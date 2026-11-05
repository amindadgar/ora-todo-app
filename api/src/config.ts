import { z } from 'zod';

const bool = z.enum(['true', 'false', '1', '0']).transform((v) => v === 'true' || v === '1');
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  /** Google OAuth client ID (the "audience" of ID tokens). Without it, Google sign-in answers 503. */
  GOOGLE_CLIENT_ID: z.string().trim().optional().transform((v) => v || undefined),
  /** Origins allowed to make state-changing requests (CSRF defence), comma separated. */
  ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),
  SESSION_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  /** Dev/test only: accept `mock:<id>:<name>` credentials instead of real Google tokens. Refused in production. */
  AUTH_MOCK: bool.default(false),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  /** Soft cap on stored records per user. */
  MAX_RECORDS_PER_USER: z.coerce.number().int().min(100).default(20000)
});

export type Config = Omit<z.infer<typeof schema>, 'ALLOWED_ORIGINS'> & { ALLOWED_ORIGINS: string[] };

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = schema.safeParse(env);
  if (!parsed.success) throw new Error('Invalid configuration:\n' + parsed.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n'));
  const c = parsed.data;
  if (c.NODE_ENV === 'production' && c.AUTH_MOCK) throw new Error('AUTH_MOCK must not be enabled in production');
  const origins = c.ALLOWED_ORIGINS.split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean);
  if (c.NODE_ENV === 'production' && origins.some((o) => o.startsWith('http://localhost'))) throw new Error('ALLOWED_ORIGINS must not include localhost in production');
  return { ...c, ALLOWED_ORIGINS: origins };
}
