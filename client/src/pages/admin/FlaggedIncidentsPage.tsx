import React, { useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRecentViolations } from '../../hooks/useConvexMonitoring';
import { useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { CheckCircle, XCircle, Eye, Loader2, Image as ImageIcon, X, ChevronDown, ChevronRight } from 'lucide-react';
import { SessionDetailModal } from '../../components/SessionDetailModal';

export const FlaggedIncidentsPage: React.FC = () => {
    const { user: _user } = useAuth();
    // const [violations, setViolations] = useState<any[]>([]); // Removed state, using real-time data
    // const [loading, setLoading] = useState(true); // Removed state, using real-time data

    const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
    const [selectedSnapshot, setSelectedSnapshot] = useState<{ image: string; violation: any } | null>(null);
    const [expandedStudents, setExpandedStudents] = useState<Set<string>>(new Set());
    const [expandedExams, setExpandedExams] = useState<Set<string>>(new Set());

    // Real-time violations via Convex
    const { violations, loading } = useRecentViolations(100);

    const resolveViolation = useMutation(api.violations.resolveViolation);
    const dismissViolation = useMutation(api.violations.dismissViolation);

    // Group violations by student, then by exam
    const groupedViolations = useMemo(() => {
        const grouped: Record<string, Record<string, { examTitle: string; violations: any[] }>> = {};

        // Only show open violations (or maybe show all but visually distinguish? Let's show all for history but filter default?)
        // For now, let's include all so proctors can see history.
        violations.forEach((violation: any) => {
            if (violation.status === 'dismissed' || violation.status === 'resolved') return; // Hide processed ones from default view to reduce clutter

            const studentName = violation.user_profile?.name || 'Unknown';
            const examTitle = violation.exam?.title || violation.session?.exam_id || 'Unknown Exam';
            const examId = violation.session?.exam_id || 'unknown';

            if (!grouped[studentName]) {
                grouped[studentName] = {};
            }
            if (!grouped[studentName][examId]) {
                grouped[studentName][examId] = {
                    examTitle,
                    violations: []
                };
            }
            grouped[studentName][examId].violations.push(violation);
        });

        // Sort violations within each exam by timestamp
        Object.keys(grouped).forEach(studentName => {
            Object.keys(grouped[studentName]).forEach(examId => {
                grouped[studentName][examId].violations.sort((a, b) =>
                    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                );
            });
        });

        return grouped;
    }, [violations]);

    const handleResolve = async (violationId: Id<"violations">) => {
        if (confirm('Mark this violation as resolved?')) {
            try {
                await resolveViolation({ violationId });
            } catch (error) {
                console.error("Failed to resolve violation:", error);
                alert("Failed to resolve violation");
            }
        }
    };

    const handleDismiss = async (violationId: Id<"violations">) => {
        if (confirm('Dismiss this violation? This action cannot be undone.')) {
            try {
                await dismissViolation({ violationId });
            } catch (error) {
                console.error("Failed to dismiss violation:", error);
                alert("Failed to dismiss violation");
            }
        }
    };

    const toggleStudent = (studentName: string) => {
        const newExpanded = new Set(expandedStudents);
        if (newExpanded.has(studentName)) {
            newExpanded.delete(studentName);
        } else {
            newExpanded.add(studentName);
        }
        setExpandedStudents(newExpanded);
    };

    const toggleExam = (studentName: string, examId: string) => {
        const key = `${studentName}-${examId}`;
        const newExpanded = new Set(expandedExams);
        if (newExpanded.has(key)) {
            newExpanded.delete(key);
        } else {
            newExpanded.add(key);
        }
        setExpandedExams(newExpanded);
    };


    return (
        <div className="flex-1 p-8">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">Flagged Incidents & Violations</h1>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    </div>
                ) : (
                    <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-200">
                            <h2 className="text-xl font-semibold text-gray-900">Active Violations</h2>
                        </div>
                        <div className="divide-y divide-gray-200">
                            {Object.keys(groupedViolations).length === 0 ? (
                                <div className="px-6 py-12 text-center">
                                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3 opacity-50" />
                                    <p className="text-gray-500 text-sm">No active violations found</p>
                                </div>
                            ) : (
                                Object.entries(groupedViolations).map(([studentName, exams]) => {
                                    const isStudentExpanded = expandedStudents.has(studentName);
                                    const totalViolations = Object.values(exams).reduce((sum, exam) => sum + exam.violations.length, 0);

                                    return (
                                        <div key={studentName} className="border-b border-gray-200 last:border-b-0">
                                            {/* Student Header */}
                                            <div
                                                onClick={() => toggleStudent(studentName)}
                                                className="px-6 py-4 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors flex items-center justify-between"
                                            >
                                                <div className="flex items-center gap-3">
                                                    {isStudentExpanded ? (
                                                        <ChevronDown className="w-5 h-5 text-gray-600" />
                                                    ) : (
                                                        <ChevronRight className="w-5 h-5 text-gray-600" />
                                                    )}
                                                    <div>
                                                        <h3 className="text-lg font-semibold text-gray-900">{studentName}</h3>
                                                        <p className="text-sm text-gray-500">
                                                            {Object.keys(exams).length} exam{Object.keys(exams).length !== 1 ? 's' : ''} • {totalViolations} violation{totalViolations !== 1 ? 's' : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Exams List */}
                                            {isStudentExpanded && (
                                                <div className="bg-white">
                                                    {Object.entries(exams).map(([examId, examData]) => {
                                                        const examKey = `${studentName}-${examId}`;
                                                        const isExamExpanded = expandedExams.has(examKey);

                                                        return (
                                                            <div key={examId} className="border-t border-gray-200">
                                                                {/* Exam Header */}
                                                                <div
                                                                    onClick={() => toggleExam(studentName, examId)}
                                                                    className="px-10 py-3 bg-gray-50/50 hover:bg-gray-100/50 cursor-pointer transition-colors flex items-center justify-between"
                                                                >
                                                                    <div className="flex items-center gap-3">
                                                                        {isExamExpanded ? (
                                                                            <ChevronDown className="w-4 h-4 text-gray-500" />
                                                                        ) : (
                                                                            <ChevronRight className="w-4 h-4 text-gray-500" />
                                                                        )}
                                                                        <div>
                                                                            <h4 className="text-base font-medium text-gray-800">{examData.examTitle}</h4>
                                                                            <div className="flex items-center gap-3 text-xs text-gray-500">
                                                                                <span>{examData.violations.length} violation{examData.violations.length !== 1 ? 's' : ''}</span>
                                                                                <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                                                                <span className={`font-medium ${(examData.violations[0]?.session?.credibility_score ?? 100) < 50 ? 'text-red-600' : 'text-gray-700'}`}>
                                                                                    Credibility: {examData.violations[0]?.session?.credibility_score ?? 100}%
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Violations List */}
                                                                {isExamExpanded && (
                                                                    <div className="bg-white">
                                                                        <div className="overflow-x-auto">
                                                                            <table className="w-full">
                                                                                <thead className="bg-gray-50">
                                                                                    <tr>
                                                                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Violation Type</th>
                                                                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Severity</th>
                                                                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Timestamp</th>
                                                                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody className="divide-y divide-gray-200">
                                                                                    {(examData.violations || []).map((violation: any) => (
                                                                                        <tr key={violation._id || violation.id} className="hover:bg-gray-50">
                                                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                                                <div className="text-sm text-gray-700">{violation.type}</div>
                                                                                            </td>
                                                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                                                <span className={`px-2 py-1 text-xs font-bold rounded ${violation.severity === 'critical' ? 'bg-red-100 text-red-700' :
                                                                                                    violation.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                                                                                                        violation.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                                                                                            'bg-blue-100 text-blue-700'
                                                                                                    }`}>
                                                                                                    {violation.severity}
                                                                                                </span>
                                                                                            </td>
                                                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                                                                {new Date(violation.timestamp).toLocaleString()}
                                                                                            </td>
                                                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                                                <div className="flex items-center gap-2">
                                                                                                    {violation.snapshot_url && (
                                                                                                        <button
                                                                                                            onClick={() => setSelectedSnapshot({ image: violation.snapshot_url, violation })}
                                                                                                            className="text-purple-600 hover:text-purple-700 text-sm font-medium p-1 hover:bg-purple-50 rounded"
                                                                                                            title="View Snapshot"
                                                                                                        >
                                                                                                            <ImageIcon className="w-4 h-4" />
                                                                                                        </button>
                                                                                                    )}
                                                                                                    <button
                                                                                                        onClick={() => setSelectedSessionId(violation.session_id)}
                                                                                                        className="text-blue-600 hover:text-blue-700 text-sm font-medium p-1 hover:bg-blue-50 rounded"
                                                                                                        title="View Session Details"
                                                                                                    >
                                                                                                        <Eye className="w-4 h-4" />
                                                                                                    </button>
                                                                                                    <button
                                                                                                        onClick={() => handleResolve(violation._id)}
                                                                                                        className="text-green-600 hover:text-green-700 text-sm font-medium p-1 hover:bg-green-50 rounded"
                                                                                                        title="Mark as Resolved"
                                                                                                    >
                                                                                                        <CheckCircle className="w-4 h-4" />
                                                                                                    </button>
                                                                                                    <button
                                                                                                        onClick={() => handleDismiss(violation._id)}
                                                                                                        className="text-red-600 hover:text-red-700 text-sm font-medium p-1 hover:bg-red-50 rounded"
                                                                                                        title="Dismiss Violation"
                                                                                                    >
                                                                                                        <XCircle className="w-4 h-4" />
                                                                                                    </button>
                                                                                                </div>
                                                                                            </td>
                                                                                        </tr>
                                                                                    ))}
                                                                                </tbody>
                                                                            </table>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>
            {/* Session Detail Modal */}
            {
                selectedSessionId && (
                    <SessionDetailModal
                        sessionId={selectedSessionId}
                        onClose={() => setSelectedSessionId(null)}
                    />
                )
            }

            {/* Snapshot Viewer Modal */}
            {
                selectedSnapshot && (
                    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-xl shadow-xl max-w-6xl max-h-[90vh] overflow-auto relative">
                            <div className="sticky top-0 bg-gray-900 text-white p-4 flex justify-between items-center z-10">
                                <div>
                                    <h3 className="text-lg font-bold">Violation Snapshot</h3>
                                    <p className="text-sm text-gray-300">
                                        {selectedSnapshot.violation.type} • {new Date(selectedSnapshot.violation.timestamp).toLocaleString()}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedSnapshot(null)}
                                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-4">
                                {selectedSnapshot.image ? (
                                    <img
                                        src={selectedSnapshot.image}
                                        alt="Violation snapshot"
                                        className="w-full h-auto rounded-lg border border-gray-200"
                                        onError={(e) => {
                                            console.error('Failed to load violation image:', selectedSnapshot.image);
                                            (e.target as HTMLImageElement).style.display = 'none';
                                            const errorDiv = document.createElement('div');
                                            errorDiv.className = 'text-center p-8 text-gray-500';
                                            errorDiv.textContent = 'Image not available';
                                            (e.target as HTMLImageElement).parentElement?.appendChild(errorDiv);
                                        }}
                                    />
                                ) : (
                                    <div className="text-center p-8 text-gray-500">
                                        <ImageIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                                        <p>No snapshot available for this violation</p>
                                    </div>
                                )}
                                {selectedSnapshot.violation.metadata && (
                                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                                        <h4 className="font-semibold mb-2">Metadata</h4>
                                        <pre className="text-xs overflow-auto">
                                            {JSON.stringify(selectedSnapshot.violation.metadata, null, 2)}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    );
};

