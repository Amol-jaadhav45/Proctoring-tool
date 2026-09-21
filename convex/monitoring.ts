import { query } from './_generated/server';
import { v } from 'convex/values';

/**
 * Get active exams with student counts
 */
export const getActiveExamsWithStats = query({
    args: {},
    handler: async (ctx) => {
        const exams = await ctx.db
            .query("exams")
            .filter((q) => q.eq(q.field("is_active"), true))
            .collect();

        const examsWithStats = await Promise.all(
            exams.map(async (exam) => {
                const activeSessions = await ctx.db
                    .query("exam_sessions")
                    .withIndex("by_exam", (q) => q.eq("exam_id", exam._id))
                    .filter((q) =>
                        q.or(
                            q.eq(q.field("status"), "active"),
                            q.eq(q.field("status"), "paused")
                        )
                    )
                    .collect();

                return {
                    ...exam,
                    activeStudents: activeSessions.length,
                    totalSessions: activeSessions.length,
                };
            })
        );

        return examsWithStats;
    }
});

/**
 * Get all exams with student counts (active or ended)
 */
export const getAllExamsWithStats = query({
    args: {},
    handler: async (ctx) => {
        const exams = await ctx.db
            .query("exams")
            .order("desc")
            .collect();

        const examsWithStats = await Promise.all(
            exams.map(async (exam) => {
                const activeSessions = await ctx.db
                    .query("exam_sessions")
                    .withIndex("by_exam", (q) => q.eq("exam_id", exam._id))
                    .filter((q) =>
                        q.or(
                            q.eq(q.field("status"), "active"),
                            q.eq(q.field("status"), "paused")
                        )
                    )
                    .collect();

                return {
                    ...exam,
                    activeStudents: activeSessions.length,
                    totalSessions: activeSessions.length,
                };
            })
        );

        return examsWithStats;
    }
});

/**
 * Get live sessions for a specific exam with user profiles and recent violations
 */
export const getLiveSessionsWithProfiles = query({
    args: { exam_id: v.id('exams') },
    handler: async (ctx, args) => {
        const sessions = await ctx.db
            .query("exam_sessions")
            .withIndex("by_exam", (q) => q.eq("exam_id", args.exam_id))
            .filter((q) =>
                q.or(
                    q.eq(q.field("status"), "active"),
                    q.eq(q.field("status"), "paused")
                )
            )
            .collect();

        const sessionsWithProfiles = await Promise.all(
            sessions.map(async (session) => {
                // Get user profile
                const profile = await ctx.db
                    .query("user_profiles")
                    .withIndex("by_user_id", (q) => q.eq("user_id", session.user_id))
                    .first();

                // Get recent violations (last 5)
                const violations = await ctx.db
                    .query("violations")
                    .withIndex("by_session", (q) => q.eq("session_id", session._id))
                    .order("desc")
                    .take(5);

                return {
                    ...session,
                    user_profile: profile || null,
                    recentViolations: violations || [],
                    violation_count: violations.length,
                };
            })
        );

        return sessionsWithProfiles;
    }
});

/**
 * Get recent violations across all sessions
 */
export const getRecentViolations = query({
    args: { limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const limit = args.limit || 50;
        const allViolations = await ctx.db
            .query("violations")
            .order("desc")
            .take(limit);

        // Enrich with session, user info, and exam data
        const violationsWithContext = await Promise.all(
            allViolations.map(async (violation) => {
                const session = await ctx.db.get(violation.session_id);
                if (!session) return null;

                const profile = await ctx.db
                    .query("user_profiles")
                    .withIndex("by_user_id", (q) => q.eq("user_id", session.user_id))
                    .first();

                const exam = await ctx.db.get(session.exam_id);

                return {
                    ...violation,
                    session,
                    user_profile: profile || null,
                    exam: exam || null,
                };
            })
        );

        return violationsWithContext.filter(v => v !== null);
    }
});

/**
 * Get session with full context (profile, exam, violations)
 */
export const getSessionWithContext = query({
    args: { session_id: v.id('exam_sessions') },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.session_id);
        if (!session) return null;

        const exam = await ctx.db.get(session.exam_id);
        const profile = await ctx.db
            .query("user_profiles")
            .withIndex("by_user_id", (q) => q.eq("user_id", session.user_id))
            .first();

        const violations = await ctx.db
            .query("violations")
            .withIndex("by_session", (q) => q.eq("session_id", session._id))
            .collect();

        return {
            ...session,
            exam: exam || null,
            user_profile: profile || null,
            violations: violations || [],
        };
    }
});

export const getGlobalUsageStats = query({
    args: {},
    handler: async (ctx) => {
        const users = await ctx.db.query("user_profiles").collect();
        const exams = await ctx.db.query("exams").collect();
        const sessions = await ctx.db.query("exam_sessions").collect();

        return {
            users: users.length,
            exams: exams.length,
            sessions: sessions.length,
        };
    }
});
