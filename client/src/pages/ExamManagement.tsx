import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { examManagementApi } from '../services/api';
import { Plus, Edit, Trash2, Loader2, BookOpen, FileText, Eye, Users, Clock, Calendar } from 'lucide-react';
import { CreateExamModal } from '../components/CreateExamModal';
import { EditExamModal } from '../components/EditExamModal';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

export const ExamManagement: React.FC = () => {
    const navigate = useNavigate();
    const { user: _user } = useAuth();

    // Switch to Convex for real-time exam management
    const convexExams = useQuery(api.monitoring.getAllExamsWithStats);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingExam, setEditingExam] = useState<any>(null);

    const loading = convexExams === undefined;
    const exams = (convexExams || []).map(e => ({
        ...e,
        id: e._id
    }));

    const handleDelete = async (id: string | any) => {
        if (!confirm('Are you sure you want to delete this exam? This action cannot be undone.')) {
            return;
        }

        try {
            await examManagementApi.delete(id);
        } catch (err: any) {
            console.error('Error deleting exam:', err);
            alert(`Failed to delete exam: ${err.message || 'Unknown error'}`);
        }
    };

    return (
        <div className="flex-1 p-8 overflow-auto bg-gray-50 dark:bg-gray-900 transition-colors">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            <BookOpen className="w-8 h-8 text-blue-600" />
                            Exam Management & Monitoring
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Manage exams and monitor live student activity in real-time</p>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        Create New Exam
                    </button>
                </div>

                {/* Exams Grid */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24">
                        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                        <span className="mt-4 text-gray-500 font-medium">Synchronizing examination data...</span>
                    </div>
                ) : exams.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-16 text-center">
                        <div className="w-20 h-20 bg-gray-50 dark:bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <BookOpen className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No exams created yet</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-sm mx-auto">Click the button above to create your first examination and start proctoring students.</p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold transition-all shadow-lg shadow-blue-500/10"
                        >
                            <Plus className="w-5 h-5" />
                            Create Your First Exam
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {exams.map((exam) => (
                            <div key={exam.id} className="group bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 hover:shadow-xl hover:border-blue-100 dark:hover:border-blue-900/30 transition-all duration-300 flex flex-col">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors uppercase tracking-tight">
                                            {exam.title}
                                        </h3>
                                        <div className="flex items-center gap-4 text-xs font-medium text-gray-500 dark:text-gray-400">
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5" />
                                                {exam.duration_minutes}m
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Users className="w-3.5 h-3.5" />
                                                {exam.questions.length || 0} Questions
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-2">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${exam.is_active
                                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                            : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                            }`}>
                                            {exam.is_active ? "Active" : "Closed"}
                                        </span>
                                        {exam.activeStudents > 0 && (
                                            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[10px] font-bold rounded-md animate-pulse">
                                                <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                                                {exam.activeStudents} LIVE
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex-1">
                                    {exam.scheduled_for && (
                                        <div className="text-xs text-indigo-600 dark:text-indigo-400 mb-4 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-2 rounded-lg font-bold flex items-center gap-2">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {new Date(exam.scheduled_for).toLocaleString()}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-2 mt-4">
                                    <button
                                        onClick={() => navigate(`/proctor/monitor/${exam.id}`)}
                                        className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-bold transition-all text-xs ${exam.activeStudents > 0
                                            ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20"
                                            : "bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400"
                                            }`}
                                    >
                                        <Eye className="w-4 h-4" />
                                        Monitor
                                    </button>
                                    <button
                                        onClick={() => navigate(`/proctor/exam-results/${exam.id}`)}
                                        className="flex items-center justify-center gap-2 px-3 py-2.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/30 font-bold transition-all text-xs"
                                    >
                                        <FileText className="w-4 h-4" />
                                        Analysis
                                    </button>
                                    <button
                                        onClick={() => setEditingExam(exam)}
                                        className="flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 font-bold transition-all text-xs border border-gray-100 dark:border-gray-600"
                                    >
                                        <Edit className="w-3.5 h-3.5" />
                                        Configure
                                    </button>
                                    <button
                                        onClick={() => handleDelete(exam.id)}
                                        className="flex items-center justify-center gap-2 px-3 py-2.5 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-600 hover:text-white font-bold transition-all text-xs"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modals */}
            {showCreateModal && (
                <CreateExamModal
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => {
                        setShowCreateModal(false);
                    }}
                />
            )}

            {editingExam && (
                <EditExamModal
                    exam={editingExam}
                    onClose={() => setEditingExam(null)}
                    onSuccess={() => {
                        setEditingExam(null);
                    }}
                />
            )}
        </div>
    );
};

