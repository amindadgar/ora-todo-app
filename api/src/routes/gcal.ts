import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Db } from '../db.js';
import type { Config } from '../config.js';
import { authUrl, decrypt, encrypt, exchangeCode, fetchMeetings, gcalEnabled, signState, verifyState, type Meeting } from '../gcal.js';

const TTL_MS = 2 * 60_000;
/** Meetings for one account, cached in the DB row for 2 minutes. `null` when not linked; throws only on transient failures. */
export async function meetingsFor(db: Db, cfg: Config, userId: string, now: Date, f: typeof fetch = fetch): Promise<Meeting[] | null> {
  const r = await db.query<{ refresh_enc: string; events_cache: Meeting[]; fetched_at: Date | null }>('select refresh_enc, events_cache, fetched_at from gcal_links where user_id = $1', [userId]);
  const row = r.rows[0]; if (!row) return null;
  if (row.fetched_at && now.getTime() - row.fetched_at.getTime() < TTL_MS) return row.events_cache;
  try {
    const list = await fetchMeetings(cfg, decrypt(cfg, row.refresh_enc), new Date(now.getTime() - 12 * 3600_000), new Date(now.getTime() + 8 * 86400_000), f);
    await db.query('update gcal_links set events_cache = $2, fetched_at = $3 where user_id = $1', [userId, JSON.stringify(list), now]);
    return list;
  } catch (e) {
    if ((e as { revoked?: boolean }).revoked) { await db.query('delete from gcal_links where user_id = $1', [userId]); return null; }   // the user revoked access in their Google account
    return row.events_cache;
  }
}

export function gcalRoutes(app: FastifyInstance, db: Db, cfg: Config, now: () => Date, f: typeof fetch = fetch) {
  const enabled = gcalEnabled(cfg);
  app.get('/v1/gcal', async (req) => {
    const r = await db.query('select 1 from gcal_links where user_id = $1', [req.user!.id]);
    return { enabled, linked: !!r.rows[0] };
  });
  app.post('/v1/gcal/connect', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (req, reply) => {
    if (!enabled) return reply.code(503).send({ error: 'not_configured' });
    return { url: authUrl(cfg, signState(cfg, req.user!.id, now())) };
  });
  /** Google redirects the browser here (cookie session present). Always ends with a redirect back into the app. */
  app.get('/v1/gcal/callback', async (req, reply) => {
    const back = (s: string) => reply.redirect(`${(cfg.PUBLIC_URL ?? cfg.ALLOWED_ORIGINS[0] ?? '').replace(/\/$/, '')}/#/settings?gcal=${s}`);
    if (!enabled) return back('off');
    const q = z.object({ code: z.string().max(2048).optional(), state: z.string().max(1024).optional(), error: z.string().optional() }).parse(req.query);
    if (q.error || !q.code || !q.state) return back('denied');
    if (verifyState(cfg, q.state, now()) !== req.user!.id) return back('failed');
    try {
      const refresh = await exchangeCode(cfg, q.code, f);
      await db.query(`insert into gcal_links (user_id, refresh_enc) values ($1, $2) on conflict (user_id) do update set refresh_enc = $2, connected_at = now(), events_cache = '[]', fetched_at = null`, [req.user!.id, encrypt(cfg, refresh)]);
      return back('ok');
    } catch { return back('failed'); }
  });
  app.delete('/v1/gcal', async (req, reply) => { await db.query('delete from gcal_links where user_id = $1', [req.user!.id]); return reply.code(204).send(); });
  app.get('/v1/gcal/events', async (req, reply) => {
    reply.header('cache-control', 'no-store');
    const list = await meetingsFor(db, cfg, req.user!.id, now(), f);
    return { linked: list !== null, events: list ?? [] };
  });
}
