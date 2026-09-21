import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useConvex, useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Sidebar } from '../components/Sidebar';
import { WebcamFeed, type WebcamFeedHandle } from '../components/WebcamFeed';
import { useMediaPipe } from '../hooks/useMediaPipe';
import { CheckCircle, CircleDot, Clock, Shield, Video, Mic, Monitor, Wifi, ScrollText, DoorOpen, XCircle, Loader2, Camera, AlertCircle, CheckCircle2, Activity, User } from 'lucide-react';

type StepKey = 'system' | 'id' | 'rules' | 'waiting';

const steps: { key: StepKey; label: string; icon: React.ComponentType<any>; desc: string }[] = [
    { key: 'system', label: 'System Check', icon: Shield, desc: 'Webcam, mic, internet, screen' },
    { key: 'id', label: 'Face Verification', icon: User, desc: 'Match your face to profile' },
    { key: 'rules', label: 'Rules', icon: ScrollText, desc: 'Agree to guidelines' },
    { key: 'waiting', label: 'Waiting Room', icon: Clock, desc: 'Join when ready' },
];

export const PreExamFlow: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const convex = useConvex();
    const userProfile = useQuery(api.users.getUser, user?.user_id ? { user_id: user.user_id } : "skip");
    const [activeStep, setActiveStep] = useState<StepKey>('system');

    // Check if exam is already completed
    useEffect(() => {
        const checkStatus = async () => {
            if (!user || !id) return;
            try {
                // Note: using sessions.getByUser which returns all sessions. 
                // Ideally backend should have a specific check, but this works for now.
                const sessions = await convex.query(api.sessions.getByUser, { user_id: user.user_id });
                // We need to cast sessions to any or access properties safely if types aren't generated
                const session = (sessions as any[])?.find((s: any) => s.exam_id === id);

                if (session && session.status === 'completed') {
                    alert("You have already completed this exam.");
                    navigate('/');
                }
            } catch (error) {
                console.error("Error checking exam status:", error);
            }
        };
        checkStatus();
    }, [user, id, convex, navigate]);

    // System check states
    const [checking, setChecking] = useState(false);
    const [cameraStatus, setCameraStatus] = useState<'pending' | 'ok' | 'failed'>('pending');
    const [micStatus, setMicStatus] = useState<'pending' | 'ok' | 'failed'>('pending');
    const [screenStatus, setScreenStatus] = useState<'pending' | 'ok' | 'failed'>('pending');
    const [internetStatus, setInternetStatus] = useState<'pending' | 'ok' | 'failed'>('pending');

    // Face verification only (no ID)
    const [facePhoto, setFacePhoto] = useState<string | null>(null);
    const [faceVerificationStatus, setFaceVerificationStatus] = useState<'face-capture' | 'matching' | 'liveness-required' | 'verified' | 'failed'>('face-capture');
    const [matchScore, setMatchScore] = useState<number | null>(null);
    const [verificationError, setVerificationError] = useState<string | null>(null);
    const webcamRef = useRef<WebcamFeedHandle>(null);
    const { compareFaces, isLoading: modelsLoading, error: modelError } = useMediaPipe();

    // Log model loading status
    useEffect(() => {
        console.log("📊 [PreExamFlow] MediaPipe status:", { modelsLoading, modelError });
    }, [modelsLoading, modelError]);

    // Log face verification status changes
    useEffect(() => {
        console.log("📊 [PreExamFlow] Face verification status:", faceVerificationStatus);
    }, [faceVerificationStatus]);

    const [agreed, setAgreed] = useState(false);

    const systemPassed = useMemo(() =>
        cameraStatus === 'ok' && micStatus === 'ok' && screenStatus === 'ok' && internetStatus === 'ok',
        [cameraStatus, micStatus, screenStatus, internetStatus]);


    const runSystemCheck = async () => {
        setChecking(true);

        // 1. Check Internet
        setInternetStatus(navigator.onLine ? 'ok' : 'failed');

        // 2 & 3. Check Camera & Mic
        try {
            const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
            videoStream.getTracks().forEach(t => t.stop());
            setCameraStatus('ok');
        } catch (err) {
            console.error('Camera check failed:', err);
            setCameraStatus('failed');
        }

        try {
            const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioStream.getTracks().forEach(t => t.stop());
            setMicStatus('ok');
        } catch (err) {
            console.error('Mic check failed:', err);
            setMicStatus('failed');
        }

        // 4. Check Screen Share
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            screenStream.getTracks().forEach(t => t.stop());
            setScreenStatus('ok');
        } catch (err) {
            console.error('Screen check failed:', err);
            setScreenStatus('failed');
        }

        setChecking(false);
    };

    const goNext = () => {
        const order: StepKey[] = ['system', 'id', 'rules', 'waiting'];
        const idx = order.indexOf(activeStep);
        const next = order[idx + 1];
        if (!next) return;
        setActiveStep(next);
    };

    // Capture face and match against profile photo only
    const captureFaceAndMatch = async () => {
        console.log("📸 [PreExamFlow] captureFaceAndMatch initiated");
        if (!webcamRef.current) {
            console.error("❌ [PreExamFlow] Webcam ref not found");
            return;
        }

        if (!userProfile) {
            console.warn("⚠️ [PreExamFlow] User profile not loaded yet");
            alert("User profile is still loading. Please wait a moment.");
            return;
        }

        const faceSnapshot = webcamRef.current.captureSnapshot();
        if (!faceSnapshot) {
            console.error("❌ [PreExamFlow] Failed to capture snapshot from webcam");
            setVerificationError('Failed to capture face. Please try again.');
            return;
        }
        console.log("✅ [PreExamFlow] Face snapshot captured");

        setFacePhoto(faceSnapshot);
        setFaceVerificationStatus('matching');
        setVerificationError(null);

        try {
            // Buffer to allow state to update and image to be ready
            await new Promise(resolve => setTimeout(resolve, 500));

            const authorizedFacePhoto = userProfile?.face_photo;
            if (!authorizedFacePhoto) {
                console.error("❌ [PreExamFlow] No profile photo found in user profile");
                setVerificationError('Profile photo not found in your account. Please contact an administrator.');
                setFaceVerificationStatus('failed');
                return;
            }
            console.log("✅ [PreExamFlow] Found authorized profile photo");

            const capturedFaceImage = new Image();
            const authorizedFaceImage = new Image();

            // Log image sources (truncated)
            console.log(`🔍 [PreExamFlow] Loading images... Snapshot len: ${faceSnapshot.length}, Profile len: ${authorizedFacePhoto.length}`);

            capturedFaceImage.src = faceSnapshot;
            authorizedFaceImage.src = authorizedFacePhoto;

            await Promise.all([
                new Promise((resolve, reject) => {
                    capturedFaceImage.onload = () => {
                        console.log("✅ [PreExamFlow] Captured image loaded");
                        resolve(null);
                    };
                    capturedFaceImage.onerror = () => reject(new Error("Failed to load captured image"));
                }),
                new Promise((resolve, reject) => {
                    authorizedFaceImage.onload = () => {
                        console.log("✅ [PreExamFlow] Profile image loaded");
                        resolve(null);
                    };
                    authorizedFaceImage.onerror = () => reject(new Error("Failed to load profile photo"));
                })
            ]);

            console.log("🔄 [PreExamFlow] Starting face comparison...");
            const faceSimilarity = compareFaces(capturedFaceImage, authorizedFaceImage);
            console.log("✅ [PreExamFlow] Face similarity score:", faceSimilarity);
            setMatchScore(faceSimilarity);

            // Match threshold: 0.52 is a balanced value for different lighting
            const FACE_MATCH_THRESHOLD = 0.52;

            if (faceSimilarity >= FACE_MATCH_THRESHOLD) {
                console.log("🎉 [PreExamFlow] Face match SUCCESS");
                setFaceVerificationStatus('liveness-required');
            } else {
                console.warn("⚠️ [PreExamFlow] Face match FAILED. Score:", faceSimilarity);
                setFaceVerificationStatus('failed');
                setVerificationError(
                    faceSimilarity === 0
                        ? 'No face detected in one or both images. Ensure your face is clearly visible and well-lit.'
                        : `Low match score (${(faceSimilarity * 100).toFixed(0)}%). Please face the camera directly in good lighting.`
                );
            }
        } catch (err: any) {
            console.error("❌ [PreExamFlow] Face verification error:", err);
            setFaceVerificationStatus('failed');
            setVerificationError(err.message || "An unexpected error occurred during verification.");
        }
    };

    const resetFaceVerification = () => {
        setFacePhoto(null);
        setFaceVerificationStatus('face-capture');
        setMatchScore(null);
        setVerificationError(null);
    };

    const livenessStepTriggered = useRef(false);
    useEffect(() => {
        // Reset triggered flag if we're not in liveness mode
        if (faceVerificationStatus !== 'liveness-required') {
            livenessStepTriggered.current = false;
            return;
        }

        // If already triggered for this session, don't do it again
        if (livenessStepTriggered.current) return;

        console.log("🔄 [PreExamFlow] Waiting for webcam ref to trigger liveness...");

        // Poll for webcam ref availability
        const interval = setInterval(() => {
            if (webcamRef.current) {
                console.log("✅ [PreExamFlow] Webcam ref found, triggering liveness...");
                livenessStepTriggered.current = true;
                clearInterval(interval);

                // Add a small delay to ensure video is playing
                setTimeout(() => {
                    console.log("🎯 [PreExamFlow] Executing liveness challenge trigger");
                    webcamRef.current?.triggerLivenessChallenge();
                }, 500);
            }
        }, 200);

        // Safety timeout to stop polling after 10 seconds
        const safetyTimeout = setTimeout(() => {
            clearInterval(interval);
            if (!livenessStepTriggered.current) {
                console.error("❌ [PreExamFlow] Timed out waiting for webcam ref");
            }
        }, 10000);

        return () => {
            clearInterval(interval);
            clearTimeout(safetyTimeout);
        };
    }, [faceVerificationStatus]);


    const handleStartExam = async () => {
        if (faceVerificationStatus !== 'verified') {
            alert('Please complete face verification before starting the exam.');
            setActiveStep('id');
            return;
        }
        navigate(`/exam/${id}`);
    };

    const renderStepContent = () => {
        switch (activeStep) {
            case 'system':
                return (
                    <div className="bg-surface-light rounded-xl border border-[#e6e6dd] p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Shield className="w-5 h-5 text-text-main" />
                            <h2 className="text-xl font-bold text-text-main">System Check</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { label: 'Webcam', icon: Video, status: cameraStatus },
                                { label: 'Microphone', icon: Mic, status: micStatus },
                                { label: 'Internet', icon: Wifi, status: internetStatus },
                                { label: 'Screen', icon: Monitor, status: screenStatus },
                            ].map((item) => {
                                const Icon = item.icon;
                                return (
                                    <div key={item.label} className="flex items-center gap-3 p-4 bg-[#f4f4e6] rounded-xl border border-[#e6e6dd]">
                                        <Icon className={`w-5 h-5 ${item.status === 'ok' ? 'text-green-600' : item.status === 'failed' ? 'text-red-600' : 'text-text-main'}`} />
                                        <div className="flex-1">
                                            <p className="font-bold text-text-main">{item.label}</p>
                                            <p className="text-xs text-text-muted font-medium">
                                                {item.status === 'ok' ? 'Ready' : item.status === 'failed' ? 'Error' : 'Pending'}
                                            </p>
                                        </div>
                                        {item.status === 'ok' ? (
                                            <CheckCircle className="w-5 h-5 text-green-600" />
                                        ) : item.status === 'failed' ? (
                                            <XCircle className="w-5 h-5 text-red-600" />
                                        ) : (
                                            <div className="w-5 h-5 rounded-full border-2 border-[#e6e6dd] border-t-text-main animate-spin" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <div className="mt-8 flex flex-col items-center justify-center gap-4">
                            {!systemPassed && !checking && (
                                <button
                                    onClick={runSystemCheck}
                                    className="px-8 py-3 bg-primary text-primary-content rounded-full text-lg font-bold hover:bg-[#e0dd05] shadow-sm transition-all flex items-center gap-2"
                                >
                                    <Shield className="w-5 h-5" />
                                    Start System Checks
                                </button>
                            )}

                            {checking && (
                                <div className="flex flex-col items-center gap-2 text-text-main">
                                    <Loader2 className="w-8 h-8 animate-spin" />
                                    <span className="font-bold animate-pulse">Running checks... Please allow permissions.</span>
                                </div>
                            )}

                            {systemPassed && (
                                <div className="flex flex-col items-center gap-4 w-full">
                                    <div className="flex items-center gap-2 text-green-700 font-bold bg-green-100 px-4 py-2 rounded-full border border-green-200">
                                        <CheckCircle className="w-5 h-5" />
                                        All systems go!
                                    </div>
                                    <div className="flex justify-between w-full">
                                        <button
                                            onClick={runSystemCheck}
                                            className="text-sm text-text-muted hover:text-text-main underline font-medium"
                                        >
                                            Re-run checks
                                        </button>
                                        <button
                                            onClick={goNext}
                                            className="px-8 py-3 bg-primary text-primary-content rounded-full text-lg font-bold hover:bg-[#e0dd05] shadow-sm transition-all"
                                        >
                                            Continue
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            case 'id':
                return (
                    <div className="bg-surface-light rounded-xl border border-[#e6e6dd] p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <User className="w-5 h-5 text-text-main" />
                            <h2 className="text-xl font-bold text-text-main">Face Verification</h2>
                        </div>

                        {modelError && (
                            <div className="mb-4 p-4 bg-red-50 border-2 border-red-500 rounded-lg">
                                <div className="flex items-center gap-2 text-red-700 font-bold mb-2">
                                    <AlertCircle className="w-5 h-5" />
                                    Failed to load AI models
                                </div>
                                <p className="text-sm text-red-600 mb-3">{modelError}</p>
                                <p className="text-xs text-red-600">
                                    Please refresh the page or check your internet connection. If the problem persists, contact support.
                                </p>
                            </div>
                        )}

                        {modelsLoading && (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                <span className="ml-2 text-text-muted font-medium">Loading face recognition...</span>
                            </div>
                        )}

                        {!modelsLoading && (
                            <>
                                {/* Persistent Webcam Feed for ID step content */}
                                <div className="space-y-4">
                                    {(faceVerificationStatus === 'face-capture' || faceVerificationStatus === 'matching' || faceVerificationStatus === 'liveness-required') && (
                                        <>
                                            {faceVerificationStatus === 'face-capture' && (
                                                <>
                                                    <p className="text-sm text-text-muted font-medium mb-2">
                                                        Look directly at the camera. We will match your face to your profile photo.
                                                    </p>
                                                    <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
                                                        <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                                                            For best results: use good lighting (face the light), look straight at the camera, and stay at arm’s length. Hats and sunglasses can lower the match.
                                                        </p>
                                                    </div>
                                                </>
                                            )}

                                            {faceVerificationStatus === 'liveness-required' && (
                                                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                                    <div className="flex items-center gap-2 text-blue-700 font-bold">
                                                        <Activity className="w-5 h-5" />
                                                        Liveness check
                                                    </div>
                                                    <p className="text-sm text-blue-600 mt-1">Follow the on-screen instruction to prove you are present (blink twice).</p>
                                                </div>
                                            )}

                                            <div className="relative aspect-video max-w-md mx-auto rounded-xl overflow-hidden bg-black mb-6 border border-[#e6e6dd]">
                                                <WebcamFeed
                                                    ref={webcamRef}
                                                    onLivenessSuccess={() => setFaceVerificationStatus('verified')}
                                                    onLivenessFailure={() => {
                                                        setVerificationError('Liveness check failed or timed out. Please try again.');
                                                        setFaceVerificationStatus('failed');
                                                    }}
                                                />

                                                {faceVerificationStatus === 'matching' && (
                                                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center backdrop-blur-sm z-10 text-white">
                                                        <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                                                        <p className="text-lg font-bold">Matching face to profile...</p>
                                                        <p className="text-sm opacity-80 mt-2">Please wait</p>
                                                    </div>
                                                )}
                                            </div>

                                            {faceVerificationStatus === 'face-capture' && (
                                                <div className="flex justify-center">
                                                    <button
                                                        onClick={captureFaceAndMatch}
                                                        className="px-6 py-3 bg-primary text-primary-content rounded-full font-bold hover:bg-[#e0dd05] transition-colors flex items-center gap-2 shadow-sm"
                                                    >
                                                        <Camera className="w-5 h-5" />
                                                        Capture & Verify Face
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {faceVerificationStatus === 'verified' && facePhoto && (
                                        <>
                                            <div className="mb-4 p-4 bg-green-50 border-2 border-green-500 rounded-lg">
                                                <div className="flex items-center gap-2 text-green-700 font-bold mb-2">
                                                    <CheckCircle2 className="w-6 h-6" />
                                                    Face verified
                                                </div>
                                                {matchScore !== null && (
                                                    <p className="text-sm text-green-600">Match: {(matchScore * 100).toFixed(1)}%</p>
                                                )}
                                            </div>
                                            <div className="max-w-xs mx-auto mb-6">
                                                <p className="text-xs text-text-muted font-medium mb-2">Captured face</p>
                                                <div className="aspect-square rounded-xl overflow-hidden bg-black border border-green-500">
                                                    <img src={facePhoto} alt="Face" className="w-full h-full object-cover" />
                                                </div>
                                            </div>
                                            <div className="flex justify-end">
                                                <button
                                                    onClick={goNext}
                                                    className="px-6 py-3 bg-primary text-primary-content rounded-full font-bold hover:bg-[#e0dd05] transition-colors shadow-sm"
                                                >
                                                    Continue
                                                </button>
                                            </div>
                                        </>
                                    )}

                                    {faceVerificationStatus === 'failed' && (
                                        <>
                                            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-500 rounded-lg">
                                                <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-bold mb-2">
                                                    <AlertCircle className="w-6 h-6" />
                                                    Face verification failed
                                                </div>
                                                <p className="text-sm text-red-600 dark:text-red-400">{verificationError}</p>
                                            </div>
                                            <div className="flex justify-center">
                                                <button
                                                    onClick={resetFaceVerification}
                                                    className="px-6 py-3 bg-primary text-primary-content rounded-full font-bold hover:bg-[#e0dd05] transition-colors shadow-sm"
                                                >
                                                    Try Again
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                );
            case 'rules':
                const canProceedToRules = faceVerificationStatus === 'verified';
                return (
                    <div className="bg-surface-light rounded-xl border border-[#e6e6dd] p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <ScrollText className="w-5 h-5 text-text-main" />
                            <h2 className="text-xl font-bold text-text-main">Rules & Guidelines</h2>
                        </div>

                        {!canProceedToRules && (
                            <div className="mb-4 p-4 bg-red-50 border-2 border-red-500 rounded-lg">
                                <div className="flex items-center gap-2 text-red-700 font-bold mb-2">
                                    <AlertCircle className="w-5 h-5" />
                                    Complete face verification first
                                </div>
                                <p className="text-sm text-red-600 mb-3">
                                    You must complete face verification before proceeding.
                                </p>
                                <button
                                    onClick={() => setActiveStep('id')}
                                    className="px-4 py-2 bg-red-600 text-white rounded-full font-bold hover:bg-red-700 transition-colors text-sm"
                                >
                                    Go to verification
                                </button>
                            </div>
                        )}

                        <ul className="space-y-2 text-sm text-text-main font-medium mb-4">
                            <li>• No phones or secondary devices</li>
                            <li>• Stay in view; avoid leaving your seat</li>
                            <li>• No talking; avoid background people</li>
                            <li>• Screen/tab switching is restricted</li>
                        </ul>
                        <label className="flex items-center gap-2 text-sm text-text-main font-bold cursor-pointer">
                            <input
                                type="checkbox"
                                checked={agreed}
                                onChange={(e) => setAgreed(e.target.checked)}
                                disabled={!canProceedToRules}
                                className="w-5 h-5 text-primary rounded focus:ring-primary border-[#e6e6dd] disabled:opacity-50"
                            />
                            I agree to follow these rules
                        </label>
                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => { if (agreed && canProceedToRules) goNext(); }}
                                disabled={!agreed || !canProceedToRules}
                                className={`px-5 py-2 rounded-full font-bold transition-colors ${!agreed || !canProceedToRules
                                    ? 'bg-[#e6e6dd] text-text-muted cursor-not-allowed'
                                    : 'bg-primary text-primary-content hover:bg-[#e0dd05]'
                                    }`}
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                );
            case 'waiting':
                const isVerified = faceVerificationStatus === 'verified';
                return (
                    <div className="bg-surface-light rounded-xl border border-[#e6e6dd] p-6">
                        <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-5 h-5 text-text-main" />
                            <h2 className="text-xl font-bold text-text-main">Waiting Room</h2>
                        </div>

                        {!isVerified && (
                            <div className="mb-4 p-4 bg-red-50 border-2 border-red-500 rounded-lg">
                                <div className="flex items-center gap-2 text-red-700 font-bold mb-2">
                                    <AlertCircle className="w-5 h-5" />
                                    Face verification required
                                </div>
                                <p className="text-sm text-red-600">
                                    Please complete face verification before starting the exam.
                                </p>
                                <button
                                    onClick={() => setActiveStep('id')}
                                    className="mt-3 px-4 py-2 bg-red-600 text-white rounded-full font-bold hover:bg-red-700 transition-colors text-sm"
                                >
                                    Go to verification
                                </button>
                            </div>
                        )}

                        {isVerified && (
                            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center gap-2 text-green-700 font-bold">
                                    <CheckCircle2 className="w-5 h-5" />
                                    Face verified ✓
                                </div>
                            </div>
                        )}

                        <p className="text-sm text-text-muted font-medium mb-4">If live proctoring is enabled, a proctor will join shortly. Otherwise, you can start once the exam window opens.</p>
                        <div className="flex items-center gap-3 mb-4">
                            <CircleDot className="w-4 h-4 text-green-500 animate-pulse" />
                            <span className="text-sm text-text-main font-bold">Queue position: #3 • Est. wait 2-3 mins</span>
                        </div>
                        <div className="flex items-center gap-3 mb-6">
                            <DoorOpen className="w-4 h-4 text-text-main" />
                            <span className="text-sm text-text-muted font-medium">You will enter the exam once the proctor admits you or the window opens.</span>
                        </div>
                        <button
                            onClick={handleStartExam}
                            disabled={!isVerified}
                            className={`px-6 py-2 rounded-full font-bold transition-colors shadow-sm ${isVerified
                                ? 'bg-primary text-primary-content hover:bg-[#e0dd05]'
                                : 'bg-[#e6e6dd] text-text-muted cursor-not-allowed'
                                }`}
                        >
                            {isVerified ? 'Go to Exam' : 'Complete face verification first'}
                        </button>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="flex min-h-screen bg-background-light dark:bg-background-dark font-display text-text-main transition-colors duration-200">
            <Sidebar />
            <div className="flex-1 overflow-auto">
                <div className="p-8">
                    <div className="max-w-6xl mx-auto">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h1 className="text-3xl font-black text-text-main">Pre-Exam Checks</h1>
                                <p className="text-sm text-text-muted font-medium mt-1">Complete these steps before starting your exam.</p>
                            </div>
                        </div>

                        {/* Stepper */}
                        <div className="bg-surface-light rounded-xl border border-[#e6e6dd] shadow-sm p-4 mb-6">
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                                {steps.map((step) => {
                                    const Icon = step.icon;
                                    const isActive = activeStep === step.key;
                                    const isDone = steps.findIndex(s => s.key === step.key) < steps.findIndex(s => s.key === activeStep);
                                    return (
                                        <div
                                            key={step.key}
                                            className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${isActive
                                                ? 'border-primary bg-[#f4f4e6]'
                                                : 'border-transparent'
                                                }`}
                                        >
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isActive ? 'bg-primary text-primary-content' : 'bg-[#e6e6dd] text-text-muted'
                                                }`}>
                                                {isDone ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                                            </div>
                                            <div className="text-sm">
                                                <p className="font-bold text-text-main">{step.label}</p>
                                                <p className="text-text-muted font-medium text-xs">{step.desc}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {renderStepContent()}
                    </div>
                </div>
            </div>
        </div>
    );
};
