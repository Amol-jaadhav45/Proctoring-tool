import { useEffect, useRef } from 'react';

interface KeystrokeDynamicsOptions {
    onViolation: (type: 'RAPID_INPUT' | 'BOT_LIKE_TYPING') => void;
}

export const useKeystrokeDynamics = ({ onViolation }: KeystrokeDynamicsOptions) => {
    const lastKeyUpTime = useRef<number>(0);
    const lastKeyDownTime = useRef<number>(0);
    const keyPressCount = useRef<number>(0);
    const startTime = useRef<number>(0);

    // Buffer to store recent inter-key latencies (flight times)
    const flightTimes = useRef<number[]>([]);
    // Buffer to store dwell times (key press duration)
    const dwellTimes = useRef<number[]>([]);
    const FLIGHT_TIME_BUFFER_SIZE = 10;
    const DWELL_TIME_BUFFER_SIZE = 10;

    // Helper function to calculate variance
    const calculateVariance = (values: number[]): number => {
        if (values.length === 0) return 0;
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
        return squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
    };

    // Helper function to check for uniform patterns (bot-like behavior)
    const detectUniformPattern = (values: number[], maxVariance: number): boolean => {
        if (values.length < FLIGHT_TIME_BUFFER_SIZE) return false;
        const variance = calculateVariance(values);
        return variance < maxVariance;
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const now = Date.now();

            // Ignore modifying keys
            if (['Shift', 'Control', 'Alt', 'Meta', 'Tab'].includes(e.key)) return;

            // Dwell time start
            lastKeyDownTime.current = now;

            // Check for Rapid Input (Burst) and Bot-like typing
            // If flight time is extremely low consistently
            if (lastKeyUpTime.current > 0) {
                const flightTime = now - lastKeyUpTime.current;

                flightTimes.current.push(flightTime);
                if (flightTimes.current.length > FLIGHT_TIME_BUFFER_SIZE) {
                    flightTimes.current.shift();
                }

                // Analyze recent flight times
                if (flightTimes.current.length === FLIGHT_TIME_BUFFER_SIZE) {
                    const avgFlightTime = flightTimes.current.reduce((a, b) => a + b, 0) / FLIGHT_TIME_BUFFER_SIZE;

                    // Human limit is roughly 20-30ms flight time for fastest typists. 
                    // < 10ms consistently is suspicious (macro/script).
                    if (avgFlightTime < 10) {
                        onViolation('RAPID_INPUT');
                        flightTimes.current = []; // Reset buffer
                        return;
                    }


                    // Bot Detection: Check for uniform timing patterns
                    if (detectUniformPattern(flightTimes.current, 5)) {
                        // Uniform pattern detected - likely bot
                        onViolation('BOT_LIKE_TYPING');
                        flightTimes.current = []; // Reset buffer
                        dwellTimes.current = []; // Reset dwell times too
                        return;
                    }
                }
            }

            keyPressCount.current += 1;
            if (startTime.current === 0) startTime.current = now;
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            const now = Date.now();
            lastKeyUpTime.current = now;

            // Track dwell time (key press duration)
            if (lastKeyDownTime.current > 0) {
                const dwellTime = now - lastKeyDownTime.current;

                // Only track meaningful dwell times (ignore modifier keys)
                if (!['Shift', 'Control', 'Alt', 'Meta', 'Tab'].includes(e.key)) {
                    dwellTimes.current.push(dwellTime);
                    if (dwellTimes.current.length > DWELL_TIME_BUFFER_SIZE) {
                        dwellTimes.current.shift();
                    }

                    // Check for uniform dwell times (bot characteristic)
                    if (detectUniformPattern(dwellTimes.current, 3)) {
                        onViolation('BOT_LIKE_TYPING');
                        flightTimes.current = []; // Reset buffers
                        dwellTimes.current = [];
                    }
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('keyup', handleKeyUp);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('keyup', handleKeyUp);
        };
    }, [onViolation]);

    return {};
};
