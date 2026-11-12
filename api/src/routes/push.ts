import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Db } from '../db.js';
import type { Config } from '../config.js';
import { validTimeZone } from '../telegram/time.js';

export const pushEnabled = (cfg: Config) => !!(cfg.VAPID_PUBLIC_KEY && cfg.VAPID_PRIVATE_KEY);
const sub = z.object({ endpoint: z.string().url().max(2048).startsWith('https://'), keys: z.object({ p256dh: z.string().max(256), auth: z.string().max(256) }), tz: z.string().optional(), lang: z.enum(['en', 'fa']).default('en') });

export function pushRoutes(app: FastifyInstance, db: Db, cfg: Config) {
  const enabled = pushEnabled(cfg);
  app.get('/v1/push', async () => ({ enabled, key: enabled ? cfg.VAPID_PUBLIC_KEY : undefined }));
  app.post('/v1/push/subscribe', async (req, reply) => {
    if (!enabled) return reply.code(503).send({ error: 'not_configured' });
    const b = sub.parse(req.body); const tz = validTimeZone(b.tz) ? b.tz : 'UTC';
    await db.query(`insert into push_subscriptions (user_id, endpoint, p256dh, auth, tz, lang) values ($1, $2, $3, $4, $5, $6)
      on conflict (endpoint) do update set user_id = $1, p256dh = $3, auth = $4, tz = $5, lang = $6`, [req.user!.id, b.endpoint, b.keys.p256dh, b.keys.auth, tz, b.lang]);
    return reply.code(204).send();
  });
  app.post('/v1/push/unsubscribe', async (req, reply) => {
    const b = z.object({ endpoint: z.string().max(2048) }).parse(req.body);
    await db.query('delete from push_subscriptions where user_id = $1 and endpoint = $2', [req.user!.id, b.endpoint]); return reply.code(204).send();
  });
}
