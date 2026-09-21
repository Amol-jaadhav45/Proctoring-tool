import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { AdminLayout } from '../components/AdminLayout';
import { Loader2, Trophy, AlertTriangle, FileText, Download, ArrowLeft, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';
import { useMutation } from 'convex/react';
import type { Id } from '../../../convex/_generated/dataModel';

export const ExamResultsReport: React.FC = () => {
    const { examId } = useParams<{ examId: string }>();
    const navigate = useNavigate();

    // Fetch exam details
    const exam = useQuery(
        api.exams.getById,
        examId ? { id: examId as Id<'exams'> } : 'skip'
    );

    // Fetch completed sessions with details
    const completedSessions = useQuery(
        examId ? ((api.sessions as any).getCompletedSessionsForExam) : 'skip',
        examId ? { exam_id: examId as Id<'exams'> } : 'skip'
    ) as any[] | undefined;

    const [selectedSession, setSelectedSession] = useState<Id<'exam_sessions'> | null>(null);
    const publishResults = useMutation((api.exams as any).publishResults);

    const handlePublishResults = async (published: boolean) => {
        if (!examId) return;
        try {
            await publishResults({
                exam_id: examId as Id<'exams'>,
                published: published
            });
            alert(published ? 'Results published successfully. Students can now view their results.' : 'Results unpublished. Students can no longer view their results.');
        } catch (error) {
            console.error('Failed to publish results:', error);
            alert('Failed to update results visibility.');
        }
    };

    if (!examId) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-gray-100 max-w-md">
                        <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-gray-900">No Exam Selected</h2>
                        <p className="text-gray-600 mt-2">Please select an exam to view results.</p>
                        <button
                            onClick={() => navigate('/admin/exams')}
                            className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                        >
                            Back to Exams
                        </button>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    if (!exam || completedSessions === undefined) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    <span className="ml-3 text-gray-600">Loading exam results...</span>
                </div>
            </AdminLayout>
        );
    }

    const sessions = (completedSessions || []) as any[];
    const totalStudents = sessions.length;
    const averageScore = totalStudents > 0
        ? Math.round(sessions.reduce((sum: number, s: any) => sum + (s.score || 0), 0) / totalStudents)
        : 0;
    const passedCount = sessions.filter((s: any) => (s.score || 0) >= 60).length;
    const failedCount = totalStudents - passedCount;

    const exportReport = () => {
        const reportData = {
            exam: {
                title: exam.title,
                description: exam.description,
                duration_minutes: exam.duration_minutes,
            },
            summary: {
                total_students: totalStudents,
                average_score: averageScore,
                passed: passedCount,
                failed: failedCount,
            },
            students: sessions.map((s: any) => ({
                student_id: s.user_id,
                student_name: s.user_profile?.name || 'Unknown',
                score: s.score || 0,
                violations: s.violation_count || 0,
                started_at: s.started_at,
                submitted_at: s.submitted_at,
                credibility_score: s.credibility_score || 100,
            })),
        };

        const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `exam-results-${exam.title.replace(/\s+/g, '-')}-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <AdminLayout>
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <button
                                    onClick={() => navigate(-1)}
                                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    Back
                                </button>
                                <h1 className="text-3xl font-bold text-gray-900">{exam.title} - Results Report</h1>
                                <p className="text-gray-600 mt-2">{exam.description || 'Exam Results and Log Reports'}</p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => handlePublishResults(!(exam as any).results_published)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${(exam as any).results_published
                                        ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                                        : 'bg-green-600 text-white hover:bg-green-700'
                                        }`}
                                >
                                    {(exam as any).results_published ? (
                                        <>
                                            <EyeOff className="w-5 h-5" />
                                            Unpublish Results
                                        </>
                                    ) : (
                                        <>
                                            <Eye className="w-5 h-5" />
                                            Publish Results
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={exportReport}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                                >
                                    <Download className="w-5 h-5" />
                                    Export Report
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 font-medium">Total Students</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-2">{totalStudents}</p>
                                </div>
                                <FileText className="w-10 h-10 text-blue-500" />
                            </div>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 font-medium">Average Score</p>
                                    <p className="text-3xl font-bold text-gray-900 mt-2">{averageScore}%</p>
                                </div>
                                <Trophy className="w-10 h-10 text-yellow-500" />
                            </div>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-green-200 p-6 bg-green-50">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 font-medium">Passed</p>
                                    <p className="text-3xl font-bold text-green-700 mt-2">{passedCount}</p>
                                </div>
                                <CheckCircle className="w-10 h-10 text-green-500" />
                            </div>
                        </div>
                        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6 bg-red-50">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600 font-medium">Failed</p>
                                    <p className="text-3xl font-bold text-red-700 mt-2">{failedCount}</p>
                                </div>
                                <XCircle className="w-10 h-10 text-red-500" />
                            </div>
                        </div>
                    </div>

                    {/* Results Table */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-xl font-bold text-gray-900">Student Results for {exam.title} (Sorted by Score)</h2>
                        </div>
                        {sessions.length === 0 ? (
                            <div className="p-12 text-center">
                                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500 font-medium">No completed exams yet</p>
                                <p className="text-sm text-gray-400 mt-2">Results will appear here once students complete the exam.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Rank</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Student</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Score</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Violations</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Credibility</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Submitted</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {sessions.map((session: any, index: number) => {
                                            const score = session.score || 0;
                                            const isPassing = score >= 60;
                                            const violations = session.violations || [];
                                            const criticalViolations = violations.filter((v: any) => v.severity === 'critical').length;

                                            return (
                                                <tr
                                                    key={session._id}
                                                    className={`hover:bg-gray-50 transition-colors ${selectedSession === session._id ? 'bg-blue-50' : ''
                                                        }`}
                                                >
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            {index < 3 && (
                                                                <Trophy className={`w-5 h-5 mr-2 ${index === 0 ? 'text-yellow-500' :
                                                                    index === 1 ? 'text-gray-400' :
                                                                        'text-orange-500'
                                                                    }`} />
                                                            )}
                                                            <span className="text-sm font-bold text-gray-900">#{index + 1}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div>
                                                            <p className="text-sm font-bold text-gray-900">
                                                                {session.user_profile?.name || 'Unknown Student'}
                                                            </p>
                                                            <p className="text-xs text-gray-500">ID: {session.user_id.slice(0, 8)}...</p>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`text-lg font-bold ${isPassing ? 'text-green-600' : 'text-red-600'
                                                            }`}>
                                                            {score}%
                                                        </span>
                                                        {isPassing ? (
                                                            <CheckCircle className="w-4 h-4 text-green-500 inline-block ml-2" />
                                                        ) : (
                                                            <XCircle className="w-4 h-4 text-red-500 inline-block ml-2" />
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-sm font-bold ${session.violation_count > 0 ? 'text-red-600' : 'text-gray-600'
                                                                }`}>
                                                                {session.violation_count}
                                                            </span>
                                                            {criticalViolations > 0 && (
                                                                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold">
                                                                    {criticalViolations} Critical
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-2 h-2 rounded-full ${(session.credibility_score || 100) >= 80 ? 'bg-green-500' :
                                                                (session.credibility_score || 100) >= 60 ? 'bg-yellow-500' :
                                                                    'bg-red-500'
                                                                }`}></div>
                                                            <span className="text-sm font-medium text-gray-900">
                                                                {session.credibility_score || 100}%
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                        {session.submitted_at
                                                            ? new Date(session.submitted_at).toLocaleString()
                                                            : 'N/A'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <button
                                                            onClick={() => setSelectedSession(
                                                                selectedSession === session._id ? null : session._id
                                                            )}
                                                            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                                                        >
                                                            {selectedSession === session._id ? 'Hide' : 'View'} Log
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Detailed Log Report for Selected Session */}
                    {selectedSession && (
                        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-4">Detailed Log Report</h3>
                            {(() => {
                                const session = sessions.find((s: any) => s._id === selectedSession);
                                if (!session) return null;

                                const violations = session.violations || [];
                                const studentName = session.extracted_name
                                    || session.user_profile?.name
                                    || session.user_id?.slice(0, 8)
                                    || 'Student';

                                return (
                                    <div>
                                        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                                            <h4 className="font-bold text-gray-900 mb-2">{studentName} - Session Details</h4>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                <div>
                                                    <p className="text-gray-600">Score</p>
                                                    <p className="font-bold text-gray-900">{session.score || 0}%</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-600">Started</p>
                                                    <p className="font-bold text-gray-900">
                                                        {new Date(session.started_at).toLocaleString()}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-600">Submitted</p>
                                                    <p className="font-bold text-gray-900">
                                                        {session.submitted_at
                                                            ? new Date(session.submitted_at).toLocaleString()
                                                            : 'N/A'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-600">Credibility</p>
                                                    <p className="font-bold text-gray-900">{session.credibility_score || 100}%</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                                                <AlertTriangle className="w-5 h-5 text-red-500" />
                                                Violations Log ({violations.length})
                                            </h4>
                                            {violations.length === 0 ? (
                                                <p className="text-gray-500 text-sm">No violations detected during this exam session.</p>
                                            ) : (
                                                <div className="space-y-2">
                                                    {violations.map((violation: any, idx: number) => (
                                                        <div
                                                            key={idx}
                                                            className={`p-3 rounded-lg border ${violation.severity === 'critical'
                                                                ? 'bg-red-50 border-red-200'
                                                                : violation.severity === 'high'
                                                                    ? 'bg-orange-50 border-orange-200'
                                                                    : 'bg-yellow-50 border-yellow-200'
                                                                }`}
                                                        >
                                                            <div className="flex items-start justify-between">
                                                                <div>
                                                                    <p className="font-bold text-sm text-gray-900">
                                                                        {violation.type.replace(/_/g, ' ')}
                                                                    </p>
                                                                    <p className="text-xs text-gray-600 mt-1">
                                                                        {new Date(violation.timestamp).toLocaleString()}
                                                                    </p>
                                                                </div>
                                                                <span className={`text-xs font-bold px-2 py-1 rounded ${violation.severity === 'critical'
                                                                    ? 'bg-red-200 text-red-800'
                                                                    : violation.severity === 'high'
                                                                        ? 'bg-orange-200 text-orange-800'
                                                                        : 'bg-yellow-200 text-yellow-800'
                                                                    }`}>
                                                                    {violation.severity.toUpperCase()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
};
