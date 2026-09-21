import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";

// Ultra-simple notification functions that should work
export const getAll = query({
    args: { user_id: v.string() },
    handler: async (ctx, args) => {
        console.log("Getting notifications for user:", args.user_id);

        // optimized to use index
        const userNotifications = await ctx.db
            .query("notifications")
            .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
            .order("desc") // show newest first
            .collect();

        console.log("User notifications found:", userNotifications.length);

        return userNotifications;
    },
});

export const getUnreadCount = query({
    args: { user_id: v.string() },
    handler: async (_ctx, args) => {
        console.log("getUnreadCount START for user (STATIC DEBUG MODE):", args.user_id);
        return 0; // STATIC DEBUG RETURN

        /*
        try {
            // optimized to use index - much faster and cheaper
            const userNotifications = await ctx.db
                .query("notifications")
                .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
                .filter((q) => q.eq(q.field("read"), false))
                .collect();

            // console.log("Unread count:", userNotifications.length);

            return userNotifications.length;
        } catch (error) {
            console.error("Error in getUnreadCount:", error);
            return 0; // Return 0 instead of throwing
        }
        */
    },
});

export const sendToUser = mutation({
    args: {
        user_id: v.string(),
        type: v.string(),
        title: v.string(),
        message: v.string(),
        sender_id: v.string(),
    },
    handler: async (ctx, args) => {
        console.log("sendToUser called with:", JSON.stringify(args, null, 2));

        try {
            // Check if user exists (optional, but good for diagnostics)
            const user = await ctx.db
                .query("user_profiles")
                .withIndex("by_user_id", (q) => q.eq("user_id", args.user_id))
                .first();

            if (!user) {
                console.warn(`Warning: Target user ${args.user_id} not found in user_profiles`);
            }

            console.log("Creating notification...");

            const notificationId = await ctx.db.insert("notifications", {
                user_id: args.user_id,
                type: args.type,
                title: args.title,
                message: args.message,
                read: false,
                timestamp: new Date().toISOString(),
                sender_id: args.sender_id,
            });

            console.log("Notification created with ID:", notificationId);

            const notification = await ctx.db.get(notificationId);
            return notification;
        } catch (error) {
            console.error("Critical error in sendToUser:", error);
            // Use ConvexError to send the actual message to the client
            throw new ConvexError({
                message: "Failed to send notification via Convex",
                error: error instanceof Error ? error.message : String(error),
                code: "NOTIFICATION_SEND_ERROR",
                data: args
            });
        }
    },
});

// Test function to verify basic functionality
export const test = query({
    handler: async (ctx) => {
        try {
            const notifications = await ctx.db.query("notifications").collect();
            return {
                success: true,
                count: notifications.length,
                message: "Notifications table is accessible",
                sample: notifications.slice(0, 2)
            };
        } catch (error) {
            return {
                success: false,
                error: (error as any).message
            };
        }
    },
});