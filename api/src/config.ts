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
  /** Shared secret the Telegram Worker presents (Bearer) to the /bot/* endpoints. Unset → the bot integration is disabled. */
  BOT_SHARED_SECRET: z.string().trim().min(32, 'BOT_SHARED_SECRET must be at least 32 characters').optional().or(z.literal('').transform(() => undefined)),
  /** Public bot username (without @), used to build the t.me deep link. */
  TELEGRAM_BOT_USERNAME: z.string().trim().regex(/^[A-Za-z0-9_]{3,64}$/, 'invalid bot username').optional().or(z.literal('').transform(() => undefined)),
  /** Google OAuth client secret (server-side code flow for Calendar). Unset → Calendar connect is disabled. */
  GOOGLE_CLIENT_SECRET: z.string().trim().optional().transform((v) => v || undefined),
  /** 32+ char secret used to encrypt Calendar refresh tokens and sign OAuth state. */
  TOKEN_KEY: z.string().trim().min(32, 'TOKEN_KEY must be at least 32 characters').optional().or(z.literal('').transform(() => undefined)),
  /** Public origin of the web app (for the OAuth redirect URI). Defaults to the first ALLOWED_ORIGINS entry. */
  PUBLIC_URL: z.string().trim().optional().transform((v) => v || undefined),
  /** Web Push (VAPID). All three unset → push is disabled. */
  VAPID_PUBLIC_KEY: z.string().trim().optional().transform((v) => v || undefined),
  VAPID_PRIVATE_KEY: z.string().trim().optional().transform((v) => v || undefined),
  VAPID_SUBJECT: z.string().trim().default('mailto:admin@example.com'),
  /** Max Postgres connections held by this process. Small on purpose: each idle backend costs the database ~5-10 MB. */
  DB_POOL_MAX: z.coerce.number().int().min(1).max(50).default(5),
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
