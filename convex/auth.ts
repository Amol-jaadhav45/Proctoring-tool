import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Simple password hashing function (in production, use bcrypt or similar)
function hashPassword(password: string): string {
    // Using Web Crypto API available in Convex runtime
    const encoder = new TextEncoder();
    const data = encoder.encode(password + "proctai_salt_2024"); // Add salt
    return btoa(String.fromCharCode(...new Uint8Array(data))); // Base64 encode
}

function verifyPassword(password: string, hash: string): boolean {
    return hashPassword(password) === hash;
}

export const signIn = mutation({
    args: {
        email: v.string(),
        password: v.string(),
    },
    handler: async (ctx, args) => {
        // Use proper email index for efficient lookup
        const user = await ctx.db
            .query("user_profiles")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .first();

        if (!user) {
            return { error: "Invalid email or password" }; // Don't reveal which field is wrong
        }

        // Verify password using secure comparison
        if (!verifyPassword(args.password, user.password_hash)) {
            return { error: "Invalid email or password" };
        }

        // Update last login timestamp
        await ctx.db.patch(user._id, {
            last_login: new Date().toISOString()
        });

        // Return user without password hash
        const { password_hash, ...userWithoutPassword } = user;
        return { user: userWithoutPassword };
    },
});

export const signUp = mutation({
    args: {
        name: v.string(),
        email: v.string(),
        password: v.string(),
        role: v.optional(v.string()), // Default to student
        institute_id: v.optional(v.string()),
        branch_id: v.optional(v.string()),
        face_photo: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Check if email already exists using proper index
        const existing = await ctx.db
            .query("user_profiles")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .first();

        if (existing) {
            return { error: "Email already in use" };
        }

        // Validate password strength
        if (args.password.length < 6) {
            return { error: "Password must be at least 6 characters long" };
        }

        const userId = Math.random().toString(36).substring(7); // Simple ID generation
        const passwordHash = hashPassword(args.password);

        const newUserId = await ctx.db.insert("user_profiles", {
            user_id: userId,
            name: args.name,
            email: args.email,
            password_hash: passwordHash,
            role: (args.role as any) || "student",
            institute_id: args.institute_id || undefined,
            branch_id: args.branch_id || undefined,
            face_photo: args.face_photo || undefined,
            created_at: new Date().toISOString(),
        });

        const user = await ctx.db.get(newUserId);
        if (!user) {
            return { error: "Failed to create user" };
        }

        // Return user without password hash
        const { password_hash, ...userWithoutPassword } = user;
        return { user: userWithoutPassword };
    },
});

// Create an invite token for a new user; email is sent via separate action
export const createInvite = mutation({
    args: {
        email: v.string(),
        role: v.optional(v.string()), // default student
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("user_profiles")
            .filter((q) => q.eq(q.field("email"), args.email))
            .first();

        if (existing) {
            return { error: "A user with this email already exists" };
        }

        // Use Web Crypto API available in Convex environment
        const token = (globalThis.crypto?.randomUUID?.() ??
            Math.random().toString(36).slice(2) +
            Math.random().toString(36).slice(2));
        const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

        const inviteId = await ctx.db.insert("invites", {
            email: args.email,
            role: (args.role as any) || "student",
            token,
            used: false,
            expiresAt,
        });

        const baseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
        const link = `${baseUrl}/invite?token=${token}`;

        return { inviteId, link, error: null };
    },
});

// Look up invite details from token (used by frontend invite page)
export const getInvite = query({
    args: { token: v.string() },
    handler: async (ctx, { token }) => {
        const invite = await ctx.db
            .query("invites")
            .withIndex("by_token", (q) => q.eq("token", token))
            .first();

        if (!invite || invite.used || invite.expiresAt < Date.now()) {
            return null;
        }

        return {
            email: invite.email,
            role: invite.role,
        };
    },
});

// Accept invite: user sets password, account is created in user_profiles
export const acceptInvite = mutation({
    args: {
        token: v.string(),
        name: v.string(),
        password: v.string(),
    },
    handler: async (ctx, { token, name, password }) => {
        const invite = await ctx.db
            .query("invites")
            .withIndex("by_token", (q) => q.eq("token", token))
            .first();

        if (!invite || invite.used || invite.expiresAt < Date.now()) {
            return { error: "Invite is invalid or has expired" };
        }

        // Make sure we still don't have a user with this email
        const existing = await ctx.db
            .query("user_profiles")
            .withIndex("by_email", (q) => q.eq("email", invite.email))
            .first();

        if (existing) {
            return { error: "Account already exists for this email" };
        }

        // Validate password strength
        if (password.length < 6) {
            return { error: "Password must be at least 6 characters long" };
        }

        const userId = Math.random().toString(36).substring(7);
        const passwordHash = hashPassword(password);

        const newUserId = await ctx.db.insert("user_profiles", {
            user_id: userId,
            name,
            email: invite.email,
            password_hash: passwordHash,
            role: (invite.role as any) || "student",
            created_at: new Date().toISOString(),
        });

        await ctx.db.patch(invite._id, { used: true });

        const user = await ctx.db.get(newUserId);
        if (!user) {
            return { error: "Failed to create user" };
        }

        // Return user without password hash
        const { password_hash, ...userWithoutPassword } = user;
        return { user: userWithoutPassword, error: null };
    },
});

// Delete an invite (for admins to remove pending invites)
export const deleteInvite = mutation({
    args: {
        inviteId: v.id("invites"),
    },
    handler: async (ctx, { inviteId }) => {
        await ctx.db.delete(inviteId);
        return { success: true };
    },
});


