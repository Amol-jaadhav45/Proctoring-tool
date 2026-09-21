import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Users, UserX, Eye, Clock, X, Download, Camera } from 'lucide-react';

export interface ViolationAlert {
    id: string;
    studentId: string;
    studentName: string;
    type: 'NO_FACE' | 'MULTIPLE_FACES' | 'LOOKING_AWAY' | 'LIVENESS_FAILURE' | 'SUSPICIOUS_ACTIVITY';
    severity: 'low' | 'medium' | 'high' | 'critical';
    timestamp: Date;
    description: string;
    screenshot?: string;
    confidence?: number;
    duration?: number;
    autoResolved?: boolean;
}

interface RealTimeViolationAlertsProps {
    violations: ViolationAlert[];
    onViolationResolve?: (violationId: string) => void;
    onTakeScreenshot?: (studentId: string) => void;
    onPauseStudent?: (studentId: string) => void;
    onWarnStudent?: (studentId: string) => void;
    maxHeight?: string;
}

export const RealTimeViolationAlerts: React.FC<RealTimeViolationAlertsProps> = ({
    violations,
    onViolationResolve,
    onTakeScreenshot,
    onPauseStudent,
    onWarnStudent,
    maxHeight = '400px'
}) => {
    const [filter, setFilter] = useState<'all' | 'unresolved' | 'critical'>('unresolved');
    const [selectedViolation, setSelectedViolation] = useState<string | null>(null);
    const autoResolveTime = 30;
    const alertsEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to new violations
    useEffect(() => {
        if (alertsEndRef.current) {
            alertsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [violations]);

    // Auto-resolve violations after timeout
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            violations.forEach(violation => {
                const timeDiff = (now - violation.timestamp.getTime()) / 1000;
                if (timeDiff > autoResolveTime && !violation.autoResolved) {
                    onViolationResolve?.(violation.id);
                }
            });
        }, 5000);

        return () => clearInterval(interval);
    }, [violations, autoResolveTime, onViolationResolve]);

    const filteredViolations = violations.filter(violation => {
        switch (filter) {
            case 'unresolved':
                return !violation.autoResolved;
            case 'critical':
                return violation.severity === 'critical' || violation.severity === 'high';
            default:
                return true;
        }
    }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const getViolationIcon = (type: string) => {
        switch (type) {
            case 'NO_FACE':
                return <UserX className="w-5 h-5" />;
            case 'MULTIPLE_FACES':
                return <Users className="w-5 h-5" />;
            case 'LOOKING_AWAY':
                return <Eye className="w-5 h-5" />;
            case 'LIVENESS_FAILURE':
                return <AlertTriangle className="w-5 h-5" />;
            default:
                return <AlertTriangle className="w-5 h-5" />;
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical':
                return 'border-red-500 bg-red-50 text-red-700';
            case 'high':
                return 'border-red-400 bg-red-50 text-red-600';
            case 'medium':
                return 'border-yellow-500 bg-yellow-50 text-yellow-700';
            case 'low':
                return 'border-blue-500 bg-blue-50 text-blue-700';
            default:
                return 'border-gray-500 bg-gray-50 text-gray-700';
        }
    };

    const getViolationDescription = (type: string, details?: any) => {
        switch (type) {
            case 'NO_FACE':
                return 'Student face not detected in camera view';
            case 'MULTIPLE_FACES':
                return 'Multiple people detected in examination area';
            case 'LOOKING_AWAY':
                return `Student looking ${details?.direction || 'away from screen'}`;
            case 'LIVENESS_FAILURE':
                return 'Liveness check failed - possible spoofing attempt';
            case 'SUSPICIOUS_ACTIVITY':
                return 'Suspicious behavior pattern detected';
            default:
                return 'Unusual activity detected';
        }
    };

    const handleScreenshot = async (violation: ViolationAlert) => {
        try {
            // Capture screenshot from student's video stream
            onTakeScreenshot?.(violation.studentId);
        } catch (error) {
            console.error('Failed to capture screenshot:', error);
        }
    };

    const formatDuration = (timestamp: Date) => {
        const now = Date.now();
        const diff = (now - timestamp.getTime()) / 1000;

        if (diff < 60) return `${Math.round(diff)}s ago`;
        if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
        return `${Math.round(diff / 3600)}h ago`;
    };

    const activeViolationsCount = violations.filter(v => !v.autoResolved).length;
    const criticalViolationsCount = violations.filter(v =>
        !v.autoResolved && (v.severity === 'critical' || v.severity === 'high')
    ).length;

    return (
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 flex flex-col" style={{ maxHeight }}>
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        <h3 className="text-lg font-bold text-gray-900">Violation Alerts</h3>
                        {activeViolationsCount > 0 && (
                            <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                                {activeViolationsCount} Active
                            </span>
                        )}
                        {criticalViolationsCount > 0 && (
                            <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-semibold rounded-full">
                                {criticalViolationsCount} Critical
                            </span>
                        )}
                    </div>

                    <button
                        onClick={() => setSelectedViolation(null)}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-3 py-1 text-sm rounded-lg transition-colors ${filter === 'all'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        All ({violations.length})
                    </button>
                    <button
                        onClick={() => setFilter('unresolved')}
                        className={`px-3 py-1 text-sm rounded-lg transition-colors ${filter === 'unresolved'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        Unresolved ({activeViolationsCount})
                    </button>
                    <button
                        onClick={() => setFilter('critical')}
                        className={`px-3 py-1 text-sm rounded-lg transition-colors ${filter === 'critical'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        Critical ({criticalViolationsCount})
                    </button>
                </div>
            </div>

            {/* Violations List */}
            <div className="flex-1 overflow-y-auto">
                {filteredViolations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                        <AlertTriangle className="w-12 h-12 mb-3 opacity-50" />
                        <p className="text-center">
                            {filter === 'all' ? 'No violations detected' :
                                filter === 'unresolved' ? 'No unresolved violations' :
                                    'No critical violations'}
                        </p>
                    </div>
                ) : (
                    <div className="p-4 space-y-3">
                        {filteredViolations.map((violation) => (
                            <div
                                key={violation.id}
                                className={`border-2 rounded-lg p-4 transition-all hover:shadow-md ${selectedViolation === violation.id
                                        ? 'ring-2 ring-blue-500'
                                        : ''
                                    } ${getSeverityColor(violation.severity)}`}
                                onClick={() => setSelectedViolation(
                                    selectedViolation === violation.id ? null : violation.id
                                )}
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white rounded-lg">
                                            {getViolationIcon(violation.type)}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-semibold">{violation.studentName}</span>
                                                <span className="text-xs px-2 py-1 bg-white rounded-full uppercase">
                                                    {violation.severity}
                                                </span>
                                            </div>
                                            <p className="text-sm">
                                                {getViolationDescription(violation.type)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 text-xs text-gray-600">
                                        <Clock className="w-3 h-3" />
                                        <span>{formatDuration(violation.timestamp)}</span>
                                    </div>
                                </div>

                                {/* Expanded Details */}
                                {selectedViolation === violation.id && (
                                    <div className="mt-3 pt-3 border-t border-gray-200">
                                        <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                                            <div>
                                                <span className="text-gray-600">Type:</span>
                                                <span className="ml-1 font-medium">{violation.type}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Confidence:</span>
                                                <span className="ml-1 font-medium">
                                                    {violation.confidence ? `${Math.round(violation.confidence * 100)}%` : 'N/A'}
                                                </span>
                                            </div>
                                            {violation.duration && (
                                                <div>
                                                    <span className="text-gray-600">Duration:</span>
                                                    <span className="ml-1 font-medium">{violation.duration}s</span>
                                                </div>
                                            )}
                                            <div>
                                                <span className="text-gray-600">Student ID:</span>
                                                <span className="ml-1 font-medium">{violation.studentId}</span>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleScreenshot(violation);
                                                }}
                                                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
                                            >
                                                <Camera className="w-3 h-3" />
                                                Screenshot
                                            </button>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onWarnStudent?.(violation.studentId);
                                                }}
                                                className="px-3 py-1 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
                                            >
                                                Warn
                                            </button>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onPauseStudent?.(violation.studentId);
                                                }}
                                                className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                                            >
                                                Pause
                                            </button>

                                            {violation.screenshot && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        // Download screenshot
                                                        const link = document.createElement('a');
                                                        link.href = violation.screenshot || '';
                                                        link.download = `violation-${violation.id || 'unknown'}.jpg`;
                                                        link.click();
                                                    }}
                                                    className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors flex items-center gap-1"
                                                >
                                                    <Download className="w-3 h-3" />
                                                    Evidence
                                                </button>
                                            )}

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onViolationResolve?.(violation.id);
                                                }}
                                                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                                            >
                                                Resolve
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div ref={alertsEndRef} />
        </div>
    );
};