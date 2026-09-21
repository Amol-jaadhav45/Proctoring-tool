import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Simple test query to verify Convex is working
export const testConnection = query({
    handler: async (_ctx) => {
        return {
            status: "connected",
            timestamp: new Date().toISOString(),
            message: "Convex is working properly!"
        };
    },
});

// Test creating a simple notification
export const createTestNotification = mutation({
    args: {
        user_id: v.string(),
        title: v.optional(v.string()),
        message: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        try {
            const notificationId = await ctx.db.insert("notifications", {
                user_id: args.user_id,
                type: "info",
                title: args.title || "Test Notification",
                message: args.message || "This is a test notification created by the debug function.",
                read: false,
                timestamp: new Date().toISOString(),
                sender_id: "system",
            });

            return {
                success: true,
                notificationId,
                message: "Test notification created successfully!"
            };
        } catch (error) {
            console.error("Error creating test notification:", error);
            return {
                success: false,
                error: (error as any).message
            };
        }
    },
});

// Get basic stats for debugging
export const getStats = query({
    handler: async (ctx) => {
        try {
            const [users, notifications, sessions, exams] = await Promise.all([
                ctx.db.query("user_profiles").collect(),
                ctx.db.query("notifications").collect(),
                ctx.db.query("exam_sessions").collect(),
                ctx.db.query("exams").collect(),
            ]);

            return {
                users: users.length,
                notifications: notifications.length,
                sessions: sessions.length,
                exams: exams.length,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error("Error getting stats:", error);
            return {
                error: (error as any).message,
                timestamp: new Date().toISOString()
            };
        }
    },
});

// Clear all notifications for a user (for testing)
export const clearUserNotifications = mutation({
    args: { user_id: v.string() },
    handler: async (ctx, args) => {
        try {
            const notifications = await ctx.db
                .query("notifications")
                .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
                .collect();

            await Promise.all(
                notifications.map(notification => ctx.db.delete(notification._id))
            );

            return {
                success: true,
                deleted: notifications.length,
                message: `Deleted ${notifications.length} notifications for user ${args.user_id}`
            };
        } catch (error) {
            console.error("Error clearing notifications:", error);
            return {
                success: false,
                error: (error as any).message
            };
        }
    },
});

// Purge all exam history data for a fresh start
export const clearAllExamHistory = mutation({
    handler: async (ctx) => {
        try {
            // 1. Get all records to delete
            const [sessions, violations, proctorActions, auditLogs] = await Promise.all([
                ctx.db.query("exam_sessions").collect(),
                ctx.db.query("violations").collect(),
                ctx.db.query("proctor_actions").collect(),
                ctx.db.query("audit_logs").collect(),
            ]);

            // 2. Perform deletions
            await Promise.all([
                ...sessions.map(s => ctx.db.delete(s._id)),
                ...violations.map(v => ctx.db.delete(v._id)),
                ...proctorActions.map(p => ctx.db.delete(p._id)),
                ...auditLogs.map(a => ctx.db.delete(a._id)),
            ]);

            return {
                success: true,
                message: `Purged ${sessions.length} sessions, ${violations.length} violations, ${proctorActions.length} proctor actions, and ${auditLogs.length} audit logs.`,
                counts: {
                    sessions: sessions.length,
                    violations: violations.length,
                    proctorActions: proctorActions.length,
                    auditLogs: auditLogs.length
                }
            };
        } catch (error) {
            console.error("Error purging exam history:", error);
            return {
                success: false,
                error: (error as any).message
            };
        }
    },
});