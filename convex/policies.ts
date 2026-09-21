import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const seedDefaultPolicy = mutation({
    args: {},
    handler: async (ctx) => {
        const defaultPolicy = await ctx.db
            .query("exam_policies")
            .withIndex("by_title", (q) => q.eq("title", "Standard Academic Integrity"))
            .first();

        if (defaultPolicy) return defaultPolicy._id;

        return await ctx.db.insert("exam_policies", {
            title: "Standard Academic Integrity",
            weights: {
                FACE_DETECTED: 0,
                FACE_MISSING: 15,
                MULTIPLE_FACES: 40,
                GAZE_AVERSION: 5,
                AUDIO_VOICE_DETECTED: 20,
                AUDIO_BACKGROUND_NOISE: 5,
                OBJECT_DETECTED: 30,
            },
            thresholds: {
                medium: 30,
                high: 60,
                critical: 85,
            },
            decay_rate: 5,
            is_default: true,
            created_at: new Date().toISOString(),
        });
    },
});

export const getPolicyByExam = query({
    args: { examId: v.id("exams") },
    handler: async (ctx, args) => {
        const exam = await ctx.db.get(args.examId);
        if (!exam || !exam.policy_id) {
            // Fallback to default policy
            return await ctx.db
                .query("exam_policies")
                .withIndex("by_title", (q) => q.eq("title", "Standard Academic Integrity"))
                .first();
        }
        return await ctx.db.get(exam.policy_id);
    },
});
