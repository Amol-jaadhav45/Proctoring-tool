import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get aggregated statistics for the proctor dashboard.
 */
export const getProctorStats = query({
    args: {},
    handler: async (ctx) => {
        const allSessions = await ctx.db.query("exam_sessions").collect();
        const activeSessions = allSessions.filter(s => s.status === "active" || s.status === "in_progress");
        const completedSessions = allSessions.filter(s => s.status === "completed");

        // Calculate Average Integrity (Credibility Score) across all sessions where it exists
        const sessionsWithCredibility = allSessions.filter(s => s.credibility_score !== undefined);
        const averageIntegrity = sessionsWithCredibility.length > 0
            ? Math.round(sessionsWithCredibility.reduce((acc, s) => acc + (s.credibility_score || 0), 0) / sessionsWithCredibility.length)
            : 100;

        // Calculate violation rate trend
        // We use credibility_score < 100 as a proxy for "Has Violations" to avoid scanning the entire violations table
        const sessionsWithViolationsCount = allSessions.filter(s => (s.credibility_score || 100) < 100).length;

        const violationRate = allSessions.length > 0
            ? Math.round((sessionsWithViolationsCount / allSessions.length) * 100)
            : 0;

        return {
            liveExams: activeSessions.length,
            totalExamsConducted: completedSessions.length,
            averageIntegrity: averageIntegrity,
            violationRate: violationRate,
            totalStudentsProctored: allSessions.length
        };
    },
});

/**
 * Get performance statistics for a specific student.
 */
export const getStudentHistoryStats = query({
    args: { user_id: v.string() },
    handler: async (ctx, args) => {
        const sessions = await ctx.db
            .query("exam_sessions")
            .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
            .filter((q) => q.or(
                q.eq(q.field("status"), "completed"),
                q.eq(q.field("status"), "terminated")
            ))
            .collect();

        if (sessions.length === 0) {
            return {
                averageScore: 0,
                examsPassed: 0,
                highestScore: 0,
                lastScore: 0,
                totalExams: 0
            };
        }

        const scores = sessions.map(s => s.score || 0);
        const passMark = 60; // Standard pass mark for now
        const passed = scores.filter(s => s >= passMark).length;

        // Sort by timestamp if available or use creation time
        const sortedSessions = [...sessions].sort((a, b) =>
            new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
        );

        return {
            averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
            examsPassed: passed,
            highestScore: Math.max(...scores),
            lastScore: sortedSessions[0].score || 0,
            totalExams: sessions.length
        };
    },
});

/**
 * Get detailed insights for the admin dashboard including time-series data.
 */
export const getAdminInsights = query({
    args: {},
    handler: async (ctx) => {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

        // Significantly reduced limits to prevent 16MB issue
        const recentSessions = await ctx.db
            .query("exam_sessions")
            .withIndex("by_started_at", (q) => q.gte("started_at", sevenDaysAgo))
            .take(1000); // Reduced from 3000 to 1000

        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(now.getDate() - (6 - i));
            return d.toISOString().split('T')[0];
        });

        // Activity Trend (Sessions per day)
        const activityTrend = last7Days.map(date => {
            const count = recentSessions.filter(s => s.started_at.startsWith(date)).length;
            return { date, count };
        });

        // Integrity Trend (Avg credibility per day)
        const integrityTrend = last7Days.map(date => {
            const daySessions = recentSessions.filter(s =>
                s.started_at.startsWith(date) && s.credibility_score !== undefined
            );
            const avg = daySessions.length > 0
                ? Math.round(daySessions.reduce((acc, s) => acc + (s.credibility_score || 0), 0) / daySessions.length)
                : 100;
            return { date, score: avg };
        });

        // Violation Distribution - Reduced limit to prevent memory issues
        const recentViolations = await ctx.db
            .query("violations")
            .withIndex("by_timestamp", (q) => q.gte("timestamp", sevenDaysAgo))
            .take(500); // Reduced from 1000 to 500

        const violationTypes = [...new Set(recentViolations.map(v => v.type))];
        const distribution = violationTypes.map(type => ({
            type,
            count: recentViolations.filter(v => v.type === type).length
        })).sort((a, b) => b.count - a.count).slice(0, 5);

        // Narrative Insights
        const thisWeekCount = recentSessions.length;

        // Optimized growth calculation with reduced limit
        const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString();
        const previousWeekSessions = await ctx.db
            .query("exam_sessions")
            .withIndex("by_started_at", (q) =>
                q.gte("started_at", fourteenDaysAgo).lt("started_at", sevenDaysAgo)
            )
            .take(1000); // Reduced from 2000 to 1000

        const lastWeekCount = previousWeekSessions.length;

        const growth = lastWeekCount > 0 ? Math.round(((thisWeekCount - lastWeekCount) / lastWeekCount) * 100) : 100;

        return {
            activityTrend,
            integrityTrend,
            distribution,
            summary: {
                thisWeekCount,
                growth,
                averageIntegrity: integrityTrend.length > 0 ? integrityTrend[integrityTrend.length - 1].score : 100
            }
        };
    },
});
