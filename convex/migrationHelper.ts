import { query } from "./_generated/server";

export const dumpExams = query({
    handler: async (ctx) => {
        return await ctx.db.query("exams").collect();
    },
});

export const dumpUsers = query({
    handler: async (ctx) => {
        return await ctx.db.query("user_profiles").collect();
    },
});

export const dumpPolicies = query({
    handler: async (ctx) => {
        return await ctx.db.query("exam_policies").collect();
    },
});
