import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";

// Get All Exams
export const getAll = query({
    args: { includeInactive: v.optional(v.boolean()) },
    handler: async (ctx, args) => {
        if (args.includeInactive) {
            return await ctx.db.query("exams").order("desc").collect();
        }
        return await ctx.db.query("exams").filter(q => q.eq(q.field("is_active"), true)).order("desc").collect();
    },
});

// Exams for a specific user: active exams + any exam they have a session for (so completed/inactive exams stay visible for "View Results")
export const getExamsForUser = query({
    args: { user_id: v.string() },
    handler: async (ctx, args) => {
        const activeExams = await ctx.db.query("exams").filter(q => q.eq(q.field("is_active"), true)).order("desc").collect();
        const mySessions = await ctx.db
            .query("exam_sessions")
            .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
            .collect();
        const examIdsFromSessions = new Set(mySessions.map((s) => s.exam_id));
        const alreadyIncluded = new Set(activeExams.map((e) => e._id));
        const extraIds = [...examIdsFromSessions].filter((id) => !alreadyIncluded.has(id));
        const extraExams = await Promise.all(extraIds.map((id) => ctx.db.get(id)));
        const validExtra = extraExams.filter((e): e is NonNullable<typeof e> => e != null);
        return [...activeExams, ...validExtra];
    },
});

// Get Exam by ID
export const getById = query({
    args: { id: v.id("exams") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});

// Create Exam
export const create = mutation({
    args: {
        title: v.string(),
        duration_minutes: v.number(),
        questions: v.array(v.any()),
        scheduled_for: v.optional(v.string()),
        created_by: v.string(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("exams", {
            ...args,
            is_active: true,
            created_at: new Date().toISOString(),
        });
    },
});

// Start Exam Session
export const startSession = mutation({
    args: {
        exam_id: v.id("exams"),
        user_id: v.string(),
        extracted_name: v.optional(v.string()),
        id_photo: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const exam = await ctx.db.get(args.exam_id);
        if (!exam) throw new Error("Exam not found");

        const now = Date.now();

        // Check scheduling
        if (exam.scheduled_for) {
            const scheduledTime = new Date(exam.scheduled_for).getTime();
            if (now < scheduledTime) {
                throw new ConvexError(`This exam is scheduled for ${new Date(exam.scheduled_for).toLocaleString()}. Please wait.`);
            }
        }

        // Enforce single attempt limit
        const existingSession = await ctx.db
            .query("exam_sessions")
            .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
            .filter((q) => q.eq(q.field("exam_id"), args.exam_id))
            .first();

        if (existingSession) {
            if (existingSession.locked) {
                throw new ConvexError("Exam already submitted. You cannot take this exam again.");
            }

            // Check if time expired for the existing session
            if (existingSession.end_time < now) {
                // Auto-lock it if not already locked
                let score = 0;
                if (exam.questions && existingSession.answers) {
                    let correctCount = 0;
                    const totalQuestions = exam.questions.length;
                    exam.questions.forEach((q: any, idx: number) => {
                        if (existingSession.answers[idx] === q.correctAnswer) {
                            correctCount++;
                        }
                    });
                    score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
                }

                await ctx.db.patch(existingSession._id, {
                    locked: true,
                    status: "completed",
                    score: score,
                    submitted_at: new Date().toISOString()
                });
                throw new ConvexError("Exam time has expired.");
            }

            // Allow resume
            return {
                sessionId: existingSession._id,
                status: existingSession.status,
                startedAt: existingSession.started_at,
                endTime: existingSession.end_time,
                duration: exam.duration_minutes
            };
        }

        const durationMs = exam.duration_minutes * 60 * 1000;
        const endTime = now + durationMs;
        const nowIso = new Date().toISOString();

        const newSessionId = await ctx.db.insert("exam_sessions", {
            exam_id: args.exam_id,
            user_id: args.user_id,
            status: "active",
            started_at: nowIso,
            end_time: endTime,
            locked: false,
            extracted_name: args.extracted_name,
            id_photo: args.id_photo,
        });

        return {
            sessionId: newSessionId,
            status: "active",
            startedAt: nowIso,
            endTime: endTime,
            duration: exam.duration_minutes
        };
    },
});

// Submit Exam (Calculate Score)
export const submitExam = mutation({
    args: {
        session_id: v.id("exam_sessions"),
        answers: v.optional(v.any()), // Record<number, number> - questionIndex: answerIndex
    },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.session_id);
        if (!session) throw new Error("Session not found");
        if (session.locked) return; // Already submitted

        const exam = await ctx.db.get(session.exam_id);
        if (!exam) throw new Error("Exam not found");

        let score = 0;
        let totalQuestions = 0;

        if (args.answers && exam.questions) {
            totalQuestions = exam.questions.length;
            exam.questions.forEach((q: any, idx: number) => {
                if (args.answers[idx] === q.correctAnswer) {
                    score++;
                }
            });
        }

        const percentage = totalQuestions > 0 ? (score / totalQuestions) * 100 : 0;

        await ctx.db.patch(args.session_id, {
            status: "completed",
            locked: true,
            submitted_at: new Date().toISOString(),
            score: Math.round(percentage),
            answers: args.answers ?? undefined,
        });
    },
});

// Log Violation
export const logViolation = mutation({
    args: {
        session_id: v.id("exam_sessions"),
        type: v.string(),
        severity: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        const session = await ctx.db.get(args.session_id);
        if (!session || session.locked) return;

        const severity = args.severity || "medium";

        await ctx.db.insert("violations", {
            session_id: args.session_id,
            type: args.type,
            severity: severity,
            timestamp: new Date().toISOString(),
            metadata: args.metadata,
        });

        // Update credibility score
        let penalty = 0;
        switch (severity) {
            case 'critical':
                penalty = 20;
                break;
            case 'high':
                penalty = 10;
                break;
            case 'medium':
                penalty = 5;
                break;
            case 'low':
                penalty = 2;
                break;
        }

        const currentScore = session.credibility_score ?? 100;
        const newScore = Math.max(0, currentScore - penalty);

        if (newScore !== currentScore) {
            await ctx.db.patch(args.session_id, {
                credibility_score: newScore
            });
        }
    },
});

// Publish/Unpublish Results
export const publishResults = mutation({
    args: {
        exam_id: v.id("exams"),
        published: v.boolean(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.exam_id, {
            results_published: args.published,
        });
    },
});

// Update Exam
export const update = mutation({
    args: {
        id: v.id("exams"),
        title: v.optional(v.string()),
        duration_minutes: v.optional(v.number()),
        questions: v.optional(v.array(v.any())),
        scheduled_for: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        return await ctx.db.patch(id, updates);
    },
});

export const deleteExam = mutation({
    args: { id: v.id("exams") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});

export const terminateAllSessions = mutation({
    args: { exam_id: v.id("exams") },
    handler: async (ctx, args) => {
        const activeSessions = await ctx.db
            .query("exam_sessions")
            .withIndex("by_exam", (q) => q.eq("exam_id", args.exam_id))
            .filter((q) => q.eq(q.field("status"), "active"))
            .collect();

        for (const session of activeSessions) {
            const exam = await ctx.db.get(args.exam_id);
            let score = 0;
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

            await ctx.db.patch(session._id, {
                status: "completed",
                locked: true,
                submitted_at: new Date().toISOString(),
                score: score
            });
        }

        // Also mark the exam as inactive
        await ctx.db.patch(args.exam_id, { is_active: false });
    },
});
