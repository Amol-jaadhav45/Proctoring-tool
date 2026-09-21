import { query } from "./_generated/server";

// Ultra-simple sessions functions
export const getAll = query({
    handler: async (ctx) => {
        try {
            // Limit to 50 sessions to prevent OOM/timeouts
            const sessions = await ctx.db.query("exam_sessions").order("desc").take(50);
            return sessions;
        } catch (error) {
            console.error("Error in sessions.getAll:", error);
            return [];
        }
    },
});

export const test = query({
    handler: async (ctx) => {
        try {
            const sessions = await ctx.db.query("exam_sessions").collect();
            return {
                success: true,
                count: sessions.length,
                message: "Sessions table is accessible"
            };
        } catch (error) {
            return {
                success: false,
                error: (error as any).message
            };
        }
    },
});