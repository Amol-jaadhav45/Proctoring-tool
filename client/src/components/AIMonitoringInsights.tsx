import React, { useState } from 'react';
import { Brain, Eye, AlertTriangle, TrendingUp, Activity, Square } from 'lucide-react';

export interface StudentAnalytics {
    studentId: string;
    studentName: string;
    attentionScore: number;
    violationCount: number;
    lastViolation: string;
    focusTime: number;
    suspiciousActivity: number;
    status: 'focused' | 'distracted' | 'violation' | 'offline';
}

interface AIMonitoringInsightsProps {
    students: StudentAnalytics[];
    onStudentSelect?: (studentId: string) => void;
    selectedStudent?: string;
}

export const AIMonitoringInsights: React.FC<AIMonitoringInsightsProps> = ({
    students,
    onStudentSelect,
    selectedStudent
}) => {
    const [timeRange, setTimeRange] = useState<'5min' | '15min' | '30min' | 'all'>('15min');
    const [sortBy, setSortBy] = useState<'attention' | 'violations' | 'status'>('attention');
    const [showRiskOnly, setShowRiskOnly] = useState(false);

    // Calculate overall insights
    const insights = {
        totalStudents: students.length,
        averageAttention: students.length > 0
            ? Math.round(students.reduce((sum, s) => sum + s.attentionScore, 0) / students.length)
            : 0,
        highRiskStudents: students.filter(s => s.status === 'violation').length,
        totalViolations: students.reduce((sum, s) => sum + s.violationCount, 0),
        focusedStudents: students.filter(s => s.status === 'focused').length
    };

    // Sort students based on selected criteria
    const sortedStudents = [...students].sort((a, b) => {
        switch (sortBy) {
            case 'attention':
                return b.attentionScore - a.attentionScore;
            case 'violations':
                return b.violationCount - a.violationCount;
            case 'status':
                const statusOrder = { 'violation': 0, 'distracted': 1, 'focused': 2, 'offline': 3 };
                return statusOrder[a.status] - statusOrder[b.status];
            default:
                return 0;
        }
    });

    // Filter students based on risk level
    const filteredStudents = showRiskOnly
        ? sortedStudents.filter(s => s.status === 'violation' || s.suspiciousActivity > 3)
        : sortedStudents;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'focused': return 'text-green-600 bg-green-50';
            case 'distracted': return 'text-yellow-600 bg-yellow-50';
            case 'violation': return 'text-red-600 bg-red-50';
            case 'offline': return 'text-gray-600 bg-gray-50';
            default: return 'text-gray-600 bg-gray-50';
        }
    };

    const getAttentionColor = (score: number) => {
        if (score >= 80) return 'text-green-600';
        if (score >= 60) return 'text-yellow-600';
        return 'text-red-600';
    };

    const getRiskLevel = (student: StudentAnalytics) => {
        if (student.status === 'violation' || student.suspiciousActivity > 5) return 'HIGH';
        if (student.suspiciousActivity > 2 || student.attentionScore < 50) return 'MEDIUM';
        return 'LOW';
    };

    const getRiskColor = (risk: string) => {
        switch (risk) {
            case 'HIGH': return 'text-red-600 bg-red-50 border-red-200';
            case 'MEDIUM': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
            case 'LOW': return 'text-green-600 bg-green-50 border-green-200';
            default: return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-blue-600" />
                    <h2 className="text-xl font-bold text-gray-900">AI Monitoring Insights</h2>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowRiskOnly(!showRiskOnly)}
                        className={`px-3 py-1 text-sm rounded-lg border transition-colors ${showRiskOnly
                                ? 'bg-red-50 border-red-200 text-red-600'
                                : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                            }`}
                    >
                        {showRiskOnly ? 'All Students' : 'Risk Only'}
                    </button>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <Eye className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-600">Total Students</span>
                    </div>
                    <div className="text-2xl font-bold text-blue-900">{insights.totalStudents}</div>
                </div>

                <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium text-green-600">Avg Attention</span>
                    </div>
                    <div className="text-2xl font-bold text-green-900">{insights.averageAttention}%</div>
                </div>

                <div className="text-center p-4 bg-red-50 rounded-lg">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        <span className="text-sm font-medium text-red-600">Violations</span>
                    </div>
                    <div className="text-2xl font-bold text-red-900">{insights.totalViolations}</div>
                </div>

                <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <Activity className="w-4 h-4 text-purple-600" />
                        <span className="text-sm font-medium text-purple-600">High Risk</span>
                    </div>
                    <div className="text-2xl font-bold text-purple-900">{insights.highRiskStudents}</div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Sort by:</span>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="attention">Attention Score</option>
                        <option value="violations">Violation Count</option>
                        <option value="status">Status</option>
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">Time:</span>
                    <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value as any)}
                        className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="5min">Last 5 min</option>
                        <option value="15min">Last 15 min</option>
                        <option value="30min">Last 30 min</option>
                        <option value="all">All Time</option>
                    </select>
                </div>
            </div>

            {/* Student List */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredStudents.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No students match current filters</p>
                    </div>
                ) : (
                    filteredStudents.map((student) => {
                        const riskLevel = getRiskLevel(student);
                        const isSelected = selectedStudent === student.studentId;

                        return (
                            <div
                                key={student.studentId}
                                onClick={() => onStudentSelect?.(student.studentId)}
                                className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${isSelected
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="font-semibold text-gray-900">{student.studentName}</span>
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(student.status)}`}>
                                                {student.status.toUpperCase()}
                                            </span>
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getRiskColor(riskLevel)}`}>
                                                {riskLevel} RISK
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                            <div>
                                                <span className="text-gray-600">Attention:</span>
                                                <span className={`ml-1 font-semibold ${getAttentionColor(student.attentionScore)}`}>
                                                    {student.attentionScore}%
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Violations:</span>
                                                <span className="ml-1 font-semibold text-red-600">
                                                    {student.violationCount}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Focus Time:</span>
                                                <span className="ml-1 font-semibold text-blue-600">
                                                    {Math.round(student.focusTime / 60)}m
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Suspicious:</span>
                                                <span className="ml-1 font-semibold text-orange-600">
                                                    {student.suspiciousActivity}
                                                </span>
                                            </div>
                                        </div>

                                        {student.lastViolation && (
                                            <div className="mt-2 text-xs text-gray-500">
                                                Last violation: {new Date(student.lastViolation).toLocaleString()}
                                            </div>
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2 ml-4">
                                        <button
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Focus camera"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                // Handle focus action
                                            }}
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>
                                        <button
                                            className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                                            title="Send warning"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                // Handle warning action
                                            }}
                                        >
                                            <AlertTriangle className="w-4 h-4" />
                                        </button>
                                        <button
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Terminate session"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                // Handle terminate action
                                            }}
                                        >
                                            <Square className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};