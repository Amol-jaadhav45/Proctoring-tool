import { signalingService } from '../services/signaling';

interface SnapshotMetadata {
    violationType: string;
    timestamp: string;
    sessionId: string;
    questionIndex?: number;
    timeRemaining?: number;
    credibilityScore?: number;
    confidence?: number;
}

export const captureViolationSnapshot = async (
    roomId: string,
    sessionId: string,
    violationType: string,
    metadata: Partial<SnapshotMetadata> = {},
    streams?: { screen?: MediaStream | null, webcam?: MediaStream | null }
): Promise<void> => {
    try {
        // Capture screen
        const screenCanvas = await captureFromStream(streams?.screen) || await captureScreen();

        // Capture webcam if available
        const webcamCanvas = await captureFromStream(streams?.webcam) || await captureWebcam();

        // Combine screenshots side by side
        const combinedCanvas = document.createElement('canvas');
        const sWidth = screenCanvas?.width || 0;
        const sHeight = screenCanvas?.height || 0;
        const wWidth = webcamCanvas?.width || 0;
        const wHeight = webcamCanvas?.height || 0;

        combinedCanvas.width = sWidth + wWidth;
        combinedCanvas.height = Math.max(sHeight, wHeight) || 480;

        const ctx = combinedCanvas.getContext('2d');

        if (ctx) {
            // Fill background
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(0, 0, combinedCanvas.width, combinedCanvas.height);

            // Draw screen on left
            if (screenCanvas) {
                ctx.drawImage(screenCanvas, 0, 0);
            }

            // Draw webcam on right
            if (webcamCanvas) {
                ctx.drawImage(webcamCanvas, sWidth, 0);
            }

            // --- DOWNSCALE ---
            const MAX_WIDTH = 1280;
            let finalCanvas = combinedCanvas;
            if (combinedCanvas.width > MAX_WIDTH) {
                const scale = MAX_WIDTH / combinedCanvas.width;
                const downscaledCanvas = document.createElement('canvas');
                downscaledCanvas.width = MAX_WIDTH;
                downscaledCanvas.height = combinedCanvas.height * scale;
                const dCtx = downscaledCanvas.getContext('2d');
                if (dCtx) {
                    dCtx.drawImage(combinedCanvas, 0, 0, downscaledCanvas.width, downscaledCanvas.height);
                    finalCanvas = downscaledCanvas;
                }
            }

            const fCtx = finalCanvas.getContext('2d');
            if (fCtx) {
                // Add violation info overlay on the FINAL canvas
                fCtx.fillStyle = 'rgba(220, 38, 38, 0.9)';
                fCtx.fillRect(0, 0, finalCanvas.width, 50);
                fCtx.fillStyle = 'white';
                fCtx.font = 'bold 18px sans-serif';
                fCtx.fillText(`VIOLATION DETECTED: ${violationType.replace(/_/g, ' ')}`, 15, 32);
            }

            // Convert to base64 with lower quality (0.6)
            const imageData = finalCanvas.toDataURL('image/jpeg', 0.6);

            // Send via existing signaling service
            signalingService.sendViolation({
                roomId,
                sessionId,
                violationType,
                imageData,
                metadata: {
                    ...metadata,
                    timestamp: new Date().toISOString(),
                }
            });

            // Also save to backend (non-blocking - fire and forget)
            // Don't await to prevent Convex connection issues from blocking camera
            saveSnapshotToBackend(sessionId, violationType, imageData, {
                ...metadata,
                confidence: metadata?.confidence
            }).catch(err => {
                console.error('[snapshot] Failed to save snapshot (non-blocking):', err.message);
            });
        }
    } catch (error) {
        console.error('Error capturing violation snapshot:', error);
    }
};

const captureFromStream = async (stream?: MediaStream | null): Promise<HTMLCanvasElement | null> => {
    if (!stream) return null;
    const track = stream.getVideoTracks()[0];
    if (!track) return null;

    try {
        const imageCapture = new (window as any).ImageCapture(track);
        const bitmap = await imageCapture.grabFrame();
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(bitmap, 0, 0);
            return canvas;
        }
    } catch (err) {
        // Fallback to video element if ImageCapture fails
        const video = document.createElement('video');
        video.srcObject = stream;
        await video.play();
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(video, 0, 0);
            video.srcObject = null;
            return canvas;
        }
    }
    return null;
};

const captureScreen = async (): Promise<HTMLCanvasElement | null> => {
    try {
        // Use html2canvas or similar library, or browser's capture API
        // For now, we'll use a simple approach
        const canvas = document.createElement('canvas');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        const ctx = canvas.getContext('2d');

        if (ctx) {
            // Capture visible area
            ctx.drawImage(document.body as any, 0, 0);
        }

        return canvas;
    } catch (error) {
        console.error('Error capturing screen:', error);
        return null;
    }
};

const captureWebcam = async (): Promise<HTMLCanvasElement | null> => {
    try {
        const video = document.querySelector('video');
        if (!video || video.readyState !== 4) return null;

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');

        if (ctx) {
            ctx.drawImage(video, 0, 0);
        }

        return canvas;
    } catch (error) {
        console.error('Error capturing webcam:', error);
        return null;
    }
};

const saveSnapshotToBackend = async (
    sessionId: string,
    violationType: string,
    imageData: string,
    metadata: Partial<SnapshotMetadata>
) => {
    try {
        const API_BASE_URL =
            (import.meta.env.VITE_API_URL as string | undefined) ||
            (typeof window !== 'undefined' ? `${window.location.origin}/api` : '');
        if (!API_BASE_URL) {
            console.warn('[snapshot] API base URL is not set. Snapshot will not be saved to backend.');
            return;
        }

        // Add timeout to prevent hanging on network issues
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        try {
            const response = await fetch(`${API_BASE_URL}/violations/snapshot`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    session_id: sessionId,
                    violation_type: violationType,
                    image_data: imageData,
                    metadata
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                console.warn(`[snapshot] Backend returned ${response.status} for violation snapshot`);
            } else {
                console.log(`[snapshot] Successfully saved ${violationType} snapshot for session ${sessionId.slice(0, 8)}`);
            }
        } catch (fetchError: any) {
            clearTimeout(timeoutId);
            if (fetchError.name === 'AbortError') {
                console.warn('[snapshot] Snapshot save timed out after 10s - continuing without saving');
            } else {
                throw fetchError;
            }
        }
    } catch (error: any) {
        // Log detailed error but don't throw - camera should continue working
        console.error('[snapshot] Error saving snapshot to backend:', {
            error: error.message,
            violationType,
            sessionId: sessionId.slice(0, 8),
            stack: error.stack
        });
    }
};





