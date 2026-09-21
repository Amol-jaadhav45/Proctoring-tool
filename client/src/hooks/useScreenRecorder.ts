import { useState, useRef, useCallback } from 'react';

interface UseScreenRecorderReturn {
    isRecording: boolean;
    startRecording: () => Promise<void>;
    stopRecording: () => Promise<Blob | null>;
    pauseRecording: () => void;
    resumeRecording: () => void;
    error: string | null;
}

export const useScreenRecorder = (): UseScreenRecorderReturn => {
    const [isRecording, setIsRecording] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);

    const startRecording = useCallback(async () => {
        try {
            setError(null);
            chunksRef.current = [];

            // Get screen and audio
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: { mediaSource: 'screen' } as any,
                audio: true
            });

            // Get webcam stream
            const webcamStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false
            });

            // Combine streams
            const combinedStream = new MediaStream();
            screenStream.getVideoTracks().forEach(track => combinedStream.addTrack(track));
            screenStream.getAudioTracks().forEach(track => combinedStream.addTrack(track));
            webcamStream.getVideoTracks().forEach(track => combinedStream.addTrack(track));

            streamRef.current = combinedStream;

            // Create MediaRecorder
            const options: MediaRecorderOptions = {
                mimeType: 'video/webm;codecs=vp9,opus',
                videoBitsPerSecond: 2500000 // 2.5 Mbps
            };

            // Fallback to default if codec not supported
            if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
                options.mimeType = 'video/webm';
            }

            const mediaRecorder = new MediaRecorder(combinedStream, options);
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                // Stop all tracks
                combinedStream.getTracks().forEach(track => track.stop());
                screenStream.getTracks().forEach(track => track.stop());
                webcamStream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start(1000); // Collect data every second
            setIsRecording(true);

            // Handle screen sharing stop
            screenStream.getVideoTracks()[0].onended = () => {
                if (isRecording) {
                    stopRecording();
                }
            };
        } catch (err: any) {
            setError(err.message || 'Failed to start recording');
            console.error('Screen recording error:', err);
        }
    }, []);

    const stopRecording = useCallback(async (): Promise<Blob | null> => {
        return new Promise((resolve) => {
            if (!mediaRecorderRef.current || !isRecording) {
                resolve(null);
                return;
            }

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'video/webm' });
                setIsRecording(false);
                chunksRef.current = [];
                resolve(blob);
            };

            mediaRecorderRef.current.stop();
        });
    }, [isRecording]);

    const pauseRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.pause();
        }
    }, [isRecording]);

    const resumeRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.resume();
        }
    }, [isRecording]);

    return {
        isRecording,
        startRecording,
        stopRecording,
        pauseRecording,
        resumeRecording,
        error
    };
};





