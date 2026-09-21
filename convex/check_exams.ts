import { query } from "./_generated/server";

export const checkExams = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("exams").filter(q => q.eq(q.field("is_active"), true)).collect();
    },
});
