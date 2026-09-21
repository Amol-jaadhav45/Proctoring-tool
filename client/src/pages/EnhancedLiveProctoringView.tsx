import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { StudentFeedCard } from '../components/StudentFeedCard';
import { AIMonitoringInsights, type StudentAnalytics } from '../components/AIMonitoringInsights';
import { RealTimeViolationAlerts, type ViolationAlert } from '../components/RealTimeViolationAlerts';
import { StudentFocusTracking, type StudentAttentionData } from '../components/StudentFocusTracking';
import { BulkProctorActions } from '../components/BulkProctorActions';
import { StudentMonitoringModal, type DetailedStudentData } from '../components/StudentMonitoringModal';
import { examApi, type Exam } from '../services/api';
import { AdminLayout } from '../components/AdminLayout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { ProctorChat } from '../components/ProctorChat';
import { Loader2, MessageSquare, AlertCircle, Brain, Eye, Activity, Settings } from 'lucide-react';
import { useWebRTC } from '../hooks/useWebRTC';
import { signalingService } from '../services/signaling';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { getCredibilityStatus } from '../utils/metrics';

export const EnhancedLiveProctoringView: React.FC = () => {
    const { examId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showChat, setShowChat] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'insights' | 'focus' | 'bulk'>('grid');
    const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
    const [showStudentModal, setShowStudentModal] = useState(false);

    const [proctorName, setProctorName] = useState<string>('Proctor');
    const [exam, setExam] = useState<Exam | null>(null);

    // WebRTC and AI State
    const { user } = useAuth();
    const { remoteStreams } = useWebRTC({
        roomId: examId || 'default-room',
        userId: user?.user_id || 'instructor',
        isBroadcaster: false
    });

    // Real-time Convex Data
    const sessionsData = useQuery(
        (api as any).sessions.getAllActiveSessionsWithViolations,
        examId ? { examId: examId as Id<"exams"> } : "skip" as any
    );

    const sessions = sessionsData || [];

    // Derive analytics from real data
    const [studentAnalytics, setStudentAnalytics] = useState<StudentAnalytics[]>([]);
    const [violationAlerts, setViolationAlerts] = useState<ViolationAlert[]>([]);
    const [attentionData, setAttentionData] = useState<StudentAttentionData[]>([]);

    useEffect(() => {
        const fetchExam = async () => {
            try {
                if (examId) {
                    const examData = await examApi.getById(examId);
                    setExam(examData);
                }
            } catch (error) {
                console.error('Failed to fetch exam:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchExam();
    }, [examId]);

    // Transform real sessions into analytics
    useEffect(() => {
        if (!sessions) return;

        const analytics: StudentAnalytics[] = sessions.map((session: any) => {
            const sessionStart = new Date(session.started_at).getTime();
            const now = Date.now();
            const focusTime = Math.floor((now - sessionStart) / 1000); // seconds

            return {
                studentId: session.user_id,
                studentName: `Student ${session.user_id.slice(0, 8)}`,
                attentionScore: session.credibility_score || 75,
                violationCount: session.violation_count || 0,
                lastViolation: session.latest_violation?.timestamp || new Date().toISOString(),
                focusTime: focusTime,
                suspiciousActivity: session.violation_count || 0,
                status: getCredibilityStatus(session.credibility_score || 100)
            };
        });

        setStudentAnalytics(analytics);

        // Generate violation alerts from real data - ONLY for this exam
        const alerts: ViolationAlert[] = [];
        sessions.forEach((session: any) => {
            if (session.latest_violation) {
                alerts.push({
                    id: `violation-${session.latest_violation._id}`,
                    studentId: session.user_id,
                    studentName: `Student ${session.user_id.slice(0, 8)}`,
                    type: session.latest_violation.type as any,
                    severity: session.latest_violation.severity as any,
                    timestamp: new Date(session.latest_violation.timestamp),
                    description: session.latest_violation.type.replace('_', ' '),
                    confidence: 0.85,
                    autoResolved: false
                });
            }
        });
        setViolationAlerts(alerts);

        // Generate attention tracking data
        const attention: StudentAttentionData[] = analytics.map(student => ({
            studentId: student.studentId,
            studentName: student.studentName,
            currentAttention: student.attentionScore,
            averageAttention: student.attentionScore,
            focusTime: student.focusTime,
            distractionCount: student.violationCount,
            metrics: [],
            status: student.status as any,
            lastActivity: new Date()
        }));
        setAttentionData(attention);

    }, [sessions]);

    // Real-time Violation Updates from Signaling Server
    useEffect(() => {
        if (!examId) return;

        // Connect to signaling if not already
        signalingService.connect();
        signalingService.joinRoom(examId, user?.id || 'proctor');

        signalingService.onViolationSnapshot((payload: any) => {
            console.log('[Proctor] Instant violation received:', payload);

            // Add to alerts immediately
            const newAlert: ViolationAlert = {
                id: `instant-${Date.now()}`,
                studentId: payload.userId || payload.studentId,
                studentName: payload.userName || payload.studentName || `Student ${(payload.userId || payload.studentId || '').slice(0, 8)}`,
                type: payload.violationType,
                severity: (payload.metadata?.severity || 'high') as any,
                timestamp: new Date(),
                description: payload.violationType?.replace(/_/g, ' ') || 'Unusual activity',
                screenshot: payload.imageData,
                confidence: payload.metadata?.confidence || 0.9,
                autoResolved: false
            };

            setViolationAlerts(prev => [newAlert, ...prev]);

            // Optional: browser notification
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                new Notification('Violation Detected!', {
                    body: `${newAlert.studentName}: ${newAlert.description}`
                });
            }
        });

        return () => {
            // Unsubscribe if signalingService supported it, but for now we just keep it
        };
    }, [examId, user?.id]);

    // Get user name from profile
    useEffect(() => {
        const fetchProctorName = async () => {
            if (user) {
                const { data } = await supabase
                    .from('user_profiles')
                    .select('name')
                    .eq('user_id', user.id)
                    .single();
                if (data?.name) {
                    setProctorName(data.name);
                }
            }
        };
        fetchProctorName();
    }, [user]);

    const terminateSession = useMutation((api.sessions as any).terminateSession);
    const setSessionPaused = useMutation((api.sessions as any).setSessionPaused);

    // Map sessions to display students
    const displayStudents = sessions.map((session: any) => ({
        id: session.user_id,
        sessionId: session._id,
        sessionStatus: session.status || 'active',
        name: session.user_profile?.name || session.userProfile?.name || 'Unknown Student',
        status: (session.credibility_score || 100) < 60 ? 'alert' : (session.credibility_score || 100) < 80 ? 'warning' : 'ok',
        imageUrl: session.user_profile?.face_photo || session.userProfile?.face_photo || '/default-avatar.png',
        screenUrl: session.screen_recording_url || null,
        stream: remoteStreams.get(session.user_id),
        hasAudio: true,
        isScreenSharing: true,
        alertMessage: session.latest_violation ? `${session.latest_violation.type.replace('_', ' ')}` : undefined
    }));

    const filteredStudents = displayStudents.filter((student: any) =>
        student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.id.includes(searchQuery)
    );

    // Get student details for modal
    const getSelectedStudentDetails = (): DetailedStudentData | null => {
        if (!selectedStudent) return null;

        const student = sessions.find((s: any) => s.user_id === selectedStudent);
        const analytics = studentAnalytics.find(a => a.studentId === selectedStudent);

        if (!student || !analytics) return null;

        return {
            id: student.user_id,
            name: analytics.studentName,
            email: `${analytics.studentName.toLowerCase().replace(' ', '.')}@example.com`,
            status: 'active',
            currentAttention: analytics.attentionScore,
            averageAttention: analytics.attentionScore,
            focusTime: analytics.focusTime,
            distractionCount: analytics.violationCount,
            violations: [],
            screenshots: [],
            examProgress: {
                currentQuestion: (student.current_question_index || 0) + 1,
                totalQuestions: exam?.questions?.length || 0,
                timeRemaining: student.end_time ? Math.max(0, new Date(student.end_time).getTime() - Date.now()) / 1000 : 0,
                timeSpent: Math.floor((Date.now() - new Date(student.started_at).getTime()) / 1000)
            },
            systemInfo: {
                browser: 'Chrome 120.0',
                os: 'Windows 11',
                deviceType: 'Desktop',
                screenResolution: '1920x1080',
                connectionType: 'Broadband'
            },
            webcamActive: true,
            micActive: true,
            screenSharing: true
        };
    };

    const handleStudentAction = async (studentId: string, action: string) => {
        const session = sessions.find((s: any) => s.user_id === studentId);
        const sessionId = session?._id;
        if (!sessionId) return;
        try {
            if (action === 'terminate') {
                if (!window.confirm('Remove this student from the exam? They will not be able to rejoin.')) return;
                await terminateSession({ session_id: sessionId });
            } else if (action === 'pause') {
                await setSessionPaused({ session_id: sessionId, paused: true });
            } else if (action === 'resume') {
                await setSessionPaused({ session_id: sessionId, paused: false });
            }
        } catch (err) {
            console.error('Student action failed:', err);
            alert('Action failed.');
        }
    };

    if (!examId) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center min-h-screen bg-gray-50">
                    <div className="bg-white rounded-lg p-8 max-w-md w-full text-center border border-gray-200 shadow-lg">
                        <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">No Exam Selected</h2>
                        <p className="text-gray-600 mb-6">
                            Please select an exam from active exams list to start monitoring.
                        </p>
                        <button
                            onClick={() => navigate('/proctor/monitoring')}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                        >
                            Go to Active Exams
                        </button>
                    </div>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="flex h-screen bg-gray-50">
                {/* Main Content */}
                <main className="flex flex-1 flex-col overflow-y-auto">
                    <div className="p-6">
                        {/* Page Header */}
                        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                            <div className="flex flex-col gap-2">
                                <h1 className="text-3xl font-bold text-gray-900">Live Proctoring: {exam?.title || 'Loading...'}</h1>
                                <p className="text-gray-600 text-base">Advanced AI-powered monitoring dashboard</p>
                            </div>

                            <div className="flex items-center gap-2">
                                {/* View Mode Selector */}
                                <div className="flex items-center bg-white rounded-lg border border-gray-200">
                                    <button
                                        onClick={() => setViewMode('grid')}
                                        className={`px-3 py-2 text-sm font-medium rounded-l-lg transition-colors ${viewMode === 'grid'
                                            ? 'bg-blue-600 text-white'
                                            : 'text-gray-600 hover:bg-gray-100'
                                            }`}
                                    >
                                        <Eye className="w-4 h-4 mr-1" />
                                        Grid View
                                    </button>
                                    <button
                                        onClick={() => setViewMode('insights')}
                                        className={`px-3 py-2 text-sm font-medium transition-colors ${viewMode === 'insights'
                                            ? 'bg-blue-600 text-white'
                                            : 'text-gray-600 hover:bg-gray-100'
                                            }`}
                                    >
                                        <Brain className="w-4 h-4 mr-1" />
                                        AI Insights
                                    </button>
                                    <button
                                        onClick={() => setViewMode('focus')}
                                        className={`px-3 py-2 text-sm font-medium transition-colors ${viewMode === 'focus'
                                            ? 'bg-blue-600 text-white'
                                            : 'text-gray-600 hover:bg-gray-100'
                                            }`}
                                    >
                                        <Activity className="w-4 h-4 mr-1" />
                                        Focus Tracking
                                    </button>
                                    <button
                                        onClick={() => setViewMode('bulk')}
                                        className={`px-3 py-2 text-sm font-medium rounded-r-lg transition-colors ${viewMode === 'bulk'
                                            ? 'bg-blue-600 text-white'
                                            : 'text-gray-600 hover:bg-gray-100'
                                            }`}
                                    >
                                        <Settings className="w-4 h-4 mr-1" />
                                        Bulk Actions
                                    </button>
                                </div>

                                <button
                                    onClick={() => setShowChat(true)}
                                    className="flex items-center justify-center gap-2 rounded-lg h-10 px-4 bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors"
                                >
                                    <MessageSquare className="w-4 h-4" />
                                    <span className="truncate">Chat</span>
                                </button>
                            </div>
                        </div>

                        {/* Dynamic Content Based on View Mode */}
                        {viewMode === 'grid' && (
                            <>
                                {/* Search Bar */}
                                <div className="mb-4">
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="text-gray-400 text-xl">🔍</span>
                                        </div>
                                        <input
                                            type="text"
                                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                                            placeholder="Search for a student by name or ID..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Student Grid */}
                                {loading ? (
                                    <div className="flex items-center justify-center h-64">
                                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                                    </div>
                                ) : filteredStudents.length === 0 ? (
                                    <div className="text-center py-12 text-gray-500">
                                        <p>No students active in this exam yet.</p>
                                        <p className="text-sm mt-2">Students will appear here when they start the exam.</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                        {filteredStudents.map((student: any) => (
                                            <div
                                                key={student.id}
                                                onClick={() => {
                                                    setSelectedStudent(student.id);
                                                    setShowStudentModal(true);
                                                }}
                                            >
                                                <StudentFeedCard
                                                    studentName={student.name}
                                                    studentId={student.id}
                                                    status={student.status}
                                                    imageUrl={student.imageUrl}
                                                    hasAudio={student.hasAudio}
                                                    isScreenSharing={student.isScreenSharing}
                                                    screenUrl={student.screenUrl}
                                                    stream={student.stream}
                                                    alertMessage={student.alertMessage}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}

                        {viewMode === 'insights' && (
                            <AIMonitoringInsights
                                students={studentAnalytics}
                                onStudentSelect={setSelectedStudent}
                                selectedStudent={selectedStudent || undefined}
                            />
                        )}

                        {viewMode === 'focus' && (
                            <StudentFocusTracking
                                students={attentionData}
                                timeRange="15min"
                                onTimeRangeChange={() => { }}
                            />
                        )}

                        {viewMode === 'bulk' && (
                            <BulkProctorActions
                                students={sessions.map((s: any) => ({
                                    id: s.user_id,
                                    name: `Student ${s.user_id.slice(0, 8)}`,
                                    status: 'active',
                                    selected: false
                                }))}
                                onWarnStudents={(ids) => ids.forEach(id => handleStudentAction(id, 'warn'))}
                                onPauseStudents={(ids) => ids.forEach(id => handleStudentAction(id, 'pause'))}
                                onResumeStudents={(ids) => ids.forEach(id => handleStudentAction(id, 'resume'))}
                                onTerminateStudents={(ids) => ids.forEach(id => handleStudentAction(id, 'terminate'))}
                                onMessageStudents={(ids) => ids.forEach(id => handleStudentAction(id, 'message'))}
                                onScreenshotStudents={(ids) => ids.forEach(id => handleStudentAction(id, 'screenshot'))}
                                onSelectAll={() => { }}
                                onDeselectAll={() => { }}
                                onToggleStudent={() => { }}
                            />
                        )}
                    </div>
                </main>

                {/* Side Panel - Real-time Alerts */}
                <aside className="w-96 bg-white border-l border-gray-200">
                    <RealTimeViolationAlerts
                        violations={violationAlerts}
                        onViolationResolve={(violationId) => {
                            setViolationAlerts(prev =>
                                prev.map(v => v.id === violationId ? { ...v, autoResolved: true } : v)
                            );
                        }}
                        onTakeScreenshot={(studentId) => handleStudentAction(studentId, 'screenshot')}
                        onPauseStudent={(studentId) => handleStudentAction(studentId, 'pause')}
                        onWarnStudent={(studentId) => handleStudentAction(studentId, 'warn')}
                    />
                </aside>
            </div>

            {/* Proctor Chat */}
            {showChat && user && (
                <ProctorChat
                    roomId={examId || 'default-room'}
                    userId={user.user_id}
                    userName={proctorName}
                    userType="proctor"
                    isOpen={showChat}
                    onClose={() => setShowChat(false)}
                />
            )}

            {/* Student Details Modal */}
            {showStudentModal && selectedStudent && (
                <StudentMonitoringModal
                    student={getSelectedStudentDetails()!}
                    isOpen={showStudentModal}
                    onClose={() => {
                        setShowStudentModal(false);
                        setSelectedStudent(null);
                    }}
                    onTakeScreenshot={() => handleStudentAction(selectedStudent, 'screenshot')}
                    onSendMessage={(message) => console.log('Message to student:', message)}
                    onPauseExam={() => handleStudentAction(selectedStudent, 'pause')}
                    onTerminateExam={() => handleStudentAction(selectedStudent, 'terminate')}
                    onWarnStudent={() => handleStudentAction(selectedStudent, 'warn')}
                />
            )}
        </AdminLayout>
    );
};