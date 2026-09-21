import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Comprehensive diagnostic to identify issues
export const runDiagnostics = query({
    args: { user_id: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const results = {
            timestamp: new Date().toISOString(),
            tests: {} as any,
            errors: [] as string[],
            success: true
        };

        // Test 1: Basic table access
        try {
            const userCount = await ctx.db.query("user_profiles").collect();
            results.tests.user_profiles = { count: userCount.length, status: "✅ OK" };
        } catch (error) {
            results.tests.user_profiles = { status: "❌ FAILED", error: (error as any).message };
            results.errors.push(`user_profiles: ${(error as any).message}`);
            results.success = false;
        }

        // Test 2: Notifications table
        try {
            const notifications = await ctx.db.query("notifications").collect();
            results.tests.notifications = { count: notifications.length, status: "✅ OK" };
        } catch (error) {
            results.tests.notifications = { status: "❌ FAILED", error: (error as any).message };
            results.errors.push(`notifications: ${(error as any).message}`);
            results.success = false;
        }

        // Test 3: Sessions table
        try {
            const sessions = await ctx.db.query("exam_sessions").collect();
            results.tests.exam_sessions = { count: sessions.length, status: "✅ OK" };
        } catch (error) {
            results.tests.exam_sessions = { status: "❌ FAILED", error: (error as any).message };
            results.errors.push(`exam_sessions: ${(error as any).message}`);
            results.success = false;
        }

        // Test 4: Exams table
        try {
            const exams = await ctx.db.query("exams").collect();
            results.tests.exams = { count: exams.length, status: "✅ OK" };
        } catch (error) {
            results.tests.exams = { status: "❌ FAILED", error: (error as any).message };
            results.errors.push(`exams: ${(error as any).message}`);
            results.success = false;
        }

        // Test 5: User-specific notifications (if user_id provided)
        if (args.user_id) {
            try {
                const userNotifications = await ctx.db
                    .query("notifications")
                    .withIndex("by_user", (q) => q.eq("user_id", args.user_id as string))
                    .collect();
                results.tests.user_notifications = {
                    count: userNotifications.length,
                    status: "✅ OK",
                    user_id: args.user_id
                };
            } catch (error) {
                results.tests.user_notifications = {
                    status: "❌ FAILED",
                    error: (error as any).message,
                    user_id: args.user_id
                };
                results.errors.push(`user_notifications: ${(error as any).message}`);
                results.success = false;
            }

            // Test 6: Unread count calculation
            try {
                const allUserNotifications = await ctx.db
                    .query("notifications")
                    .withIndex("by_user", (q) => q.eq("user_id", args.user_id as string))
                    .collect();
                const unreadCount = allUserNotifications.filter(n => !n.read).length;
                results.tests.unread_count = {
                    count: unreadCount,
                    total: allUserNotifications.length,
                    status: "✅ OK"
                };
            } catch (error) {
                results.tests.unread_count = { status: "❌ FAILED", error: (error as any).message };
                results.errors.push(`unread_count: ${(error as any).message}`);
                results.success = false;
            }
        }

        return results;
    },
});

// Test creating a notification with full error handling
export const testCreateNotification = mutation({
    args: {
        user_id: v.string(),
        title: v.optional(v.string()),
        message: v.optional(v.string())
    },
    handler: async (ctx, args) => {
        try {
            // Verify user exists
            const user = await ctx.db
                .query("user_profiles")
                .withIndex("by_user_id", (q) => q.eq("user_id", args.user_id))
                .first();

            if (!user) {
                return {
                    success: false,
                    error: `User with ID ${args.user_id} not found`,
                    available_users: await ctx.db.query("user_profiles").collect().then(users =>
                        users.map(u => ({ user_id: u.user_id, email: u.email }))
                    )
                };
            }

            // Create notification
            const notificationId = await ctx.db.insert("notifications", {
                user_id: args.user_id,
                type: "info",
                title: args.title || "Diagnostic Test",
                message: args.message || `Test notification created at ${new Date().toLocaleTimeString()}`,
                read: false,
                timestamp: new Date().toISOString(),
                sender_id: "diagnostic-system",
            });

            // Verify it was created
            const created = await ctx.db.get(notificationId);

            return {
                success: true,
                notificationId,
                created,
                message: "Notification created and verified successfully"
            };

        } catch (error) {
            return {
                success: false,
                error: (error as any).message,
                stack: (error as any).stack
            };
        }
    },
});

// Get detailed user info for debugging
export const getUserInfo = query({
    args: { user_id: v.string() },
    handler: async (ctx, args) => {
        try {
            const user = await ctx.db
                .query("user_profiles")
                .withIndex("by_user_id", (q) => q.eq("user_id", args.user_id))
                .first();

            if (!user) {
                const allUsers = await ctx.db.query("user_profiles").collect();
                return {
                    found: false,
                    searched_for: args.user_id,
                    available_users: allUsers.map(u => ({
                        user_id: u.user_id,
                        email: u.email,
                        name: u.name,
                        role: u.role
                    }))
                };
            }

            // Get user's notifications
            const notifications = await ctx.db
                .query("notifications")
                .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
                .collect();

            return {
                found: true,
                user: {
                    user_id: user.user_id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    created_at: user.created_at
                },
                notifications: {
                    total: notifications.length,
                    unread: notifications.filter(n => !n.read).length,
                    recent: notifications.slice(0, 3).map(n => ({
                        title: n.title,
                        message: n.message,
                        read: n.read,
                        timestamp: n.timestamp
                    }))
                }
            };

        } catch (error) {
            return {
                found: false,
                error: (error as any).message,
                searched_for: args.user_id
            };
        }
    },
});