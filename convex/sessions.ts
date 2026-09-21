import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getActiveSessions = query({
    args: { examId: v.id("exams") },
    handler: async (ctx, args) => {
        const now = Date.now();
        const tenMinutesAgo = now - 10 * 60 * 1000;
        const thirtyMinutesAgo = now - 30 * 60 * 1000;

        const sessions = await ctx.db
            .query("exam_sessions")
            .withIndex("by_exam", (q) => q.eq("exam_id", args.examId))
            .filter((q) => q.and(
                q.neq(q.field("status"), "completed"),
                q.neq(q.field("status"), "terminated"),
                q.or(
                    // fresh ping
                    q.gt(q.field("last_ping"), tenMinutesAgo),
                    // no ping but created recently
                    q.and(
                        q.eq(q.field("last_ping"), undefined),
                        q.gt(q.field("_creationTime"), thirtyMinutesAgo)
                    )
                )
            ))
            .collect();

        return sessions;
    },
});

export const getSessionViolations = query({
    args: { sessionId: v.id("exam_sessions") },
    handler: async (ctx, args) => {
        const violations = await ctx.db
            .query("violations")
            .withIndex("by_session", (q) => q.eq("session_id", args.sessionId))
            .order("desc")
            .take(10);

        return violations;
    },
});

export const getAllActiveSessionsWithViolations = query({
    args: { examId: v.id("exams") },
    handler: async (ctx, args) => {
        const now = Date.now();
        const tenMinutesAgo = now - 10 * 60 * 1000;
        const thirtyMinutesAgo = now - 30 * 60 * 1000;

        const sessions = await ctx.db
            .query("exam_sessions")
            .withIndex("by_exam", (q) => q.eq("exam_id", args.examId))
            .filter((q) => q.and(
                q.neq(q.field("status"), "completed"),
                q.neq(q.field("status"), "terminated"),
                q.or(
                    q.gt(q.field("last_ping"), tenMinutesAgo),
                    q.and(
                        q.eq(q.field("last_ping"), undefined),
                        q.gt(q.field("_creationTime"), thirtyMinutesAgo)
                    )
                )
            ))
            .collect();

        // Fetch violations for each session
        const sessionsWithViolations = await Promise.all(
            sessions.map(async (session) => {
                const violations = await ctx.db
                    .query("violations")
                    .withIndex("by_session", (q) => q.eq("session_id", session._id))
                    .collect();

                const latestViolation = violations.length > 0 ? violations[violations.length - 1] : null;

                return {
                    ...session,
                    violation_count: violations.length,
                    latest_violation: latestViolation,
                };
            })
        );

        return sessionsWithViolations;
    },
});

export const getMyHistory = query({
    args: { user_id: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("exam_sessions")
            .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
            .collect();
    },
});

// My history with exam info (title, results_published) for showing "View Results"
export const getMyHistoryWithExams = query({
    args: { user_id: v.string() },
    handler: async (ctx, args) => {
        const sessions = await ctx.db
            .query("exam_sessions")
            .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
            .collect();

        const withExams = await Promise.all(
            sessions.map(async (session) => {
                const exam = await ctx.db.get(session.exam_id);
                return {
                    ...session,
                    exam_title: exam?.title ?? "Unknown",
                    results_published: exam?.results_published ?? false,
                };
            })
        );
        return withExams;
    },
});

// Alias for getMyHistory used by some front-end components
export const getByUser = getMyHistory;

// Get all sessions (for admin dashboard)
export const getAll = query({
    handler: async (ctx) => {
        return await ctx.db.query("exam_sessions").collect();
    },
});

export const getById = query({
    args: { id: v.id("exam_sessions") },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.id);
        if (!session) return null;

        const exam = await ctx.db.get(session.exam_id);
        return {
            ...session,
            exam_title: exam?.title || "Unknown Exam",
            duration_minutes: exam?.duration_minutes || 0,
        };
    },
});

// Get completed sessions for an exam (for proctor results report)
export const getCompletedSessionsForExam = query({
    args: { exam_id: v.id("exams") },
    handler: async (ctx, args) => {
        const sessions = await ctx.db
            .query("exam_sessions")
            .withIndex("by_exam", (q) => q.eq("exam_id", args.exam_id))
            .filter((q) => q.eq(q.field("status"), "completed"))
            .collect();

        // Enrich with user profiles and violations
        const sessionsWithDetails = await Promise.all(
            sessions.map(async (session) => {
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
                    user_profile: profile || null,
                    violations: violations || [],
                    violation_count: violations.length,
                };
            })
        );

        // Sort by score (high to low)
        return sessionsWithDetails.sort((a, b) => {
            const scoreA = a.score || 0;
            const scoreB = b.score || 0;
            return scoreB - scoreA; // Descending order
        });
    },
});

/** Kick (terminate) a student's session. They are removed from the exam. Score is calculated based on current answers. */
export const terminateSession = mutation({
    args: { session_id: v.id("exam_sessions") },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.session_id);
        if (!session) throw new Error("Session not found");
        if (session.locked) return; // Already submitted or terminated

        const exam = await ctx.db.get(session.exam_id);
        let score = session.score;

        if (exam && exam.questions && session.answers) {
            let correctCount = 0;
            const totalQuestions = exam.questions.length;
            exam.questions.forEach((q: any, idx: number) => {
                if (session.answers[idx] === q.correctAnswer) {
                    correctCount++;
                }
            });
            score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
        }

        await ctx.db.patch(args.session_id, {
            status: "terminated",
            locked: true,
            submitted_at: new Date().toISOString(),
            score: score ?? 0,
        });
    },
});

/** Pause or resume a student. Paused students cannot interact until resumed. */
export const setSessionPaused = mutation({
    args: {
        session_id: v.id("exam_sessions"),
        paused: v.boolean(),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.session_id);
        if (!session) throw new Error("Session not found");
        if (session.locked) return;
        await ctx.db.patch(args.session_id, {
            status: args.paused ? "paused" : "active",
        });
    },
});

export const updateCurrentQuestion = mutation({
    args: {
        session_id: v.id("exam_sessions"),
        question_index: v.number(),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.session_id);
        if (!session) throw new Error("Session not found");
        await ctx.db.patch(args.session_id, {
            current_question_index: args.question_index,
        });
    },
});

export const updatePing = mutation({
    args: {
        session_id: v.id("exam_sessions"),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.session_id);
        if (!session) throw new Error("Session not found");
        await ctx.db.patch(args.session_id, {
            last_ping: Date.now(),
        });
    },
});

export const saveAnswers = mutation({
    args: {
        session_id: v.id("exam_sessions"),
        answers: v.any(),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.session_id);
        if (!session) throw new Error("Session not found");
        if (session.locked) return;

        await ctx.db.patch(args.session_id, {
            answers: args.answers,
        });
    },
});