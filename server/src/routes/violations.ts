import express from 'express';
import { logViolation } from '../lib/convex';
import type { Id } from '../../../convex/_generated/dataModel';

const router = express.Router();

router.post('/snapshot', async (req, res) => {
  const { session_id, violation_type, image_data, metadata, confidence } = req.body;

  if (!session_id || !violation_type) {
    return res.status(400).json({
      error: 'session_id and violation_type are required',
    });
  }

  try {
    const finalConfidence = confidence ?? metadata?.confidence;
    const severity = inferSeverity(violation_type);

    try {
      await logViolation({
        session_id: session_id as Id<'exam_sessions'>,
        type: violation_type,
        severity,
        timestamp: new Date().toISOString(),
        snapshot: image_data || undefined,
        metadata: metadata || undefined,
        confidence: finalConfidence,
      });
      res.json({ success: true });
    } catch (convexError: any) {
      // Log the Convex error but still return success to client
      // This prevents camera from blocking on Convex connection issues
      console.error('[violations] Convex save failed (non-blocking):', {
        error: convexError.message,
        type: violation_type,
        sessionId: session_id.slice(0, 8)
      });

      // Return success anyway - violation was detected even if not saved
      res.json({
        success: true,
        warning: 'Violation detected but snapshot save failed'
      });
    }
  } catch (err: any) {
    console.error('[violations] snapshot error:', err);
    res.status(500).json({
      error: err?.message || 'Failed to log violation snapshot',
    });
  }
});

function inferSeverity(type: string): string {
  const t = type?.toLowerCase() || '';
  if (t.includes('critical') || t.includes('cheat') || t.includes('phone')) return 'critical';
  if (t.includes('high') || t.includes('multiple') || t.includes('face')) return 'high';
  if (t.includes('medium') || t.includes('look') || t.includes('gaze')) return 'medium';
  return 'low';
}

export default router;
