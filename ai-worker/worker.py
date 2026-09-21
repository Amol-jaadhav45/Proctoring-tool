import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
load_dotenv("../server/.env")

import time
import json
import uuid
import random
import sys
import base64
import numpy as np

# Lazy load ML libraries to avoid startup crashes if dependencies are missing during dev
try:
    import cv2
    import mediapipe as mp
    from ultralytics import YOLO
except ImportError as e:
    print(f"CRITICAL: Missing ML dependencies: {e}")
    print("Please run: pip install -r requirements.txt")
    # We might still run in simulation mode, but inference will fail
    cv2 = None
    mp = None
    YOLO = None

# Initialize Models (Lazy loaded in main or globally if available)
mp_face_mesh = None
mp_drawing = None
face_mesh = None
yolo_model = None
face_cascade = None

def init_models():
    global mp_face_mesh, mp_drawing, face_mesh, yolo_model, face_cascade
    if cv2 is None:
        return

    print("Loading AI Models...")
    
    # Try loading MediaPipe
    try:
        if hasattr(mp, 'solutions'):
            mp_face_mesh = mp.solutions.face_mesh
            mp_drawing = mp.solutions.drawing_utils
            
            # Refine Face Mesh for gaze tracking
            face_mesh = mp_face_mesh.FaceMesh(
                max_num_faces=5,
                refine_landmarks=True,
                min_detection_confidence=0.5,
                min_tracking_confidence=0.5
            )
            print("MediaPipe FaceMesh loaded.")
        else:
            print("MediaPipe 'solutions' not found (Python 3.14?). Falling back to OpenCV.")
            raise ImportError("MediaPipe broken")
    except Exception as e:
        print(f"MediaPipe failed to load: {e}. Using OpenCV Haar Cascade fallback.")
        try:
            # Load Haar Cascade
            casc_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
            face_cascade = cv2.CascadeClassifier(casc_path)
            print("OpenCV Haar Cascade loaded.")
        except Exception as ex:
            print(f"Failed to load OpenCV Cascade: {ex}")

    # Load YOLOv8 Nano (pretrained on COCO)
    try:
        print("Loading YOLOv8n model...")
        yolo_model = YOLO("yolov8n.pt") 
        print("YOLOv8n loaded successfully.")
    except Exception as e:
        print(f"Error loading YOLO: {e}")

SIMULATION_INTERVAL = float(os.getenv("AI_SIMULATION_INTERVAL_SECONDS", "2"))

def decode_image(base64_string):
    """
    Decodes a base64 string to a OpenCV image.
    """
    try:
        # Remove header if present (data:image/jpeg;base64,...)
        if "," in base64_string:
            base64_string = base64_string.split(",")[1]
        
        img_bytes = base64.b64decode(base64_string)
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return img
    except Exception as e:
        print(f"Error decoding image: {e}")
        return None

def analyze_gaze(landmarks, image_width, image_height):
    """
    Estimate gaze direction based on face mesh landmarks.
    Simple heuristic using nose tip and face edges.
    """
    # Landmarks: 1 (nose tip), 33 (left eye corner), 263 (right eye corner), 61 (mouth left), 291 (mouth right)
    nose_tip = landmarks[1]
    left_eye = landmarks[33]
    right_eye = landmarks[263]
    
    # Calculate relative horizontal position of nose
    eye_center_x = (left_eye.x + right_eye.x) / 2
    gaze_diff_x = nose_tip.x - eye_center_x
    
    # Thresholds for looking left/right
    if gaze_diff_x < -0.04:
        return "RIGHT" 
    elif gaze_diff_x > 0.04:
        return "LEFT"
        
    return "CENTER"

def process_frame_inference(frame_data: dict, session_id: str):
    """
    Process a video frame with real AI inference.
    """
    if cv2 is None:
        return None

    frame_b64 = frame_data.get("image") or frame_data.get("frame")
    if not frame_b64:
        return None

    img = decode_image(frame_b64)
    if img is None:
        return None

    h, w, _ = img.shape
    
    # --- Face Detection ---
    face_count = 0
    gaze_violation = None

    if face_mesh:
        # Use MediaPipe
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        results = face_mesh.process(rgb_img)
        if results.multi_face_landmarks:
            face_count = len(results.multi_face_landmarks)
            # Check Gaze on first face
            if face_count == 1:
                landmarks = results.multi_face_landmarks[0].landmark
                direction = analyze_gaze(landmarks, w, h)
                if direction != "CENTER":
                    gaze_violation = {
                        "type": "GAZE_AVERSION",
                        "confidence": 0.75,
                        "payload": {"direction": direction}
                    }
    elif face_cascade:
        # Use OpenCV Haar Cascade
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(30, 30)
        )
        face_count = len(faces)
    
    # Result Logic
    if face_count == 0:
        return {
            "type": "FACE_MISSING",
            "confidence": 0.90,
            "payload": {"faceCount": 0}
        }
    elif face_count > 1:
        return {
            "type": "MULTIPLE_FACES",
            "confidence": 0.85,
            "payload": {"faceCount": face_count}
        }
    elif gaze_violation:
        return gaze_violation

    # --- Object Detection (YOLO) ---
    if yolo_model:
        yolo_results = yolo_model(img, verbose=False)
        for r in yolo_results:
            boxes = r.boxes
            for box in boxes:
                cls = int(box.cls[0])
                conf = float(box.conf[0])
                
                # COCO classes: 67=cell phone
                if cls == 67 and conf > 0.5:
                    return {
                        "type": "PROHIBITED_OBJECT",
                        "confidence": conf,
                        "payload": {"object": "cell phone"}
                    }

    return None

import redis

def connect_redis():
    redis_url = os.getenv("REDIS_URL")
    if not redis_url:
        raise RuntimeError("REDIS_URL is required for ai-worker")
    client = redis.Redis.from_url(redis_url, decode_responses=True)
    try:
        client.ping()
        print(f"Connected to Redis at {redis_url}")
    except Exception as e:
        print(f"Failed to connect to Redis: {e}")
        # Continue, maybe transient?
    return client

def generate_fake_event(session_id: str):
    """
    Generates a random AI event adhering to the system's schema.
    (Kept for simulation mode)
    """
    event_types = ["FACE_MISSING", "MULTIPLE_FACES", "GAZE_AVERSION", "NORMAL"]
    weights = [0.1, 0.1, 0.2, 0.6]
    e_type = random.choices(event_types, weights=weights, k=1)[0]
    
    if e_type == "NORMAL":
        return None

    base_event = {
        "id": str(uuid.uuid4()),
        "sessionId": session_id,
        "type": e_type,
        "timestamp": int(time.time() * 1000),
        "confidence": round(random.uniform(0.7, 0.99), 2),
        "metadata": {"source": "ai-worker-stub"}
    }
    
    payload = {}
    if e_type == "FACE_MISSING":
        payload = {"faceCount": 0}
    elif e_type == "MULTIPLE_FACES":
        payload = {"faceCount": random.randint(2, 4)}
    elif e_type == "GAZE_AVERSION":
        payload = {"direction": random.choice(["LEFT", "RIGHT", "DOWN"])}
        
    base_event["payload"] = payload
    return base_event

def run_simulation(pubsub, redis_client):
    """
    Listens for active sessions (published by server/client) on `exam.sessions.active`
    and simulates AI events by publishing to `exam.events.{sessionId}`.
    """
    print("AI worker running in SIMULATION mode.")
    print("Waiting for session announcements on channel: exam.sessions.active")
    for message in pubsub.listen():
        if message.get("type") != "message":
            continue
        try:
            payload = json.loads(message["data"])
            session_id = payload.get("sessionId") or payload.get("session_id") or payload.get("id")
            if not session_id:
                continue
            # simulate a short burst
            for _ in range(3):
                event = generate_fake_event(session_id)
                if event:
                    json_event = json.dumps(event)
                    channel = f"exam.events.{session_id}"
                    redis_client.publish(channel, json_event)
                    print(f"[SIM_EVENT] {channel} {json_event}")
                time.sleep(SIMULATION_INTERVAL)
        except Exception as e:
            print(f"[SIM] Error handling message: {e}")

def run_real_inference(pubsub, redis_client):
    """
    Processes real video frames from Redis stream.
    Subscribes to exam.frames.{sessionId} channels.
    """
    print("AI worker running in REAL inference mode.")
    # Initialize models now
    init_models()
    
    if face_mesh is None and face_cascade is None and yolo_model is None:
        print("WARNING: ALL Models failed to load. Inference will not run.")
        return

    print("Subscribing to frame channels: exam.frames.*")
    
    # Subscribe to all frame channels
    pubsub.psubscribe("exam.frames.*")
    
    for message in pubsub.listen():
        if message.get("type") != "pmessage":
            continue
        try:
            channel = message.get("channel", "")
            session_id = channel.replace("exam.frames.", "") if "exam.frames." in channel else None
            
            if not session_id:
                continue
                
            frame_data = json.loads(message["data"])
            
            # Process frame with real inference
            result = process_frame_inference(frame_data, session_id)
            
            if result:
                event = {
                    "id": str(uuid.uuid4()),
                    "sessionId": session_id,
                    "type": result["type"],
                    "timestamp": int(time.time() * 1000),
                    "confidence": result.get("confidence", 0.8),
                    "payload": result.get("payload", {}),
                    "metadata": {"source": "ai-worker-v2"}
                }
                
                json_event = json.dumps(event)
                event_channel = f"exam.events.{session_id}"
                redis_client.publish(event_channel, json_event)
                print(f"[AI_EVENT] {event_channel} {event['type']}")
        except Exception as e:
            print(f"[AI] Error processing frame: {e}")

def main():
    mode = os.getenv("AI_WORKER_MODE", "simulate").lower()
    print(f"--- AI Worker Started (mode={mode}) ---")

    redis_client = connect_redis()
    pubsub = redis_client.pubsub()

    try:
        if mode == "simulate":
            pubsub.subscribe("exam.sessions.active")
            run_simulation(pubsub, redis_client)
        elif mode == "inference":
            run_real_inference(pubsub, redis_client)
        else:
            raise RuntimeError(
                f"Unsupported AI_WORKER_MODE: {mode}. "
                "Set AI_WORKER_MODE=simulate (default) or AI_WORKER_MODE=inference"
            )
    except KeyboardInterrupt:
        print("\nStopping worker...")

if __name__ == "__main__":
    main()
