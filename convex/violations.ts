import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const log = mutation({
    args: {
        session_id: v.id("exam_sessions"),
        type: v.string(),
        severity: v.string(),
        timestamp: v.string(),
        snapshot: v.optional(v.string()),
        metadata: v.optional(v.any()),
        confidence: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("violations", {
            session_id: args.session_id,
            type: args.type,
            severity: args.severity,
            timestamp: args.timestamp,
            snapshot_url: args.snapshot,
            metadata: args.metadata,
            confidence: args.confidence,
        });

        // Update credibility score
        const session = await ctx.db.get(args.session_id);
        if (session) {
            let basePenalty = 0;
            switch (args.severity) {
                case 'critical':
                    basePenalty = 20;
                    break;
                case 'high':
                    basePenalty = 10;
                    break;
                case 'medium':
                    basePenalty = 5;
                    break;
                case 'low':
                    basePenalty = 2;
                    break;
                default:
                    basePenalty = 2;
            }

            // Weighted penalty: base * confidence (default to 1.0 if not provided)
            const confidence = args.confidence ?? 1.0;
            const penalty = Math.max(1, Math.round(basePenalty * confidence));

            const currentScore = session.credibility_score ?? 100;
            const newScore = Math.max(0, currentScore - penalty);

            if (newScore !== currentScore) {
                await ctx.db.patch(args.session_id, {
                    credibility_score: newScore
                });
            }
        }
    },
});

export const getBySession = query({
    args: { session_id: v.id("exam_sessions") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("violations")
            .withIndex("by_session", (q) => q.eq("session_id", args.session_id))
            .collect();
    },
});

// Get critical violations from today
export const getCriticalToday = query({
    handler: async (ctx) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayISO = today.toISOString();

        const allViolations = await ctx.db.query("violations").collect();
        return allViolations.filter(v =>
            v.severity === 'critical' &&
            v.timestamp >= todayISO
        ).slice(0, 10); // Limit to 10 most recent
    },
});

export const resolveViolation = mutation({
    args: {
        violationId: v.id("violations"),
        proctor_id: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const violation = await ctx.db.get(args.violationId);
        if (!violation) throw new Error("Violation not found");

        await ctx.db.patch(args.violationId, { status: "resolved" });

        if (args.proctor_id) {
            await ctx.db.insert("proctor_actions", {
                session_id: violation.session_id,
                proctor_id: args.proctor_id,
                action: "dismiss", // Resolving is similar to dismissing from active view, using 'dismiss' or add 'resolve' to schema
                reason: "Violation resolved by proctor",
                timestamp: new Date().toISOString(),
                metadata: { violationId: args.violationId, action: "resolve" }
            });
        }
    },
});

export const dismissViolation = mutation({
    args: {
        violationId: v.id("violations"),
        proctor_id: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        const violation = await ctx.db.get(args.violationId);
        if (!violation) throw new Error("Violation not found");

        await ctx.db.patch(args.violationId, { status: "dismissed" });

        if (args.proctor_id) {
            await ctx.db.insert("proctor_actions", {
                session_id: violation.session_id,
                proctor_id: args.proctor_id,
                action: "dismiss",
                reason: "Violation dismissed by proctor",
                timestamp: new Date().toISOString(),
                metadata: { violationId: args.violationId }
            });
        }
    },
});
