import type { FaceLandmarkerResult } from '@mediapipe/tasks-vision';

export type GazeDirection = 'CENTER' | 'LEFT' | 'RIGHT' | 'UP' | 'DOWN';

export interface ViolationStatus {
    isLookingAway: boolean;
    gazeDirection: GazeDirection;
    faceCount: number;
    isMultipleFaces: boolean;
    isNoFace: boolean;
    isBlinking?: boolean;
    confidence: number; // 0 to 1 scaling based on certainty
}

// Heuristic to estimate Head Yaw (Left/Right turn)
// Returns value between -1 (Left) and 1 (Right), roughly. 0 is Center.
const calculateHeadYaw = (landmarks: any[]): number => {
    // Key landmarks: 1 (Nose Tip), 234 (Left Ear/Cheek), 454 (Right Ear/Cheek)
    const nose = landmarks[1];
    const leftSide = landmarks[234];
    const rightSide = landmarks[454];

    if (!nose || !leftSide || !rightSide) return 0;

    // Calculate midpoint of face width
    const faceCenterX = (leftSide.x + rightSide.x) / 2;

    // Calculate face width for normalization
    const faceWidth = Math.abs(rightSide.x - leftSide.x);

    // Yaw is the deviation of the nose from the center, normalized by face width
    // Multiplied by constant to scale it to roughly -1 to 1 range for 90 degree turns
    return (nose.x - faceCenterX) / faceWidth * 2.5;
};

/**
 * Normalizes a value that is at or above a threshold into a 0.5-1.0 confidence range.
 * If value equals threshold, confidence is 0.5. If value is 1.5x threshold or more, confidence is 1.0.
 */
const normalizeConfidence = (value: number, threshold: number): number => {
    const v = Math.abs(value);
    const t = Math.abs(threshold);
    if (v < t) return 0;
    // Map [t, t*1.5] to [0.5, 1.0]
    const confidence = 0.5 + (Math.min(v, t * 1.5) - t) / (t * 0.5) * 0.5;
    return Number(confidence.toFixed(2));
};

export interface AnalyzeViolationOptions {
    /** When true, use lower thresholds so LEFT/RIGHT/UP are reported for liveness challenges */
    livenessMode?: boolean;
}

export const analyzeViolation = (result: FaceLandmarkerResult, options?: AnalyzeViolationOptions): ViolationStatus => {
    const livenessMode = options?.livenessMode ?? false;
    const faceCount = result.faceLandmarks.length;

    if (faceCount === 0) {
        return {
            isLookingAway: true,
            gazeDirection: 'CENTER',
            faceCount: 0,
            isMultipleFaces: false,
            isNoFace: true,
            isBlinking: false,
            confidence: 1.0
        };
    }

    if (faceCount > 1) {
        return {
            isLookingAway: true,
            gazeDirection: 'CENTER',
            faceCount,
            isMultipleFaces: true,
            isNoFace: false,
            isBlinking: false,
            confidence: 1.0
        };
    }

    // --- Single Face Logic ---
    const blendshapes = result.faceBlendshapes[0].categories;
    const landmarks = result.faceLandmarks[0];

    // 1. Calculate Head Pose (Yaw)
    const headYaw = calculateHeadYaw(landmarks);

    // 2. Get Eye Gaze Scores
    const eyeLookInLeft = blendshapes.find(b => b.categoryName === 'eyeLookInLeft')?.score || 0;
    const eyeLookOutLeft = blendshapes.find(b => b.categoryName === 'eyeLookOutLeft')?.score || 0;
    const eyeLookInRight = blendshapes.find(b => b.categoryName === 'eyeLookInRight')?.score || 0;
    const eyeLookOutRight = blendshapes.find(b => b.categoryName === 'eyeLookOutRight')?.score || 0;

    // Net Eye Movement (Positive = Right, Negative = Left)
    const leftEyeNet = eyeLookInLeft - eyeLookOutLeft;
    const rightEyeNet = eyeLookOutRight - eyeLookInRight;
    const avgEyeGaze = (leftEyeNet + rightEyeNet) / 2;

    const eyeLookUp = blendshapes.find(b => b.categoryName === 'eyeLookUpLeft')?.score || 0;
    const eyeLookDown = blendshapes.find(b => b.categoryName === 'eyeLookDownLeft')?.score || 0;

    let gazeDirection: GazeDirection = 'CENTER';
    let isLookingAway = false;
    let confidence = 0;

    // Liveness: lower thresholds so user can satisfy "turn left/right" or "look up" easily
    const HEAD_YAW_THRESHOLD_LIVENESS = 0.32;
    const EYE_LOOK_UP_THRESHOLD_LIVENESS = 0.45;

    // Thresholds for normal proctoring (strict - minimal false positives)
    const HEAD_YAW_THRESHOLD_EXTREME = 1.0;
    const HEAD_YAW_THRESHOLD_MODERATE = 0.6;
    const EYE_GAZE_THRESHOLD = 0.7;

    if (livenessMode) {
        // Set gaze direction from head yaw with low threshold so small turns count
        if (Math.abs(headYaw) > HEAD_YAW_THRESHOLD_LIVENESS) {
            gazeDirection = headYaw > 0 ? 'RIGHT' : 'LEFT';
            confidence = normalizeConfidence(headYaw, HEAD_YAW_THRESHOLD_LIVENESS);
        }
        if (eyeLookUp > EYE_LOOK_UP_THRESHOLD_LIVENESS) {
            gazeDirection = 'UP';
            confidence = Math.max(confidence, normalizeConfidence(eyeLookUp, EYE_LOOK_UP_THRESHOLD_LIVENESS));
        } else if (eyeLookDown > 0.85) {
            gazeDirection = 'DOWN';
            confidence = Math.max(confidence, normalizeConfidence(eyeLookDown, 0.85));
        }
        // Don't set isLookingAway from direction in liveness so the challenge can succeed
    } else {
        // --- Normal violation logic ---
        if (Math.abs(headYaw) > HEAD_YAW_THRESHOLD_EXTREME) {
            isLookingAway = true;
            gazeDirection = headYaw > 0 ? 'RIGHT' : 'LEFT';
            confidence = normalizeConfidence(headYaw, HEAD_YAW_THRESHOLD_EXTREME);
        } else if (Math.abs(headYaw) > HEAD_YAW_THRESHOLD_MODERATE) {
            if (headYaw > 0 && avgEyeGaze > 0.1) {
                isLookingAway = true;
                gazeDirection = 'RIGHT';
                confidence = normalizeConfidence(headYaw, HEAD_YAW_THRESHOLD_MODERATE);
            } else if (headYaw < 0 && avgEyeGaze < -0.1) {
                isLookingAway = true;
                gazeDirection = 'LEFT';
                confidence = normalizeConfidence(headYaw, HEAD_YAW_THRESHOLD_MODERATE);
            }
        } else {
            if (avgEyeGaze > EYE_GAZE_THRESHOLD) {
                isLookingAway = true;
                gazeDirection = 'RIGHT';
                confidence = normalizeConfidence(avgEyeGaze, EYE_GAZE_THRESHOLD);
            } else if (avgEyeGaze < -EYE_GAZE_THRESHOLD) {
                isLookingAway = true;
                gazeDirection = 'LEFT';
                confidence = normalizeConfidence(avgEyeGaze, EYE_GAZE_THRESHOLD);
            }
        }

        if (eyeLookUp > 0.8) {
            isLookingAway = true;
            gazeDirection = 'UP';
            confidence = Math.max(confidence, normalizeConfidence(eyeLookUp, 0.8));
        } else if (eyeLookDown > 0.9) {
            isLookingAway = true;
            gazeDirection = 'DOWN';
            confidence = Math.max(confidence, normalizeConfidence(eyeLookDown, 0.9));
        }
    }

    // 3. Blink Detection (slightly lower threshold in liveness so blinks register reliably)
    const eyeBlinkLeft = blendshapes.find(b => b.categoryName === 'eyeBlinkLeft')?.score || 0;
    const eyeBlinkRight = blendshapes.find(b => b.categoryName === 'eyeBlinkRight')?.score || 0;
    const blinkThreshold = livenessMode ? 0.35 : 0.5;
    const isBlinking = eyeBlinkLeft > blinkThreshold && eyeBlinkRight > blinkThreshold;

    return {
        isLookingAway,
        gazeDirection,
        faceCount,
        isMultipleFaces: false,
        isNoFace: false,
        isBlinking,
        confidence: isLookingAway ? Math.max(0.1, confidence) : 0
    };
};
