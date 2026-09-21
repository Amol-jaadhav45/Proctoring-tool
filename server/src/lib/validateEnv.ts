/**
 * Validates required environment variables at startup.
 * Missing optional vars are logged; missing required vars throw.
 */
const required = [] as const; // CONVEX_URL optional - convex routes fail gracefully if unset
const optional = [
  'PORT',
  'NODE_ENV',
  'REDIS_URL',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'MEDIASOUP_MIN_PORT',
  'MEDIASOUP_MAX_PORT',
  'MEDIASOUP_LISTEN_IP',
  'MEDIASOUP_ANNOUNCED_IP',
] as const;

export function validateEnv(): void {
  const missing: string[] = [];
  for (const key of required) {
    if (!process.env[key]?.trim()) {
      missing.push(key);
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `Missing required env vars: ${missing.join(', ')}. Add them to .env or environment.`
    );
  }

  if (!process.env.CONVEX_URL) {
    console.warn('[env] CONVEX_URL not set – violations/profile routes will fail. Set CONVEX_URL for Convex features.');
  }
  if (!process.env.REDIS_URL) {
    console.warn('[env] REDIS_URL not set – event bus disabled. Set REDIS_URL for Redis features.');
  }
}
