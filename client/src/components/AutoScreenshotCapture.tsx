import React, { useState, useEffect, useRef } from 'react';
import { Camera, Download, Clock, CheckCircle } from 'lucide-react';

export interface ViolationScreenshot {
    id: string;
    studentId: string;
    studentName: string;
    violationType: string;
    timestamp: Date;
    imageUrl: string;
    confidence: number;
    autoCaptured: boolean;
    notes?: string;
}

interface AutoScreenshotCaptureProps {
    isEnabled: boolean;
    onViolation: (violation: string, screenshot: string, confidence: number) => void;
    onScreenshotCaptured: (screenshot: ViolationScreenshot) => void;
    captureInterval?: number; // seconds
    minConfidence?: number; // minimum confidence to trigger capture
}

export const AutoScreenshotCapture: React.FC<AutoScreenshotCaptureProps> = ({
    isEnabled,
    onViolation,
    onScreenshotCaptured,
    captureInterval = 30, // every 30 seconds
    minConfidence = 0.7
}) => {
    const [screenshots, setScreenshots] = useState<ViolationScreenshot[]>([]);
    const [isCapturing, setIsCapturing] = useState(false);
    const [captureCountdown, setCaptureCountdown] = useState<number>(0);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const intervalRef = useRef<number | null>(null);
    const countdownRef = useRef<number | null>(null);

    // Generate violation-based screenshots
    const captureViolationScreenshot = async (violationType: string, confidence: number) => {
        if (!videoRef.current || !canvasRef.current) return;

        try {
            setIsCapturing(true);

            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');

            if (!context) return;

            // Set canvas dimensions to match video
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;

            // Draw video frame to canvas
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Add violation overlay
            context.fillStyle = 'rgba(255, 0, 0, 0.7)';
            context.fillRect(0, 0, canvas.width, 40);
            context.fillStyle = 'white';
            context.font = 'bold 16px Arial';
            context.fillText(`⚠️ ${violationType.toUpperCase()} - ${Math.round(confidence * 100)}%`, 10, 25);

            // Convert to blob and then to data URL
            canvas.toBlob(async (blob) => {
                if (!blob) return;

                const imageUrl = URL.createObjectURL(blob);
                const screenshot: ViolationScreenshot = {
                    id: `violation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    studentId: 'current-student', // Would be passed as prop
                    studentName: 'Current Student', // Would be passed as prop
                    violationType,
                    timestamp: new Date(),
                    imageUrl,
                    confidence,
                    autoCaptured: true,
                    notes: `Automatically captured on ${violationType} detection`
                };

                setScreenshots(prev => [screenshot, ...prev].slice(0, 50)); // Keep last 50
                onScreenshotCaptured(screenshot);
                onViolation(violationType, imageUrl, confidence);
                setIsCapturing(false);
            }, 'image/jpeg', 0.9);

        } catch (error) {
            console.error('Failed to capture violation screenshot:', error);
            setIsCapturing(false);
        }
    };

    // Periodic screenshot capture
    const capturePeriodicScreenshot = async () => {
        if (!videoRef.current || !canvasRef.current) return;

        try {
            setIsCapturing(true);

            const video = videoRef.current;
            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');

            if (!context) return;

            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
            context.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Add timestamp overlay
            context.fillStyle = 'rgba(0, 0, 0, 0.7)';
            context.fillRect(0, canvas.height - 40, canvas.width, 40);
            context.fillStyle = 'white';
            context.font = '14px Arial';
            context.fillText(`📸 ${new Date().toLocaleString()}`, 10, canvas.height - 15);

            canvas.toBlob(async (blob) => {
                if (!blob) return;

                const imageUrl = URL.createObjectURL(blob);
                const screenshot: ViolationScreenshot = {
                    id: `periodic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    studentId: 'current-student',
                    studentName: 'Current Student',
                    violationType: 'PERIODIC_CHECK',
                    timestamp: new Date(),
                    imageUrl,
                    confidence: 1.0,
                    autoCaptured: true,
                    notes: 'Periodic monitoring screenshot'
                };

                setScreenshots(prev => [screenshot, ...prev].slice(0, 50));
                onScreenshotCaptured(screenshot);
                setIsCapturing(false);

                // Download option for periodic screenshots
                setTimeout(() => URL.revokeObjectURL(imageUrl), 5000);
            }, 'image/jpeg', 0.9);

        } catch (error) {
            console.error('Failed to capture periodic screenshot:', error);
            setIsCapturing(false);
        }
    };

    // Setup intervals
    useEffect(() => {
        if (!isEnabled) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (countdownRef.current) clearInterval(countdownRef.current);
            setCaptureCountdown(0);
            return;
        }

        // Periodic capture interval
        intervalRef.current = window.setInterval(() => {
            capturePeriodicScreenshot();
            setCaptureCountdown(captureInterval);
        }, captureInterval * 1000);

        // Countdown timer
        let countdown = captureInterval;
        countdownRef.current = window.setInterval(() => {
            countdown -= 1;
            setCaptureCountdown(countdown);
            if (countdown <= 0) {
                countdown = captureInterval;
            }
        }, 1000);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (countdownRef.current) clearInterval(countdownRef.current);
        };
    }, [isEnabled, captureInterval]);

    // Mock violation detection for demonstration
    const simulateViolation = () => {
        const violations = ['NO_FACE', 'MULTIPLE_FACES', 'LOOKING_AWAY', 'LIVENESS_FAILURE'];
        const violationType = violations[Math.floor(Math.random() * violations.length)];
        const confidence = Math.random() * 0.5 + 0.5; // 0.5 to 1.0

        if (confidence >= minConfidence) {
            captureViolationScreenshot(violationType, confidence);
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (countdownRef.current) clearInterval(countdownRef.current);

            // Clean up object URLs
            screenshots.forEach(screenshot => {
                if (screenshot.imageUrl.startsWith('blob:')) {
                    URL.revokeObjectURL(screenshot.imageUrl);
                }
            });
        };
    }, []);

    const downloadScreenshot = (screenshot: ViolationScreenshot) => {
        const link = document.createElement('a');
        link.href = screenshot.imageUrl;
        link.download = `${screenshot.violationType}-${screenshot.id}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    return (
        <div className="bg-white rounded-lg shadow-lg border border-gray-200">
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Camera className="w-5 h-5 text-blue-600" />
                        <h3 className="text-lg font-bold text-gray-900">Auto Screenshot Capture</h3>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Status Indicator */}
                        <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${isEnabled ? 'bg-green-500' : 'bg-gray-400'
                                }`} />
                            <span className="text-sm text-gray-600">
                                {isEnabled ? 'Active' : 'Inactive'}
                            </span>
                        </div>

                        {/* Test Button */}
                        <button
                            onClick={simulateViolation}
                            disabled={!isEnabled}
                            className="px-3 py-1 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Simulate Violation
                        </button>
                    </div>
                </div>

                {/* Settings */}
                <div className="mt-3 flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                        <span>Capture Interval:</span>
                        <span className="font-medium text-gray-900">{captureInterval}s</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span>Min Confidence:</span>
                        <span className="font-medium text-gray-900">{Math.round(minConfidence * 100)}%</span>
                    </div>
                    {captureCountdown > 0 && (
                        <div className="flex items-center gap-2 text-blue-600">
                            <Clock className="w-4 h-4" />
                            <span>Next capture in {captureCountdown}s</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Hidden Video and Canvas for Capture */}
            <div className="hidden">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                // In production, this would be connected to the actual student stream
                />
                <canvas ref={canvasRef} />
            </div>

            {/* Capture Status */}
            {isCapturing && (
                <div className="mx-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2">
                    <Camera className="w-4 h-4 text-blue-600 animate-pulse" />
                    <span className="text-sm text-blue-700">Capturing screenshot...</span>
                </div>
            )}

            {/* Screenshots Gallery */}
            <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-gray-900">
                        Captured Screenshots ({screenshots.length})
                    </h4>
                    {screenshots.length > 0 && (
                        <button
                            onClick={() => setScreenshots([])}
                            className="text-sm text-red-600 hover:text-red-700 transition-colors"
                        >
                            Clear All
                        </button>
                    )}
                </div>

                {screenshots.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No screenshots captured yet</p>
                        <p className="text-sm mt-2">
                            Screenshots will be automatically captured when violations are detected
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                        {screenshots.map((screenshot) => (
                            <div
                                key={screenshot.id}
                                className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                            >
                                <div className="relative">
                                    <img
                                        src={screenshot.imageUrl}
                                        alt={`Screenshot ${screenshot.id}`}
                                        className="w-full h-32 object-cover"
                                    />

                                    {/* Overlay Info */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 hover:opacity-100 transition-opacity">
                                        <div className="absolute bottom-0 left-0 right-0 p-2 text-white">
                                            <div className="text-xs font-medium truncate">
                                                {screenshot.violationType.replace('_', ' ')}
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs opacity-75">
                                                    {formatTime(screenshot.timestamp)}
                                                </span>
                                                <div className="flex items-center gap-1">
                                                    {screenshot.autoCaptured && (
                                                        <span className="px-1 py-0.5 bg-blue-600 text-xs rounded">Auto</span>
                                                    )}
                                                    <span className="px-1 py-0.5 bg-white bg-opacity-20 text-xs rounded">
                                                        {Math.round(screenshot.confidence * 100)}%
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Capture Indicator */}
                                    {screenshot.autoCaptured && (
                                        <div className="absolute top-2 right-2">
                                            <CheckCircle className="w-4 h-4 text-green-500" />
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="p-2 bg-gray-50 border-t border-gray-200">
                                    <div className="flex items-center justify-between">
                                        <div className="text-xs text-gray-600 truncate flex-1">
                                            {screenshot.notes}
                                        </div>
                                        <button
                                            onClick={() => downloadScreenshot(screenshot)}
                                            className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                            title="Download screenshot"
                                        >
                                            <Download className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};