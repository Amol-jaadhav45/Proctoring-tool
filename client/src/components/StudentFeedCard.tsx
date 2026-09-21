import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { MoreVertical, UserX, PauseCircle, PlayCircle, MonitorOff } from 'lucide-react';

export interface StudentFeedCardProps {
    studentName: string;
    studentId: string;
    status: 'ok' | 'warning' | 'alert';
    imageUrl?: string;
    hasAudio: boolean;
    isScreenSharing: boolean;
    screenUrl?: string;
    stream?: MediaStream;
    screenStream?: MediaStream; // Separate screen sharing stream
    alertMessage?: string;
    isConnected?: boolean;
    violationCount?: number;
    onClick?: () => void;
    /** Proctor actions: session id and status for kick/pause */
    sessionId?: string;
    sessionStatus?: 'active' | 'paused';
    onKick?: (sessionId: string) => void;
    onPauseResume?: (sessionId: string, pause: boolean) => void;
}

export const StudentFeedCard: React.FC<StudentFeedCardProps> = ({
    studentName,
    studentId,
    status,
    imageUrl,
    hasAudio,
    isScreenSharing,
    screenUrl,
    stream,
    screenStream,
    alertMessage,
    isConnected,
    violationCount = 0,
    onClick,
    sessionId,
    sessionStatus = 'active',
    onKick,
    onPauseResume,
}) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const mainVideoRef = useRef<HTMLVideoElement>(null);
    const pipVideoRef = useRef<HTMLVideoElement>(null);
    // State to force re-render when tracks are added/removed
    const [trackVersion, setTrackVersion] = useState(0);

    // Listen for track changes on the stream object itself
    useEffect(() => {
        if (!stream) return;

        const handleTrackChange = () => {
            console.log(`[StudentFeedCard] ${studentName}: Track change detected (add/remove)`);
            setTrackVersion(v => v + 1);
        };

        stream.addEventListener('addtrack', handleTrackChange);
        stream.addEventListener('removetrack', handleTrackChange);

        return () => {
            stream.removeEventListener('addtrack', handleTrackChange);
            stream.removeEventListener('removetrack', handleTrackChange);
        };
    }, [stream, studentName]);

    // Robustly identify and split tracks using useMemo
    const { webcamStream: localWebcamStream, screenStream: localScreenStream } = React.useMemo(() => {
        if (screenStream) {
            return {
                webcamStream: stream || null,
                screenStream: screenStream
            };
        }

        if (!stream) return { webcamStream: null, screenStream: null };

        const videoTracks = stream.getVideoTracks();
        const audioTracks = stream.getAudioTracks();

        console.log(`[StudentFeedCard] ${studentName}: Computing split streams (v:${trackVersion}). vTracks: ${videoTracks.length}`);

        if (videoTracks.length === 0) {
            return { webcamStream: new MediaStream(audioTracks), screenStream: null };
        }

        // Identification Heuristics
        // 1. Explicit 'isScreen' flag (set by sfu-service/broadcaster)
        // 2. Label check
        // 3. Resolution check (secondary, heuristic-based)

        let screenTrack = videoTracks.find((t: any) => t.isScreen === true) ||
            videoTracks.find((t: any) => /screen|display|window|desktop/i.test(t.label));

        let camTrack = videoTracks.find(t => t !== screenTrack && !(t as any).isScreen) ||
            (screenTrack ? videoTracks.find(t => t !== screenTrack) : videoTracks[0]);

        // If we still didn't find a screen track but have 2+ tracks, pick the other one
        if (!screenTrack && videoTracks.length > 1) {
            screenTrack = videoTracks.find(t => t !== camTrack);
        }

        const finalWebcam = camTrack ? new MediaStream([camTrack, ...audioTracks]) : new MediaStream(audioTracks);
        const finalScreen = screenTrack ? new MediaStream([screenTrack]) : null;

        return { webcamStream: finalWebcam, screenStream: finalScreen };
    }, [stream, screenStream, trackVersion, studentName]);

    // Keep video srcObject in sync when stream arrives or changes
    const mainStream = localScreenStream || localWebcamStream;
    useEffect(() => {
        const video = mainVideoRef.current;
        if (!video) return;

        if (video.srcObject !== mainStream) {
            video.srcObject = mainStream || null;
        }

        if (mainStream && mainStream.active) {
            video.play().catch(err => {
                if (err.name !== 'AbortError') {
                    console.warn(`[StudentFeedCard] Failed to play main video for ${studentName}:`, err);
                }
            });
        }
    }, [mainStream, studentName]);

    useEffect(() => {
        const video = pipVideoRef.current;
        if (!video) return;

        if (video.srcObject !== localWebcamStream) {
            video.srcObject = localWebcamStream || null;
        }

        if (localWebcamStream && localWebcamStream.active && localWebcamStream.getVideoTracks().length > 0) {
            video.play().catch(err => {
                if (err.name !== 'AbortError') {
                    console.warn(`[StudentFeedCard] Failed to play PiP video for ${studentName}:`, err);
                }
            });
        }
    }, [localWebcamStream, studentName]);

    useEffect(() => {
        if (!menuOpen) return;
        const close = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
        };
        document.addEventListener('click', close);
        return () => document.removeEventListener('click', close);
    }, [menuOpen]);
    const statusColors = {
        ok: 'border-green-500',
        warning: 'border-yellow-500',
        alert: 'border-red-500'
    };

    const statusBgColors = {
        ok: 'bg-green-500/80',
        warning: 'bg-yellow-500/80',
        alert: 'bg-red-500/80'
    };

    const statusIcons = {
        ok: '✓',
        warning: '⚠',
        alert: '✕'
    };

    const statusText = {
        ok: 'OK',
        warning: 'WARNING',
        alert: 'ALERT'
    };

    const showActions = sessionId && (onKick || onPauseResume);

    return (
        <div
            className={clsx(
                "flex flex-col rounded-xl overflow-hidden border-2 bg-white transition-transform hover:scale-[1.02] shadow-sm relative",
                statusColors[status],
                onClick && "cursor-pointer"
            )}
            onClick={onClick}
        >
            <div className="relative aspect-video bg-black group">
                {/* Main View: Screen Share Stream (priority) */}
                {localScreenStream ? (
                    <video
                        ref={mainVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="h-full w-full object-contain"
                    />
                ) : localWebcamStream ? (
                    <video
                        ref={mainVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="h-full w-full object-cover"
                    />
                ) : imageUrl ? (
                    <div className="h-full w-full relative">
                        <img
                            alt={`Profile of ${studentName}`}
                            className="h-full w-full object-cover blur-[2px] opacity-40 grayscale"
                            src={imageUrl}
                            onError={(e) => {
                                // Fallback for broken image
                                e.currentTarget.style.display = 'none';
                            }}
                        />
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/60 text-gray-400">
                            <MonitorOff className="w-10 h-10 mb-2 opacity-30" />
                            <span className="text-[10px] font-bold uppercase tracking-wider opacity-50">No Signal / Offline</span>
                        </div>
                    </div>
                ) : (
                    <div className="h-full w-full flex flex-col items-center justify-center bg-gray-900 text-gray-600">
                        <MonitorOff className="w-10 h-10 mb-2 opacity-20" />
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-40">No Signal</span>
                    </div>
                )}

                {/* PiP View: Webcam (if screen share is active) */}
                {(localScreenStream || screenUrl) && localWebcamStream && localWebcamStream.getVideoTracks().length > 0 && (
                    <div className="absolute bottom-2 right-2 w-1/3 aspect-video rounded-lg overflow-hidden border border-white/20 shadow-lg bg-black">
                        <video
                            ref={pipVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className="h-full w-full object-cover"
                        />
                    </div>
                )}

                <div className={clsx(
                    "absolute top-2 left-2 flex items-center gap-1.5 text-white text-xs font-semibold px-2 py-1 rounded-full",
                    statusBgColors[status],
                    status === 'warning' && 'text-gray-900'
                )}>
                    <span className="text-sm">{statusIcons[status]}</span>
                    {statusText[status]}
                </div>

                {/* Connection Status + Proctor Actions */}
                <div className="absolute top-2 right-2 flex items-center gap-1.5 z-20">
                    {sessionStatus === 'paused' && (
                        <span className="text-white text-xs font-semibold px-2 py-1 rounded-full bg-amber-500/90">
                            PAUSED
                        </span>
                    )}
                    <div className={clsx(
                        "flex items-center gap-1.5 text-white text-xs font-semibold px-2 py-1 rounded-full",
                        isConnected ? 'bg-green-500/80' : 'bg-red-500/80'
                    )}>
                        <span className={clsx(
                            "w-2 h-2 rounded-full",
                            isConnected ? 'bg-green-300 animate-pulse' : 'bg-red-300'
                        )}></span>
                        {isConnected ? 'ONLINE' : 'OFFLINE'}
                    </div>
                    {showActions && (
                        <div className="relative" ref={menuRef}>
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setMenuOpen((o) => !o); }}
                                className="p-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white"
                                title="Proctor actions"
                            >
                                <MoreVertical className="w-4 h-4" />
                            </button>
                            {menuOpen && (
                                <div className="absolute right-0 top-full mt-1 py-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 z-30 text-left">
                                    {onPauseResume && (
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onPauseResume(sessionId!, sessionStatus === 'active'); }}
                                            className="w-full px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                                        >
                                            {sessionStatus === 'paused' ? <PlayCircle className="w-4 h-4 text-green-600" /> : <PauseCircle className="w-4 h-4 text-amber-600" />}
                                            {sessionStatus === 'paused' ? 'Resume' : 'Pause'}
                                        </button>
                                    )}
                                    {onKick && (
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onKick(sessionId!); }}
                                            className="w-full px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 flex items-center gap-2"
                                        >
                                            <UserX className="w-4 h-4" />
                                            Kick student
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Violation Count Badge */}
                {violationCount > 0 && (
                    <div className="absolute top-12 right-2 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 z-10 shadow-lg">
                        <span>⚠</span>
                        {violationCount}
                    </div>
                )}

                {alertMessage && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-2 truncate">
                        {alertMessage}
                    </div>
                )}
            </div>

            <div className="p-3 bg-white">
                <p className="font-semibold text-sm text-gray-900">
                    {studentName} <span className="text-gray-600 font-normal">(ID: {studentId.slice(0, 8)}...)</span>
                </p>
                <div className="flex items-center gap-3 text-gray-600 mt-1">
                    <span
                        className={clsx("text-lg", isScreenSharing ? "text-blue-600" : "opacity-50")}
                        title={isScreenSharing ? "Screen sharing active" : "Screen sharing inactive"}
                    >
                        🖥️
                    </span>
                    <span
                        className={clsx(
                            "text-lg",
                            hasAudio ? "text-green-600" : "text-red-600"
                        )}
                        title={hasAudio ? "Audio on" : "Audio off"}
                    >
                        {hasAudio ? '🎤' : '🔇'}
                    </span>
                    {violationCount > 0 && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-semibold">
                            {violationCount} violation{violationCount !== 1 ? 's' : ''}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};
