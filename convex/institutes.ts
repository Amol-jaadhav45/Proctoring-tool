import { query } from "./_generated/server";
import { v } from "convex/values";

// Get all institutes
export const getAll = query({
    handler: async (ctx) => {
        return await ctx.db.query("institutes").collect();
    },
});

// Get branches for an institute
export const getAllBranches = query({
    args: { institute_id: v.id("institutes") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("branches")
            .withIndex("by_institute", (q) => q.eq("institute_id", args.institute_id))
            .collect();
    },
});

// Get all branches (admin)
export const getAllBranchesAdmin = query({
    handler: async (ctx) => {
        return await ctx.db.query("branches").collect();
    },
});