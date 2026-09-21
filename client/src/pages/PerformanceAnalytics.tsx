import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Sidebar } from '../components/Sidebar';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';


export const PerformanceAnalytics: React.FC = () => {
    const { user } = useAuth();
    const historyData = useQuery((api.sessions as any).getMyHistoryWithExams, user ? { user_id: user.id } : "skip");
    const stats = useQuery(api.analytics.getStudentHistoryStats, user ? { user_id: user.id } : "skip");

    const sortedHistory = React.useMemo(() => {
        if (!historyData) return [];
        return [...historyData].sort((a: any, b: any) =>
            new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
        );
    }, [historyData]);

    const loading = historyData === undefined || stats === undefined;

    if (loading) {
        return (
            <div className="flex h-screen bg-background-light dark:bg-background-dark font-display">
                <Sidebar />
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
            </div>
        );
    }

    if (!stats || sortedHistory.length === 0) {
        return (
            <div className="flex h-screen bg-background-light dark:bg-background-dark font-display">
                <Sidebar />
                <div className="flex-1 p-8">
                    <div className="max-w-5xl mx-auto">
                        <h1 className="text-3xl font-black text-text-main mb-8">My Results</h1>
                        <div className="bg-surface-light p-12 rounded-xl border border-[#e6e6dd] text-center shadow-sm">
                            <p className="text-text-muted font-medium">No exam results available yet.</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-background-light dark:bg-background-dark font-display transition-colors">
            <Sidebar />
            <div className="flex-1 overflow-auto p-8">
                <div className="max-w-5xl mx-auto">
                    <h1 className="text-3xl font-black text-text-main mb-8">My Results</h1>

                    {/* Simplified Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                        <div className="bg-surface-light p-6 rounded-xl border border-[#e6e6dd] shadow-sm transform hover:scale-105 transition-transform duration-200">
                            <p className="text-sm text-text-muted font-bold mb-1">Average Score</p>
                            <p className="text-3xl font-black text-primary">{stats.averageScore}%</p>
                        </div>
                        <div className="bg-surface-light p-6 rounded-xl border border-[#e6e6dd] shadow-sm transform hover:scale-105 transition-transform duration-200">
                            <p className="text-sm text-text-muted font-bold mb-1">Exams Passed</p>
                            <div className="flex items-center gap-2">
                                <p className="text-3xl font-black text-green-600">{stats.examsPassed}</p>
                                <span className="text-sm text-text-muted font-medium">/ {historyData.length}</span>
                            </div>
                        </div>
                        <div className="bg-surface-light p-6 rounded-xl border border-[#e6e6dd] shadow-sm transform hover:scale-105 transition-transform duration-200">
                            <p className="text-sm text-text-muted font-bold mb-1">Best Score</p>
                            <p className="text-3xl font-black text-primary">{stats.highestScore}%</p>
                        </div>
                        <div className="bg-surface-light p-6 rounded-xl border border-[#e6e6dd] shadow-sm transform hover:scale-105 transition-transform duration-200">
                            <p className="text-sm text-text-muted font-bold mb-1">Last Exam</p>
                            <p className="text-3xl font-black text-text-main">{stats.lastScore}%</p>
                        </div>
                    </div>

                    {/* Results List */}
                    <h2 className="text-xl font-bold text-text-main mb-6">Exam History</h2>
                    <div className="space-y-4">
                        {sortedHistory.map((session: any) => (
                            <div key={session._id} className="bg-surface-light p-6 rounded-xl border border-[#e6e6dd] flex items-center justify-between shadow-sm hover:border-primary transition-colors">
                                <div>
                                    <h3 className="font-bold text-lg text-text-main mb-1">
                                        {session.exam_title}
                                    </h3>
                                    <p className="text-sm text-text-muted font-medium">
                                        {new Date(session.started_at).toLocaleDateString()} at {new Date(session.started_at).toLocaleTimeString()}
                                    </p>
                                </div>
                                <div className="flex items-center gap-8">
                                    <div className="text-right">
                                        <p className="text-xs text-text-muted uppercase tracking-wider mb-1 font-bold">Status</p>
                                        <div className="flex items-center gap-2">
                                            {session.status === 'terminated' ? (
                                                <>
                                                    <XCircle className="w-5 h-5 text-amber-500" />
                                                    <span className="text-sm font-bold text-amber-600">Terminated</span>
                                                </>
                                            ) : session.score >= 60 ? (
                                                <>
                                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                                    <span className="text-sm font-bold text-green-600">Passed</span>
                                                </>
                                            ) : (
                                                <>
                                                    <XCircle className="w-5 h-5 text-red-500" />
                                                    <span className="text-sm font-bold text-red-600">Failed</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="bg-[#f8f8f5] px-4 py-2 rounded-lg min-w-[80px] text-center border border-[#e6e6dd]">
                                        <span className={`text-xl font-black ${(session.score || 0) >= 80 ? 'text-green-600' :
                                            (session.score || 0) >= 60 ? 'text-primary' :
                                                'text-red-600'
                                            }`}>
                                            {session.score || 0}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
