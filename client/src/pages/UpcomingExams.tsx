import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { StudentLayout } from '../components/StudentLayout';
import { examApi, type Exam } from '../services/api';
import { Calendar, Clock, Users, BookOpen, Loader2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const UpcomingExams: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [exams, setExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch session history for "completed" check
    const myHistory = useQuery(api.sessions.getMyHistoryWithExams, user?.user_id ? { user_id: user.user_id } : "skip");
    const examSessions = myHistory || [];
    const [calendarMonth, setCalendarMonth] = useState(() => {
        const d = new Date();
        return { year: d.getFullYear(), month: d.getMonth() };
    });
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    useEffect(() => {
        fetchExams();
    }, []);

    const fetchExams = async () => {
        try {
            setLoading(true);
            const data = await examApi.getAll();
            setExams(data);
        } catch (err) {
            console.error('Error fetching exams:', err);
            setError('Failed to load upcoming exams');
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const getDaysUntil = (dateString: string) => {
        const examDate = new Date(dateString);
        const today = new Date();
        const diffTime = examDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const dateKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const examsByDate = useMemo(() => {
        const map: Record<string, Exam[]> = {};
        exams.forEach((exam) => {
            const examDate = new Date((exam as any).scheduled_for || exam.created_at);
            const key = dateKey(examDate);
            if (!map[key]) map[key] = [];
            map[key].push(exam);
        });
        return map;
    }, [exams]);

    const calendarDays = useMemo(() => {
        const { year, month } = calendarMonth;
        const first = new Date(year, month, 1);
        const last = new Date(year, month + 1, 0);
        const startPad = first.getDay();
        const daysInMonth = last.getDate();
        const prevMonth = new Date(year, month, 0);
        const prevDays = prevMonth.getDate();
        const rows: (number | null)[][] = [];
        let row: (number | null)[] = [];
        for (let i = 0; i < startPad; i++) {
            row.push(-(prevDays - startPad + 1 + i));
        }
        for (let d = 1; d <= daysInMonth; d++) {
            row.push(d);
            if (row.length === 7) {
                rows.push(row);
                row = [];
            }
        }
        let next = 1;
        while (row.length > 0 && row.length < 7) {
            row.push(-next);
            next++;
        }
        if (row.length) rows.push(row);
        return rows;
    }, [calendarMonth]);

    const todayKey = dateKey(new Date());
    const hasExam = (day: number) => {
        if (day <= 0) return false;
        const key = `${calendarMonth.year}-${calendarMonth.month}-${day}`;
        return !!examsByDate[key]?.length;
    };

    return (
        <StudentLayout>
            <div className="bg-background-light dark:bg-background-dark min-h-screen text-text-main font-display p-8">
                <div className="max-w-6xl mx-auto">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-3 bg-[#f4f4e6] rounded-xl text-text-main">
                            <Calendar className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-text-main">Upcoming Exams</h1>
                            <p className="text-text-muted mt-1">View and prepare for your scheduled examinations</p>
                        </div>
                    </div>

                    {/* Calendar widget */}
                    <div className="bg-surface-light rounded-xl shadow-sm border border-[#e6e6dd] p-6 mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-bold text-text-main">Calendar</h2>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setCalendarMonth((m) => (m.month === 0 ? { year: m.year - 1, month: 11 } : { year: m.year, month: m.month - 1 }))}
                                    className="p-2 rounded-lg border border-[#e6e6dd] hover:bg-[#f4f4e6] text-text-main"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <span className="min-w-[160px] text-center font-bold text-text-main">
                                    {new Date(calendarMonth.year, calendarMonth.month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setCalendarMonth((m) => (m.month === 11 ? { year: m.year + 1, month: 0 } : { year: m.year, month: m.month + 1 }))}
                                    className="p-2 rounded-lg border border-[#e6e6dd] hover:bg-[#f4f4e6] text-text-main"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-7 gap-1 text-center">
                            {WEEKDAYS.map((w) => (
                                <div key={w} className="py-2 text-xs font-bold text-text-muted uppercase">
                                    {w}
                                </div>
                            ))}
                            {calendarDays.flat().map((day, idx) => {
                                const dayVal = day ?? 0;
                                const isPadding = dayVal <= 0;
                                const dayNum = dayVal <= 0 ? Math.abs(dayVal) : dayVal;
                                const currentKey = dayVal > 0 ? `${calendarMonth.year}-${calendarMonth.month}-${dayVal}` : '';
                                const isToday = dayVal > 0 && currentKey === todayKey;
                                const withExam = dayVal > 0 && hasExam(dayVal);
                                return (
                                    <button
                                        key={idx}
                                        type="button"
                                        disabled={isPadding}
                                        onClick={() => dayVal > 0 && setSelectedDate(new Date(calendarMonth.year, calendarMonth.month, dayVal))}
                                        className={`
                                            py-2 rounded-lg text-sm font-medium transition-colors
                                            ${isPadding ? 'text-gray-300 dark:text-gray-600 cursor-default' : 'text-text-main hover:bg-[#f4f4e6]'}
                                            ${isToday ? 'ring-2 ring-primary bg-primary/10' : ''}
                                            ${withExam ? 'bg-primary/20 font-bold text-primary' : ''}
                                        `}
                                    >
                                        {dayNum}
                                        {withExam && <span className="block w-1 h-1 rounded-full bg-primary mx-auto mt-0.5" />}
                                    </button>
                                );
                            })}
                        </div>
                        {selectedDate && examsByDate[dateKey(selectedDate)]?.length > 0 && (
                            <div className="mt-4 pt-4 border-t border-[#e6e6dd]">
                                <p className="text-sm font-bold text-text-muted mb-2">
                                    Exams on {selectedDate.toLocaleDateString('en-US')}
                                </p>
                                <ul className="space-y-1">
                                    {examsByDate[dateKey(selectedDate)].map((exam) => (
                                        <li key={exam.id}>
                                            <button
                                                type="button"
                                                onClick={() => navigate(`/exam/${exam.id}/precheck`)}
                                                className="text-sm font-medium text-primary hover:underline"
                                            >
                                                {exam.title}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                            <span className="ml-3 text-text-muted">Loading exams...</span>
                        </div>
                    ) : error ? (
                        <div className="bg-red-50 text-red-800 p-4 rounded-xl flex items-start gap-3 border border-red-100">
                            <AlertCircle className="w-5 h-5 mt-0.5" />
                            <div>
                                <p className="font-bold">Error Loading Exams</p>
                                <p className="text-sm mt-1">{error}</p>
                            </div>
                        </div>
                    ) : exams.length === 0 ? (
                        <div className="bg-surface-light rounded-xl shadow-sm p-12 text-center border border-[#e6e6dd]">
                            <Calendar className="w-16 h-16 text-[#e6e6dd] mx-auto mb-4" />
                            <h3 className="text-lg font-bold text-text-main mb-2">No Upcoming Exams</h3>
                            <p className="text-text-muted">You don't have any scheduled exams at the moment.</p>
                        </div>
                    ) : (
                        <div className="grid gap-6">
                            {exams.map((exam) => {
                                // Use scheduled_for if available, otherwise created_at (though created_at implies it's open)
                                const targetDateStr = (exam as any).scheduled_for || exam.created_at;
                                const daysUntil = getDaysUntil(targetDateStr);
                                const isSoon = daysUntil <= 7 && daysUntil >= 0;
                                const isFuture = daysUntil > 0;
                                const isToday = daysUntil === 0;

                                const session = examSessions.find((s: any) => s.exam_id === exam._id || s.exam_id === exam.id);
                                const isCompleted = session?.status === 'completed';

                                return (
                                    <div
                                        key={exam.id}
                                        className={`rounded-xl shadow-sm border p-6 transition-all group ${isCompleted
                                                ? 'bg-gray-50 border-gray-200 opacity-70 grayscale'
                                                : 'bg-surface-light border-[#e6e6dd] hover:border-primary'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h3 className={`text-xl font-bold ${isCompleted ? 'text-gray-500' : 'text-text-main'}`}>{exam.title}</h3>
                                                    {isCompleted ? (
                                                        <span className="px-3 py-1 bg-gray-200 text-gray-600 text-[10px] font-black rounded-full uppercase tracking-wider">
                                                            Completed
                                                        </span>
                                                    ) : (
                                                        <>
                                                            {isSoon && isFuture && (
                                                                <span className="px-3 py-1 bg-primary text-primary-content text-xs font-bold rounded-full">
                                                                    Soon
                                                                </span>
                                                            )}
                                                            {isToday && (
                                                                <span className="px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
                                                                    Today
                                                                </span>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                                <p className={`mb-4 font-medium ${isCompleted ? 'text-gray-400' : 'text-text-muted'}`}>{exam.description || 'Comprehensive assessment'}</p>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                                    <div className="flex items-center gap-2 text-sm text-text-muted">
                                                        <Calendar className="w-4 h-4 text-text-muted/70" />
                                                        <span>{formatDate(targetDateStr)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm text-text-muted">
                                                        <Clock className="w-4 h-4 text-text-muted/70" />
                                                        <span>{exam.duration_minutes} minutes</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-sm text-text-muted">
                                                        <BookOpen className="w-4 h-4 text-text-muted/70" />
                                                        <span>{exam.questions.length} questions</span>
                                                    </div>
                                                </div>

                                                {daysUntil >= 0 && (
                                                    <div className="mb-4 bg-[#f8f8f5] p-4 rounded-lg border border-[#e6e6dd]">
                                                        <div className="text-sm text-text-muted mb-2 font-bold flex justify-between">
                                                            <span>
                                                                {daysUntil === 0
                                                                    ? 'Exam is today!'
                                                                    : daysUntil === 1
                                                                        ? 'Exam is tomorrow'
                                                                        : `${daysUntil} days remaining`
                                                                }
                                                            </span>
                                                            <span>{Math.max(0, Math.min(100, Math.round((30 - daysUntil) / 30 * 100)))}% Ready</span>
                                                        </div>
                                                        <div className="w-full bg-[#e6e6dd] rounded-full h-2">
                                                            <div
                                                                className={`h-2 rounded-full transition-all ${daysUntil <= 3 ? 'bg-red-500' :
                                                                    daysUntil <= 7 ? 'bg-primary' :
                                                                        'bg-text-muted'
                                                                    }`}
                                                                style={{ width: `${Math.min(100, (30 - daysUntil) / 30 * 100)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-4 border-t border-[#e6e6dd]">
                                            <div className="flex items-center gap-2 text-sm text-text-muted font-medium">
                                                <Users className="w-4 h-4" />
                                                <span>Multiple choice format</span>
                                            </div>
                                            <button
                                                onClick={() => navigate(`/exam/${exam.id}`)}
                                                disabled={isFuture || isCompleted}
                                                className={`px-6 py-2 rounded-full font-bold transition-colors shadow-sm ${isCompleted
                                                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                        : isFuture
                                                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                            : 'bg-primary text-primary-content hover:bg-[#e0dd05]'
                                                    }`}
                                            >
                                                {isCompleted ? 'Completed' : isFuture ? `Available in ${daysUntil} days` : 'Start Exam'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </StudentLayout>
    );
};




