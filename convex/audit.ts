import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const logEvent = mutation({
    args: {
        event_type: v.string(),
        user_id: v.optional(v.string()),
        target_id: v.optional(v.string()),
        action: v.string(),
        details: v.string(),
        ip_address: v.optional(v.string()),
        timestamp: v.string(),
        integrity_hash: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("audit_logs", args);
    },
});
