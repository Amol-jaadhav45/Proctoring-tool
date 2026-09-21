import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sessionApi, type SessionDetail } from '../services/api';
import { CredibilityBadge } from '../components/CredibilityBadge';
import { AlertTriangle, CheckCircle, Clock, Shield, Loader2, ArrowLeft } from 'lucide-react';

export const SessionDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [data, setData] = useState<SessionDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);


    useEffect(() => {
        if (!id) return;

        const fetchDetail = async () => {
            try {
                setLoading(true);
                const result = await sessionApi.getById(id);
                setData(result);
            } catch (err) {
                console.error('Error fetching session detail:', err);
                setError('Failed to load session details');
            } finally {
                setLoading(false);
            }
        };

        fetchDetail();
    }, [id]);

    if (!id) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                    <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                    <p className="text-gray-600">Session ID not provided</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-auto">
            <div className="p-6 max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                Session Details - {data?.session.exam_title || 'Loading...'}
                            </h1>
                            <p className="text-sm text-gray-500">ID: {id}</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    </div>
                ) : error ? (
                    <div className="bg-red-50 text-red-800 p-4 rounded-lg flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5" />
                        {error}
                    </div>
                ) : data ? (
                    <div className="space-y-6">
                        {/* Overview Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                                <div className="text-sm text-gray-500 mb-2">Credibility Score</div>
                                <CredibilityBadge score={data.credibility_score} size="large" />
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                                <div className="text-sm text-gray-500 mb-2">Total Violations</div>
                                <div className="text-3xl font-bold text-gray-900">{data.violations.length}</div>
                                <div className="text-xs text-gray-500 mt-2">
                                    {data.violations.filter((v: any) => v.severity === 'critical').length} Critical • {data.violations.filter((v: any) => v.severity !== 'critical').length} Warning
                                </div>
                            </div>
                            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                                <div className="text-sm text-gray-500 mb-2">Status</div>
                                <div className="flex items-center gap-2 mt-1">
                                    {data.session.status === 'completed' ? (
                                        <CheckCircle className="w-6 h-6 text-green-600" />
                                    ) : (
                                        <Clock className="w-6 h-6 text-blue-600" />
                                    )}
                                    <span className="text-xl font-semibold capitalize">
                                        {data.session.status.replace('_', ' ')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Student Info */}
                        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                            <h3 className="font-semibold text-gray-900 mb-4 text-lg">Student Information</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-gray-500">Student ID:</span>
                                    <span className="ml-2 font-mono text-gray-900">{data.session.user_id}</span>
                                </div>
                                <div>
                                    <span className="ml-2 font-medium text-gray-900">{data.session.exam_title}</span>
                                </div>
                                <div className="col-span-full mt-4 p-4 bg-gray-50 rounded-lg flex justify-around">
                                    <div className="text-center">
                                        <p className="text-sm text-gray-500">Score</p>
                                        <p className="text-3xl font-bold text-blue-600">{data.session.score ?? '-'}/100</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm text-gray-500">Credibility</p>
                                        <p className={`text-3xl font-bold ${data.credibility_score > 80 ? 'text-green-600' : 'text-red-500'}`}>
                                            {data.credibility_score}%
                                        </p>
                                    </div>
                                </div>
                                <div>
                                    <span className="text-gray-500">Started:</span>
                                    <span className="ml-2 text-gray-900">{new Date(data.session.started_at).toLocaleString()}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">Duration:</span>
                                    <span className="ml-2 text-gray-900">{data.session.duration_minutes} mins</span>
                                </div>
                                {data.session.submitted_at && (
                                    <div>
                                        <span className="text-gray-500">Submitted:</span>
                                        <span className="ml-2 text-gray-900">{new Date(data.session.submitted_at).toLocaleString()}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Violation Timeline */}
                        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2 text-lg">
                                <Shield className="w-5 h-5 text-blue-600" />
                                Violation Timeline
                            </h3>
                            {data.violations.length === 0 ? (
                                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2 opacity-50" />
                                    <p>No violations detected during this session.</p>
                                </div>
                            ) : (
                                <div className="relative border-l-2 border-gray-200 ml-3 space-y-6">
                                    {data.violations.map((violation: any, idx: number) => (
                                        <div key={idx} className="ml-6 relative">
                                            <div className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full border-2 bg-white ${violation.severity === 'critical' ? 'border-red-500' :
                                                violation.severity === 'high' ? 'border-orange-500' :
                                                    violation.severity === 'medium' ? 'border-yellow-500' :
                                                        'border-blue-500'
                                                }`} />
                                            <div className={`p-4 rounded-lg border ${violation.severity === 'critical' ? 'bg-red-50 border-red-100' :
                                                violation.severity === 'high' ? 'bg-orange-50 border-orange-100' :
                                                    violation.severity === 'medium' ? 'bg-yellow-50 border-yellow-100' :
                                                        'bg-blue-50 border-blue-100'
                                                }`}>
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className={`font-semibold ${violation.severity === 'critical' ? 'text-red-900' :
                                                            violation.severity === 'high' ? 'text-orange-900' :
                                                                violation.severity === 'medium' ? 'text-yellow-900' :
                                                                    'text-blue-900'
                                                            }`}>
                                                            {violation.type.replace(/_/g, ' ')}
                                                        </p>
                                                        <p className="text-sm text-gray-600 mt-1">
                                                            Severity: <span className="capitalize font-medium">{violation.severity}</span>
                                                        </p>
                                                        {violation.metadata && (
                                                            <p className="text-xs text-gray-500 mt-1">
                                                                {JSON.stringify(violation.metadata)}
                                                            </p>
                                                        )}
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
        </div>

    );
};





