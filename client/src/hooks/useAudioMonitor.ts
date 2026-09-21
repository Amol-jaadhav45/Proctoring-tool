import { useEffect, useState, useRef } from 'react';

interface AudioMonitorOptions {
    onViolation: (confidence?: number) => void;
    threshold?: number; // RMS threshold, default 0.05
}

export const useAudioMonitor = ({ onViolation, threshold = 0.15 }: AudioMonitorOptions) => {
    const [isTalking, setIsTalking] = useState(false);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const filterRef = useRef<BiquadFilterNode | null>(null);
    const requestRef = useRef<number>(0);
    const speechRunCount = useRef<number>(0);
    const lastViolationTime = useRef<number>(0);

    // For speaker counting - track voice activity patterns
    const voiceActivityHistory = useRef<number[]>([]);
    const VOICE_HISTORY_SIZE = 50; // Track last 50 samples (~1 second at 50fps)

    const SILENCE_THRESHOLD_MS = 500; // 500ms of silence before stopping talking
    const lastSpeakTime = useRef<number>(0);

    useEffect(() => {
        const startAudio = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

                const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
                const audioContext = new AudioContextClass();

                if (audioContext.state === 'suspended') {
                    await audioContext.resume();
                }

                const analyser = audioContext.createAnalyser();
                analyser.fftSize = 512;

                const filter = audioContext.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.value = 1850;
                filter.Q.value = 1.22;

                const source = audioContext.createMediaStreamSource(stream);
                source.connect(filter);
                filter.connect(analyser);

                audioContextRef.current = audioContext;
                analyserRef.current = analyser;
                sourceRef.current = source;
                filterRef.current = filter;

                const bufferLength = analyser.frequencyBinCount;
                const dataArray = new Float32Array(bufferLength);

                const checkAudioActivity = () => {
                    if (!analyserRef.current) return;

                    analyserRef.current.getFloatTimeDomainData(dataArray);

                    let sumSquares = 0;
                    for (let i = 0; i < bufferLength; i++) {
                        sumSquares += dataArray[i] * dataArray[i];
                    }
                    const rms = Math.sqrt(sumSquares / bufferLength);

                    voiceActivityHistory.current.push(rms);
                    if (voiceActivityHistory.current.length > VOICE_HISTORY_SIZE) {
                        voiceActivityHistory.current.shift();
                    }



                    // Improved adaptive threshold calculation
                    const avgNoise = voiceActivityHistory.current
                        .slice(0, Math.floor(VOICE_HISTORY_SIZE * 0.5))
                        .reduce((a, b) => a + b, 0) / Math.floor(VOICE_HISTORY_SIZE * 0.5);

                    const adaptiveThreshold = Math.max(threshold, avgNoise * 2.5);

                    // More accurate speech detection
                    if (rms > adaptiveThreshold) {
                        speechRunCount.current += 1;
                        // Require sustained speech for 8 frames (~160ms at 50fps) before flagging
                        if (speechRunCount.current > 8) {
                            setIsTalking(true);
                            lastSpeakTime.current = Date.now();
                        }
                    } else {
                        // Reset counter gradually to avoid false negatives
                        if (speechRunCount.current > 0) {
                            speechRunCount.current = Math.max(0, speechRunCount.current - 2);
                        }
                        // Only stop talking if it's been silent for longer than SILENCE_THRESHOLD_MS
                        if (Date.now() - lastSpeakTime.current > SILENCE_THRESHOLD_MS) {
                            setIsTalking(false);
                        }
                    }

                    requestRef.current = requestAnimationFrame(checkAudioActivity);
                };

                checkAudioActivity();

            } catch (err) {
                console.error("Error accessing microphone:", err);
            }
        };

        const handleUserInteraction = () => {
            if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
                audioContextRef.current.resume();
            }
        };
        document.addEventListener('click', handleUserInteraction);

        startAudio();

        return () => {
            document.removeEventListener('click', handleUserInteraction);
            if (audioContextRef.current) audioContextRef.current.close();
            if (sourceRef.current) sourceRef.current.disconnect();
            if (filterRef.current) filterRef.current.disconnect();
            cancelAnimationFrame(requestRef.current);
        };
    }, [threshold]);

    useEffect(() => {
        if (isTalking) {
            const handler = setTimeout(() => {
                const now = Date.now();
                if (now - lastViolationTime.current > 5000) { // Throttle audio violations to once every 5s
                    lastViolationTime.current = now;
                    console.log("[useAudioMonitor] Sustained speech detected, triggering violation");
                    onViolation(1.0);
                }
            }, 1500); // 1.5s of sustained speech before triggering violation
            return () => clearTimeout(handler);
        }
    }, [isTalking, onViolation]);

    return { isTalking };
};
