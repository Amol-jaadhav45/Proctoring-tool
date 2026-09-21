import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import {
    Calendar as CalendarIcon,
    PlayCircle,
    ChevronRight,
    CheckCircle2,
    Info,
    ArrowRight,
    Bell
} from 'lucide-react';
import { type Exam } from '../services/api';
import { Sidebar } from '../components/Sidebar';

type StudentExam = Exam & {
    scheduled_for?: string;
    subject?: string;
    status?: 'upcoming' | 'completed' | 'flagged' | 'in_progress' | 'missed';
    sessionId?: string;
};

export const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [showInstructions, setShowInstructions] = React.useState(false);

    // Use Convex useQuery for reactive data. Students need exams they have sessions for (including inactive/completed) so "View Results" appears.
    const allExams = useQuery(
        user?.user_id ? (api.exams as any).getExamsForUser : api.exams.getAll,
        user?.user_id ? { user_id: user.user_id } : {}
    );
    const myHistory = useQuery(api.sessions.getMyHistoryWithExams, user?.user_id ? { user_id: user.user_id } : "skip");


    // Convex Real-time Notifications
    const notifications = useQuery(api.notifications.getAll, { user_id: user?.user_id ?? "" });
    const unreadCount = notifications ? notifications.filter((n: any) => !n.read).length : 0;

    // Get user profile from Convex
    const userProfile = useQuery(api.users.getUser, { user_id: user?.user_id ?? "" });

    const exams = allExams || [];
    const examSessions = myHistory || [];



    const now = new Date();

    const decorateExam = (exam: any) => {
        const scheduledFor = exam.scheduled_for || exam.created_at;
        const startTime = new Date(scheduledFor);
        const session = examSessions.find((s: any) => s.exam_id === exam._id || s.exam_id === exam.id);
        let status: StudentExam['status'] = 'upcoming';

        if (session) {
            if (session.status === 'completed') status = 'completed';
            else if (session.status === 'in_progress' || session.status === 'active') status = 'in_progress';
        } else if (exam.scheduled_for) {
            // Only mark as missed if there was a SPECIFIC scheduled time that passed
            if (startTime.getTime() < now.getTime() && (now.getTime() - startTime.getTime() > (exam.duration_minutes + 60) * 60 * 1000)) {
                status = 'missed';
            }
        } else {
            // If no scheduled_for, it's a general exam available since created_at
            status = 'upcoming';
        }

        const resultsPublished = session?.results_published ?? false;
        return { ...exam, id: exam._id || exam.id, scheduled_for: scheduledFor, status, startTime, sessionId: session?._id, resultsPublished };
    };

    const decorated = exams.map(decorateExam);

    // Sort Chronologically for "Next Up" section
    const sortedChronologically = [...decorated]
        .filter((e: any) => e.status === 'upcoming' || e.status === 'in_progress')
        .sort((a: any, b: any) => {
            if (a.status === 'in_progress' && b.status !== 'in_progress') return -1;
            if (a.status !== 'in_progress' && b.status === 'in_progress') return 1;
            return a.startTime.getTime() - b.startTime.getTime();
        });

    const nextExam = sortedChronologically[0];

    // For the "Upcoming Exams" list, show newest created first as requested
    const otherUpcoming = decorated
        .filter((e: any) => e.id !== nextExam?.id && (e.status === 'upcoming' || e.status === 'in_progress' || e.status === 'completed'))
        .sort((a: any, b: any) => {
            const timeA = new Date(a.created_at || a._creationTime || a.startTime).getTime();
            const timeB = new Date(b.created_at || b._creationTime || b.startTime).getTime();
            return timeB - timeA;
        });

    const getTimeParts = (dateString?: string) => {
        if (!dateString) return { days: 0, hours: 0, mins: 0, secs: 0 };
        const target = new Date(dateString).getTime();
        const diffMs = target - now.getTime();
        if (diffMs <= 0) return { days: 0, hours: 0, mins: 0, secs: 0 };

        return {
            days: Math.floor(diffMs / (1000 * 60 * 60 * 24)),
            hours: Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
            mins: Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60)),
            secs: Math.floor((diffMs % (1000 * 60)) / 1000)
        };
    };

    const nextExamTimeParts = getTimeParts(nextExam?.scheduled_for || nextExam?.created_at);

    const canStart = (exam: StudentExam) => {
        if (!exam) return false;
        if (exam.status === 'completed' || exam.status === 'missed') return false;
        if (exam.status === 'in_progress') return true;
        const startTime = new Date(exam.scheduled_for || exam.created_at).getTime();
        const minutesUntil = (startTime - now.getTime()) / (1000 * 60);
        return minutesUntil <= 30;
    };



    return (
        <div className="bg-background-light dark:bg-background-dark text-text-main font-display min-h-screen flex overflow-hidden">
            <Sidebar />

            <main className="flex-1 flex flex-col h-screen overflow-y-auto relative custom-scrollbar">
                {/* Top Bar */}
                <header className="sticky top-0 z-10 bg-background-light/90 backdrop-blur-md px-8 py-6 border-b border-transparent">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 max-w-7xl mx-auto w-full">
                        <div>
                            <h2 className="text-3xl font-black text-text-main tracking-tight">Welcome back, {userProfile?.name?.split(' ')[0] || user?.name?.split(' ')[0] || 'Student'}</h2>
                            <p className="text-text-muted mt-1 font-normal">Ready for your exams? Your system is checked and good to go.</p>
                        </div>
                        <div className="flex items-center gap-4">

                            <button
                                onClick={() => navigate('/notifications')}
                                className="relative p-2 text-text-main hover:bg-[#e6e6dd] rounded-full transition-colors"
                            >
                                <Bell className="w-6 h-6" />
                                {unreadCount > 0 && (
                                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                                )}
                            </button>
                        </div>
                    </div>
                </header>

                <div className="p-8 max-w-7xl mx-auto w-full flex flex-col gap-8 pb-20">
                    {/* Hero Section */}
                    <section className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-bold tracking-tight flex items-center gap-2">
                                <CalendarIcon className="w-6 h-6 text-text-muted" />
                                Next Up
                            </h3>
                        </div>

                        {nextExam ? (
                            <div className="bg-surface-light rounded-xl p-6 shadow-sm border border-[#e6e6dd] flex flex-col md:flex-row gap-8 items-stretch relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-primary/10 to-transparent pointer-events-none"></div>

                                <div className="flex-1 flex flex-col justify-center gap-4 z-10">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <span className="bg-primary/20 text-primary-content text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2 inline-block">
                                                {nextExam.status === 'in_progress' ? 'Resume Session' : 'Proctored Exam'}
                                            </span>
                                            <h2 className="text-4xl font-black text-text-main tracking-tight leading-none mb-1">
                                                {nextExam.title}
                                            </h2>
                                            <p className="text-text-muted text-lg">
                                                {nextExam.subject || 'General'} • {nextExam.duration_minutes} Minutes
                                            </p>
                                        </div>
                                    </div>

                                    {/* Timer */}
                                    <div className="flex gap-3 py-4">
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="w-16 h-16 flex items-center justify-center bg-[#f4f4e6] rounded-xl text-2xl font-bold text-text-main font-mono">
                                                {nextExamTimeParts.days.toString().padStart(2, '0')}
                                            </div>
                                            <span className="text-xs text-text-muted uppercase font-bold">Days</span>
                                        </div>
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="w-16 h-16 flex items-center justify-center bg-[#f4f4e6] rounded-xl text-2xl font-bold text-text-main font-mono">
                                                {nextExamTimeParts.hours.toString().padStart(2, '0')}
                                            </div>
                                            <span className="text-xs text-text-muted uppercase font-bold">Hours</span>
                                        </div>
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="w-16 h-16 flex items-center justify-center bg-[#f4f4e6] rounded-xl text-2xl font-bold text-text-main font-mono">
                                                {nextExamTimeParts.mins.toString().padStart(2, '0')}
                                            </div>
                                            <span className="text-xs text-text-muted uppercase font-bold">Mins</span>
                                        </div>
                                        <div className="flex flex-col items-center gap-1">
                                            <div className="w-16 h-16 flex items-center justify-center bg-primary text-primary-content rounded-xl text-2xl font-bold font-mono animate-pulse">
                                                {nextExamTimeParts.secs.toString().padStart(2, '0')}
                                            </div>
                                            <span className="text-xs text-text-muted uppercase font-bold">Secs</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-4 mt-2">
                                        <button
                                            onClick={() => navigate(`/exam/${nextExam.id}`)}
                                            disabled={!canStart(nextExam)}
                                            className={`bg-primary hover:bg-[#e0dd05] text-primary-content px-8 py-3 rounded-full font-bold text-base transition-all shadow-[0_4px_0_rgb(0,0,0,0.1)] hover:shadow-[0_2px_0_rgb(0,0,0,0.1)] hover:translate-y-[2px] flex items-center gap-2 ${!canStart(nextExam) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            <PlayCircle className="w-5 h-5" fill="currentColor" />
                                            Start Proctoring Session
                                        </button>
                                        <button
                                            onClick={() => setShowInstructions(true)}
                                            className="bg-white border border-[#e6e6dd] hover:bg-[#f4f4e6] text-text-main px-6 py-3 rounded-full font-semibold text-sm transition-colors"
                                        >
                                            View Instructions
                                        </button>
                                    </div>
                                </div>

                                {/* Calendar Widget */}
                                <div className="w-full md:w-1/3 bg-surface-light rounded-xl shadow-sm border border-[#e6e6dd] p-4 flex flex-col">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-sm font-bold text-text-main">This month</h3>
                                        <button
                                            onClick={() => navigate('/upcoming')}
                                            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                                        >
                                            View Calendar <ArrowRight className="w-3 h-3" />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] font-bold text-text-muted uppercase mb-1">
                                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                                            <span key={i}>{d}</span>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-7 gap-0.5 text-center flex-1">
                                        {(() => {
                                            const now = new Date();
                                            const year = now.getFullYear(), month = now.getMonth();
                                            const first = new Date(year, month, 1).getDay();
                                            const daysInMonth = new Date(year, month + 1, 0).getDate();
                                            const today = now.getDate();
                                            const cells: React.ReactNode[] = [];
                                            for (let i = 0; i < first; i++) cells.push(<span key={`pad-${i}`} className="py-1 text-gray-300" />);
                                            for (let d = 1; d <= daysInMonth; d++) {
                                                const hasExamOnDay = decorated.some((e: any) => {
                                                    const examDate = e.startTime || new Date(e.scheduled_for || e.created_at || e._creationTime);
                                                    return examDate.getDate() === d &&
                                                        examDate.getMonth() === month &&
                                                        examDate.getFullYear() === year;
                                                });
                                                cells.push(
                                                    <span
                                                        key={d}
                                                        title={hasExamOnDay ? "Exam scheduled" : ""}
                                                        className={`py-1 rounded-lg text-xs font-bold transition-all relative ${d === today
                                                            ? 'bg-primary text-primary-content shadow-sm'
                                                            : hasExamOnDay
                                                                ? 'bg-primary/20 text-primary hover:bg-primary/30'
                                                                : 'text-text-main hover:bg-[#f4f4e6]'
                                                            }`}
                                                    >
                                                        {d}
                                                        {hasExamOnDay && d !== today && (
                                                            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-primary rounded-full"></span>
                                                        )}
                                                        {hasExamOnDay && d === today && (
                                                            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full"></span>
                                                        )}
                                                    </span>
                                                );
                                            }
                                            return cells;
                                        })()}
                                    </div>
                                    <div className="mt-3 flex items-center gap-3">
                                        <div className="flex items-center gap-1">
                                            <div className="w-2 h-2 bg-primary rounded-full"></div>
                                            <span className="text-[10px] text-text-muted">Today</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className="w-2 h-2 bg-primary/20 rounded-full border border-primary/30"></div>
                                            <span className="text-[10px] text-text-muted">Exam</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-surface-light p-12 rounded-xl text-center border border-[#e6e6dd]">
                                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                                <h3 className="text-xl font-bold">You're all caught up!</h3>
                                <p className="text-text-muted">No pending exams at the moment.</p>
                            </div>
                        )}
                    </section>

                    {/* Grid Layout */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                        {/* Upcoming List */}
                        <div className="xl:col-span-2 flex flex-col gap-6">
                            <div className="flex items-center justify-between px-1">
                                <h3 className="text-xl font-bold tracking-tight">Upcoming Exams</h3>
                                <button className="text-sm font-semibold text-text-muted hover:text-text-main flex items-center gap-1" onClick={() => navigate('/upcoming')}>
                                    View Calendar <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>

                            {otherUpcoming.length > 0 ? otherUpcoming.map((exam: any) => (
                                <div
                                    key={exam.id}
                                    onClick={() => exam.status !== 'completed' && navigate(`/exam/${exam.id}/precheck`)}
                                    className={`p-4 rounded-xl shadow-sm flex flex-col sm:flex-row gap-4 transition-all group ${exam.status === 'completed'
                                        ? 'bg-gray-50 border border-gray-200 opacity-70 grayscale cursor-default'
                                        : 'bg-surface-light border border-[#e6e6dd] hover:border-primary/50 cursor-pointer active:scale-[0.98]'
                                        }`}
                                >
                                    <div className={`w-full sm:w-32 h-32 sm:h-auto rounded-lg flex items-center justify-center flex-shrink-0 relative overflow-hidden ${exam.status === 'completed' ? 'bg-gray-200' : 'bg-gradient-to-br from-primary/20 to-primary/5'
                                        }`}>
                                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48cGF0dGVybiBpZD0iZ3JpZCIgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBwYXR0ZXJuVW5pdHM9InVzZXJTcGFjZU9uVXNlIj48cGF0aCBkPSJNIDIwIDAgTCAwIDAgMCAyMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjAuNSIgb3BhY2l0eT0iMC4xIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30"></div>
                                        <span className={`text-2xl font-bold relative z-10 ${exam.status === 'completed' ? 'text-gray-500' : 'text-primary'}`}>
                                            {new Date(exam.scheduled_for || exam.created_at).getDate()}
                                        </span>
                                    </div>
                                    <div className="flex-1 flex flex-col justify-center py-2">
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className={`text-lg font-bold transition-colors ${exam.status === 'completed' ? 'text-gray-500' : 'text-text-main group-hover:text-primary'}`}>
                                                {exam.title}
                                            </h4>
                                            <div className="flex items-center gap-2">
                                                {exam.status === 'completed' && (
                                                    <span className="bg-gray-200 text-gray-600 text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider">
                                                        Completed
                                                    </span>
                                                )}
                                                <span className={`${exam.status === 'completed' ? 'bg-gray-100 text-gray-400' : 'bg-[#f4f4e6] text-text-muted'} text-xs font-bold px-2 py-1 rounded`}>
                                                    {new Date(exam.scheduled_for || exam.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                        <p className={`${exam.status === 'completed' ? 'text-gray-400' : 'text-text-muted'} text-sm mb-4`}>
                                            {new Date(exam.scheduled_for || exam.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {exam.duration_minutes} Minutes • {exam.subject || 'General'}
                                        </p>
                                        <div className="flex items-center gap-4 mt-auto flex-wrap">
                                            <span className={`text-xs ${exam.status === 'completed' ? 'text-gray-400' : 'text-text-muted'} font-medium flex items-center gap-1`}>
                                                {exam.status === 'completed' ? (
                                                    <>
                                                        <CheckCircle2 className="w-3 h-3 text-gray-400" /> Submitted
                                                    </>
                                                ) : (
                                                    <>
                                                        <CheckCircle2 className="w-3 h-3 text-green-500" /> Registered
                                                    </>
                                                )}
                                            </span>
                                            {exam.status === 'completed' && exam.sessionId && (exam as any).resultsPublished && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); navigate(`/results/${exam.sessionId}`); }}
                                                    className="text-xs font-bold text-primary hover:underline"
                                                >
                                                    View Results
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col justify-center">
                                        {exam.status === 'completed' && (exam as any).resultsPublished && exam.sessionId ? (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); navigate(`/results/${exam.sessionId}`); }}
                                                className="p-2 rounded-full border border-primary bg-primary/10 text-primary hover:bg-primary hover:text-primary-content transition-colors"
                                            >
                                                <ChevronRight className="w-5 h-5" />
                                            </button>
                                        ) : (
                                            <button
                                                disabled={exam.status === 'completed'}
                                                className="p-2 rounded-full border border-[#e6e6dd] text-text-muted hover:bg-primary hover:text-primary-content transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <ChevronRight className="w-5 h-5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )) : (
                                <div className="p-8 text-center text-text-muted bg-surface-light rounded-xl border border-[#e6e6dd] border-dashed">
                                    No other exams upcoming.
                                </div>
                            )}
                        </div>

                        {/* Right Widgets */}
                        <div className="flex flex-col gap-6">



                            {/* Alert */}
                            <div className="bg-[#fefce8] p-4 rounded-xl border border-primary/30 flex gap-3">
                                <Info className="w-5 h-5 text-yellow-600 mt-0.5" />
                                <div>
                                    <p className="text-sm font-bold text-text-main">ID Verification</p>
                                    <p className="text-xs text-text-muted mt-1 leading-relaxed">Please ensure your webcam permissions are enabled in the browser.</p>
                                    <button onClick={() => navigate('/profile')} className="text-xs font-bold text-yellow-700 mt-2 hover:underline">Check Settings</button>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </main>

            {/* Instructions Modal */}
            {showInstructions && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Info className="w-5 h-5 text-primary" />
                                Exam Instructions
                            </h3>
                            <button
                                onClick={() => setShowInstructions(false)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                            >
                                <ArrowRight className="w-5 h-5 rotate-45" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="space-y-4">
                                <section>
                                    <h4 className="font-bold text-lg mb-2">Before You Start</h4>
                                    <ul className="list-disc pl-5 space-y-2 text-text-muted">
                                        <li>Ensure you are in a quiet, well-lit room.</li>
                                        <li>Close all other tabs and applications.</li>
                                        <li>Have your ID ready for verification if required.</li>
                                    </ul>
                                </section>

                                <section>
                                    <h4 className="font-bold text-lg mb-2">During the Exam</h4>
                                    <ul className="list-disc pl-5 space-y-2 text-text-muted">
                                        <li>Keep your face visible to the camera at all times.</li>
                                        <li>Do not leave the exam window or switch tabs.</li>
                                        <li>Speaking or looking away frequently may flag your session.</li>
                                    </ul>
                                </section>

                                <section>
                                    <h4 className="font-bold text-lg mb-2">Technical Requirements</h4>
                                    <ul className="list-disc pl-5 space-y-2 text-text-muted">
                                        <li>Stable internet connection is required.</li>
                                        <li>Webcam and microphone must be enabled.</li>
                                        <li>Screen sharing permission will be requested.</li>
                                    </ul>
                                </section>
                            </div>

                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl flex gap-3 text-sm text-blue-700 dark:text-blue-300">
                                <Info className="w-5 h-5 flex-shrink-0" />
                                <p>
                                    Any attempt to bypass proctoring measures will be recorded and reported to the administrator.
                                    By proceeding, you agree to being recorded for invigilation purposes.
                                </p>
                            </div>
                        </div>
                        <div className="p-6 border-t border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-900/50 flex justify-end gap-3 rounded-b-2xl">
                            <button
                                onClick={() => setShowInstructions(false)}
                                className="px-5 py-2.5 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-zinc-800 transition-colors"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => {
                                    setShowInstructions(false);
                                    if (nextExam) navigate(`/exam/${nextExam.id}`);
                                }}
                                className="px-5 py-2.5 bg-primary text-primary-content rounded-xl font-bold hover:brightness-110 transition-all flex items-center gap-2"
                            >
                                <PlayCircle className="w-4 h-4" />
                                Start Exam
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
