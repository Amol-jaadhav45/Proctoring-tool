import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import { useMediaPipe } from '../hooks/useMediaPipe';
import { useLivenessChallenge } from '../hooks/useLivenessChallenge';
import { analyzeViolation, type ViolationStatus } from '../utils/visionLogic';
import { AlertTriangle, UserX, Users, Activity } from 'lucide-react';

export interface WebcamFeedHandle {
    captureSnapshot: () => string | null;
    triggerLivenessChallenge: () => void;
    video: HTMLVideoElement | null;
}

interface WebcamFeedProps {
    onViolation?: (type: 'NO_FACE' | 'MULTIPLE_FACES' | 'LOOKING_AWAY' | 'LIVENESS_FAILURE', confidence?: number) => void;
    onStreamReady?: (stream: MediaStream) => void;
    /** Called when liveness challenge is completed successfully (e.g. pre-exam verification) */
    onLivenessSuccess?: () => void;
    /** Called when liveness challenge fails or times out */
    onLivenessFailure?: () => void;
}

export const WebcamFeed = forwardRef<WebcamFeedHandle, WebcamFeedProps>(({ onViolation, onStreamReady, onLivenessSuccess, onLivenessFailure }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const { faceLandmarker, isLoading } = useMediaPipe();
    const [violation, setViolation] = useState<ViolationStatus | null>(null);
    const [hasError, setHasError] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const requestRef = useRef<number>(0);
    const lastViolationTime = useRef<number>(0);
    const lastBlinkTime = useRef<number>(Date.now());

    // Liveness Challenge Hook
    const {
        verifyLiveness,
        startChallenge,
        message: challengeMessage,
        currentChallenge
    } = useLivenessChallenge({
        onSuccess: onLivenessSuccess,
        onFailure: () => {
            onLivenessFailure?.();
            onViolation?.('LIVENESS_FAILURE');
        }
    });

    useImperativeHandle(ref, () => ({
        captureSnapshot: () => {
            if (videoRef.current) {
                const canvas = document.createElement('canvas');
                canvas.width = videoRef.current.videoWidth;
                canvas.height = videoRef.current.videoHeight;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(videoRef.current, 0, 0);
                    return canvas.toDataURL('image/jpeg');
                }
            }
            return null;
        },
        triggerLivenessChallenge: () => {
            console.log("🎯 [WebcamFeed] Liveness challenge triggered");
            startChallenge();
        },
        video: videoRef.current
    }));

    const startCamera = async () => {
        console.log("🔄 [WebcamFeed] Starting camera...");
        setHasError(false);
        setErrorMessage('');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 640, height: 480 }
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            console.log("✅ [WebcamFeed] Camera started successfully");
            if (onStreamReady) {
                onStreamReady(stream);
            }
        } catch (err: any) {
            console.error("❌ [WebcamFeed] Error accessing webcam:", err);
            setHasError(true);
            if (err.name === 'NotAllowedError') {
                setErrorMessage('Camera access was denied. Please allow camera access in your browser settings.');
            } else if (err.name === 'NotFoundError') {
                setErrorMessage('No camera found. Please connect a camera and try again.');
            } else {
                setErrorMessage('Could not access camera. Please check your connection and try again.');
            }
        }
    };

    useEffect(() => {
        startCamera();

        return () => {
            // Cleanup stream
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }
            cancelAnimationFrame(requestRef.current);
        };
    }, []);

    // Refs to avoid stale closures in the animation frame loop
    const currentChallengeRef = useRef(currentChallenge);
    const verifyLivenessRef = useRef(verifyLiveness);

    useEffect(() => {
        currentChallengeRef.current = currentChallenge;
        verifyLivenessRef.current = verifyLiveness;
    }, [currentChallenge, verifyLiveness]);

    const predictWebcam = () => {
        if (faceLandmarker && videoRef.current && videoRef.current.readyState === 4) {
            const startTimeMs = performance.now();
            const results = faceLandmarker.detectForVideo(videoRef.current, startTimeMs);

            const activeChallenge = currentChallengeRef.current;
            const checkLiveness = verifyLivenessRef.current;

            const status = analyzeViolation(results, { livenessMode: !!activeChallenge });
            setViolation(status);

            // Verify active liveness challenge
            if (activeChallenge) {
                checkLiveness(status);
            }

            // Report violations to parent (throttled)
            const now = Date.now();

            // Liveness Check (Blink Detection)
            if (status.isBlinking) {
                lastBlinkTime.current = now;
            } else {
                // If no blink for 60 seconds (60000ms)
                if (now - lastBlinkTime.current > 60000) {
                    if (now - lastViolationTime.current > 5000) { // Throttle liveness alerts
                        onViolation?.('LIVENESS_FAILURE');
                        lastViolationTime.current = now;
                    }
                }
            }

            if (now - lastViolationTime.current > 2000) { // Throttle 2s
                if (status.isNoFace) {
                    onViolation?.('NO_FACE', status.confidence);
                    lastViolationTime.current = now;
                } else if (status.isMultipleFaces) {
                    onViolation?.('MULTIPLE_FACES', status.confidence);
                    lastViolationTime.current = now;
                } else if (status.isLookingAway) {
                    onViolation?.('LOOKING_AWAY', status.confidence);
                    lastViolationTime.current = now;
                }
            }
        }
        requestRef.current = requestAnimationFrame(predictWebcam);
    };

    useEffect(() => {
        if (faceLandmarker && !isLoading) {
            console.log("✅ [WebcamFeed] Face landmarker ready, starting prediction loop");
            // Cancel any existing loop before starting a new one
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
            predictWebcam();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [faceLandmarker, isLoading]);

    return (
        <div className="relative w-full h-full bg-black rounded-xl overflow-hidden">
            {isLoading && !hasError && (
                <div className="absolute inset-0 flex items-center justify-center text-white z-10 bg-black/50">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <span>Loading AI Model...</span>
                    </div>
                </div>
            )}

            {hasError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white z-20 bg-gray-900 px-6 text-center">
                    <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
                    <h3 className="text-xl font-bold mb-2">Camera Error</h3>
                    <p className="text-gray-400 mb-6 max-w-xs">{errorMessage}</p>
                    <button
                        onClick={startCamera}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold transition-colors"
                    >
                        Retry Camera
                    </button>
                </div>
            )}

            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100" // Mirror effect
            />

            {/* Overlay Alerts */}
            {violation && (
                <div className="absolute top-4 left-4 right-4 flex flex-col gap-2">
                    {violation.isNoFace && (
                        <div className="bg-red-500/90 text-white px-4 py-2 rounded-lg flex items-center gap-2 backdrop-blur-sm">
                            <UserX className="w-5 h-5" />
                            <span className="font-semibold">No Face Detected!</span>
                        </div>
                    )}

                    {violation.isMultipleFaces && (
                        <div className="bg-red-600/90 text-white px-4 py-2 rounded-lg flex items-center gap-2 backdrop-blur-sm">
                            <Users className="w-5 h-5" />
                            <span className="font-semibold">Multiple People Detected!</span>
                        </div>
                    )}

                    {/* Liveness Challenge Overlay */}
                    {challengeMessage && (
                        <div className="bg-blue-600/90 text-white px-4 py-3 rounded-lg flex items-center gap-3 backdrop-blur-sm animate-pulse border-2 border-white/20 shadow-xl">
                            <Activity className="w-6 h-6" />
                            <div className="flex flex-col">
                                <span className="font-bold text-lg">Liveness Check Required</span>
                                <span className="font-medium">{challengeMessage}</span>
                            </div>
                        </div>
                    )}

                    {violation.isLookingAway && !violation.isNoFace && !violation.isMultipleFaces && (
                        <div className="bg-yellow-500/90 text-white px-4 py-2 rounded-lg flex items-center gap-2 backdrop-blur-sm">
                            <AlertTriangle className="w-5 h-5" />
                            <span className="font-semibold">Please look at the screen ({violation.gazeDirection})</span>
                        </div>
                    )}
                </div>
            )}

            {/* Debug Info (Optional - can be removed in prod) */}
            <div className="absolute bottom-2 right-2 text-xs text-white/50 font-mono">
                {violation?.faceCount} Face(s)
            </div>
        </div>
    );
});

WebcamFeed.displayName = 'WebcamFeed';
