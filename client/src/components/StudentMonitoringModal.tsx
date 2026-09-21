import React, { useState, useEffect, useRef } from 'react';
import {
    X,
    Camera,
    Download,
    AlertTriangle,
    Eye,
    Clock,
    Activity,
    MessageSquare,
    PauseCircle,
    Square,
    Monitor
} from 'lucide-react';

export interface DetailedStudentData {
    id: string;
    name: string;
    email: string;
    status: 'active' | 'paused' | 'terminated' | 'offline';
    currentAttention: number;
    averageAttention: number;
    focusTime: number;
    distractionCount: number;
    violations: Array<{
        type: string;
        timestamp: Date;
        description: string;
        screenshot?: string;
        severity: string;
    }>;
    screenshots: Array<{
        timestamp: Date;
        url: string;
        type: 'manual' | 'violation' | 'automatic';
    }>;
    examProgress: {
        currentQuestion: number;
        totalQuestions: number;
        timeRemaining: number;
        timeSpent: number;
    };
    systemInfo: {
        browser: string;
        os: string;
        deviceType: string;
        screenResolution: string;
        connectionType: string;
    };
    webcamActive: boolean;
    micActive: boolean;
    screenSharing: boolean;
}

interface StudentMonitoringModalProps {
    student: DetailedStudentData;
    isOpen: boolean;
    onClose: () => void;
    onTakeScreenshot: () => void;
    onSendMessage: (message: string) => void;
    onPauseExam: () => void;
    onTerminateExam: () => void;
    onWarnStudent: () => void;
}

export const StudentMonitoringModal: React.FC<StudentMonitoringModalProps> = ({
    student,
    isOpen,
    onClose,
    onTakeScreenshot,
    onSendMessage,
    onPauseExam,
    onTerminateExam,
    onWarnStudent
}) => {
    const [activeTab, setActiveTab] = useState<'live' | 'analytics' | 'violations' | 'screenshots' | 'info'>('live');
    const [message, setMessage] = useState('');
    const [autoRefresh, setAutoRefresh] = useState(true);
    const videoRef = useRef<HTMLVideoElement>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Auto-refresh data
    useEffect(() => {
        if (autoRefresh && isOpen) {
            const interval = setInterval(() => {
                // In production, this would fetch fresh data from the server
                console.log('Refreshing student data...');
            }, 5000);

            intervalRef.current = interval;
            return () => {
                if (intervalRef.current) clearInterval(intervalRef.current);
            };
        }
    }, [autoRefresh, isOpen]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'text-green-600 bg-green-50 border-green-200';
            case 'paused': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
            case 'terminated': return 'text-red-600 bg-red-50 border-red-200';
            case 'offline': return 'text-gray-600 bg-gray-50 border-gray-200';
            default: return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical': return 'bg-red-100 text-red-800 border-red-300';
            case 'high': return 'bg-red-50 text-red-700 border-red-200';
            case 'medium': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
            case 'low': return 'bg-blue-50 text-blue-700 border-blue-200';
            default: return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    };

    const formatTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[95vh] mx-4 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className={`px-3 py-1 rounded-full border font-semibold ${getStatusColor(student.status)}`}>
                            {student.status.toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">{student.name}</h2>
                            <p className="text-sm text-gray-600">{student.email}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 text-sm text-gray-600">
                            <input
                                type="checkbox"
                                checked={autoRefresh}
                                onChange={(e) => setAutoRefresh(e.target.checked)}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            Auto-refresh
                        </label>

                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200">
                    {[
                        { id: 'live', label: 'Live Feed', icon: <Eye className="w-4 h-4" /> },
                        { id: 'analytics', label: 'Analytics', icon: <Activity className="w-4 h-4" /> },
                        { id: 'violations', label: 'Violations', icon: <AlertTriangle className="w-4 h-4" /> },
                        { id: 'screenshots', label: 'Screenshots', icon: <Camera className="w-4 h-4" /> },
                        { id: 'info', label: 'System Info', icon: <Monitor className="w-4 h-4" /> }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                                ? 'border-blue-500 text-blue-600 bg-blue-50'
                                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                                }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {activeTab === 'live' && (
                        <div className="p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Live Video Feed */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Live Feed</h3>
                                    <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            playsInline
                                            className="w-full h-full object-cover"
                                            // In production, this would be the actual WebRTC stream
                                            src={student.webcamActive ? undefined : ''}
                                        />

                                        {!student.webcamActive && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-gray-500">
                                                <div className="text-center">
                                                    <Camera className="w-12 h-12 mx-auto mb-2" />
                                                    <p>Camera inactive</p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Status Overlays */}
                                        <div className="absolute top-4 left-4 space-y-2">
                                            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${student.micActive ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                                                }`}>
                                                {student.micActive ? '🎤 Mic On' : '🔇 Mic Off'}
                                            </div>
                                            {student.screenSharing && (
                                                <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-blue-500 text-white">
                                                    🖥️ Screen Sharing
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Quick Actions */}
                                    <div className="flex gap-2 mt-4">
                                        <button
                                            onClick={onTakeScreenshot}
                                            className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                        >
                                            <Camera className="w-4 h-4" />
                                            Screenshot
                                        </button>
                                        <button
                                            onClick={onWarnStudent}
                                            className="flex items-center gap-2 px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                                        >
                                            <AlertTriangle className="w-4 h-4" />
                                            Warn
                                        </button>
                                        <button
                                            onClick={onPauseExam}
                                            className="flex items-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                                        >
                                            <PauseCircle className="w-4 h-4" />
                                            Pause
                                        </button>
                                        <button
                                            onClick={onTerminateExam}
                                            className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                        >
                                            <Square className="w-4 h-4" />
                                            Terminate
                                        </button>
                                    </div>
                                </div>

                                {/* Live Stats */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Live Statistics</h3>
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-blue-50 rounded-lg p-4">
                                                <div className="text-sm text-blue-600 mb-1">Current Attention</div>
                                                <div className="text-2xl font-bold text-blue-900">
                                                    {Math.round(student.currentAttention)}%
                                                </div>
                                            </div>
                                            <div className="bg-green-50 rounded-lg p-4">
                                                <div className="text-sm text-green-600 mb-1">Average Attention</div>
                                                <div className="text-2xl font-bold text-green-900">
                                                    {Math.round(student.averageAttention)}%
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-purple-50 rounded-lg p-4">
                                                <div className="text-sm text-purple-600 mb-1">Focus Time</div>
                                                <div className="text-xl font-bold text-purple-900">
                                                    {formatTime(student.focusTime)}
                                                </div>
                                            </div>
                                            <div className="bg-red-50 rounded-lg p-4">
                                                <div className="text-sm text-red-600 mb-1">Distractions</div>
                                                <div className="text-xl font-bold text-red-900">
                                                    {student.distractionCount}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Exam Progress */}
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <div className="text-sm text-gray-600 mb-3">Exam Progress</div>
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-sm">
                                                    <span>Question {student.examProgress.currentQuestion} of {student.examProgress.totalQuestions}</span>
                                                    <span>{Math.round((student.examProgress.currentQuestion / student.examProgress.totalQuestions) * 100)}%</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-2">
                                                    <div
                                                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                                                        style={{
                                                            width: `${(student.examProgress.currentQuestion / student.examProgress.totalQuestions) * 100}%`
                                                        }}
                                                    />
                                                </div>
                                                <div className="flex justify-between text-xs text-gray-600 mt-2">
                                                    <span>Time: {formatTime(student.examProgress.timeSpent)}</span>
                                                    <span>Remaining: {formatTime(student.examProgress.timeRemaining)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'analytics' && (
                        <div className="p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Attention Analytics</h3>
                            {/* Analytics content would go here - charts, trends, etc. */}
                            <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500">
                                <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>Attention analytics and charts would be displayed here</p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'violations' && (
                        <div className="p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                Violations ({student.violations.length})
                            </h3>
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                {student.violations.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                        <p>No violations recorded</p>
                                    </div>
                                ) : (
                                    student.violations.map((violation, index) => (
                                        <div
                                            key={index}
                                            className={`border rounded-lg p-4 ${getSeverityColor(violation.severity)}`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="font-semibold text-gray-900">
                                                            {violation.type.replace('_', ' ')}
                                                        </span>
                                                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-white bg-opacity-50">
                                                            {violation.severity.toUpperCase()}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm">{violation.description}</p>
                                                    <div className="flex items-center gap-2 text-xs text-gray-600 mt-2">
                                                        <Clock className="w-3 h-3" />
                                                        <span>{violation.timestamp.toLocaleString()}</span>
                                                    </div>
                                                </div>
                                                {violation.screenshot && (
                                                    <img
                                                        src={violation.screenshot}
                                                        alt="Violation screenshot"
                                                        className="w-20 h-15 object-cover rounded border"
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'screenshots' && (
                        <div className="p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">
                                Screenshots ({student.screenshots.length})
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-96 overflow-y-auto">
                                {student.screenshots.length === 0 ? (
                                    <div className="col-span-full text-center py-8 text-gray-500">
                                        <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                        <p>No screenshots captured</p>
                                    </div>
                                ) : (
                                    student.screenshots.map((screenshot, index) => (
                                        <div key={index} className="relative group">
                                            <img
                                                src={screenshot.url}
                                                alt={`Screenshot ${index + 1}`}
                                                className="w-full h-24 object-cover rounded border cursor-pointer group-hover:border-blue-500 transition-colors"
                                            />
                                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all rounded flex items-center justify-center">
                                                <Download className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                            <div className="mt-2 text-xs text-gray-600">
                                                {screenshot.timestamp.toLocaleString()} • {screenshot.type}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {activeTab === 'info' && (
                        <div className="p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">System Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <div className="text-sm">
                                        <span className="text-gray-600">Browser:</span>
                                        <span className="ml-2 font-medium">{student.systemInfo.browser}</span>
                                    </div>
                                    <div className="text-sm">
                                        <span className="text-gray-600">Operating System:</span>
                                        <span className="ml-2 font-medium">{student.systemInfo.os}</span>
                                    </div>
                                    <div className="text-sm">
                                        <span className="text-gray-600">Device Type:</span>
                                        <span className="ml-2 font-medium">{student.systemInfo.deviceType}</span>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="text-sm">
                                        <span className="text-gray-600">Screen Resolution:</span>
                                        <span className="ml-2 font-medium">{student.systemInfo.screenResolution}</span>
                                    </div>
                                    <div className="text-sm">
                                        <span className="text-gray-600">Connection Type:</span>
                                        <span className="ml-2 font-medium">{student.systemInfo.connectionType}</span>
                                    </div>
                                    <div className="text-sm">
                                        <span className="text-gray-600">Student ID:</span>
                                        <span className="ml-2 font-medium">{student.id}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-gray-200">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter' && message.trim()) {
                                    onSendMessage(message);
                                    setMessage('');
                                }
                            }}
                            placeholder="Send a message to this student..."
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <button
                            onClick={() => {
                                if (message.trim()) {
                                    onSendMessage(message);
                                    setMessage('');
                                }
                            }}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                        >
                            <MessageSquare className="w-4 h-4" />
                            Send
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};