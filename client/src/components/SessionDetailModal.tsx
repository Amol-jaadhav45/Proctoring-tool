import React, { useEffect, useState } from 'react';
import { X, AlertTriangle, CheckCircle, Clock, Shield } from 'lucide-react';
import { sessionApi, type SessionDetail } from '../services/api';
import { CredibilityBadge } from './CredibilityBadge';

interface SessionDetailModalProps {
    sessionId: string;
    onClose: () => void;
}

export const SessionDetailModal: React.FC<SessionDetailModalProps> = ({ sessionId, onClose }) => {
    const [data, setData] = useState<SessionDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                setLoading(true);
                const result = await sessionApi.getById(sessionId);
                setData(result);
            } catch (err) {
                console.error('Error fetching session detail:', err);
                setError('Failed to load session details');
            } finally {
                setLoading(false);
            }
        };

        fetchDetail();
    }, [sessionId]);

    if (!sessionId) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">
                            Session Details - {data?.session.exam_title || 'Loading...'}
                        </h2>
                        <p className="text-sm text-gray-500">ID: {sessionId}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : error ? (
                        <div className="bg-red-50 text-red-800 p-4 rounded-lg flex items-center gap-3">
                            <AlertTriangle className="w-5 h-5" />
                            {error}
                        </div>
                    ) : data ? (
                        <div className="space-y-8">
                            {/* Overview Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                    <div className="text-sm text-gray-500 mb-1">Credibility Score</div>
                                    <div className="flex items-center gap-2">
                                        <CredibilityBadge score={data.credibility_score} size="large" />
                                    </div>
                                </div>
                                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                    <div className="text-sm text-gray-500 mb-1">Total Violations</div>
                                    <div className="text-2xl font-bold text-gray-900">{data.violations.length}</div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        {data.violations.filter((v: any) => v.severity === 'critical').length} Critical • {data.violations.filter((v: any) => v.severity !== 'critical').length} Warning
                                    </div>
                                </div>
                                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                                    <div className="text-sm text-gray-500 mb-1">Status</div>
                                    <div className="flex items-center gap-2 mt-1">
                                        {data.session.status === 'completed' ? (
                                            <CheckCircle className="w-5 h-5 text-green-600" />
                                        ) : (
                                            <Clock className="w-5 h-5 text-blue-600" />
                                        )}
                                        <span className="text-lg font-semibold capitalize">
                                            {data.session.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Student Info */}
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <h3 className="font-semibold text-gray-900 mb-3">Student Information</h3>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-gray-500">Student ID:</span>
                                        <span className="ml-2 font-mono text-gray-900">{data.session.user_id}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Exam:</span>
                                        <span className="ml-2 font-medium text-gray-900">{data.session.exam_title}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Started:</span>
                                        <span className="ml-2 text-gray-900">{new Date(data.session.started_at).toLocaleString()}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-500">Duration:</span>
                                        <span className="ml-2 text-gray-900">{data.session.duration_minutes} mins</span>
                                    </div>
                                </div>
                            </div>

                            {/* Violation Timeline */}
                            <div>
                                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-blue-600" />
                                    Violation Timeline
                                </h3>
                                {data.violations.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                        No violations detected during this session.
                                    </div>
                                ) : (
                                    <div className="relative border-l-2 border-gray-200 ml-3 space-y-6">
                                        {data.violations.map((violation: any, idx: number) => (
                                            <div key={idx} className="ml-6 relative">
                                                <div className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-2 bg-white ${violation.severity === 'critical' ? 'border-red-500' : 'border-yellow-500'
                                                    }`} />
                                                <div className={`p-4 rounded-lg border ${violation.severity === 'critical'
                                                    ? 'bg-red-50 border-red-100'
                                                    : 'bg-yellow-50 border-yellow-100'
                                                    }`}>
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className={`font-semibold ${violation.severity === 'critical' ? 'text-red-900' : 'text-yellow-900'
                                                                }`}>
                                                                {violation.type.replace(/_/g, ' ')}
                                                            </p>
                                                            <p className="text-sm text-gray-600 mt-1">
                                                                Severity: <span className="capitalize font-medium">{violation.severity}</span>
                                                            </p>
                                                        </div>
                                                        <span className="text-xs text-gray-500 font-mono">
                                                            {new Date(violation.timestamp).toLocaleTimeString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : null}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
