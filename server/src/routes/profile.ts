import express from 'express';
import { getUser } from '../lib/convex';

const router = express.Router();

router.get('/:userId', async (req, res) => {
  const { userId } = req.params;
  if (!userId) {
    return res.status(400).json({ error: 'userId required' });
  }
  try {
    const user = await getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err: any) {
    console.error('[profile] get error:', err);
    res.status(500).json({
      error: err?.message || 'Failed to fetch profile',
    });
  }
});

export default router;
