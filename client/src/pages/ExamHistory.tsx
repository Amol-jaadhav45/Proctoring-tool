import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Sidebar } from '../components/Sidebar';
import { CredibilityBadge } from '../components/CredibilityBadge';
import { Calendar, Clock, Award, AlertTriangle, Loader2, Search, Eye } from 'lucide-react';

export const ExamHistory: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');

    const sessionsData = useQuery(
        (api.sessions as any).getMyHistoryWithExams,
        user?.user_id ? { user_id: user.user_id } : 'skip'
    );
    const sessions = sessionsData ?? [];
    const loading = sessionsData === undefined;

    const filteredSessions = sessions.filter((session: any) =>
        (session.exam_title || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

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

    return (
        <div className="flex h-screen bg-background-light dark:bg-background-dark font-display text-text-main">
            <Sidebar />
            <div className="flex-1 overflow-auto">
                <div className="p-8">
                    <div className="max-w-6xl mx-auto">
                        <h1 className="text-3xl font-black text-text-main mb-8">Exam History</h1>

                        {/* Search */}
                        <div className="mb-6">
                            <div className="relative">
                                <Search className="absolute left-3 top-3 w-5 h-5 text-text-muted" />
                                <input
                                    type="text"
                                    placeholder="Search exams..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 border border-[#e6e6dd] rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-surface-light shadow-sm text-text-main"
                                />
                            </div>
                        </div>

                        {/* Exam List */}
                        {filteredSessions.length === 0 ? (
                            <div className="bg-surface-light p-12 rounded-xl shadow-sm text-center border border-[#e6e6dd]">
                                <p className="text-text-muted font-medium">
                                    {searchTerm ? 'No exams found matching your search.' : 'No exam history yet.'}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {filteredSessions.map((session: any) => {
                                    const sessionId = session._id;
                                    const violationsCount = session.violation_count ?? 0;
                                    return (
                                        <div
                                            key={sessionId}
                                            className="bg-surface-light p-6 rounded-xl shadow-sm border border-[#e6e6dd] hover:border-primary transition-colors"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <h3 className="text-xl font-bold text-text-main mb-2">
                                                        {session.exam_title}
                                                    </h3>

                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                                        <div className="flex items-center gap-2 text-sm">
                                                            <Calendar className="w-4 h-4 text-text-muted" />
                                                            <span className="text-text-muted font-medium">
                                                                {new Date(session.started_at).toLocaleDateString()}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-2 text-sm">
                                                            <Clock className="w-4 h-4 text-text-muted" />
                                                            <span className="text-text-muted font-medium">
                                                                {new Date(session.started_at).toLocaleTimeString()}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-2 text-sm">
                                                            <Award className="w-4 h-4 text-text-muted" />
                                                            <span className="text-text-muted font-medium">
                                                                Score: {session.score ?? 0}%
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-2 text-sm">
                                                            <AlertTriangle className="w-4 h-4 text-text-muted" />
                                                            <span className="text-text-muted font-medium">
                                                                {violationsCount} violations
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-4 flex-wrap">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm text-text-muted font-bold">Credibility:</span>
                                                            <CredibilityBadge score={session.credibility_score ?? 100} />
                                                        </div>

                                                        {session.results_published && (
                                                            <>
                                                                <div className="h-4 w-px bg-[#e6e6dd]"></div>
                                                                <button
                                                                    onClick={() => navigate(`/results/${sessionId}`)}
                                                                    className="flex items-center gap-2 text-sm font-bold text-primary hover:underline"
                                                                >
                                                                    <Eye className="w-4 h-4" />
                                                                    View Results
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Score Badge */}
                                                <div className="ml-4 flex flex-col items-end gap-2">
                                                    <div className={`text-center p-4 rounded-lg border border-[#e6e6dd] ${(session.score ?? 0) >= 80 ? 'bg-green-50' :
                                                        (session.score ?? 0) >= 60 ? 'bg-[#f8f8f5]' :
                                                            'bg-red-50'
                                                        }`}>
                                                        <div className={`text-3xl font-black ${(session.score ?? 0) >= 80 ? 'text-green-600' :
                                                            (session.score ?? 0) >= 60 ? 'text-primary' :
                                                                'text-red-600'
                                                            }`}>
                                                            {session.score ?? 0}%
                                                        </div>
                                                        <div className="text-xs text-text-muted mt-1 font-bold">Score</div>
                                                    </div>
                                                    {session.results_published && (
                                                        <button
                                                            onClick={() => navigate(`/results/${sessionId}`)}
                                                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-content text-sm font-bold transition-colors"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                            View Results
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
