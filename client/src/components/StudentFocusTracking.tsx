import React, { useState, useEffect, useRef } from 'react';
import { Brain, Eye, AlertTriangle, Target, Activity } from 'lucide-react';

export interface AttentionMetrics {
    timestamp: number;
    attentionScore: number;
    gazeDirection: string;
    faceDetected: boolean;
    violationCount: number;
    blinkRate: number;
}

export interface StudentAttentionData {
    studentId: string;
    studentName: string;
    currentAttention: number;
    averageAttention: number;
    focusTime: number;
    distractionCount: number;
    metrics: AttentionMetrics[];
    status: 'focused' | 'distracted' | 'violation' | 'offline';
    lastActivity: Date;
}

interface StudentFocusTrackingProps {
    students: StudentAttentionData[];
    timeRange: '1min' | '5min' | '15min' | '30min';
    onTimeRangeChange: (range: '1min' | '5min' | '15min' | '30min') => void;
    maxHeight?: string;
}

export const StudentFocusTracking: React.FC<StudentFocusTrackingProps> = ({
    students,
    timeRange,
    onTimeRangeChange,
    maxHeight = '300px'
}) => {
    const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
    const intervalRef = useRef<any>(null);

    // Update attention scores periodically
    useEffect(() => {
        const interval = setInterval(() => {
            // Simulate real-time attention updates
            students.forEach(student => {
                if (student.status !== 'offline') {
                    const randomAttention = Math.max(20, Math.min(100,
                        student.currentAttention + (Math.random() - 0.5) * 10
                    ));
                    student.currentAttention = randomAttention;
                    student.metrics.push({
                        timestamp: Date.now(),
                        attentionScore: randomAttention,
                        gazeDirection: 'CENTER',
                        faceDetected: true,
                        violationCount: student.distractionCount,
                        blinkRate: Math.random() * 20
                    });
                }
            });
        }, 2000);

        intervalRef.current = interval;
        return () => clearInterval(intervalRef.current);
    }, [students]);

    const getOverallStats = () => {
        if (students.length === 0) return { avgAttention: 0, totalDistractions: 0, focusedStudents: 0 };

        const totalAttention = students.reduce((sum, s) => sum + s.currentAttention, 0);
        const avgAttention = Math.round(totalAttention / students.length);
        const totalDistractions = students.reduce((sum, s) => sum + s.distractionCount, 0);
        const focusedStudents = students.filter(s => s.currentAttention >= 70).length;

        return { avgAttention, totalDistractions, focusedStudents };
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'focused': return 'text-green-600 bg-green-50 border-green-200';
            case 'distracted': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
            case 'violation': return 'text-red-600 bg-red-50 border-red-200';
            case 'offline': return 'text-gray-600 bg-gray-50 border-gray-200';
            default: return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    const getAttentionBarColor = (score: number) => {
        if (score >= 80) return 'bg-green-500';
        if (score >= 60) return 'bg-yellow-500';
        if (score >= 40) return 'bg-orange-500';
        return 'bg-red-500';
    };

    const stats = getOverallStats();

    return (
        <div className="bg-white rounded-lg shadow-lg border border-gray-200" style={{ maxHeight }}>
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Target className="w-5 h-5 text-blue-600" />
                        <h3 className="text-lg font-bold text-gray-900">Focus Tracking</h3>
                    </div>

                    <select
                        value={timeRange}
                        onChange={(e) => onTimeRangeChange(e.target.value as any)}
                        className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="1min">1 min</option>
                        <option value="5min">5 min</option>
                        <option value="15min">15 min</option>
                        <option value="30min">30 min</option>
                    </select>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                            <Brain className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium text-gray-600">Avg Attention</span>
                        </div>
                        <div className="text-2xl font-bold text-blue-900">{stats.avgAttention}%</div>
                    </div>

                    <div className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                            <AlertTriangle className="w-4 h-4 text-yellow-600" />
                            <span className="text-sm font-medium text-gray-600">Distractions</span>
                        </div>
                        <div className="text-2xl font-bold text-yellow-900">{stats.totalDistractions}</div>
                    </div>

                    <div className="text-center">
                        <div className="flex items-center justify-center gap-1 mb-1">
                            <Eye className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-gray-600">Focused</span>
                        </div>
                        <div className="text-2xl font-bold text-green-900">{stats.focusedStudents}</div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col" style={{ height: 'calc(100% - 140px)' }}>
                {/* Student List with Progress Bars */}
                <div className="flex-1 p-4 overflow-y-auto">
                    {students.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            <div className="text-center">
                                <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>No students currently tracked</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {students.map((student) => (
                                <div
                                    key={student.studentId}
                                    className={`p-4 border-2 rounded-lg transition-all cursor-pointer ${selectedStudent === student.studentId
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    onClick={() => setSelectedStudent(
                                        selectedStudent === student.studentId ? null : student.studentId
                                    )}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <span className="font-semibold text-gray-900">{student.studentName}</span>
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(student.status)}`}>
                                                {student.status.toUpperCase()}
                                            </span>
                                        </div>

                                        <div className="text-right">
                                            <div className="text-2xl font-bold text-gray-900">
                                                {Math.round(student.currentAttention)}%
                                            </div>
                                            <div className="text-xs text-gray-600">Attention</div>
                                        </div>
                                    </div>

                                    {/* Attention Progress Bar */}
                                    <div className="mb-3">
                                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                            <span>Focus Level</span>
                                            <span>{Math.round(student.currentAttention)}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full transition-all duration-500 ${getAttentionBarColor(student.currentAttention)}`}
                                                style={{ width: `${student.currentAttention}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {selectedStudent === student.studentId && (
                                        <div className="mt-3 pt-3 border-t border-gray-200">
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <span className="text-gray-600">Average Attention:</span>
                                                    <span className="ml-1 font-medium">{Math.round(student.averageAttention)}%</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-600">Focus Time:</span>
                                                    <span className="ml-1 font-medium">{Math.round(student.focusTime / 60)}m</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-600">Distractions:</span>
                                                    <span className="ml-1 font-medium text-red-600">{student.distractionCount}</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-600">Last Activity:</span>
                                                    <span className="ml-1 font-medium">
                                                        {student.lastActivity.toLocaleTimeString()}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Recent Activity Timeline */}
                                            <div className="mt-3">
                                                <h4 className="text-sm font-semibold text-gray-900 mb-2">Recent Activity</h4>
                                                <div className="space-y-1">
                                                    {student.metrics.slice(-5).reverse().map((metric) => (
                                                        <div key={metric.timestamp} className="flex items-center gap-2 text-xs">
                                                            <span className="text-gray-500">
                                                                {new Date(metric.timestamp).toLocaleTimeString()}
                                                            </span>
                                                            <div className={`w-2 h-2 rounded-full ${metric.attentionScore >= 80 ? 'bg-green-500' :
                                                                    metric.attentionScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                                                }`} />
                                                            <span className="text-gray-700">
                                                                {metric.faceDetected ? 'Face detected' : 'No face'} •
                                                                {metric.attentionScore}% attention
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};