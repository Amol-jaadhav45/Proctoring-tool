import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

/**
 * Real-Time Monitoring Hooks
 * These hooks provide live data subscriptions via Convex
 */

/**
 * Subscribe to active exams with live student counts
 * Updates automatically when students join/leave exams
 */
export const useActiveExams = () => {
    const exams = useQuery((api as any).monitoring.getActiveExamsWithStats);
    return {
        exams: exams || [],
        loading: exams === undefined,
    };
};

/**
 * Subscribe to live sessions for a specific exam
 * Includes user profiles and recent violations
 */
export const useLiveSessions = (examId: Id<'exams'> | null) => {
    const sessions = useQuery(
        examId ? (api as any).monitoring.getLiveSessionsWithProfiles : 'skip',
        examId ? { exam_id: examId } : 'skip'
    );
    return {
        sessions: sessions || [],
        loading: sessions === undefined,
    };
};

/**
 * Subscribe to recent violations stream
 * Updates in real-time as new violations occur
 */
export const useRecentViolations = (limit?: number) => {
    const violations = useQuery((api as any).monitoring.getRecentViolations, { limit });
    return {
        violations: violations || [],
        loading: violations === undefined,
    };
};

/**
 * Subscribe to a specific session with full context
 * Includes user profile, exam details, and all violations
 */
export const useSessionWithContext = (sessionId: Id<'exam_sessions'> | null) => {
    const session = useQuery(
        sessionId ? (api as any).monitoring.getSessionWithContext : 'skip',
        sessionId ? { session_id: sessionId } : 'skip'
    );
    return {
        session,
        loading: session === undefined,
    };
};
