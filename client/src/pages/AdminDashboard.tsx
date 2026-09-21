import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
// import { AdminLayout } from '../components/AdminLayout';
import {
    Loader2, Clock, LogOut, User,
    Activity, Shield, Users, Calendar, Bell, Server,
    Eye, FileText, BarChart3, Send
} from 'lucide-react';
import { SendNotificationModal } from '../components/SendNotificationModal';
import { NotificationBell } from '../components/NotificationBell';

import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';






export const AdminDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { user, signOut } = useAuth();
    const [showNotificationModal, setShowNotificationModal] = useState(false);

    // Use Convex queries for real-time data
    const allExams = useQuery(api.exams.getAll, {}) || [];
    const allSessions = useQuery(api.sessions.getAll, {}) || [];
    const allUsers = useQuery(api.users.getAll, {}) || [];
    const insights = useQuery(api.analytics.getAdminInsights, {}) || {
        activityTrend: [],
        integrityTrend: [],
        distribution: [],
        summary: { thisWeekCount: 0, growth: 0, averageIntegrity: 100 }
    };


    // Calculate stats from real-time data
    const stats = useMemo(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

        const totalExamsToday = allExams.filter((e: any) => {
            const created = new Date(e.created_at);
            return created >= today;
        }).length;

        const totalExamsThisWeek = allExams.filter((e: any) => {
            const created = new Date(e.created_at);
            return created >= weekAgo;
        }).length;

        const totalExamsThisMonth = allExams.filter((e: any) => {
            const created = new Date(e.created_at);
            return created >= monthAgo;
        }).length;

        const liveExams = allSessions.filter((s: any) => s.status === 'in_progress' || s.status === 'active').length;

        return {
            totalExamsToday,
            totalExamsThisWeek,
            totalExamsThisMonth,
            liveExams,
            studentsBeingProctored: liveExams,
            totalUsers: allUsers.length,
            totalExamsConducted: allSessions.filter((s: any) => s.status === 'completed').length,
            systemHealth: 'healthy' as const
        };
    }, [allExams, allSessions, allUsers]);

    // Calculate upcoming exams from real-time data
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

    const notifications: any[] = []; // Notifications can be added later

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center p-8">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900 overflow-hidden transition-colors duration-200">
            <div className="flex-1 overflow-auto">
                {/* Header */}
                <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-10 transition-colors duration-200">
                    <div className="py-4 pr-6 pl-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <Shield className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                        Admin Dashboard
                                    </h1>
                                    <p className="text-sm text-gray-500 dark:text-gray-300">Comprehensive overview of your proctoring system</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => setShowNotificationModal(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    title="Send Notification"
                                >
                                    <Send className="w-4 h-4" />
                                    <span className="text-sm font-medium">Send Notification</span>
                                </button>
                                <NotificationBell />
                                <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg transition-colors">
                                    <User className="w-4 h-4 text-gray-600 dark:text-gray-200" />
                                    <span className="text-sm text-gray-700 dark:text-gray-100">{user?.email || 'Admin'}</span>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Logout
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="p-6">
                    <div className="max-w-7xl mx-auto space-y-6">
                        {/* Quick Stats Row */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <StatCard
                                title="Exams Today"
                                value={stats?.totalExamsToday || 0}
                                icon={Calendar}
                                iconColor="text-blue-600"
                                iconBg="bg-blue-100"
                                trend={`${stats?.totalExamsThisWeek || 0} this week`}
                            />
                            <StatCard
                                title="Live Exams"
                                value={stats?.liveExams || 0}
                                icon={Activity}
                                iconColor="text-green-600"
                                iconBg="bg-green-100"
                                trend={`${stats?.studentsBeingProctored || 0} students`}
                                pulse={!!(stats?.liveExams && stats.liveExams > 0)}
                            />
                            <StatCard
                                title="System Health"
                                value={stats?.systemHealth === 'healthy' ? '100%' : '75%'}
                                icon={Server}
                                iconColor={stats?.systemHealth === 'healthy' ? 'text-green-600' : 'text-yellow-600'}
                                iconBg={stats?.systemHealth === 'healthy' ? 'bg-green-100' : 'bg-yellow-100'}
                                trend="All systems operational"
                            />
                        </div>

                        {/* Main Stats Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Left Column - Exams Overview */}
                            <div className="lg:col-span-2 space-y-6">
                                {/* Exams Scheduled */}
                                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 p-6 transition-colors duration-200">
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                            <Calendar className="w-5 h-5 text-blue-600" />
                                            Exams Scheduled
                                        </h2>
                                        <button
                                            onClick={() => navigate('/admin/exams')}
                                            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                                        >
                                            View All →
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 mb-6">
                                        <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg transition-colors">
                                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats?.totalExamsToday || 0}</div>
                                            <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">Today</div>
                                        </div>
                                        <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg transition-colors">
                                            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats?.totalExamsThisWeek || 0}</div>
                                            <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">This Week</div>
                                        </div>
                                        <div className="text-center p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg transition-colors">
                                            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{stats?.totalExamsThisMonth || 0}</div>
                                            <div className="text-xs text-gray-600 dark:text-gray-300 mt-1">This Month</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Upcoming Exams */}
                                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 p-6 transition-colors duration-200">
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                        <Clock className="w-5 h-5 text-orange-600" />
                                        Upcoming Exams
                                    </h2>
                                    <div className="space-y-3">
                                        {upcomingExams.length === 0 ? (
                                            <p className="text-gray-500 dark:text-gray-300 text-sm text-center py-4">No upcoming exams</p>
                                        ) : (
                                            upcomingExams.map((exam) => (
                                                <div
                                                    key={exam.id}
                                                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                                                    onClick={() => {
                                                        navigate(`/admin/monitor/${exam.id}`);
                                                    }}
                                                >
                                                    <div className="flex-1">
                                                        <div className="font-semibold text-gray-900 dark:text-white">{exam.title}</div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-300 mt-1">
                                                            {new Date(exam.scheduled_at).toLocaleString()} • {exam.duration_minutes} mins • {exam.student_count} students
                                                        </div>
                                                    </div>
                                                    <div className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded">
                                                        {exam.proctoring_type}
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right Column - Quick Stats & Notifications */}
                            <div className="space-y-6">
                                {/* Quick Stats */}
                                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 p-6 transition-colors duration-200">
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                        <BarChart3 className="w-5 h-5 text-purple-600" />
                                        Quick Stats
                                    </h2>
                                    <div className="space-y-4">
                                        <StatRow icon={Users} label="Total Users" value={stats?.totalUsers || 0} />
                                        <StatRow icon={FileText} label="Exams Conducted" value={stats?.totalExamsConducted || 0} />
                                        <StatRow icon={Eye} label="Live Proctoring" value={stats?.liveExams || 0} />
                                    </div>
                                </div>

                                {/* Narrative Insights Panel */}
                                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl shadow-lg p-6 text-white relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-10">
                                        <Shield className="w-24 h-24" />
                                    </div>
                                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                                        <Activity className="w-5 h-5" />
                                        AI Summary
                                    </h2>
                                    <div className="space-y-4 relative z-10">
                                        <div className="p-3 bg-white/10 rounded-lg backdrop-blur-sm border border-white/10">
                                            <p className="text-sm font-medium">
                                                Exam integrity is maintaining a solid <span className="font-bold underline">{insights.summary.averageIntegrity}%</span> average this week.
                                            </p>
                                        </div>
                                        <div className="p-3 bg-white/10 rounded-lg backdrop-blur-sm border border-white/10">
                                            <p className="text-sm font-medium">
                                                Activity has {insights.summary.growth >= 0 ? 'increased' : 'decreased'} by <span className="font-bold">{Math.abs(insights.summary.growth)}%</span> compared to last week.
                                            </p>
                                        </div>
                                        <div className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-60 mt-4 text-center">
                                            Automated Analytics Nominal
                                        </div>
                                    </div>
                                </div>

                                {/* Notifications */}
                                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 p-6 transition-colors duration-200">
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                        <Bell className="w-5 h-5 text-yellow-600" />
                                        Notifications
                                    </h2>
                                    <div className="space-y-3">
                                        {notifications.length === 0 ? (
                                            <p className="text-gray-500 dark:text-gray-300 text-sm text-center py-4">No notifications</p>
                                        ) : (
                                            notifications.map((notif) => (
                                                <div
                                                    key={notif.id}
                                                    className={`p-3 rounded-lg border ${notif.type === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' :
                                                        notif.type === 'info' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' :
                                                            'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                                                        }`}
                                                >
                                                    <div className="text-sm text-gray-900 dark:text-gray-100">{notif.message}</div>
                                                    <div className="text-xs text-gray-500 dark:text-gray-300 mt-1">{notif.time}                                                </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* System Health */}
                                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 p-6 transition-colors duration-200">
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                        <Server className="w-5 h-5 text-green-600" />
                                        System Health
                                    </h2>
                                    <div className="space-y-3">
                                        <HealthItem label="Webcam Detection" status="operational" />
                                        <HealthItem label="Microphone Detection" status="operational" />
                                        <HealthItem label="AI Models" status="operational" />
                                        <HealthItem label="Database" status="operational" />
                                        <HealthItem label="API Server" status="operational" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <SendNotificationModal
                isOpen={showNotificationModal}
                onClose={() => setShowNotificationModal(false)}
            />
        </div>
    );
};


interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ElementType;
    iconColor: string;
    iconBg: string;
    trend?: string;
    pulse?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, iconColor, iconBg, trend, pulse }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 p-6 hover:shadow-lg transition-all duration-200">
        <div className="flex items-center justify-between mb-4">
            <div className={`p-3 ${iconBg} rounded-lg`}>
                <Icon className={`w-6 h-6 ${iconColor} ${pulse ? 'animate-pulse' : ''}`} />
            </div>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-300 mb-1 font-medium">{title}</div>
        <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">{value}</div>
        {trend && <div className="text-xs text-gray-400 dark:text-gray-300">{trend}</div>}
    </div>
);

interface StatRowProps {
    icon: React.ElementType;
    label: string;
    value: number;
}

const StatRow: React.FC<StatRowProps> = ({ icon: Icon, label, value }) => (
    <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 text-gray-400 dark:text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-300">{label}</span>
        </div>
        <span className="text-lg font-bold text-gray-900 dark:text-white">{value}</span>
    </div>
);

interface HealthItemProps {
    label: string;
    status: 'operational' | 'warning' | 'critical';
}

const HealthItem: React.FC<HealthItemProps> = ({ label, status }) => (
    <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600 dark:text-gray-300">{label}</span>
        <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${status === 'operational' ? 'bg-green-500' :
                status === 'warning' ? 'bg-yellow-500' :
                    'bg-red-500'
                }`} />
            <span className={`text-xs font-medium ${status === 'operational' ? 'text-green-600' :
                status === 'warning' ? 'text-yellow-600' :
                    'text-red-600'
                }`}>
                {status === 'operational' ? 'Operational' : status}
            </span>
        </div>
    </div>
);
// SVG Chart Components
const IntegrityTrendChart: React.FC<{ data: any[] }> = ({ data }) => {
    if (!data.length) return <div className="h-full flex items-center justify-center text-gray-400">No data</div>;

    const maxScore = 100;
    const points = data.map((item, i) => {
        const x = (i / (data.length - 1)) * 100;
        const y = 100 - (item.score / maxScore) * 100;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible" preserveAspectRatio="none">
            <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                </linearGradient>
            </defs>
            <path
                d={`M 0,100 L ${points} L 100,100 Z`}
                fill="url(#lineGrad)"
                stroke="none"
            />
            <polyline
                fill="none"
                stroke="#6366f1"
                strokeWidth="2"
                points={points}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
};

const SessionActivityChart: React.FC<{ data: any[] }> = ({ data }) => {
    if (!data.length) return <div className="h-full flex items-center justify-center text-gray-400">No data</div>;

    const maxCount = Math.max(...data.map(d => d.count), 5);
    const barWidth = 10;
    const gap = (100 - (data.length * barWidth)) / (data.length - 1);

    return (
        <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible" preserveAspectRatio="none">
            {data.map((item, i) => {
                const h = (item.count / maxCount) * 80 + 5;
                const x = i * (barWidth + gap);
                return (
                    <rect
                        key={i}
                        x={x}
                        y={100 - h}
                        width={barWidth}
                        height={h}
                        fill="#10b981"
                        rx="2"
                        className="transition-all duration-500"
                    />
                );
            })}
        </svg>
    );
};




