import Fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { ZodError } from 'zod';
import type { Config } from './config.js';
import type { Db } from './db.js';
import { createVerifier, type TokenVerifier } from './auth/google.js';
import { resolveSession, type SessionUser } from './auth/session.js';
import { authRoutes, cookieName } from './routes/auth.js';
import { syncRoutes } from './routes/sync.js';

declare module 'fastify' { interface FastifyRequest { user?: SessionUser } }

const UNSAFE = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const PUBLIC = new Set(['/healthz', '/readyz', '/auth/google', '/auth/logout']);

export async function buildApp(opts: { cfg: Config; db: Db; verifier?: TokenVerifier }): Promise<FastifyInstance> {
  const { cfg, db } = opts; const verifier = opts.verifier ?? createVerifier(cfg);
  const app = Fastify({
    trustProxy: true, bodyLimit: 1_048_576,
    logger: { level: cfg.LOG_LEVEL, redact: ['req.headers.cookie', 'req.headers.authorization', 'res.headers["set-cookie"]'] }
  });
  await app.register(helmet);
  await app.register(cookie);
  await app.register(rateLimit, { max: 300, timeWindow: '1 minute' });

  // CSRF: browsers always send Origin on cross-site POST/DELETE; require it to be one of ours.
  app.addHook('onRequest', async (req, reply) => {
    if (!UNSAFE.has(req.method)) return;
    const origin = req.headers.origin;
    if (!origin || !cfg.ALLOWED_ORIGINS.includes(origin)) return reply.code(403).send({ error: 'bad_origin' });
  });
  // Session auth for everything that isn't public.
  app.addHook('preHandler', async (req, reply) => {
    const path = req.url.split('?')[0]!;
    if (PUBLIC.has(path)) return;
    const token = req.cookies[cookieName(cfg)];
    const user = token ? await resolveSession(db, token, cfg.SESSION_TTL_DAYS) : null;
    if (!user) return reply.code(401).send({ error: 'unauthorized' });
    req.user = user;
  });
  app.setErrorHandler((err: Error & { statusCode?: number }, req, reply) => {
    if (err instanceof ZodError) return reply.code(400).send({ error: 'validation', issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) });
    const status = err.statusCode && err.statusCode < 500 ? err.statusCode : 500;
    if (status === 500) req.log.error({ err }, 'unhandled error');
    return reply.code(status).send({ error: status === 500 ? 'internal' : err.message });
  });
  app.setNotFoundHandler((_req, reply) => reply.code(404).send({ error: 'not_found' }));

  app.get('/healthz', async () => ({ ok: true }));
  app.get('/readyz', async (_req, reply) => { try { await db.query('select 1'); return { ok: true }; } catch { return reply.code(503).send({ ok: false }); } });
  authRoutes(app, db, cfg, verifier);
  syncRoutes(app, db, cfg);
  return app;
}
