import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Schema definition for Proctoring System
  // User Profiles
  user_profiles: defineTable({
    user_id: v.string(),
    name: v.string(),
    email: v.string(),
    password_hash: v.string(), // Hashed password for security
    role: v.union(v.literal("student"), v.literal("instructor"), v.literal("admin")),
    face_photo: v.optional(v.string()),
    authorized_id_photo: v.optional(v.string()), // Authorized ID card image for verification
    student_id: v.optional(v.string()),
    institute_id: v.optional(v.string()),
    branch_id: v.optional(v.string()),
    created_at: v.optional(v.string()),
    last_login: v.optional(v.string()),
  })
    .index("by_user_id", ["user_id"])
    .index("by_email", ["email"])
    .index("by_role", ["role"]),

  // Invite tokens for email-based onboarding
  invites: defineTable({
    email: v.string(),
    role: v.string(),
    token: v.string(),
    used: v.boolean(),
    expiresAt: v.number(), // timestamp in ms
  }).index("by_token", ["token"]),

  // Exam Policies (Configuration-driven rules)
  exam_policies: defineTable({
    title: v.string(),
    weights: v.any(), // Record<AIEventType, number>
    thresholds: v.object({
      medium: v.number(),
      high: v.number(),
      critical: v.number(),
    }),
    decay_rate: v.number(),
    is_default: v.optional(v.boolean()),
    created_at: v.string(),
  }).index("by_title", ["title"]),

  // exams
  exams: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    duration_minutes: v.number(),
    questions: v.array(v.any()),
    policy_id: v.optional(v.id("exam_policies")),
    created_by: v.string(),
    is_active: v.boolean(),
    scheduled_for: v.optional(v.string()), // ISO date string
    results_published: v.optional(v.boolean()), // Whether results are visible to students
    created_at: v.string(),
  })
    .index("by_creator", ["created_by"])
    .index("by_active", ["is_active"])
    .index("by_title", ["title"]),

  // Exam Sessions
  exam_sessions: defineTable({
    exam_id: v.id("exams"),
    user_id: v.string(),
    status: v.string(), // 'active', 'completed', 'terminated'
    started_at: v.string(),
    end_time: v.number(), // Hard deadline timestamp (ms)
    locked: v.boolean(), // True if session is finalized
    last_ping: v.optional(v.number()),
    attempt_ip: v.optional(v.string()),
    submitted_at: v.optional(v.string()),
    score: v.optional(v.number()),
    answers: v.optional(v.any()), // Record<number, number> - questionIndex: answerIndex
    credibility_score: v.optional(v.number()),
    extracted_name: v.optional(v.string()), // Name extracted from ID card during verification
    id_photo: v.optional(v.string()), // Captured ID card photo
    current_question_index: v.optional(v.number()), // For tracking progress
  })
    .index("by_user", ["user_id"])
    .index("by_exam", ["exam_id"])
    .index("by_started_at", ["started_at"]),

  // Violations (AI Events)
  violations: defineTable({
    session_id: v.id("exam_sessions"),
    type: v.string(), // Matches AIEventType
    severity: v.string(), // 'low', 'medium', 'high', 'critical'
    timestamp: v.string(),
    snapshot_url: v.optional(v.string()),
    metadata: v.optional(v.any()),
    confidence: v.optional(v.number()), // Detection confidence 0-1
    status: v.optional(v.string()), // 'open', 'resolved', 'dismissed'
  })
    .index("by_session", ["session_id"])
    .index("by_timestamp", ["timestamp"]),

  // Proctor Actions (Human-in-the-loop)
  proctor_actions: defineTable({
    session_id: v.id("exam_sessions"),
    proctor_id: v.string(),
    action: v.union(v.literal("warn"), v.literal("flag"), v.literal("dismiss"), v.literal("terminate")),
    reason: v.string(),
    timestamp: v.string(),
    metadata: v.optional(v.any()),
  }).index("by_session", ["session_id"]),

  // Immutable Audit Logs (Security/Compliance)
  audit_logs: defineTable({
    event_type: v.string(),
    user_id: v.optional(v.string()), // Actor
    target_id: v.optional(v.string()), // Target (e.g., session_id)
    action: v.string(),
    details: v.string(),
    ip_address: v.optional(v.string()),
    timestamp: v.string(),
    integrity_hash: v.optional(v.string()), // For tamper detection
  })
    .index("by_user", ["user_id"])
    .index("by_type", ["event_type"]),

  // Institutes
  institutes: defineTable({
    name: v.string(),
    code: v.string(),
    address: v.string(),
    created_at: v.optional(v.string()),
  }),

  // Branches
  branches: defineTable({
    name: v.string(),
    code: v.string(),
    institute_id: v.id("institutes"),
  }).index("by_institute", ["institute_id"]),

  // Notifications - simplified indexes
  notifications: defineTable({
    user_id: v.string(),
    type: v.string(), // 'info', 'success', 'warning', 'error'
    title: v.string(),
    message: v.string(),
    read: v.boolean(),
    timestamp: v.string(),
    sender_id: v.optional(v.string()), // Who sent the notification
    metadata: v.optional(v.any()), // Additional data like exam_id, session_id, etc.
  }).index("by_user", ["user_id"]),
});