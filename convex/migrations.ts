import { mutation } from "./_generated/server";

// Migration to reset and recreate tables with proper schema
export const resetNotificationsTable = mutation({
    handler: async (ctx) => {
        try {
            // Get all notifications
            const notifications = await ctx.db.query("notifications").collect();

            // Delete all notifications
            await Promise.all(
                notifications.map(notification => ctx.db.delete(notification._id))
            );

            console.log(`Deleted ${notifications.length} notifications`);

            return {
                success: true,
                message: `Reset notifications table - deleted ${notifications.length} records`
            };
        } catch (error) {
            console.error("Migration error:", error);
            return {
                success: false,
                error: (error as any).message
            };
        }
    },
});

export const resetSessionsTable = mutation({
    handler: async (ctx) => {
        try {
            // Get all sessions
            const sessions = await ctx.db.query("exam_sessions").collect();

            // Delete all sessions
            await Promise.all(
                sessions.map(session => ctx.db.delete(session._id))
            );

            console.log(`Deleted ${sessions.length} sessions`);

            return {
                success: true,
                message: `Reset sessions table - deleted ${sessions.length} records`
            };
        } catch (error) {
            console.error("Migration error:", error);
            return {
                success: false,
                error: (error as any).message
            };
        }
    },
});

// Create sample data for testing
export const createSampleData = mutation({
    handler: async (ctx) => {
        try {
            // Create a sample notification
            const notificationId = await ctx.db.insert("notifications", {
                user_id: "6ed616",
                type: "info",
                title: "Welcome to the System",
                message: "Your notification system is now working properly!",
                read: false,
                timestamp: new Date().toISOString(),
                sender_id: "system",
            });

            return {
                success: true,
                notificationId,
                message: "Sample data created successfully"
            };
        } catch (error) {
            console.error("Sample data creation error:", error);
            return {
                success: false,
                error: (error as any).message
            };
        }
    },
});