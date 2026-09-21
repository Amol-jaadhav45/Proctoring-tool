import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
    Loader2, Clock, LogOut, LayoutDashboard,
    Activity, Calendar, Plus,
    Eye, FileText, BarChart3, TrendingUp, Users
} from 'lucide-react';
import { NotificationBell } from '../components/NotificationBell';

import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

export const ProctorDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { user, signOut } = useAuth();

    // Use Convex queries for real-time data
    const allExams = useQuery(api.exams.getAll, {}) || [];
    const allSessions = useQuery(api.sessions.getAll, {}) || [];
    const proctorAnalytics = useQuery(api.analytics.getProctorStats, {}) || {
        liveExams: 0,
        totalExamsConducted: 0,
        averageIntegrity: 0,
        violationRate: 0,
        totalStudentsProctored: 0
    };

    // Calculate stats from real-time data
    const stats = useMemo(() => {
        return {
            liveExams: proctorAnalytics.liveExams,
            studentsBeingProctored: proctorAnalytics.liveExams,
            totalExamsConducted: proctorAnalytics.totalExamsConducted,
            averageIntegrity: proctorAnalytics.averageIntegrity,
            violationRate: proctorAnalytics.violationRate
        };
    }, [proctorAnalytics]);

    const upcomingExams = useMemo(() => {
        const activeExams = allExams.filter((e: any) => e.is_active).slice(0, 5);
        return activeExams.map((exam: any) => ({
            id: exam._id || exam.id,
            title: exam.title,
            scheduled_at: exam.created_at,
            duration_minutes: exam.duration_minutes,
            student_count: allSessions.filter((s: any) => (s.exam_id === exam._id || s.exam_id === exam.id)).length,
            proctoring_type: 'AI Proctoring'
        }));
    }, [allExams, allSessions]);

    const loading = allExams === undefined || allSessions === undefined;

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    if (loading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                <p className="mt-4 text-gray-500 font-medium tracking-wide">Initializing Proctor Center...</p>
            </div>
        );
    }

    return (
        <div className="flex-1 p-8 overflow-auto bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
            <div className="max-w-7xl mx-auto">
                {/* Header - Consistent with ExamManagement.tsx */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                            <LayoutDashboard className="w-8 h-8 text-blue-600" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white uppercase tracking-tight">
                                Proctor Dashboard
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400 mt-1">Welcome back, {user?.name || 'Proctor'}. Monitor and manage your examinations.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <NotificationBell />
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 font-bold transition-all border border-gray-200 dark:border-gray-700"
                        >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                        </button>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="space-y-8">
                    {/* Stat Cards - Classic Professional Style */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <ClassicStatCard
                            title="Live Sessions"
                            value={stats.liveExams}
                            icon={Activity}
                            color="blue"
                            active={stats.liveExams > 0}
                        />
                        <ClassicStatCard
                            title="Avg. Integrity"
                            value={`${stats.averageIntegrity}%`}
                            icon={TrendingUp}
                            color="indigo"
                        />
                        <ClassicStatCard
                            title="Total Exams"
                            value={stats.totalExamsConducted}
                            icon={FileText}
                            color="purple"
                        />
                        <ClassicStatCard
                            title="Violation Rate"
                            value={`${stats.violationRate}%`}
                            icon={BarChart3}
                            color="red"
                        />
                    </div>

                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Exams List - Matching ExamManagement Cards */}
                        <div className="lg:col-span-2">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 uppercase tracking-tight">
                                    <Calendar className="w-5 h-5 text-blue-600" />
                                    Active & Upcoming
                                </h2>
                                <button
                                    onClick={() => navigate('/proctor/exams')}
                                    className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                                >
                                    Manage All Exams
                                </button>
                            </div>

                            <div className="space-y-4">
                                {upcomingExams.length === 0 ? (
                                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
                                        <Calendar className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
                                        <p className="text-gray-500 dark:text-gray-400 font-medium">No sessions scheduled at the moment.</p>
                                    </div>
                                ) : (
                                    upcomingExams.map((exam) => (
                                        <div
                                            key={exam.id}
                                            onClick={() => navigate(`/proctor/monitor/${exam.id}`)}
                                            className="group bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-900 transition-all cursor-pointer flex items-center justify-between"
                                        >
                                            <div className="flex items-center gap-5">
                                                <div className="w-14 h-14 bg-gray-50 dark:bg-gray-900 rounded-xl flex flex-col items-center justify-center border border-gray-100 dark:border-gray-700 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/10 transition-colors">
                                                    <span className="text-[10px] font-black text-gray-400 uppercase leading-none">
                                                        {new Date(exam.scheduled_at).toLocaleString('default', { month: 'short' })}
                                                    </span>
                                                    <span className="text-xl font-bold text-gray-700 dark:text-gray-300 leading-none mt-1">
                                                        {new Date(exam.scheduled_at).getDate()}
                                                    </span>
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 uppercase tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                        {exam.title}
                                                    </h3>
                                                    <div className="flex items-center gap-4">
                                                        <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 font-medium">
                                                            <Clock className="w-4 h-4" /> {exam.duration_minutes}m
                                                        </span>
                                                        <span className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-bold">
                                                            <Users className="w-4 h-4" /> {exam.student_count} Students
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-[10px] font-black uppercase rounded-lg border border-gray-200 dark:border-gray-600">
                                                    {exam.proctoring_type}
                                                </span>
                                                <div className="p-3 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
                                                    <Eye className="w-5 h-5" />
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Quick Actions Sidebar */}
                        <div className="space-y-6">
                            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                                <h3 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] mb-6">Quick Actions</h3>
                                <div className="grid gap-3">
                                    <QuickActionLink
                                        label="Manage Students"
                                        icon={Users}
                                        onClick={() => navigate('/proctor/users')}
                                        color="blue"
                                    />
                                    <QuickActionLink
                                        label="Exam Management"
                                        icon={FileText}
                                        onClick={() => navigate('/proctor/exams')}
                                        color="indigo"
                                    />
                                    <QuickActionLink
                                        label="Violation Center"
                                        icon={Activity}
                                        onClick={() => navigate('/proctor/violations')}
                                        color="red"
                                    />
                                    <QuickActionLink
                                        label="Exam Schedule"
                                        icon={Calendar}
                                        onClick={() => navigate('/proctor/scheduling')}
                                        color="amber"
                                    />
                                </div>
                            </div>

                            {/* System Status - Clean Style */}
                            <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-xl shadow-blue-500/20">
                                <h4 className="text-sm font-bold uppercase tracking-tight mb-2">Systems Online</h4>
                                <p className="text-blue-100 text-[11px] leading-relaxed mb-4">
                                    AI monitoring and streaming services are active. High accuracy mode is enabled.
                                </p>
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg w-full border border-white/10">
                                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-100">Healthy Sync Active</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface ClassicStatCardProps {
    title: string;
    value: string | number;
    icon: any;
    color: 'blue' | 'indigo' | 'purple' | 'red';
    active?: boolean;
}

const ClassicStatCard: React.FC<ClassicStatCardProps> = ({ title, value, icon: Icon, color, active }) => {
    const colors = {
        blue: "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
        indigo: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20",
        purple: "text-purple-600 bg-purple-50 dark:bg-purple-900/20",
        red: "text-red-600 bg-red-50 dark:bg-red-900/20"
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">{title}</span>
                <div className={`p-2.5 rounded-xl ${colors[color]} group-hover:scale-110 transition-transform`}>
                    <Icon className="w-5 h-5" />
                </div>
            </div>
            <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter">{value}</span>
                {active && (
                    <span className="text-[10px] font-black text-green-600 dark:text-green-400 uppercase tracking-tighter leading-none px-2 py-0.5 bg-green-50 dark:bg-green-900/20 rounded border border-green-100 dark:border-green-900/30">
                        Live Now
                    </span>
                )}
            </div>
        </div>
    );
};

interface QuickActionLinkProps {
    label: string;
    icon: any;
    onClick: () => void;
    color: string;
}

const QuickActionLink: React.FC<QuickActionLinkProps> = ({ label, icon: Icon, onClick, color }) => {
    const colors: any = {
        blue: "text-blue-600 bg-blue-50 dark:bg-blue-900/10",
        indigo: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/10",
        red: "text-red-600 bg-red-50 dark:bg-red-900/10",
        amber: "text-amber-600 bg-amber-50 dark:bg-amber-900/10"
    };

    return (
        <button
            onClick={onClick}
            className="flex items-center gap-4 w-full p-4 bg-white dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-900/30 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all group"
        >
            <div className={`p-2.5 rounded-lg ${colors[color] || colors.blue}`}>
                <Icon className="w-4.5 h-4.5" />
            </div>
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 uppercase tracking-tight transition-colors">
                {label}
            </span>
        </button>
    );
};
