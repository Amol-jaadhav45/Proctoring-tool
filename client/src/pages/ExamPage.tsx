import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { WebcamFeed } from '../components/WebcamFeed';
import type { WebcamFeedHandle } from '../components/WebcamFeed';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useMediaPipe } from '../hooks/useMediaPipe';
import { useExamIntegrity } from '../hooks/useExamIntegrity';
import { useAudioMonitor } from '../hooks/useAudioMonitor';
import { useScreenMonitor } from '../hooks/useScreenMonitor';
import { useWebRTC } from '../hooks/useWebRTC';
import { useScreenRecorder } from '../hooks/useScreenRecorder';
import { useBrowserLockdown } from '../hooks/useBrowserLockdown';
import { useKeystrokeDynamics } from '../hooks/useKeystrokeDynamics';
import { usePhoneDetection } from '../hooks/usePhoneDetection';
import { captureViolationSnapshot } from '../utils/violationSnapshot';
import { AlertTriangle, Maximize, Loader2, Video, Flag, ArrowLeft, ArrowRight, School, Timer as TimerIcon, Volume2, MessageCircle } from 'lucide-react';
import { ProctorChat } from '../components/ProctorChat';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { examApi, violationApi, type Exam } from '../services/api';
import { VIOLATION_TYPES, type ViolationType } from '../constants/violationTypes';

export const ExamPage: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [exam, setExam] = useState<Exam | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [timeLeft, setTimeLeft] = useState(3600); // Will be set from exam data
    const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
    const [flaggedQuestions, setFlaggedQuestions] = useState<Set<number>>(new Set());
    const [violations, setViolations] = useState<{ message: string, severity: 'critical' | 'warning', timestamp: string, id: string }[]>([]);
    const violationTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
    const [userPhoto, setUserPhoto] = useState<string | null>(null);
    const [userName, setUserName] = useState<string>('Student');
    const [showSupportChat, setShowSupportChat] = useState(false);

    // Throttling for violations
    const lastViolationTimes = useRef<Map<ViolationType, number>>(new Map());
    const isCapturingSnapshot = useRef<boolean>(false);

    // Streams for WebRTC and Snapshots (using refs to avoid circular dependencies in handleViolation)
    const webcamStreamRef = useRef<MediaStream | null>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);
    const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);

    // Sync webcam ref
    useEffect(() => {
        webcamStreamRef.current = webcamStream;
    }, [webcamStream]);

    // Screen recording
    const { isRecording, startRecording, stopRecording } = useScreenRecorder();

    const updateCurrentQuestion = useMutation(api.sessions.updateCurrentQuestion);
    const updatePing = useMutation(api.sessions.updatePing);

    const handleViolation = useCallback(async (type: ViolationType, confidence?: number) => {
        const now = Date.now();
        const config = VIOLATION_TYPES[type];

        if (!config) {
            console.warn(`Unknown violation type: ${type}`);
            return;
        }

        // 1. Global Throttling Logic
        const lastTime = lastViolationTimes.current.get(type) || 0;
        let cooldown = 5000; // Default 5s between same violation type

        // Special cooldowns
        if (type === 'AUDIO_DETECTED') cooldown = 10000; // 10s for audio
        if (type === 'NO_FACE' || type === 'LOOKING_AWAY' || type === 'MULTIPLE_FACES') cooldown = 15000; // 15s for AI visuals
        if (type === 'FOCUS_LOST' || type === 'TAB_SWITCH') cooldown = 3000; // Faster for navigation

        if (now - lastTime < cooldown) {
            // Still in cooldown, skip logging
            return;
        }

        // Update last violation time
        lastViolationTimes.current.set(type, now);

        const violationId = `${type}-${now}`;
        const violationData = {
            id: violationId,
            message: config.message,
            severity: (config.severity === 'low' || config.severity === 'medium') ? 'warning' as const : 'critical' as const,
            timestamp: new Date().toLocaleTimeString()
        };

        setViolations(prev => [...prev, violationData]);

        // Auto-dismiss after 5 seconds for warnings, 10 seconds for critical
        const dismissDelay = violationData.severity === 'critical' ? 10000 : 5000;
        const timeoutId = setTimeout(() => {
            setViolations(prev => prev.filter(v => v.id !== violationId));
            violationTimeoutsRef.current.delete(violationId);
        }, dismissDelay);

        violationTimeoutsRef.current.set(violationId, timeoutId);

        const severity = config.severity;

        // Capture snapshot for critical violations (with concurrency control)
        if (sessionId && (severity === 'critical' || severity === 'high')) {
            if (isCapturingSnapshot.current) {
                console.log(`[ExamPage] Skipping snapshot for ${type} - capture already in progress`);
            } else {
                try {
                    isCapturingSnapshot.current = true;
                    await captureViolationSnapshot(
                        `exam-${id}`,
                        sessionId,
                        type,
                        {
                            violationType: type,
                            sessionId,
                            questionIndex: currentQuestionIndex,
                            timeRemaining: timeLeft,
                            confidence: confidence,
                        },
                        {
                            webcam: webcamStreamRef.current,
                            screen: screenStreamRef.current
                        }
                    );
                } catch (error) {
                    console.error('Failed to capture snapshot:', error);
                } finally {
                    isCapturingSnapshot.current = false;
                }
            }
        }

        // Log violation to backend
        if (sessionId) {
            try {
                await violationApi.log({
                    session_id: sessionId,
                    type,
                    severity,
                    confidence,
                });
            } catch (error) {
                console.error('Failed to log violation:', error);
            }
        }
    }, [sessionId, id, currentQuestionIndex, timeLeft]);

    // Sync current question index
    useEffect(() => {
        if (!sessionId) return;
        updateCurrentQuestion({ session_id: sessionId as Id<"exam_sessions">, question_index: currentQuestionIndex });
    }, [currentQuestionIndex, sessionId]);

    // Streams for WebRTC and Snapshots
    const { stream: screenStream } = useScreenMonitor({
        sessionId,
        onViolation: (type) => handleViolation(type)
    });

    // Sync screen ref
    useEffect(() => {
        screenStreamRef.current = screenStream || null;
    }, [screenStream]);

    const { compareFaces } = useMediaPipe();
    const lastVerificationTime = useRef<number>(0);
    const webcamRef = useRef<WebcamFeedHandle>(null);
    const livenessChallengeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Fetch user face photo and name
    useEffect(() => {
        const fetchUserData = async () => {
            if (!user) return;

            const { data } = await supabase
                .from('user_profiles')
                .select('face_photo, name')
                .eq('user_id', user.id)
                .single();

            if (data) {
                if (data.face_photo) {
                    setUserPhoto(data.face_photo);
                }
                if (data.name) {
                    setUserName(data.name);
                }
            }
        };

        fetchUserData();
    }, [user]);

    // Auto-start screen recording when exam starts
    useEffect(() => {
        if (sessionId && !isRecording) {
            startRecording().catch(err => {
                console.error('Failed to start recording:', err);
            });
        }

        // Stop recording when component unmounts or exam ends
        return () => {
            if (isRecording) {
                stopRecording();
            }
        };
    }, [sessionId]);

    // Fetch exam and start session
    useEffect(() => {
        const initExam = async () => {
            if (!id || !user) return;

            try {
                setLoading(true);
                const examData = await examApi.getById(id);
                setExam(examData);

                // Get extracted name and ID photo from session storage (set during verification)
                const extractedName = sessionStorage.getItem(`exam_${id}_extracted_name`) || undefined;
                const idPhoto = sessionStorage.getItem(`exam_${id}_id_photo`) || undefined;

                // Start or resume exam session with extracted data
                const session = await examApi.startSession(id, user.user_id, extractedName, idPhoto);
                setSessionId(session.id);

                // Clean up session storage
                sessionStorage.removeItem(`exam_${id}_extracted_name`);
                sessionStorage.removeItem(`exam_${id}_id_photo`);

                // Calculate remaining time
                const startedAt = new Date(session.started_at).getTime();
                const now = Date.now();
                const elapsedSeconds = Math.floor((now - startedAt) / 1000);
                const totalDurationSeconds = examData.duration_minutes * 60;
                const remaining = totalDurationSeconds - elapsedSeconds;

                if (remaining <= 0) {
                    alert("Exam time has expired! Submitting now.");
                    // Force submit logic here or redirect
                    navigate('/');
                } else {
                    setTimeLeft(remaining);
                }

                console.log(`Exam started at: ${session.started_at}, Elapsed: ${elapsedSeconds}s, Remaining: ${remaining}s`);

            } catch (error: any) {
                console.error('Error loading exam:', error);
                // Handle already completed error
                if (error.message && (error.message.includes("already submitted") || error.message.includes("already completed"))) {
                    alert('You have already completed this exam.');
                } else if (error.data && typeof error.data === 'string') {
                    // ConvexError data
                    alert(error.data);
                } else {
                    alert('Failed to load exam. ' + (error.message || ''));
                }
                navigate('/');
            } finally {
                setLoading(false);
            }
        };

        initExam();
    }, [id, user, navigate]);

    const { isFullscreen, enterFullscreen } = useExamIntegrity({ onViolation: (type) => handleViolation(type) });
    const { isTalking } = useAudioMonitor({ onViolation: () => handleViolation('AUDIO_DETECTED', 1.0) });

    // Browser lockdown
    useBrowserLockdown({
        disableRightClick: true,
        disableCopyPaste: true,
        disablePrint: true,
        disableDevTools: true,
        enforceFullscreen: true,
        onViolation: (type) => handleViolation(type as any, 1.0)
    });

    // Phone / secondary device must not be visible to camera during exam
    usePhoneDetection(
        () => webcamRef.current?.video ?? null,
        { onPhoneVisible: (conf) => handleViolation('PHONE_VISIBLE', conf), enabled: !!sessionId }
    );

    // Keystroke Dynamics
    useKeystrokeDynamics({
        onViolation: (type) => handleViolation(type)
    });
    // WebRTC Broadcasting
    // Combine Webcam + Screen into one stream (or just send screen if active)

    // Combine Webcam + Screen so proctor sees both camera and screen
    const combinedStream = React.useMemo(() => {
        if (!screenStream && !webcamStream) return null;

        const combined = new MediaStream();

        if (screenStream) {
            screenStream.getVideoTracks().forEach((track: MediaStreamTrack) => {
                // Explicitly tag this track as a screen track
                (track as any).isScreen = true;
                combined.addTrack(track);
            });
        }

        if (webcamStream) {
            webcamStream.getVideoTracks().forEach((track: MediaStreamTrack) => {
                // Ensure webcam tracks are NOT tagged as screen
                (track as any).isScreen = false;
                combined.addTrack(track);
            });
            webcamStream.getAudioTracks().forEach((track: MediaStreamTrack) => {
                combined.addTrack(track);
            });
        }

        return combined.getTracks().length > 0 ? combined : null;
    }, [screenStream, webcamStream]);

    useWebRTC({
        roomId: id || 'default-room',
        isBroadcaster: true,
        localStream: combinedStream,
        userId: user?.user_id ?? user?.id
    });

    const handleSubmitExam = async () => {
        if (!sessionId || !id) return;
        try {
            setLoading(true);
            await examApi.submitSession(id, sessionId, selectedAnswers);
            // Redirect to dashboard immediately after successful submission
            navigate('/', { replace: true });
        } catch (error) {
            console.error('Error submitting exam:', error);
            alert('Failed to submit exam. Please try again.');
            setLoading(false);
        }
    };

    // Real-time session status (paused by proctor / kicked)
    const convexSession = useQuery(
        api.sessions.getById,
        sessionId ? { id: sessionId as Id<'exam_sessions'> } : 'skip'
    );
    const sessionPaused = convexSession?.status === 'paused';
    const sessionKicked = convexSession?.status === 'completed' || convexSession?.status === 'terminated';

    useEffect(() => {
        if (sessionKicked) {
            const t = setTimeout(() => navigate('/', { replace: true }), 3000);
            return () => clearTimeout(t);
        }
    }, [sessionKicked, navigate]);

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    // Auto-submit when time is up
                    handleSubmitExam();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [sessionId, id]); // Added dependencies


    useEffect(() => {
        if (!userPhoto || !webcamRef.current) return;

        const verifyFace = async () => {
            const now = Date.now();
            if (now - lastVerificationTime.current < 5000) return; // Check every 5s

            // Access the video element exposed by WebcamFeed
            const videoElement = webcamRef.current?.video;
            if (videoElement && videoElement.readyState === 4) {
                // Create an image element from the userPhoto base64
                const refImage = new Image();
                refImage.src = userPhoto;
                await refImage.decode();

                const similarity = compareFaces(videoElement, refImage);
                // console.log("Face Similarity:", similarity);

                // Threshold for MobileNetV3 cosine similarity
                // Usually > 0.8 is a match, but let's be lenient for now
                if (similarity < 0.75) {
                    // Double check: if similarity is 0, it might mean no face detected by embedder or model not loaded
                    // We only flag if we are sure it's a mismatch (similarity > 0 but low)
                    if (similarity > 0) {
                        // For mismatch, lower similarity = higher confidence that it's NOT the intended user
                        const mismatchConfidence = Number((1 - similarity).toFixed(2));
                        handleViolation('USER_MISMATCH', mismatchConfidence);
                    }
                }
                lastVerificationTime.current = now;
            }
        };

        // Single check every 5s (matches throttle); no need for both setInterval and requestAnimationFrame
        const intervalId = setInterval(verifyFace, 5000);
        return () => clearInterval(intervalId);
    }, [userPhoto, compareFaces, handleViolation]);

    // Auto-start screen recording when exam starts & Schedule Liveness Challenges
    useEffect(() => {
        if (!sessionId) return;

        // Start screen recording
        if (!isRecording) {
            startRecording().catch(err => {
                console.error('Failed to start recording:', err);
            });
        }

        // Schedule Random Liveness Challenges
        const scheduleChallenge = (): ReturnType<typeof setTimeout> => {
            const minDelay = 60000; // 1 minute
            const maxDelay = 300000; // 5 minutes
            const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;

            return setTimeout(() => {
                // Check if webcam ref is available before triggering
                if (webcamRef.current?.triggerLivenessChallenge) {
                    webcamRef.current.triggerLivenessChallenge();
                }
                // Reschedule next challenge
                livenessChallengeTimeoutRef.current = scheduleChallenge();
            }, delay);
        };

        // First challenge sooner (30s) - only if webcam is ready
        const startFirstChallenge = () => {
            if (webcamRef.current?.triggerLivenessChallenge) {
                webcamRef.current.triggerLivenessChallenge();
                livenessChallengeTimeoutRef.current = scheduleChallenge();
            } else {
                // Retry after a short delay if webcam not ready
                livenessChallengeTimeoutRef.current = setTimeout(startFirstChallenge, 1000);
            }
        };

        // Start first challenge after 30 seconds
        livenessChallengeTimeoutRef.current = setTimeout(startFirstChallenge, 30000);

        // Cleanup function
        return () => {
            if (livenessChallengeTimeoutRef.current) {
                clearTimeout(livenessChallengeTimeoutRef.current);
                livenessChallengeTimeoutRef.current = null;
            }
            if (isRecording) {
                stopRecording();
            }
            // Clear all violation timeouts on unmount
            violationTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
            violationTimeoutsRef.current.clear();
        };
    }, [sessionId, isRecording, startRecording, stopRecording]);

    // Heartbeat (Ping) logic
    useEffect(() => {
        if (!sessionId) return;

        const sendPing = async () => {
            try {
                await updatePing({ session_id: sessionId as Id<"exam_sessions"> });
            } catch (err) {
                console.error('[Heartbeat] Failed to send ping:', err);
            }
        };

        // Send initial ping
        sendPing();

        // Send periodic pings
        const interval = setInterval(sendPing, 10000); // Every 10 seconds
        return () => clearInterval(interval);
    }, [sessionId, updatePing]);

    const toggleFlag = () => {
        setFlaggedQuestions(prev => {
            const next = new Set(prev);
            if (next.has(currentQuestionIndex)) {
                next.delete(currentQuestionIndex);
            } else {
                next.add(currentQuestionIndex);
            }
            return next;
        });
    };

    const handleSelectOption = (idx: number) => {
        setSelectedAnswers(prev => ({
            ...prev,
            [currentQuestionIndex]: idx
        }));
    };

    // Auto-save answers to Convex
    const saveAnswersMutation = useMutation((api.sessions as any).saveAnswers);
    useEffect(() => {
        if (!sessionId || Object.keys(selectedAnswers).length === 0) return;

        const syncAnswers = async () => {
            try {
                await saveAnswersMutation({
                    session_id: sessionId as Id<"exam_sessions">,
                    answers: selectedAnswers
                });
            } catch (err) {
                console.error('Failed to auto-save answers:', err);
            }
        };

        const timer = setTimeout(syncAnswers, 2000); // 2s debounce
        return () => clearTimeout(timer);
    }, [selectedAnswers, sessionId, saveAnswersMutation]);

    const minutesRemaining = Math.floor(timeLeft / 60);
    const secondsRemaining = timeLeft % 60;

    if (loading || !exam) {
        return (
            <div className="h-screen w-full flex flex-col items-center justify-center bg-background-light dark:bg-background-dark">
                <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                <p className="text-lg font-medium text-gray-600 dark:text-gray-400">Initializing Exam Session...</p>
            </div>
        );
    }

    return (
        <div className="bg-background-light dark:bg-background-dark text-[#0d141b] dark:text-white h-screen w-full flex flex-col overflow-hidden font-display">
            {/* Kicked by proctor */}
            {sessionKicked && (
                <div className="fixed inset-0 bg-black/90 z-[110] flex flex-col items-center justify-center text-white p-6 backdrop-blur-md">
                    <div className="bg-[#1a2632] p-10 rounded-2xl border border-red-500/50 flex flex-col items-center max-w-lg text-center shadow-2xl">
                        <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
                        <h2 className="text-xl font-bold mb-2">You have been removed from the exam</h2>
                        <p className="text-gray-400 mb-6">The proctor has ended your session. Redirecting to dashboard...</p>
                        <div className="text-sm text-gray-500">Redirecting in 3 seconds</div>
                    </div>
                </div>
            )}

            {/* Paused by proctor */}
            {sessionPaused && (
                <div className="fixed inset-0 bg-amber-950/80 z-[105] flex flex-col items-center justify-center text-white p-6 backdrop-blur-md">
                    <div className="bg-amber-900/95 p-10 rounded-2xl border border-amber-500/50 flex flex-col items-center max-w-lg text-center shadow-2xl">
                        <TimerIcon className="w-16 h-16 text-amber-400 mb-4" />
                        <h2 className="text-xl font-bold mb-2">Exam paused</h2>
                        <p className="text-amber-100">The proctor has paused your session. You cannot continue until the proctor resumes the exam.</p>
                        <p className="text-amber-200/80 text-sm mt-4">Please wait. Do not leave this page.</p>
                    </div>
                </div>
            )}

            {/* Integrity Warning Overlay */}
            {!isFullscreen && (
                <div className="fixed inset-0 bg-black/90 z-[100] flex flex-col items-center justify-center text-white p-6 backdrop-blur-md">
                    <div className="bg-[#1a2632] p-10 rounded-2xl border border-red-500/30 flex flex-col items-center max-w-lg text-center shadow-2xl">
                        <div className="size-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
                            <AlertTriangle className="w-10 h-10 text-red-500" />
                        </div>
                        <h2 className="text-3xl font-bold mb-4 tracking-tight">Full-Screen Mode Required</h2>
                        <p className="mb-8 text-gray-400 text-lg leading-relaxed">
                            To ensure exam integrity, you must remain in full-screen mode.
                            Unauthorized exits are logged and reported to the proctor.
                        </p>
                        <button
                            onClick={enterFullscreen}
                            className="bg-primary hover:bg-blue-600 text-white px-10 py-4 rounded-xl font-bold text-lg flex items-center gap-3 transition-all transform active:scale-95 shadow-xl shadow-blue-500/20"
                        >
                            <Maximize className="w-6 h-6" />
                            Return to Secure Mode
                        </button>
                    </div>
                </div>
            )}

            {/* Top Navigation / Header */}
            <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-[#e7edf3] dark:border-gray-800 bg-white dark:bg-[#1a2632] px-6 py-3 shrink-0 z-20 shadow-sm transition-colors relative">
                <div className="flex items-center gap-4 text-[#0d141b] dark:text-white">
                    <div className="size-10 flex items-center justify-center bg-primary/10 rounded-xl text-primary">
                        <School className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold leading-tight tracking-[-0.015em]">{exam.title}</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                            {exam.description || 'Proctored Examination Session'}
                        </p>
                    </div>
                </div>

                {/* Timer Component */}
                <div className="hidden md:flex items-center gap-3 bg-background-light dark:bg-[#101922] px-5 py-2 rounded-xl border border-[#e7edf3] dark:border-gray-700">
                    <TimerIcon className={`w-5 h-5 ${timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-gray-500 dark:text-gray-400'}`} />
                    <div className="flex items-center gap-1.5">
                        <div className="flex flex-col items-center min-w-[2.5rem]">
                            <span className={`text-xl font-bold leading-none ${timeLeft < 300 ? 'text-red-500' : 'text-primary'}`}>
                                {minutesRemaining.toString().padStart(2, '0')}
                            </span>
                            <span className="text-[10px] text-gray-500 uppercase font-bold leading-none mt-1">Min</span>
                        </div>
                        <span className="text-gray-300 font-bold mb-2">:</span>
                        <div className="flex flex-col items-center min-w-[2.5rem]">
                            <span className={`text-xl font-bold leading-none ${timeLeft < 300 ? 'text-red-500' : 'text-[#0d141b] dark:text-white'}`}>
                                {secondsRemaining.toString().padStart(2, '0')}
                            </span>
                            <span className="text-[10px] text-gray-500 uppercase font-bold leading-none mt-1">Sec</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* User Profile */}
                    <div className="flex items-center gap-3 border-r border-gray-200 dark:border-gray-700 pr-4 mr-1 hidden sm:flex">
                        <div
                            className="bg-center bg-no-repeat bg-cover rounded-full size-10 border-2 border-white dark:border-gray-700 shadow-sm"
                            style={{ backgroundImage: userPhoto ? `url(${userPhoto})` : `url(https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=137fec&color=fff)` }}
                        ></div>
                        <div className="flex flex-col">
                            <span className="text-sm font-bold leading-none">{userName}</span>
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium mt-1 uppercase tracking-wider">ID: {user?.id?.substring(0, 8) || 'N/A'}</span>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            if (window.confirm('Are you sure you want to final submit the exam?')) {
                                handleSubmitExam();
                            }
                        }}
                        className="flex cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 px-6 bg-primary hover:bg-blue-600 transition-all text-slate-50 text-sm font-bold leading-normal tracking-[0.015em] shadow-md shadow-blue-500/20 active:scale-95"
                    >
                        <span className="truncate">Submit Exam</span>
                    </button>
                </div>
            </header>

            {/* Main Layout */}
            <div className="flex flex-1 overflow-hidden relative bg-background-light dark:bg-background-dark">
                {/* Sidebar: Question Navigator */}
                <aside className="w-72 bg-background-light dark:bg-background-dark border-r border-[#e7edf3] dark:border-gray-800 flex flex-col shrink-0 z-10 hidden lg:flex transition-colors">
                    {/* Sidebar Header */}
                    <div className="p-6 border-b border-[#e7edf3] dark:border-gray-800 bg-white dark:bg-[#1a2632]">
                        <h3 className="font-bold text-[#0d141b] dark:text-white text-[11px] uppercase tracking-widest mb-4">Question Navigator</h3>
                        {/* Legend */}
                        <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-[10px] text-gray-600 dark:text-gray-400 font-bold">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded bg-primary"></div>
                                <span>CURRENT</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded bg-[#0d141b] dark:bg-gray-600"></div>
                                <span>ANSWERED</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded border border-gray-300 dark:border-gray-600"></div>
                                <span>UNANSWERED</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded bg-amber-400"></div>
                                <span>FLAGGED</span>
                            </div>
                        </div>
                    </div>

                    {/* Question Grid */}
                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-background-light dark:bg-background-dark">
                        <div className="grid grid-cols-5 gap-2.5">
                            {exam.questions.map((_, idx) => {
                                const isCurrent = currentQuestionIndex === idx;
                                const isAnswered = selectedAnswers.hasOwnProperty(idx);
                                const isFlagged = flaggedQuestions.has(idx);

                                let className = "aspect-square flex items-center justify-center rounded-lg text-xs font-bold transition-all transform active:scale-90 ";
                                if (isCurrent) {
                                    className += "bg-primary text-white shadow-lg shadow-blue-500/30 scale-105 z-10";
                                } else if (isAnswered) {
                                    className += "bg-[#0d141b] dark:bg-gray-700 text-white hover:opacity-85";
                                } else {
                                    className += "border border-[#e7edf3] dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800";
                                }

                                return (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentQuestionIndex(idx)}
                                        className={`${className} relative`}
                                    >
                                        {idx + 1}
                                        {isFlagged && (
                                            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full border-2 border-white dark:border-[#1a2632]"></div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Proctoring Status (Bottom of Sidebar) */}
                    <div className="p-4 border-t border-[#e7edf3] dark:border-gray-800 bg-white dark:bg-[#1a2632]">
                        <div className="mb-4 rounded-xl overflow-hidden bg-black aspect-video relative group shadow-inner border border-gray-200 dark:border-gray-700">
                            <WebcamFeed onViolation={handleViolation} onStreamReady={setWebcamStream} />
                            <div className="absolute inset-0 border-2 border-emerald-500/50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </div>

                        <div className="flex items-center gap-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 p-3 shadow-sm">
                            <div className="relative flex items-center justify-center size-6 shrink-0">
                                <span className={`absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 ${isRecording ? 'animate-ping' : ''}`}></span>
                                <span className="relative inline-flex rounded-full size-2.5 bg-emerald-500"></span>
                            </div>
                            <div>
                                <p className="text-[#0d141b] dark:text-emerald-100 text-xs font-bold leading-tight">Monitoring Active</p>
                                <p className={`text-[10px] mt-0.5 font-medium ${isTalking ? 'text-red-500 animate-pulse font-bold' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                    {isTalking ? 'Voice Detected' : 'Camera & Mic On'}
                                </p>
                            </div>
                            {isTalking ? (
                                <Volume2 className="w-5 h-5 text-red-500 animate-bounce ml-auto" />
                            ) : (
                                <Video className="w-5 h-5 text-emerald-600 dark:text-emerald-400 ml-auto" />
                            )}
                        </div>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto bg-background-light dark:bg-background-dark p-6 md:p-8 lg:p-12 flex justify-center custom-scrollbar transition-colors min-w-0">
                    <div className="w-full max-w-4xl flex flex-col gap-6 pb-20 min-w-0">
                        {/* Progress Bar */}
                        <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700/50 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary transition-all duration-500 ease-out shadow-[0_0_10px_rgba(19,127,236,0.3)]"
                                style={{ width: `${((currentQuestionIndex + 1) / exam.questions.length) * 100}%` }}
                            ></div>
                        </div>

                        {/* Question Card */}
                        <div className="bg-white dark:bg-[#1a2632] rounded-2xl shadow-sm border border-[#e7edf3] dark:border-gray-800 overflow-hidden flex flex-col transition-all duration-300 w-full">
                            {/* Question Header */}
                            <div className="px-8 py-6 border-b border-[#e7edf3] dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-white/2">
                                <h1 className="text-[#0d141b] dark:text-white tracking-tight text-xl md:text-2xl font-bold leading-tight">
                                    Question {currentQuestionIndex + 1} <span className="text-gray-400 font-normal text-lg ml-2">of {exam.questions.length}</span>
                                </h1>
                                <button
                                    onClick={toggleFlag}
                                    className={`group flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 ${flaggedQuestions.has(currentQuestionIndex)
                                        ? 'bg-amber-500 color-white'
                                        : 'text-gray-500 dark:text-gray-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:text-amber-600'
                                        }`}
                                >
                                    <Flag className={`w-5 h-5 ${flaggedQuestions.has(currentQuestionIndex) ? 'fill-current' : ''}`} />
                                    <span className="text-sm font-bold">{flaggedQuestions.has(currentQuestionIndex) ? 'Flagged' : 'Flag for Review'}</span>
                                </button>
                            </div>

                            {/* Question Body */}
                            <div className="p-8 md:p-10">
                                <div className="prose dark:prose-invert max-w-none mb-10">
                                    <p className="text-[#0d141b] dark:text-gray-200 text-[19px] font-normal leading-relaxed">
                                        {exam.questions[currentQuestionIndex].question}
                                    </p>
                                </div>

                                {/* Dynamic Media Area */}
                                {exam.questions[currentQuestionIndex].image && (
                                    <div className="my-8 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700/50 max-w-2xl bg-gray-50 dark:bg-gray-800/20 group">
                                        <div
                                            className="bg-center bg-no-repeat bg-cover aspect-video w-full opacity-90 group-hover:opacity-100 transition-all cursor-pointer relative"
                                            style={{ backgroundImage: `url(${exam.questions[currentQuestionIndex].image})` }}
                                        >
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/10 transition-colors">
                                                <div className="bg-white/20 backdrop-blur-md p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all scale-75 group-hover:scale-100">
                                                    <Maximize className="w-6 h-6 text-white" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="px-4 py-2 text-[11px] text-gray-500 dark:text-gray-400 text-center font-bold tracking-wider bg-white dark:bg-[#1a2632] border-t border-gray-100 dark:border-gray-700/50 grayscale group-hover:grayscale-0 transition-all">
                                            REFERENCE FIGURE
                                        </div>
                                    </div>
                                )}

                                {/* Answer Options */}
                                <div className="flex flex-col gap-4">
                                    {exam.questions[currentQuestionIndex].options.map((option: string, idx: number) => {
                                        const isSelected = selectedAnswers[currentQuestionIndex] === idx;
                                        return (
                                            <label
                                                key={idx}
                                                className={`relative flex items-center p-5 rounded-2xl border-2 transition-all group cursor-pointer ${isSelected
                                                    ? 'border-primary bg-primary/5 shadow-md shadow-blue-500/5'
                                                    : 'border-transparent bg-gray-50/50 dark:bg-[#101922] hover:bg-gray-100 dark:hover:bg-gray-800'
                                                    }`}
                                            >
                                                <input
                                                    type="radio"
                                                    className="sr-only"
                                                    name={`q-${currentQuestionIndex}`}
                                                    checked={isSelected}
                                                    onChange={() => handleSelectOption(idx)}
                                                />
                                                <div className={`size-6 rounded-full border-2 flex items-center justify-center transition-all mr-5 shrink-0 ${isSelected ? 'border-primary' : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
                                                    }`}>
                                                    {isSelected && <div className="size-3 rounded-full bg-primary animate-in zoom-in-50 duration-200"></div>}
                                                </div>
                                                <span className={`text-[17px] font-medium transition-colors ${isSelected ? 'text-primary' : 'text-[#0d141b] dark:text-gray-300 group-hover:text-black dark:group-hover:text-white'
                                                    }`}>
                                                    <span className="font-bold mr-3 opacity-50">{String.fromCharCode(65 + idx)}.</span>
                                                    {option}
                                                </span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Footer / Navigation */}
                            <div className="px-8 py-6 bg-white dark:bg-[#1a2632] border-t border-[#e7edf3] dark:border-gray-800 flex justify-between items-center sticky bottom-0 z-10">
                                <button
                                    onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                                    disabled={currentQuestionIndex === 0}
                                    className="flex items-center gap-2.5 px-6 py-3 rounded-xl border-2 border-gray-100 dark:border-gray-700 text-[#0d141b] dark:text-white font-bold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-all disabled:opacity-30 disabled:cursor-not-allowed group"
                                >
                                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                                    <span>Previous</span>
                                </button>

                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={toggleFlag}
                                        className="md:hidden p-3 rounded-xl border-2 border-gray-100 dark:border-gray-700 text-amber-500 hover:bg-amber-50"
                                    >
                                        <Flag className={`w-5 h-5 ${flaggedQuestions.has(currentQuestionIndex) ? 'fill-current' : ''}`} />
                                    </button>

                                    {currentQuestionIndex === exam.questions.length - 1 ? (
                                        <button
                                            onClick={() => {
                                                if (window.confirm('Are you sure you want to final submit the exam?')) {
                                                    handleSubmitExam();
                                                }
                                            }}
                                            className="flex items-center gap-2 px-10 py-3 rounded-xl bg-green-600 text-white font-bold text-sm hover:bg-green-700 shadow-lg shadow-green-500/20 transition-all transform active:scale-95"
                                        >
                                            <span>Submit Exam</span>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => setCurrentQuestionIndex(prev => Math.min(exam.questions.length - 1, prev + 1))}
                                            className="flex items-center gap-3 px-10 py-3 rounded-xl bg-primary text-white font-bold text-sm hover:bg-blue-600 shadow-lg shadow-blue-500/20 transition-all transform active:scale-95 group"
                                        >
                                            <span>Next Question</span>
                                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Subtle Context Tip */}
                        <div className="text-center px-10">
                            <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed max-w-lg mx-auto">
                                <span className="font-bold text-gray-500 dark:text-gray-400">Pro Tip:</span> Answers are saved automatically in real-time. Use the Question Navigator sidebar to jump back to any question before final submission.
                            </p>
                        </div>
                    </div>
                </main>
            </div>


            {/* Violation Toast (Floating) */}
            {violations.length > 0 && (
                <div className="fixed bottom-28 right-6 z-50 flex flex-col gap-3 pointer-events-none">
                    {violations.slice(-3).map((v) => (
                        <div
                            key={v.id}
                            className="animate-in slide-in-from-right-10 duration-500 bg-red-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/20 backdrop-blur-lg"
                        >
                            <AlertTriangle className="w-6 h-6 shrink-0" />
                            <div>
                                <p className="font-bold text-sm leading-tight">{v.message}</p>
                                <p className="text-[10px] opacity-80 font-medium uppercase mt-1 tracking-widest">{v.timestamp}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Student support chat (same room as proctor for 2-way messages) */}
            {id && user && (
                <>
                    <button
                        type="button"
                        onClick={() => setShowSupportChat(!showSupportChat)}
                        className="fixed bottom-6 right-6 z-40 flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-content shadow-lg hover:bg-blue-600 transition-colors"
                        title="Support chat"
                    >
                        <MessageCircle className="w-6 h-6" />
                    </button>
                    <ProctorChat
                        roomId={id}
                        userId={user.user_id}
                        userName={userName}
                        userType="student"
                        isOpen={showSupportChat}
                        onClose={() => setShowSupportChat(false)}
                    />
                </>
            )}
        </div>
    );
};
