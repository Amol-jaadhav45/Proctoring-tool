import { ConvexHttpClient } from 'convex/browser';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';

const convexUrl = process.env.CONVEX_URL;
if (!convexUrl) {
  console.warn('[convex] CONVEX_URL not set – Convex-backed routes will fail.');
}

export const convex = convexUrl ? new ConvexHttpClient(convexUrl) : null;

// Health check on startup
if (convex && convexUrl) {
  (async () => {
    try {
      console.log(`[convex] Testing connection to ${convexUrl}...`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 10000); // Increased timeout to 10s

      const response = await fetch(convexUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (response.ok) {
        console.log('[convex] ✓ Connection to Convex successful');
      } else {
        console.warn(`[convex] ⚠ Convex returned status ${response.status}: ${response.statusText}`);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('[convex] ✗ Connection timeout (10s) - cannot reach Convex cloud.');
      } else {
        console.error('[convex] ✗ Connection error details:', {
          message: error.message,
          code: error.code,
          type: error.type,
          stack: error.stack?.split('\n')[1]?.trim() // First line of stack for context
        });
      }
      console.error('[convex] Please check network connectivity and firewall settings.');
    }
  })();
}

export async function logViolation(params: {
  session_id: Id<'exam_sessions'>;
  type: string;
  severity: string;
  timestamp: string;
  snapshot?: string;
  metadata?: unknown;
  confidence?: number;
}): Promise<void> {
  if (!convex) throw new Error('Convex client not configured');

  try {
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Convex mutation timeout')), 10000)
    );

    await Promise.race([
      convex.mutation(api.violations.log, params),
      timeoutPromise
    ]);
  } catch (error: any) {
    console.error('[convex] Failed to log violation:', {
      error: error.message,
      type: params.type,
      sessionId: params.session_id
    });
    throw error;
  }
}

export async function getUser(user_id: string): Promise<unknown> {
  if (!convex) throw new Error('Convex client not configured');
  return convex.query(api.users.getUser, { user_id });
}

