import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

import { StudentFeedCard } from '../components/StudentFeedCard';
import { ProctorChat } from '../components/ProctorChat';
import { useWebRTC } from '../hooks/useWebRTC';
import { signalingService } from '../services/signaling';
import { useLiveSessions } from '../hooks/useConvexMonitoring';
import { calculateStatus } from '../utils/timeUtils';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { Loader2, MessageSquare, AlertCircle, Eye, EyeOff, FileText } from 'lucide-react';
import { ErrorBoundary } from '../components/ErrorBoundary';

export const LiveProctoringView: React.FC = () => {
    const { examId } = useParams<{ examId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [showChat, setShowChat] = useState(false);
    const [proctorName, setProctorName] = useState('Proctor');
    const terminateAll = useMutation("exams:terminateAllSessions" as any);
    const publishResults = useMutation((api.exams as any).publishResults);
    const terminateSession = useMutation((api.sessions as any).terminateSession);
    const setSessionPaused = useMutation((api.sessions as any).setSessionPaused);

    const handleEndForAll = async () => {
        if (!examId) return;
        if (window.confirm('Are you sure you want to end the exam for all students? This action cannot be undone.')) {
            try {
                await terminateAll({ exam_id: examId as Id<'exams'> });
                alert('Exam ended for all students.');
            } catch (error) {
                console.error('Failed to end exam for all:', error);
                alert('Failed to end exam for all students.');
            }
        }
    };

    const handleKickStudent = async (sessionId: string) => {
        if (!window.confirm('Remove this student from the exam? They will not be able to rejoin.')) return;
        try {
            await terminateSession({ session_id: sessionId as Id<'exam_sessions'> });
        } catch (err) {
            console.error('Failed to kick student:', err);
            alert('Failed to remove student.');
        }
    };

    const handlePauseResume = async (sessionId: string, pause: boolean) => {
        try {
            await setSessionPaused({ session_id: sessionId as Id<'exam_sessions'>, paused: pause });
        } catch (err) {
            console.error('Failed to update student pause state:', err);
            alert('Failed to update.');
        }
    };

    // Real-time exam data
    const exam = useQuery(
        api.exams.getById,
        examId ? { id: examId as Id<'exams'> } : 'skip'
    );

    // Real-time sessions data via Convex
    const { sessions, loading: sessionsLoading } = useLiveSessions(examId ? examId as Id<'exams'> : null);

    // Get completed sessions for results view
    const completedSessions = useQuery(
        examId ? ((api.sessions as any).getCompletedSessionsForExam) : 'skip',
        examId ? { exam_id: examId as Id<'exams'> } : 'skip'
    ) as any[] | undefined;

    const [showResults, setShowResults] = useState(false);

    // WebRTC for live video streams (proctor receives student streams)
    const { remoteStreams } = useWebRTC({
        roomId: examId || 'default-room',
        isBroadcaster: false
    });

    useEffect(() => {
        // console.log('[LiveProctoringView] Exam ID:', examId);
        // console.log('[LiveProctoringView] Remote Streams Updated:',
        //    remoteStreams instanceof Map ? Array.from(remoteStreams.entries()).map(([k, v]) => `${k}: ${v.getTracks().length} tracks`) : remoteStreams
        // );
    }, [examId, remoteStreams]);

    // Map sessions to display format
    const displayStudents = (sessions || []).map((session: any) => {
        const credibility = session.credibility_score ?? 100;
        const status = calculateStatus(credibility);

        // Get stream from Map (remoteStreams is now a Map<string, MediaStream>)
        const stream = remoteStreams instanceof Map
            ? remoteStreams.get(session.user_id)
            : (remoteStreams as any)?.[session.user_id];

        // Debug logging for stream detection
        /* if (remoteStreams instanceof Map) {
            const streamKeys = Array.from(remoteStreams.keys());
            // console.log(`[LiveProctoringView] Looking for stream for user ${session.user_id}. Available streams: ${streamKeys.length} users:`, streamKeys);
        } */

        // Check if student is connected (has recent ping or active stream)
        const hasActiveStream = !!stream && stream.active;
        const lastPingValid = session.last_ping ? (Date.now() - session.last_ping) < 30000 : false;
        const isConnected = !!(hasActiveStream || lastPingValid);

        const violationCount = session.violation_count || (session.recentViolations?.length || 0);
        const latestViolation = session.recentViolations && session.recentViolations.length > 0
            ? session.recentViolations[0]
            : null;

        // Get user profile name - try multiple sources
        const studentName = session.user_profile?.name
            || session.extracted_name  // From ID verification
            || session.user_id?.slice(0, 8) // Fallback to user ID
            || 'Student';

        if (!isConnected && (stream || session.last_ping)) {
            // console.log(`[LiveProctoringView] User ${session.user_id} (${studentName}) detected as OFFLINE. Stream active: ${!!(stream?.active)}, Last ping: ${session.last_ping ? new Date(session.last_ping).toLocaleTimeString() : 'none'}`);
        }

        const isScreenSharing = !!(stream?.getVideoTracks().some((t: any) =>
            t.isScreen || /screen|display|window/i.test(t.label)
        )) || !!session.screen_recording_url;

        return {
            id: session.user_id,
            sessionId: session._id,
            sessionStatus: session.status || 'active',
            name: studentName,
            status: status,
            imageUrl: session.user_profile?.face_photo || '/default-avatar.png',
            screenUrl: session.screen_recording_url || null,
            stream: stream || null,
            screenStream: null, // Let StudentFeedCard split the unified stream
            hasAudio: !!stream?.getAudioTracks().length,
            isScreenSharing: isScreenSharing,
            isConnected: isConnected,
            violationCount: violationCount,
            alertMessage: latestViolation
                ? `${latestViolation.type.replace(/_/g, ' ')}`
                : undefined
        };
    });

    const filteredStudents = displayStudents.filter((student: any) =>
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.id.includes(searchQuery)
    );

    const activeStudents = sessions?.length || 0;

    // Get user name from profile using Convex
    const proctorProfile = useQuery(
        api.users.getUser,
        user?.user_id ? { user_id: user.user_id } : "skip"
    );

    useEffect(() => {
        if (proctorProfile?.name) {
            setProctorName(proctorProfile.name);
        }
    }, [proctorProfile]);

    // Real-time Violation Updates
    useEffect(() => {
        if (!examId) return;

        signalingService.connect();
        signalingService.joinRoom(examId, user?.id || 'proctor');

        signalingService.onViolationSnapshot((payload: any) => {
            console.log('[LiveProctor] Instant violation received:', payload);
            // In this view, we rely on Convex for the list, but we could show a transient toast
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                new Notification('Violation Detected!', {
                    body: `${payload.userName || 'Student'}: ${payload.violationType?.replace(/_/g, ' ')}`
                });
            }
        });
    }, [examId, user?.id]);

    const handlePublishResults = async (published: boolean) => {
        if (!examId) return;
        try {
            await publishResults({
                exam_id: examId as Id<'exams'>,
                published: published
            });
            alert(published ? 'Results published successfully.' : 'Results unpublished.');
        } catch (error) {
            console.error('Failed to publish results:', error);
            alert('Failed to update results visibility.');
        }
    };

    if (!examId) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-gray-100 max-w-md">
                    <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-900">No Exam Selected</h2>
                    <p className="text-gray-600 mt-2">Please select an exam to start monitoring.</p>
                    <button
                        onClick={() => navigate('/admin/monitoring')}
                        className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (

        <div className="min-h-screen bg-slate-50 flex flex-col w-full">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-30 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4 max-w-[1920px] mx-auto">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                            Live Monitoring: {exam?.title || 'Loading...'}
                        </h1>
                        <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                            <span className="flex items-center gap-1.5">
                                <span className={`w-2.5 h-2.5 rounded-full ${exam?.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                                {exam?.is_active ? `${activeStudents} student${activeStudents !== 1 ? 's' : ''} active` : 'Exam ended'}
                            </span>
                            <span>Proctor: {proctorName}</span>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={() => setShowChat(!showChat)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-colors ${showChat ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                        >
                            <MessageSquare size={18} />
                            Chat
                        </button>
                        {!exam?.is_active && completedSessions && completedSessions.length > 0 && (
                            <button
                                onClick={() => setShowResults(!showResults)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-colors ${showResults ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                            >
                                <FileText size={18} />
                                {showResults ? 'Hide Results' : 'View Results'}
                            </button>
                        )}
                        {!exam?.is_active && (
                            <button
                                onClick={() => handlePublishResults(!(exam as any)?.results_published)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-colors ${(exam as any)?.results_published ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                            >
                                {(exam as any)?.results_published ? <EyeOff size={18} /> : <Eye size={18} />}
                                {(exam as any)?.results_published ? 'Unpublish Results' : 'Publish Results'}
                            </button>
                        )}
                        {exam?.is_active && (
                            <button
                                onClick={handleEndForAll}
                                className="flex items-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors shadow-sm"
                            >
                                End for All
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex-1 p-6 w-full max-w-[1920px] mx-auto">
                <ErrorBoundary>
                    <div className="flex flex-col lg:flex-row gap-6 w-full">
                        {/* Main: Student feeds */}
                        <div className="flex-1 space-y-4 min-w-0">
                            <div className="flex items-center justify-between gap-4">
                                <label className="relative block flex-1 max-w-md">
                                    <span className="sr-only">Search students</span>
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                    </span>
                                    <input
                                        type="text"
                                        placeholder="Search by name or ID..."
                                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </label>
                                <span className="text-sm text-slate-500 font-medium">
                                    {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}
                                </span>
                            </div>

                            {sessionsLoading ? (
                                <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-slate-200 shadow-sm">
                                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
                                    <p className="text-slate-600 font-medium">Loading streams...</p>
                                    <p className="text-slate-400 text-sm mt-1">Students must be on the exam page with camera & screen shared.</p>
                                </div>
                            ) : filteredStudents.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-24 bg-white rounded-2xl border border-slate-200 shadow-sm">
                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                                        <AlertCircle size={32} className="text-slate-400" />
                                    </div>
                                    <p className="text-slate-900 font-bold text-lg">No students in this exam yet</p>
                                    <p className="text-slate-500 mt-1 max-w-sm text-center">When students join and share camera/screen, they will appear here. Ensure the exam is active.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                                    {filteredStudents.map((student: any) => (
                                        <StudentFeedCard
                                            key={student.id}
                                            studentName={student.name}
                                            studentId={student.id}
                                            status={student.status}
                                            imageUrl={student.imageUrl}
                                            hasAudio={student.hasAudio}
                                            isScreenSharing={student.isScreenSharing}
                                            screenUrl={student.screenUrl}
                                            stream={student.stream}
                                            screenStream={student.screenStream}
                                            alertMessage={student.alertMessage}
                                            isConnected={student.isConnected}
                                            violationCount={student.violationCount}
                                            sessionId={student.sessionId}
                                            sessionStatus={student.sessionStatus}
                                            onKick={handleKickStudent}
                                            onPauseResume={handlePauseResume}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Sidebar Panels */}
                        <aside className="w-full lg:w-96 space-y-6 shrink-0">
                            {/* Activity Feed */}
                            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 overflow-hidden flex flex-col h-[500px]">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                        <AlertCircle size={18} className="text-red-500" />
                                        Activity Panel
                                    </h3>
                                    <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded text-[10px] font-bold">
                                        {displayStudents.filter((s: any) => s.status !== 'ok' || s.violationCount > 0).length} Alerts
                                    </span>
                                </div>

                                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                                    {displayStudents.filter((s: any) => s.status !== 'ok' || s.violationCount > 0).length === 0 ? (
                                        <div className="text-center py-12 text-gray-400">
                                            <p className="text-xs">No active alerts detected</p>
                                        </div>
                                    ) : (
                                        displayStudents
                                            .filter((s: any) => s.status !== 'ok' || s.violationCount > 0)
                                            .sort((a: any, b: any) => {
                                                // Sort by violation count (descending), then by status severity
                                                if (b.violationCount !== a.violationCount) {
                                                    return b.violationCount - a.violationCount;
                                                }
                                                const statusOrder: Record<string, number> = { 'alert': 3, 'warning': 2, 'ok': 1 };
                                                return (statusOrder[b.status] || 0) - (statusOrder[a.status] || 0);
                                            })
                                            .map((student: any) => (
                                                <div key={student.id} className={`p-3 rounded-xl border transition-all cursor-pointer ${student.status === 'alert'
                                                    ? 'bg-red-50/50 border-red-200 hover:border-red-300'
                                                    : student.status === 'warning'
                                                        ? 'bg-yellow-50/50 border-yellow-200 hover:border-yellow-300'
                                                        : 'bg-gray-50/50 border-gray-200 hover:border-gray-300'
                                                    }`}>
                                                    <div className="flex justify-between items-start mb-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-xs text-gray-900">{student.name}</span>
                                                            {!student.isConnected && (
                                                                <span className="text-[8px] bg-red-500 text-white px-1.5 py-0.5 rounded">OFFLINE</span>
                                                            )}
                                                        </div>
                                                        <span className="text-[10px] text-gray-400">
                                                            {student.violationCount > 0 ? `${student.violationCount} violation${student.violationCount !== 1 ? 's' : ''}` : 'Live'}
                                                        </span>
                                                    </div>
                                                    <p className={`text-[10px] font-medium ${student.status === 'alert' ? 'text-red-600' :
                                                        student.status === 'warning' ? 'text-yellow-600' :
                                                            'text-gray-600'
                                                        }`}>
                                                        {student.alertMessage || (student.violationCount > 0 ? `${student.violationCount} violation${student.violationCount !== 1 ? 's' : ''} detected` : 'Monitoring')}
                                                    </p>
                                                </div>
                                            ))
                                    )}
                                </div>
                            </div>

                            {/* Chat — render outside sidebar so fixed positioning works; roomId = examId so students in exam get messages */}
                            {user && (
                                <ProctorChat
                                    roomId={examId || 'default-room'}
                                    userId={user?.user_id || user?.id || 'proctor'}
                                    userName={proctorName}
                                    userType="proctor"
                                    isOpen={showChat}
                                    onClose={() => setShowChat(false)}
                                    availableStudents={displayStudents.map((s: any) => ({ id: s.id, name: s.name }))}
                                />
                            )}
                        </aside>
                    </div>

                    {/* Results View (when exam is completed) */}
                    {showResults && !exam?.is_active && completedSessions && (completedSessions as any[]).length > 0 && (
                        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6 w-full">
                            <h3 className="text-xl font-bold text-gray-900 mb-4">Exam Results</h3>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Rank</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Student</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Score</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Violations</th>
                                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {(completedSessions || []).map((session: any, index: number) => {
                                            const score = session.score || 0;
                                            const isPassing = score >= 60;
                                            return (
                                                <tr key={session._id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm font-bold">#{index + 1}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <div>
                                                            <p className="text-sm font-bold text-gray-900">
                                                                {session.user_profile?.name || 'Unknown'}
                                                            </p>
                                                            <p className="text-xs text-gray-500">ID: {session.user_id.slice(0, 8)}...</p>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <span className={`text-sm font-bold ${isPassing ? 'text-green-600' : 'text-red-600'}`}>
                                                            {score}%
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                                        {session.violation_count || 0}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <span className={`px-2 py-1 rounded text-xs font-bold ${isPassing ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                            }`}>
                                                            {isPassing ? 'Passed' : 'Failed'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-4 flex justify-end">
                                <button
                                    onClick={() => {
                                        const basePath = window.location.pathname.includes('/admin') ? '/admin' : '/proctor';
                                        window.location.href = `${basePath}/exam-results/${examId}`;
                                    }}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
                                >
                                    <FileText size={16} />
                                    View Full Report
                                </button>
                            </div>
                        </div>
                    )}
                </ErrorBoundary>
            </div>
        </div>
    );

};
