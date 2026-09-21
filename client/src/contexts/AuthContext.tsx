import React, { createContext, useContext, useEffect, useState } from 'react';
import { useMutation, useConvex } from "convex/react";
import { api } from "../../../convex/_generated/api";

// Define our own types since we dropped Supabase
export interface User {
    id: string; // Internal Convex ID
    user_id: string; // Our custom user ID
    email: string;
    name: string;
    role: string;
    face_photo?: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signUp: (email: string, password: string, name: string, role?: string, additionalData?: any) => Promise<{ error: string | null; data: any }>;
    signIn: (email: string, password: string) => Promise<{ error: string | null }>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const convex = useConvex();
    const signInMutation = useMutation(api.auth.signIn);
    const signUpMutation = useMutation(api.auth.signUp);

    useEffect(() => {
        const validateSession = async () => {
            console.log("🔐 Starting auth validation...");
            setLoading(true);

            try {
                const storedUser = localStorage.getItem('proctai_user');
                if (!storedUser) {
                    console.log("👤 No stored user found");
                    setUser(null);
                    return;
                }

                console.log("📦 Found stored user, validating...");
                let parsed;
                try {
                    parsed = JSON.parse(storedUser);
                } catch (parseError) {
                    console.error("❌ Error parsing stored user:", parseError);
                    localStorage.removeItem('proctai_user');
                    setUser(null);
                    return;
                }

                console.log("📋 Stored user data:", { user_id: parsed.user_id, email: parsed.email });

                // Always validate with backend - no graceful fallback for security
                const user_id = parsed.user_id || parsed.id;
                if (!user_id) {
                    console.error("❌ No user_id found in stored session");
                    localStorage.removeItem('proctai_user');
                    setUser(null);
                    return;
                }

                try {
                    console.log("🔍 Validating user with Convex:", user_id);
                    const user = await convex.query(api.users.getUser, { user_id });

                    if (user) {
                        console.log("✅ User validated:", user.email);
                        // Use fresh data from backend, not stored data
                        const validatedUser = {
                            ...user,
                            id: user._id || user.user_id,
                            user_id: user.user_id || user._id
                        };
                        setUser(validatedUser);
                        localStorage.setItem('proctai_user', JSON.stringify(validatedUser));
                    } else {
                        console.warn("❌ User not found in database, clearing session");
                        localStorage.removeItem('proctai_user');
                        setUser(null);
                    }
                } catch (validationError) {
                    console.error("❌ Session validation failed:", validationError);
                    localStorage.removeItem('proctai_user');
                    setUser(null);
                }
            } catch (error) {
                console.error("❌ Auth initialization error:", error);
                localStorage.removeItem('proctai_user');
                setUser(null);
            } finally {
                console.log("✅ Auth validation complete");
                setLoading(false);
            }
        };

        validateSession();
    }, [convex]);

    const signUp = async (email: string, password: string, name: string, role?: string, additionalData?: any) => {
        try {
            const result = await signUpMutation({
                email,
                password,
                name,
                role,
                ...additionalData
            });
            if (result.error) return { error: result.error, data: null };

            // Auto login - ensure user object has all required fields
            const userData = result.user as any;
            if (!userData) return { error: "Failed to create user profile", data: null };

            // Make sure user_id matches our interface and handles Convex field names
            const userWithId: User = {
                ...userData,
                user_id: userData.user_id || userData._id,
                id: userData._id || userData.user_id,
                email: userData.email || ''
            };

            console.log("✅ User signed up:", userWithId.email);
            setUser(userWithId);
            localStorage.setItem('proctai_user', JSON.stringify(userWithId));

            return { error: null, data: userWithId };
        } catch (error: any) {
            return { error: error.message, data: null };
        }
    };

    const signIn = async (email: string, password: string) => {
        try {
            const result = await signInMutation({ email, password });
            if (result.error) return { error: result.error };

            const userData = result.user as any;
            if (!userData) return { error: "User profile not found" };

            // Ensure user object has all required fields for our interface
            const userWithId: User = {
                ...userData,
                user_id: userData.user_id || userData._id,
                id: userData._id || userData.user_id,
                email: userData.email || ''
            };

            console.log("✅ User signed in:", userWithId.email);
            setUser(userWithId);
            localStorage.setItem('proctai_user', JSON.stringify(userWithId));
            return { error: null };
        } catch (error: any) {
            return { error: error.message };
        }
    };

    const signOut = async () => {
        localStorage.removeItem('proctai_user');
        setUser(null);
    };

    const value = {
        user,
        loading,
        signUp,
        signIn,
        signOut,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
