import { mutation } from "./_generated/server";

export const initializeCredibility = mutation({
    handler: async (ctx) => {
        const sessions = await ctx.db.query("exam_sessions").collect();
        let count = 0;
        for (const session of sessions) {
            if (session.credibility_score === undefined) {
                await ctx.db.patch(session._id, {
                    credibility_score: 100
                });
                count++;
            }
        }
        return `Updated ${count} sessions with default credibility score.`;
    },
});
