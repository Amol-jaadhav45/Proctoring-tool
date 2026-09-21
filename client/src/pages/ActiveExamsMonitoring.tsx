import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ProctorLayout } from '../components/ProctorLayout';
import { Loader2, Eye, Users, Clock } from 'lucide-react';
import { useActiveExams } from '../hooks/useConvexMonitoring';

export const ActiveExamsMonitoring: React.FC = () => {
    const navigate = useNavigate();
    const { exams, loading } = useActiveExams();
    console.log('[DEBUG] ActiveExamsMonitoring:', { exams, loading });

    const handleMonitorExam = (examId: string) => {
        navigate(`/proctor/monitor/${examId}`);
    };

    return (
        <ProctorLayout>
            <div className="p-6 max-w-7xl mx-auto">
                {/* Page Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Live Monitoring
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Select an active exam to monitor students in real-time
                    </p>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Active Exams</p>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                                    {exams.length}
                                </p>
                            </div>
                            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                <Eye className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Total Students</p>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                                    {exams.reduce((sum: number, exam: any) => sum + exam.activeStudents, 0)}
                                </p>
                            </div>
                            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Auto-Refresh</p>
                                <p className="text-lg font-semibold text-gray-900 dark:text-white mt-1">
                                    Every 10s
                                </p>
                            </div>
                            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                                <Clock className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Active Exams List */}
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                ) : exams.length === 0 ? (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-12 text-center border border-gray-200 dark:border-gray-700">
                        <Eye className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            No Active Exams
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            There are no exams currently in progress. Active exams will appear here when students start taking them.
                        </p>
                        <button
                            onClick={() => navigate('/proctor/exams')}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Go to Exam Management
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {exams.map((exam: any) => {
                            const isScheduled = !!exam.scheduled_for;
                            const scheduledDate = isScheduled ? new Date(exam.scheduled_for) : null;
                            const isFuture = scheduledDate && scheduledDate.getTime() > Date.now();
                            const isLive = exam.activeStudents > 0;

                            return (
                                <div
                                    key={exam.id || exam._id}
                                    className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                                                    {exam.title}
                                                </h3>
                                                {isLive ? (
                                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 animate-pulse">
                                                        LIVE NOW
                                                    </span>
                                                ) : isFuture ? (
                                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                                        UPCOMING
                                                    </span>
                                                ) : (
                                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                                        READY
                                                    </span>
                                                )}
                                            </div>

                                            {exam.description && (
                                                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                                                    {exam.description}
                                                </p>
                                            )}

                                            <div className="flex flex-wrap gap-4 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <Users className="w-4 h-4 text-gray-500" />
                                                    <span className="text-gray-700 dark:text-gray-300">
                                                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                                                            {exam.activeStudents}
                                                        </span> active student{exam.activeStudents !== 1 ? 's' : ''}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-4 h-4 text-gray-500" />
                                                    <span className="text-gray-700 dark:text-gray-300">
                                                        Duration: <span className="font-semibold">
                                                            {exam.duration_minutes} minutes
                                                        </span>
                                                    </span>
                                                </div>

                                                {isScheduled && (
                                                    <div className="flex items-center gap-2">
                                                        <Clock className="w-4 h-4 text-purple-500" />
                                                        <span className="text-gray-700 dark:text-gray-300 font-medium">
                                                            Scheduled: {scheduledDate?.toLocaleString()}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleMonitorExam(exam._id)}
                                            className="ml-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-semibold"
                                        >
                                            <Eye className="w-5 h-5" />
                                            Monitor
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </ProctorLayout>
    );
};
