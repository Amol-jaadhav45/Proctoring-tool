import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';

interface UseScreenMonitorProps {
    sessionId: string | null;
    onViolation?: (type: 'FULLSCREEN_EXIT') => void; // Optional, if we want to detect stop sharing
}

export const useScreenMonitor = ({ sessionId, onViolation }: UseScreenMonitorProps) => {
    const [stream, setStream] = useState<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const intervalRef = useRef<number | null>(null);

    useEffect(() => {
        const startScreenShare = async () => {
            try {
                const displayStream = await navigator.mediaDevices.getDisplayMedia({
                    video: { cursor: 'always' } as any, // Cast to any to avoid TS error with cursor property
                    audio: false
                });

                setStream(displayStream);

                // Create hidden video element to draw from
                const video = document.createElement('video');
                video.srcObject = displayStream;
                video.play();
                videoRef.current = video;

                // Handle user stopping share via browser UI
                displayStream.getVideoTracks()[0].onended = () => {
                    setStream(null);
                    if (onViolation) onViolation('FULLSCREEN_EXIT'); // Treat stop share as violation
                    alert("Screen sharing is required! Please restart screen sharing.");
                    // Ideally we'd force them to restart it
                };

            } catch (err) {
                console.error("Error starting screen share:", err);
                alert("Screen sharing is mandatory for this exam.");
            }
        };

        if (sessionId && !stream) {
            startScreenShare();
        }

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [sessionId]);

    // Periodic Screenshot Upload
    useEffect(() => {
        if (!sessionId || !stream || !videoRef.current) return;

        const captureAndUpload = async () => {
            if (!videoRef.current) return;

            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');

            if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0);

                canvas.toBlob(async (blob) => {
                    if (!blob) return;

                    const timestamp = Date.now();
                    const filename = `${sessionId}/screen_${timestamp}.jpg`;

                    try {
                        // Upload timestamped file
                        await supabase.storage
                            .from('exam-recordings')
                            .upload(filename, blob, {
                                contentType: 'image/jpeg',
                                upsert: false
                            });

                        // Upload 'latest.jpg' for easy access
                        const latestFilename = `${sessionId}/latest.jpg`;
                        await supabase.storage
                            .from('exam-recordings')
                            .upload(latestFilename, blob, {
                                contentType: 'image/jpeg',
                                upsert: true
                            });

                    } catch (err) {
                        console.error('Upload exception:', err);
                    }
                }, 'image/jpeg', 0.7); // 70% quality
            }
        };

        intervalRef.current = window.setInterval(captureAndUpload, 5000); // Every 5 seconds

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [sessionId, stream]);

    return { stream };
};
