import { useState, useRef, useCallback } from 'react';
import type { ViolationStatus } from '../utils/visionLogic';

export type ChallengeType = 'BLINK_EYES';

interface Challenge {
    type: ChallengeType;
    text: string;
    startTime: number;
}

interface UseLivenessChallengeProps {
    onSuccess?: () => void;
    onFailure?: () => void;
}


const BLINK_COUNT_REQUIRED = 2;
// const BLINK_WINDOW_MS = 5000;

export const useLivenessChallenge = ({ onSuccess, onFailure }: UseLivenessChallengeProps = {}) => {
    const [currentChallenge, setCurrentChallenge] = useState<Challenge | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const blinkCountRef = useRef<number>(0);
    const previousIsBlinkingRef = useRef<boolean>(false);


    const startChallenge = useCallback(() => {
        const randomType: ChallengeType = 'BLINK_EYES';
        const text = "Please BLINK your eyes twice quickly";

        const challenge: Challenge = {
            type: randomType,
            text,
            startTime: Date.now()
        };

        setCurrentChallenge(challenge);
        setMessage(text);

        // Fail if not completed in 12 seconds (more lenient)
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
            handleFailure();
        }, 12000);

    }, []);

    const stopChallenge = useCallback(() => {
        setCurrentChallenge(null);
        setMessage(null);
        blinkCountRef.current = 0;
        previousIsBlinkingRef.current = false;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }, []);

    const handleSuccess = useCallback(() => {
        // console.log("Challenge Success!");
        stopChallenge();
        if (onSuccess) onSuccess();
    }, [onSuccess, stopChallenge]);

    const handleFailure = useCallback(() => {
        // console.log("Challenge Failed!");
        stopChallenge();
        if (onFailure) onFailure();
    }, [onFailure, stopChallenge]);

    const verifyLiveness = useCallback((status: ViolationStatus) => {
        if (!currentChallenge) return;

        const { type } = currentChallenge;
        // const now = Date.now();

        // During liveness we accept the requested gaze
        let success = false;

        if (type === 'BLINK_EYES') {
            // Count completed blinks: transition from blinking -> not blinking = one blink
            const wasBlinking = previousIsBlinkingRef.current;
            const isBlinkingNow = status.isBlinking ?? false;

            if (wasBlinking && !isBlinkingNow) {
                blinkCountRef.current = Math.min(blinkCountRef.current + 1, BLINK_COUNT_REQUIRED);
            }
            previousIsBlinkingRef.current = isBlinkingNow;

            // Reset if challenge has been running too long
            // if (now - startTime > BLINK_WINDOW_MS) {
            //     blinkCountRef.current = 0;
            // }
            if (blinkCountRef.current >= BLINK_COUNT_REQUIRED) {
                success = true;
            }
        }

        if (success) {
            blinkCountRef.current = 0;
            previousIsBlinkingRef.current = false;
            handleSuccess();
        }
    }, [currentChallenge, handleSuccess]);

    // Auto-schedule challenges every variable interval (e.g. 1-2 minutes)
    // For demo/testing, let's do it more frequently or on mount?
    // Let's rely on parent to trigger startChallenge, or we can add a timer here.
    // Ideally, the ExamPage or WebcamFeed triggers it periodically.

    return {
        currentChallenge,
        message,
        startChallenge,
        stopChallenge,
        verifyLiveness
    };
};
