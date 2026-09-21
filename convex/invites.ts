"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";

/**
 * Send invite email via Resend API (no nodemailer dependency).
 * Set RESEND_API_KEY and FROM_EMAIL in Convex dashboard env vars.
 */
export const sendInviteEmail = action({
  args: {
    email: v.string(),
    link: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (_ctx, { email, link, name }) => {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.FROM_EMAIL || process.env.RESEND_FROM || "onboarding@resend.dev";

    if (!apiKey) {
      console.warn("RESEND_API_KEY not set; skipping invite email for", email);
      return;
    }

    const text = [
      `Hi ${name || "there"},`,
      "",
      "You've been invited to ProctorAI.",
      "",
      "Click the link below to set your password and activate your account:",
      link,
      "",
      "This link will expire in 24 hours.",
    ].join("\n");

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: "Your ProctorAI account invite",
        text,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Resend API error:", res.status, err);
      throw new Error(`Failed to send invite email: ${res.status}`);
    }
  },
});
