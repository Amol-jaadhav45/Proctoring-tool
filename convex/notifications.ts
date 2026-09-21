import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";

// Get all notifications for a user
export const getAll = query({
    args: { user_id: v.string() },
    handler: async (ctx, args) => {
        try {
            const notifications = await ctx.db
                .query("notifications")
                .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
                .collect();
            
            // Sort by timestamp descending (newest first)
            return notifications.sort((a, b) => {
                const timeA = new Date(a.timestamp).getTime();
                const timeB = new Date(b.timestamp).getTime();
                return timeB - timeA; // Descending order
            });
        } catch (error) {
            console.error("Error in notifications.getAll:", error);
            return [];
        }
    },
});

// Get unread count for a user - simplified to avoid index issues
export const getUnreadCount = query({
    args: { user_id: v.string() },
    handler: async (ctx, args) => {
        try {
            const notifications = await ctx.db
                .query("notifications")
                .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
                .collect();

            const unreadCount = notifications.filter(n => !n.read).length;
            return unreadCount;
        } catch (error) {
            console.error("Error in getUnreadCount:", error);
            return 0; // Return 0 on error to prevent crashes
        }
    },
});

// Mark notification as read
export const markAsRead = mutation({
    args: {
        notification_id: v.id("notifications"),
        user_id: v.string()
    },
    handler: async (ctx, args) => {
        const notification = await ctx.db.get(args.notification_id);

        if (!notification || notification.user_id !== args.user_id) {
            throw new Error("Notification not found or access denied");
        }

        await ctx.db.patch(args.notification_id, { read: true });
        return { success: true };
    },
});

// Mark all notifications as read for a user
export const markAllAsRead = mutation({
    args: { user_id: v.string() },
    handler: async (ctx, args) => {
        const notifications = await ctx.db
            .query("notifications")
            .withIndex("by_user", (q) => q.eq("user_id", args.user_id))
            .filter((q) => q.eq(q.field("read"), false))
            .collect();

        await Promise.all(
            notifications.map((notification) =>
                ctx.db.patch(notification._id, { read: true })
            )
        );

        return { success: true, count: notifications.length };
    },
});

// Delete a notification
export const deleteNotification = mutation({
    args: {
        notification_id: v.id("notifications"),
        user_id: v.string()
    },
    handler: async (ctx, args) => {
        const notification = await ctx.db.get(args.notification_id);

        if (!notification || notification.user_id !== args.user_id) {
            throw new Error("Notification not found or access denied");
        }

        await ctx.db.delete(args.notification_id);
        return { success: true };
    },
});

// Send notification to a specific user (for proctors/admins)
export const sendToUser = mutation({
    args: {
        user_id: v.string(),
        type: v.string(),
        title: v.string(),
        message: v.string(),
        sender_id: v.string(), // Who is sending the notification
    },
    handler: async (ctx, args) => {
        try {
            // Verify sender has permission (admin or instructor)
            const sender = await ctx.db
                .query("user_profiles")
                .withIndex("by_user_id", (q) => q.eq("user_id", args.sender_id))
                .first();

            if (!sender || !["admin", "instructor"].includes(sender.role)) {
                throw new Error("Unauthorized to send notifications");
            }

            const notificationId = await ctx.db.insert("notifications", {
                user_id: args.user_id,
                type: args.type,
                title: args.title,
                message: args.message,
                read: false,
                timestamp: new Date().toISOString(),
                sender_id: args.sender_id,
            });

            const notification = await ctx.db.get(notificationId);
            return notification;
        } catch (error) {
            console.error("Error in sendToUser:", error);
            throw error;
        }
    },
});

// Send notification to multiple users (broadcast)
export const sendToMultiple = mutation({
    args: {
        user_ids: v.array(v.string()),
        type: v.string(),
        title: v.string(),
        message: v.string(),
        sender_id: v.string(),
    },
    handler: async (ctx, args) => {
        try {
            // Verify sender has permission
            const sender = await ctx.db
                .query("user_profiles")
                .withIndex("by_user_id", (q) => q.eq("user_id", args.sender_id))
                .first();

            if (!sender || !["admin", "instructor"].includes(sender.role)) {
                throw new Error("Unauthorized to send notifications");
            }

            const notifications = await Promise.all(
                args.user_ids.map((user_id) =>
                    ctx.db.insert("notifications", {
                        user_id,
                        type: args.type,
                        title: args.title,
                        message: args.message,
                        read: false,
                        timestamp: new Date().toISOString(),
                        sender_id: args.sender_id,
                    })
                )
            );

            return { success: true, count: notifications.length };
        } catch (error) {
            console.error("Error in sendToMultiple:", error);
            throw error;
        }
    },
});

// Send notification to all users of a specific role - simplified
export const sendToRole = mutation({
    args: {
        role: v.union(v.literal("student"), v.literal("instructor"), v.literal("admin")),
        type: v.string(),
        title: v.string(),
        message: v.string(),
        sender_id: v.string(),
    },
    handler: async (ctx, args) => {
        console.log(`sendToRole called for role: ${args.role} by sender: ${args.sender_id}`);
        try {
            // Verify sender has permission
            const sender = await ctx.db
                .query("user_profiles")
                .withIndex("by_user_id", (q) => q.eq("user_id", args.sender_id))
                .first();

            if (!sender) {
                console.error(`Sender not found: ${args.sender_id}`);
                throw new Error("Sender not found");
            }

            if (!["admin", "instructor"].includes(sender.role)) {
                console.error(`Unauthorized sender role: ${sender.role}`);
                throw new Error("Unauthorized to send notifications");
            }

            // Get all users with the specified role
            const users = await ctx.db
                .query("user_profiles")
                .withIndex("by_role", (q) => q.eq("role", args.role))
                .collect();

            console.log(`Found ${users.length} users with role ${args.role}`);

            if (users.length === 0) {
                return { success: true, count: 0 };
            }

            // Batch writes to avoid limits? For now just try/catch the loop
            // NOTE: If there are too many users, this might time out.
            // For > 100 users, we should use a scheduled action or split into batches.
            const notifications = await Promise.all(
                users.map((user) =>
                    ctx.db.insert("notifications", {
                        user_id: user.user_id,
                        type: args.type,
                        title: args.title,
                        message: args.message,
                        read: false,
                        timestamp: new Date().toISOString(),
                        sender_id: args.sender_id,
                    })
                )
            );

            console.log(`Successfully sent ${notifications.length} notifications`);

            return { success: true, count: notifications.length };
        } catch (error) {
            console.error("Error in sendToRole:", error);
            // Re-throw with more info to help client
            throw new ConvexError({
                message: "Failed to send to role",
                error: error instanceof Error ? error.message : String(error)
            });
        }
    },
});

// Send notification to all users in an institute
export const sendToInstitute = mutation({
    args: {
        institute_id: v.string(),
        type: v.string(),
        title: v.string(),
        message: v.string(),
        sender_id: v.string(),
    },
    handler: async (ctx, args) => {
        try {
            // Verify sender has permission
            const sender = await ctx.db
                .query("user_profiles")
                .withIndex("by_user_id", (q) => q.eq("user_id", args.sender_id))
                .first();

            if (!sender || !["admin", "instructor"].includes(sender.role)) {
                throw new Error("Unauthorized to send notifications");
            }

            // Get all users in the institute
            const users = await ctx.db
                .query("user_profiles")
                .filter((q) => q.eq(q.field("institute_id"), args.institute_id))
                .collect();

            if (users.length === 0) {
                return { success: true, count: 0 };
            }

            const notifications = await Promise.all(
                users.map((user) =>
                    ctx.db.insert("notifications", {
                        user_id: user.user_id,
                        type: args.type,
                        title: args.title,
                        message: args.message,
                        read: false,
                        timestamp: new Date().toISOString(),
                        sender_id: args.sender_id,
                    })
                )
            );

            return { success: true, count: notifications.length };
        } catch (error) {
            console.error("Error in sendToInstitute:", error);
            throw error;
        }
    },
});
