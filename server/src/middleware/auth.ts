import { Request, Response, NextFunction } from 'express';

/**
 * Optional auth middleware. Validates Authorization header if present.
 * For Convex-backed API, most auth is handled client-side; this can enforce
 * API key or JWT for server-to-server or optional protection.
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'] as string | undefined;

  if (authHeader?.startsWith('Bearer ')) {
    (req as any).token = authHeader.slice(7);
  }
  if (apiKey) {
    (req as any).apiKey = apiKey;
  }

  next();
}

/**
 * Require API key for sensitive routes (e.g. violations snapshot).
 * Set SERVER_API_KEY in env to enforce.
 */
export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  const serverKey = process.env.SERVER_API_KEY;
  if (!serverKey) {
    next();
    return;
  }

  const apiKey = req.headers['x-api-key'] as string | undefined;
  const bearer = req.headers.authorization;
  const token = bearer?.startsWith('Bearer ') ? bearer.slice(7) : undefined;

  if (apiKey === serverKey || token === serverKey) {
    next();
    return;
  }

  res.status(401).json({ error: 'Invalid or missing API key' });
}
