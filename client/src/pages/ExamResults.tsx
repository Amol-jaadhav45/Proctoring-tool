import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { CheckCircle, XCircle, AlertTriangle, Trophy, Home, Loader2, Lock } from 'lucide-react';
import type { Id } from '../../../convex/_generated/dataModel';

export const ExamResults: React.FC = () => {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    // Use Convex queries for real-time updates
    const session = useQuery(
        api.sessions.getById,
        sessionId
            ? { id: sessionId as Id<'exam_sessions'> }
            : 'skip'
    ) as any;

    const exam = useQuery(
        api.exams.getById,
        session?.exam_id
            ? { id: session.exam_id as Id<'exams'> }
            : 'skip'
    ) as any;

    const violations = useQuery(
        api.sessions.getSessionViolations,
        sessionId
            ? { sessionId: sessionId as Id<'exam_sessions'> }
            : 'skip'
    ) as any[] | undefined;

    const violationsList = violations || [];

    const isProctor = user?.role === 'admin' || user?.role === 'instructor';
    const resultsPublished = exam?.results_published ?? false;
    const loading = session === undefined || exam === undefined;

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            </div>
        );
    }

    if (!session || !exam) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-600">Results not found</p>
                    <button
                        onClick={() => navigate('/')}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Go to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    // If student and results not published, show message
    if (!isProctor && !resultsPublished) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center">
                    <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Results Not Available</h2>
                    <p className="text-gray-600 mb-6">
                        Your exam results are being reviewed. The proctor will publish the results soon.
                    </p>
                    <button
                        onClick={() => navigate('/')}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                    >
                        <Home className="w-5 h-5 inline-block mr-2" />
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    const score = session.score || 0;
    const isPassing = score >= 60;

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Score Card */}
                <div className={`bg-gradient-to-r ${isPassing ? 'from-green-500 to-green-600' : 'from-red-500 to-red-600'} rounded-xl shadow-lg p-8 text-white mb-8`}>
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold mb-2">{exam.title}</h1>
                            <p className="text-white/90">Result for {exam.title}</p>
                        </div>
                        <div className="text-center">
                            <Trophy className="w-16 h-16 mx-auto mb-2" />
                            <div className="text-5xl font-bold">{score}%</div>
                            <p className="text-sm mt-1">{isPassing ? 'Passed' : 'Failed'}</p>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4 mb-8">
                    <div className="bg-white rounded-lg shadow p-4 text-center">
                        <div className="text-2xl font-bold text-gray-900">{exam?.questions?.length || 0}</div>
                        <div className="text-sm text-gray-500">Total Questions</div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4 text-center">
                        <div className="text-2xl font-bold text-green-600">
                            {exam?.questions ? Math.round((score / 100) * exam.questions.length) : 0}
                        </div>
                        <div className="text-sm text-gray-500">Correct</div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4 text-center">
                        <div className="text-2xl font-bold text-red-600">{violationsList.length}</div>
                        <div className="text-sm text-gray-500">Violations</div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4 text-center">
                        <div className={`text-2xl font-bold ${(session.credibility_score || 100) >= 80 ? 'text-green-600' : (session.credibility_score || 100) >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {session.credibility_score || 100}%
                        </div>
                        <div className="text-sm text-gray-500">Credibility</div>
                    </div>
                </div>

                {/* Answers Review */}
                <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Answer Review</h2>
                    <div className="space-y-4">
                        {exam?.questions?.map((q: any, index: number) => {
                            const userAnswer = session?.answers?.[index];
                            const isCorrect = userAnswer === q.correctAnswer;

                            return (
                                <div key={index} className={`border-l-4 ${isCorrect ? 'border-green-500' : 'border-red-500'} pl-4 py-2`}>
                                    <div className="flex items-start gap-3">
                                        {isCorrect ? (
                                            <CheckCircle className="w-5 h-5 text-green-600 mt-1" />
                                        ) : (
                                            <XCircle className="w-5 h-5 text-red-600 mt-1" />
                                        )}
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-900 mb-2">
                                                {index + 1}. {q.question}
                                            </p>
                                            <div className="space-y-1 text-sm">
                                                <p className={userAnswer === q.correctAnswer ? 'text-green-600 font-medium' : 'text-gray-600'}>
                                                    Your answer: {q.options[userAnswer] || 'Not answered'}
                                                </p>
                                                {!isCorrect && (
                                                    <p className="text-green-600 font-medium">
                                                        Correct answer: {q.options[q.correctAnswer]}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Violations */}
                {violationsList.length > 0 && (
                    <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 text-orange-600" />
                            Violations Detected
                        </h2>
                        <div className="space-y-2">
                            {violationsList.map((v, i) => (
                                <div key={i} className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${v.severity === 'critical' ? 'bg-red-600 text-white' :
                                        v.severity === 'high' ? 'bg-orange-600 text-white' :
                                            'bg-yellow-600 text-white'
                                        }`}>
                                        {v.severity}
                                    </span>
                                    <span className="text-sm text-gray-700">{v.type}</span>
                                    <span className="text-xs text-gray-500 ml-auto">
                                        {new Date(v.timestamp).toLocaleTimeString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex justify-center">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                    >
                        <Home className="w-5 h-5" />
                        Back to Dashboard
                    </button>
                </div>
            </div>
        </div>
    );
};
