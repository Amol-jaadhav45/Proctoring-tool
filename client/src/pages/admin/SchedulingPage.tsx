import React, { useState, useEffect } from 'react';

import { useAuth } from '../../contexts/AuthContext';

import { examApi, examManagementApi } from '../../services/api';
import { Calendar, Plus, Clock, Users, Edit, Loader2 } from 'lucide-react';

interface ScheduledExam {
    id: string;
    exam_id: string;
    exam_title: string;
    scheduled_at: string;
    duration_minutes: number;
    max_students?: number;
    proctor_assigned?: string;
    status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}

export const SchedulingPage: React.FC = () => {
    const { user: _user } = useAuth();
    const [exams, setExams] = useState<any[]>([]);
    const [scheduledExams, setScheduledExams] = useState<ScheduledExam[]>([]);
    const [loading, setLoading] = useState(true);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [selectedExam, setSelectedExam] = useState<string>('');
    const [scheduleDate, setScheduleDate] = useState('');
    const [scheduleTime, setScheduleTime] = useState('');
    const [maxStudents, setMaxStudents] = useState<number>(50);


    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const examsData = await examApi.getAll(true); // Include inactive? Yes, to see past/future
            setExams(examsData);

            // In this system, exams themselves are scheduled via the `scheduled_for` field
            // The previous logic looked for exam_sessions, which are student attempts.
            // We want to show the exams that are scheduled.

            const scheduled = examsData
                .filter((exam: any) => exam.scheduled_for)
                .map((exam: any) => {
                    const scheduledDate = new Date(exam.scheduled_for);
                    const now = new Date();
                    let status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' = 'scheduled';

                    // Simple status logic based on time
                    // If it's in the past and active, maybe in_progress?
                    // If it's in the past and inactive, completed?

                    if (scheduledDate > now) {
                        status = 'scheduled';
                    } else if (exam.is_active) {
                        status = 'in_progress';
                    } else {
                        status = 'completed';
                    }

                    return {
                        id: exam.id, // Using exam ID as the ID here since we are listing exams, not sessions
                        exam_id: exam.id,
                        exam_title: exam.title,
                        scheduled_at: exam.scheduled_for,
                        duration_minutes: exam.duration_minutes,
                        max_students: 0, // Not currently in schema
                        status: status
                    };
                });

            setScheduledExams(scheduled);

        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleScheduleExam = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedExam || !scheduleDate || !scheduleTime) {
            alert('Please fill in all fields');
            return;
        }

        try {
            const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`);

            // Call API to update the exam
            // Note: We need to import examManagementApi at the top of the file
            await examManagementApi.update(selectedExam, {
                scheduled_for: scheduledDateTime.toISOString()
            });

            alert(`Exam scheduled for ${scheduledDateTime.toLocaleString()}`);

            setShowScheduleModal(false);
            setSelectedExam('');
            setScheduleDate('');
            setScheduleTime('');
            setMaxStudents(50);
            fetchData();
        } catch (err) {
            console.error('Error scheduling exam:', err);
            alert('Failed to schedule exam');
        }
    };

    const upcomingExams = scheduledExams.filter(e => {
        const scheduled = new Date(e.scheduled_at);
        return scheduled > new Date() && e.status === 'scheduled';
    }).sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

    const pastExams = scheduledExams.filter(e => {
        const scheduled = new Date(e.scheduled_at);
        return scheduled <= new Date() || e.status === 'completed' || e.status === 'cancelled';
    }).sort((a, b) => new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime());

    return (
        <div className="flex-1 p-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <Calendar className="w-8 h-8 text-blue-600" />
                            Exam Scheduling
                        </h1>
                        <p className="text-gray-500 mt-1">Schedule and manage exam sessions</p>
                    </div>
                    <button
                        onClick={() => setShowScheduleModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                    >
                        <Plus className="w-5 h-5" />
                        Schedule Exam
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Upcoming Exams */}
                        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Upcoming Exams</h2>
                            {upcomingExams.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>No upcoming exams scheduled</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {upcomingExams.map((exam) => (
                                        <div
                                            key={exam.id}
                                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                        >
                                            <div className="flex-1">
                                                <div className="font-semibold text-gray-900">{exam.exam_title}</div>
                                                <div className="text-sm text-gray-600 mt-1 flex items-center gap-4">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-4 h-4" />
                                                        {new Date(exam.scheduled_at).toLocaleString()}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Users className="w-4 h-4" />
                                                        Max: {exam.max_students || 'Unlimited'}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-4 h-4" />
                                                        {exam.duration_minutes} mins
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`px-3 py-1 text-xs font-medium rounded ${exam.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                                                    exam.status === 'in_progress' ? 'bg-green-100 text-green-700' :
                                                        'bg-gray-100 text-gray-700'
                                                    }`}>
                                                    {exam.status.replace('_', ' ')}
                                                </span>
                                                <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200 rounded-lg">
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Past Exams */}
                        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Past Exams</h2>
                            {pastExams.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <p>No past exams</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {pastExams.slice(0, 10).map((exam) => (
                                        <div
                                            key={exam.id}
                                            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                                        >
                                            <div className="flex-1">
                                                <div className="font-semibold text-gray-900">{exam.exam_title}</div>
                                                <div className="text-sm text-gray-600 mt-1">
                                                    {new Date(exam.scheduled_at).toLocaleString()} • {exam.duration_minutes} mins
                                                </div>
                                            </div>
                                            <span className={`px-3 py-1 text-xs font-medium rounded ${exam.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                'bg-gray-100 text-gray-700'
                                                }`}>
                                                {exam.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Schedule Modal */}
            {showScheduleModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <h2 className="text-xl font-bold mb-4">Schedule New Exam</h2>
                        <form onSubmit={handleScheduleExam} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Select Exam</label>
                                <select
                                    value={selectedExam}
                                    onChange={(e) => setSelectedExam(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    required
                                >
                                    <option value="">Choose an exam...</option>
                                    {exams.map(exam => (
                                        <option key={exam.id} value={exam.id}>{exam.title}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                                <input
                                    type="date"
                                    value={scheduleDate}
                                    onChange={(e) => setScheduleDate(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    required
                                    min={new Date().toISOString().split('T')[0]}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                                <input
                                    type="time"
                                    value={scheduleTime}
                                    onChange={(e) => setScheduleTime(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Max Students</label>
                                <input
                                    type="number"
                                    value={maxStudents}
                                    onChange={(e) => setMaxStudents(parseInt(e.target.value))}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    min={1}
                                />
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowScheduleModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Schedule Exam
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
