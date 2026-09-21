import { useEffect, useRef, useCallback } from 'react';

const CHECK_INTERVAL_MS = 8000;
const VIOLATION_THROTTLE_MS = 15000;
const PHONE_CONFIDENCE = 0.5;

type ObjectDetection = { class?: string; className?: string; score: number };

/**
 * Runs COCO-SSD object detection on the webcam video and calls onPhoneVisible
 * when a cell phone is detected (phones must not be visible to camera during exam).
 */
export function usePhoneDetection(
    getVideo: () => HTMLVideoElement | null,
    options: { onPhoneVisible: (confidence?: number) => void; enabled?: boolean }
) {
    const { onPhoneVisible, enabled = true } = options;
    const lastViolationTime = useRef<number>(0);
    const modelRef = useRef<{ detect: (input: HTMLVideoElement) => Promise<ObjectDetection[]> } | null>(null);
    const loadingRef = useRef<boolean>(false);

    const runDetection = useCallback(async () => {
        const video = getVideo();
        if (!video || video.readyState !== 4 || !enabled) return;

        let model = modelRef.current;
        if (!model) {
            if (loadingRef.current) return;
            loadingRef.current = true;
            try {
                const cocoSsd = await import('@tensorflow-models/coco-ssd');
                model = await cocoSsd.load();
                modelRef.current = model;
            } catch (e) {
                console.warn('Phone detection model failed to load:', e);
                loadingRef.current = false;
                return;
            } finally {
                loadingRef.current = false;
            }
        }

        try {
            const predictions = await model!.detect(video);
            const phonePrediction = predictions.find(
                (p: ObjectDetection) =>
                    (p.class === 'cell phone' || p.className === 'cell phone') &&
                    p.score >= PHONE_CONFIDENCE
            );
            if (phonePrediction) {
                const now = Date.now();
                if (now - lastViolationTime.current >= VIOLATION_THROTTLE_MS) {
                    lastViolationTime.current = now;
                    onPhoneVisible(phonePrediction.score);
                }
            }
        } catch (e) {
            // Ignore per-frame errors (e.g. video size 0)
        }
    }, [getVideo, enabled, onPhoneVisible]);

    useEffect(() => {
        if (!enabled) return;
        const id = setInterval(runDetection, CHECK_INTERVAL_MS);
        return () => clearInterval(id);
    }, [enabled, runDetection]);
}
