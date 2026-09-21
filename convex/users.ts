import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create or Update User (Upsert)
export const syncUser = mutation({
    args: {
        user_id: v.string(),
        name: v.string(),
        email: v.string(),
        role: v.string(),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("user_profiles")
            .withIndex("by_user_id", (q) => q.eq("user_id", args.user_id))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, { name: args.name, email: args.email });
            return existing._id;
        } else {
            // @ts-ignore
            return await ctx.db.insert("user_profiles", {
                ...args,
                role: args.role as any,
                created_at: new Date().toISOString()
            });
        }
    },
});

export const getUser = query({
    args: { user_id: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("user_profiles")
            .withIndex("by_user_id", (q) => q.eq("user_id", args.user_id))
            .first();
    },
});

export const createStudent = mutation({
    args: {
        user_id: v.string(),
        name: v.string(),
        email: v.string(),
        student_id: v.string(),
        face_photo: v.string(),
        password: v.optional(v.string()), // Plain password to be hashed
        institute_id: v.optional(v.string()),
        branch_id: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Simple password hashing (same as in auth.ts)
        function hashPassword(password: string): string {
            const encoder = new TextEncoder();
            const data = encoder.encode(password + "proctai_salt_2024");
            return btoa(String.fromCharCode(...new Uint8Array(data)));
        }

        // Generate password if not provided (use student_id as default)
        const plainPassword = args.password || args.student_id;
        const password_hash = hashPassword(plainPassword);

        // Exclude password from the object inserted into the database
        const { password, ...userData } = args;

        return await ctx.db.insert("user_profiles", {
            ...userData,
            password_hash, // Store hashed password
            role: "student",
            created_at: new Date().toISOString(),
        });
    },
});

export const bulkCreateStudents = mutation({
    args: {
        students: v.array(v.object({
            user_id: v.string(),
            name: v.string(),
            email: v.string(),
            student_id: v.string(),
            face_photo: v.optional(v.string()),
            institute_id: v.optional(v.string()),
            branch_id: v.optional(v.string()),
        }))
    },
    handler: async (ctx, args) => {
        function hashPassword(password: string): string {
            const encoder = new TextEncoder();
            const data = encoder.encode(password + "proctai_salt_2024");
            return btoa(String.fromCharCode(...new Uint8Array(data)));
        }

        const results = [];
        for (const student of args.students) {
            // Check if user already exists
            const existing = await ctx.db
                .query("user_profiles")
                .withIndex("by_email", (q) => q.eq("email", student.email))
                .first();

            if (existing) {
                results.push({ email: student.email, status: "exists", id: existing._id });
                continue;
            }

            const password_hash = hashPassword(student.student_id);
            const id = await ctx.db.insert("user_profiles", {
                ...student,
                password_hash,
                role: "student",
                created_at: new Date().toISOString(),
            });
            results.push({ email: student.email, status: "created", id });
        }
        return results;
    }
});

// Get all users
export const getAll = query({
    handler: async (ctx) => {
        return await ctx.db.query("user_profiles").collect();
    },
});

// Update user role
export const updateRole = mutation({
    args: {
        user_id: v.string(),
        role: v.union(v.literal("student"), v.literal("instructor"), v.literal("admin")),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("user_profiles")
            .withIndex("by_user_id", (q) => q.eq("user_id", args.user_id))
            .first();

        if (!user) {
            throw new Error("User not found");
        }

        await ctx.db.patch(user._id, { role: args.role });
        return { success: true };
    },
});

export const updateProfile = mutation({
    args: {
        user_id: v.string(),
        name: v.optional(v.string()),
        email: v.optional(v.string()),
        face_photo: v.optional(v.string()),
        institute_id: v.optional(v.string()),
        branch_id: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("user_profiles")
            .withIndex("by_user_id", (q) => q.eq("user_id", args.user_id))
            .first();

        if (!user) {
            throw new Error("User not found");
        }

        const updates: any = {};
        if (args.name !== undefined) updates.name = args.name;
        if (args.email !== undefined) updates.email = args.email;
        if (args.face_photo !== undefined) updates.face_photo = args.face_photo;
        if (args.institute_id !== undefined) updates.institute_id = args.institute_id;
        if (args.branch_id !== undefined) updates.branch_id = args.branch_id;

        await ctx.db.patch(user._id, updates);
        return { success: true };
    },
});

export const deleteUser = mutation({
    args: {
        user_id: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("user_profiles")
            .withIndex("by_user_id", (q) => q.eq("user_id", args.user_id))
            .first();

        if (!user) {
            throw new Error("User not found");
        }

        await ctx.db.delete(user._id);
        return { success: true };
    },
});

// Get all pending invites (not used and not expired)
export const getAllPendingInvites = query({
    handler: async (ctx) => {
        const now = Date.now();
        const allInvites = await ctx.db.query("invites").collect();

        // Filter for pending invites (not used and not expired)
        return allInvites.filter(invite =>
            !invite.used && invite.expiresAt > now
        );
    },
});

