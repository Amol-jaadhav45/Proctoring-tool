import { ConvexReactClient } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

const getApiBaseUrl = (): string => {
    const fromEnv = import.meta.env.VITE_API_URL as string | undefined;
    if (fromEnv) return fromEnv;
    if (typeof window !== "undefined") return `${window.location.origin}/api`;
    // Non-browser environments (tests/SSR) must provide VITE_API_URL
    return "";
};

export const API_BASE_URL = getApiBaseUrl();

// Get Convex URL from environment or use a default for development
const getConvexUrl = () => {
    const url = import.meta.env.VITE_CONVEX_URL;
    if (!url) {
        console.warn("VITE_CONVEX_URL is not set. Please set your Convex cloud URL.");
        console.warn("1. Deploy: npx convex deploy");
        console.warn("2. Get URL from output or dashboard.convex.dev");
        console.warn("3. Add to client/.env: VITE_CONVEX_URL=https://your-project.convex.cloud");
        throw new Error("VITE_CONVEX_URL is required");
    }
    return url;
};

// Create a singleton Convex client instance
let convexClientInstance: ConvexReactClient | null = null;

export const getConvexClient = (): ConvexReactClient => {
    if (!convexClientInstance) {
        convexClientInstance = new ConvexReactClient(getConvexUrl());
    }
    return convexClientInstance;
};

// For backward compatibility, export a default instance
const convex = getConvexClient();

// Helper to convert string IDs to Convex Id types
// Note: After running 'npx convex dev', proper types will be generated
// and these type assertions may no longer be needed
const toExamId = (id: string): Id<"exams"> => id as Id<"exams">;
const toSessionId = (id: string): Id<"exam_sessions"> => id as Id<"exam_sessions">;
// const toId = (table: string, id: string): any => id as any; // Unused after Supabase migration

export interface Exam {
    id: string;
    _id?: string;
    title: string;
    description?: string;
    duration_minutes: number;
    questions: any[];
    created_at: string;
    created_by: string;
    is_active: boolean;
    scheduled_for?: string;
}

export interface ExamSession {
    id: string;
    _id?: string;
    exam_id: string;
    user_id: string;
    started_at: string;
    submitted_at?: string;
    status: 'in_progress' | 'completed' | 'active';
}

export interface Violation {
    id: string;
    _id?: string;
    session_id: string;
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    timestamp: string;
    snapshot?: string;
    metadata?: any;
    confidence?: number;
}

export interface Session {
    id: string;
    exam_id: string;
    user_id: string;
    exam_title: string;
    duration_minutes: number;
    started_at: string;
    submitted_at?: string;
    score?: number;
    status: 'in_progress' | 'completed' | 'active';
    violation_count: number;
    credibility_score: number;
    latest_violation?: {
        type: string;
        severity: string;
        timestamp: string;
    } | null;
}

export interface NotificationItem {
    id: string;
    type: 'success' | 'warning' | 'info' | 'error';
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
    actionUrl?: string;
}

export interface SessionDetail {
    session: Session;
    violations: Violation[];
    credibility_score: number;
}

// Exam APIs
export const examApi = {
    // Get all exams
    async getAll(includeInactive?: boolean): Promise<Exam[]> {
        const exams = await (convex.query as any)(api.exams.getAll, { includeInactive });
        return exams.map((e: any) => ({ ...e, id: e._id }));
    },

    // Get exam by ID
    async getById(id: string): Promise<Exam> {
        // Note: Type assertion needed until Convex types are generated via 'npx convex dev'
        const exam = await convex.query(api.exams.getById, { id: toExamId(id) });
        if (!exam) throw new Error("Exam not found");
        return { ...exam, id: exam._id };
    },

    // Start exam session
    async startSession(examId: string, userId: string, extractedName?: string, idPhoto?: string): Promise<ExamSession> {
        // Use string-based name for startSession
        const result: any = await convex.mutation("exams:startSession" as any, {
            exam_id: toExamId(examId),
            user_id: userId,
            extracted_name: extractedName,
            id_photo: idPhoto
        });

        return {
            id: result.sessionId,
            exam_id: examId,
            user_id: userId,
            started_at: result.startedAt,
            status: result.status as 'in_progress' | 'completed'
        };
    },

    // Submit exam session
    async submitSession(_examId: string, sessionId: string, answers?: Record<number, number>): Promise<void> {
        // Use string-based name to be robust against CJS/ESM or stale types
        await convex.mutation("exams:submitExam" as any, {
            session_id: sessionId, // Convex handles string to Id conversion if schema matches
            answers: answers
        });
    },
};

// Violation APIs
export const violationApi = {
    // Log a violation
    async log(violation: Omit<Violation, 'id' | 'timestamp'>): Promise<Violation> {
        // Note: Type assertion needed until Convex types are generated via 'npx convex dev'
        await convex.mutation(api.violations.log, {
            session_id: toSessionId(violation.session_id),
            type: violation.type,
            severity: violation.severity,
            timestamp: new Date().toISOString(),
            snapshot: violation.snapshot,
            metadata: violation.metadata,
            confidence: violation.confidence
        } as any);
        // Return dummy as mutation doesn't return the object usually unless specified
        return { ...violation, id: 'temp', timestamp: new Date().toISOString() };
    },

    // Get violations for a session
    async getBySession(sessionId: string): Promise<Violation[]> {
        // Note: Type assertion needed until Convex types are generated via 'npx convex dev'
        const violations = await convex.query(api.violations.getBySession, { session_id: toSessionId(sessionId) });
        return violations.map((v: any) => ({ ...v, id: v._id }));
    },
};

// User Profile APIs
export const userApi = {
    // Save user face photo
    async saveFacePhoto(_userId: string, _photoBase64: string): Promise<void> {
        // In the new system, we just rely on profile updates. 
        // We'll stub this or implement a specific mutation if needed.
        // For now, assuming createStudent handled it.
    },

    // Get user face photo
    async getFacePhoto(userId: string): Promise<string | null> {
        const user = await convex.query(api.users.getUser, { user_id: userId });
        return user?.face_photo || null;
    },

    // Get full user profile
    async getProfile(userId: string): Promise<any> {
        const user = await convex.query(api.users.getUser, { user_id: userId });
        return user;
    },

    // Get all users
    async getAll(filters?: { institute_id?: string }): Promise<any[]> {
        const users = await convex.query((api as any).users.getAll);
        if (filters?.institute_id) {
            return users.filter((u: any) => u.institute_id === filters.institute_id);
        }
        return users;
    },

    // Update user role
    async updateRole(userId: string, role: string): Promise<void> {
        await (convex.mutation as any)((api as any).users.updateRole, {
            user_id: userId,
            role: role
        });
    },

    async create(userData: {
        email: string;
        name: string;
        role: string;
        student_id: string;
        face_photo: string;
        institute_id?: string;
        branch_id?: string;
    }): Promise<any> {
        // Use student_id as default password
        return await convex.mutation(api.users.createStudent, {
            user_id: userData.student_id,
            name: userData.name,
            email: userData.email,
            student_id: userData.student_id,
            face_photo: userData.face_photo,
            password: userData.student_id,
            institute_id: userData.institute_id,
            branch_id: userData.branch_id
        } as any);
    },

    // Bulk create users
    async bulkCreate(students: any[]): Promise<any> {
        return await convex.mutation((api as any).users.bulkCreateStudents, {
            students: students.map(s => ({
                user_id: s.studentId,
                name: s.name,
                email: s.email,
                student_id: s.studentId,
                institute_id: s.instituteId,
                branch_id: s.branchId,
                face_photo: "" // No initial face photo for bulk import
            }))
        });
    },

    // Delete user
    async delete(userId: string): Promise<void> {
        await (convex.mutation as any)((api as any).users.deleteUser, {
            user_id: userId
        });
    },
};

// Session APIs for Instructor Dashboard
export const sessionApi = {
    // Get all sessions - using simple function
    async getAll(_filters?: { exam_id?: string; status?: string }): Promise<Session[]> {
        try {
            const sessions = await convex.query((api as any).sessionsSimple.getAll);
            return sessions.map((s: any) => ({ ...s, id: s._id }));
        } catch (error) {
            console.error("Error in sessionApi.getAll:", error);
            return [];
        }
    },

    // Get session detail
    async getById(id: string): Promise<SessionDetail> {
        try {
            // Note: Type assertion needed until Convex types are generated via 'npx convex dev'
            const session = await convex.query(api.sessions.getById, { id: toSessionId(id) });
            if (!session) throw new Error("Session not found");

            // Fetch real violations
            const violations = await violationApi.getBySession(id);

            return {
                session: { ...session, id: session._id } as any,
                violations,
                credibility_score: session.credibility_score || 100
            };
        } catch (error) {
            console.error("Error in sessionApi.getById:", error);
            throw error;
        }
    },

    // Get credibility score
    async getCredibility(_id: string): Promise<any> {
        return { score: 100 };
    },

    // Get student's exam history
    async getMyHistory(userId: string): Promise<any[]> {
        try {
            const history = await convex.query("sessions:getMyHistory" as any, { user_id: userId });
            return history || [];
        } catch (error) {
            console.error("Error in sessionApi.getMyHistory:", error);
            return [];
        }
    },
};

// Notifications API - Using Convex
export const notificationsApi = {
    async getAll(userId: string): Promise<NotificationItem[]> {
        console.log(`🔔 [Convex] Fetching notifications for user: ${userId}`);
        try {
            if (!userId) {
                console.warn("getAll called with empty userId");
                return [];
            }
            const notifications = await convex.query(api.notifications.getAll, { user_id: userId });
            console.log(`✅ [Convex] Found ${notifications?.length || 0} notifications for ${userId}`);

            if (!notifications || !Array.isArray(notifications)) {
                console.warn("Notifications query returned non-array:", notifications);
                return [];
            }

            return notifications.map((n: any) => {
                if (!n) {
                    console.warn("Null notification in array");
                    return null;
                }
                // Convert Convex ID to string - handle both string and ID object
                let idString: string;
                if (typeof n._id === 'string') {
                    idString = n._id;
                } else if (n._id && typeof n._id === 'object') {
                    // Convex ID object - convert to string
                    idString = String(n._id);
                } else {
                    console.warn("Invalid notification ID:", n._id);
                    idString = String(n._id || 'unknown');
                }

                return {
                    _id: idString,
                    id: idString,
                    type: n.type || 'info',
                    title: n.title || 'No title',
                    message: n.message || '',
                    timestamp: n.timestamp || new Date().toISOString(),
                    read: n.read || false,
                    actionUrl: n.metadata?.actionUrl
                };
            }).filter((n: any) => n !== null) as NotificationItem[];
        } catch (error: any) {
            console.error("Error in notificationsApi.getAll:", error);
            console.error("Error details:", {
                message: error?.message,
                data: error?.data,
                stack: error?.stack
            });
            return [];
        }
    },

    async getUnreadCount(userId: string): Promise<number> {
        try {
            const count = await convex.query(api.notifications.getUnreadCount, { user_id: userId });
            return count || 0;
        } catch (error) {
            console.error("Error in notificationsApi.getUnreadCount:", error);
            return 0;
        }
    },

    async markRead(notificationId: string, userId: string): Promise<void> {
        try {
            // Convert string ID to Convex ID
            const id = notificationId as Id<"notifications">;
            await convex.mutation(api.notifications.markAsRead, {
                notification_id: id,
                user_id: userId
            });
        } catch (error: any) {
            console.error("Error in notificationsApi.markRead:", error);
            // If it's a Convex error, try to get more details
            if (error?.data) {
                console.error("Convex error data:", error.data);
            }
            throw error;
        }
    },

    async markAllAsRead(userId: string): Promise<{ success: boolean; count: number }> {
        try {
            const result = await convex.mutation(api.notifications.markAllAsRead, { user_id: userId });
            return result;
        } catch (error) {
            console.error("Error in notificationsApi.markAllAsRead:", error);
            return { success: false, count: 0 };
        }
    },

    async deleteNotification(notificationId: string, userId: string): Promise<void> {
        try {
            // Convert string ID to Convex ID
            const id = notificationId as Id<"notifications">;
            await convex.mutation(api.notifications.deleteNotification, {
                notification_id: id,
                user_id: userId
            });
        } catch (error: any) {
            console.error("Error in notificationsApi.deleteNotification:", error);
            // If it's a Convex error, try to get more details
            if (error?.data) {
                console.error("Convex error data:", error.data);
            }
            throw error;
        }
    },

    // Send notification to specific user
    async sendToUser(data: {
        user_id: string;
        type: string;
        title: string;
        message: string;
        sender_id: string;
    }): Promise<any> {
        console.log(`🚀 [Convex] Sending notification to user: ${data.user_id} from ${data.sender_id}`);
        try {
            const result = await convex.mutation(api.notifications.sendToUser, {
                user_id: data.user_id,
                type: data.type,
                title: data.title,
                message: data.message,
                sender_id: data.sender_id
            });
            console.log("✅ [Convex] Notification sent successfully:", result);
            return result;
        } catch (error) {
            console.error("Error in notificationsApi.sendToUser:", error);
            throw error;
        }
    },

    // Send notification to multiple users
    async sendToMultiple(data: {
        user_ids: string[];
        type: string;
        title: string;
        message: string;
        sender_id: string;
    }): Promise<{ success: boolean; count: number }> {
        try {
            const result = await convex.mutation(api.notifications.sendToMultiple, data);
            return result;
        } catch (error) {
            console.error("Error in notificationsApi.sendToMultiple:", error);
            return { success: false, count: 0 };
        }
    },

    // Send notification to all users of a role
    async sendToRole(data: {
        role: 'student' | 'instructor' | 'admin';
        type: string;
        title: string;
        message: string;
        sender_id: string;
    }): Promise<{ success: boolean; count: number }> {
        try {
            const result = await convex.mutation(api.notifications.sendToRole, data);
            return result;
        } catch (error) {
            console.error("Error in notificationsApi.sendToRole:", error);
            return { success: false, count: 0 };
        }
    },

    // Send notification to all users in an institute
    async sendToInstitute(data: {
        institute_id: string;
        type: string;
        title: string;
        message: string;
        sender_id: string;
    }): Promise<{ success: boolean; count: number }> {
        try {
            const result = await convex.mutation(api.notifications.sendToInstitute, data);
            return result;
        } catch (error) {
            console.error("Error in notificationsApi.sendToInstitute:", error);
            return { success: false, count: 0 };
        }
    }
};

// Exam Management APIs (for instructors)
export const examManagementApi = {
    async create(examData: any): Promise<Exam> {
        // Note: Type assertion needed until Convex types are generated via 'npx convex dev'
        const id = await convex.mutation(api.exams.create, { ...examData, created_by: 'instructor' });
        return { ...examData, id, created_at: new Date().toISOString() };
    },
    async update(id: string, examData: any): Promise<Exam> {
        // Only pass recognized fields to avoid Convex unrecognized argument errors
        const { title, duration_minutes, questions, scheduled_for } = examData;
        await convex.mutation((api as any).exams.update, {
            id: toExamId(id),
            title,
            duration_minutes,
            questions,
            scheduled_for
        });
        return { ...examData, id };
    },
    async delete(id: string): Promise<void> {
        await convex.mutation((api as any).exams.deleteExam, { id });
    },
};

// Institute APIs (Admin)
export const instituteApi = {
    getAll: async () => {
        return await convex.query(api.institutes.getAll);
    },
    getById: async (id: string) => {
        const institutes = await convex.query(api.institutes.getAll);
        return institutes.find((i: any) => i._id === id);
    },
    getAllBranches: async (instituteId: string) => {
        if (!instituteId) {
            return await convex.query((api as any).institutes.getAllBranchesAdmin);
        }
        return await convex.query(api.institutes.getAllBranches, { institute_id: instituteId as any });
    },
    create: async (_data: any) => {
        // return await convex.mutation(api.institutes.create, data);
        throw new Error("Create Institute not implemented");
    },
    delete: async (_id: string) => {
        // return await convex.mutation((api as any).institutes.deleteInstitute, { id: id as any });
        throw new Error("Delete Institute not implemented");
    },
    createBranch: async (_instituteId: string, _name: string, _code?: string) => {
        // Generate a code if not provided
        // const branchCode = code || name.substring(0, 3).toUpperCase() + Math.floor(Math.random() * 1000);
        // return await convex.mutation((api as any).institutes.createBranch, {
        //     institute_id: instituteId as any,
        //     name: name,
        //     code: branchCode
        // });
        throw new Error("Create Branch not implemented");
    },
    deleteBranch: async (_branchId: string) => {
        // return await convex.mutation((api as any).institutes.deleteBranch, { id: branchId as any });
        throw new Error("Delete Branch not implemented");
    },
    getStats: async () => { return { total_institutes: 0, total_students: 0 }; }
};

// Violations API
export const violationsApi = {
    getCriticalToday: async () => {
        return await convex.query((api as any).violations.getCriticalToday);
    }
};
