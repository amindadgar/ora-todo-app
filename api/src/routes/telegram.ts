import type { FastifyInstance } from 'fastify';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import type { Db } from '../db.js';
import type { Config } from '../config.js';
import { applyChanges, change } from '../sync/apply.js';
import { inWindow, localParts, validTimeZone } from '../telegram/time.js';

const sha = (s: string) => createHash('sha256').update(s).digest();
const CODE_TTL_MIN = 10;
const lang = z.enum(['en', 'fa']);
const chatId = z.coerce.number().int().refine(Number.isSafeInteger);

/** Constant-time check of the Worker's bearer secret. */
export function botAuthorized(cfg: Config, header: string | undefined): boolean {
  if (!cfg.BOT_SHARED_SECRET || !header?.startsWith('Bearer ')) return false;
  const a = sha(header.slice(7)), b = sha(cfg.BOT_SHARED_SECRET); return timingSafeEqual(a, b);
}

export function telegramRoutes(app: FastifyInstance, db: Db, cfg: Config, now: () => Date) {
  const enabled = !!cfg.BOT_SHARED_SECRET && !!cfg.TELEGRAM_BOT_USERNAME;
  const linkedUser = async (id: number) => (await db.query<{ user_id: string; tz: string; lang: 'en' | 'fa' }>('select user_id, tz, lang from telegram_links where chat_id = $1', [id])).rows[0];

  // ---------------- for the signed-in app user (cookie session) ----------------
  app.get('/v1/telegram', async (req) => {
    const r = await db.query<{ tz: string }>('select tz from telegram_links where user_id = $1', [req.user!.id]);
    return { enabled, linked: !!r.rows[0], username: enabled ? cfg.TELEGRAM_BOT_USERNAME : undefined };
  });
  app.post('/v1/telegram/link-code', { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } }, async (req, reply) => {
    if (!enabled) return reply.code(503).send({ error: 'not_configured' });
    const b = z.object({ lang, tz: z.string().optional() }).parse(req.body);
    const tz = validTimeZone(b.tz) ? b.tz : 'UTC';
    const code = randomBytes(18).toString('base64url');                               // 24 chars, fits Telegram's /start payload rules
    await db.query('delete from telegram_link_codes where user_id = $1 or expires_at < now()', [req.user!.id]);
    const r = await db.query<{ expires_at: Date }>(
      `insert into telegram_link_codes (code_hash, user_id, tz, lang, expires_at) values ($1, $2, $3, $4, now() + make_interval(mins => $5::int)) returning expires_at`,
      [sha(code), req.user!.id, tz, b.lang, CODE_TTL_MIN]);
    return { url: `https://t.me/${cfg.TELEGRAM_BOT_USERNAME}?start=${code}`, expiresAt: r.rows[0]!.expires_at.toISOString() };
  });
  app.delete('/v1/telegram', async (req, reply) => { await db.query('delete from telegram_link_codes where user_id = $1', [req.user!.id]); await db.query('delete from telegram_links where user_id = $1', [req.user!.id]); return reply.code(204).send(); });

  // ---------------- for the Cloudflare Worker (Bearer BOT_SHARED_SECRET) ----------------
  app.post('/bot/link', async (req, reply) => {
    const b = z.object({ code: z.string().min(8).max(64), chatId }).parse(req.body);
    const c = await db.connect();
    try {
      await c.query('begin');
      const r = await c.query<{ user_id: string; tz: string; lang: 'en' | 'fa' }>('delete from telegram_link_codes where code_hash = $1 and expires_at > now() returning user_id, tz, lang', [sha(b.code)]);
      const row = r.rows[0]; if (!row) { await c.query('rollback'); return reply.code(404).send({ error: 'invalid_code' }); }
      await c.query('delete from telegram_links where chat_id = $1 or user_id = $2', [b.chatId, row.user_id]);   // one chat ↔ one account
      await c.query('insert into telegram_links (user_id, chat_id, tz, lang) values ($1, $2, $3, $4)', [row.user_id, b.chatId, row.tz, row.lang]);
      const u = await c.query<{ name: string }>('select name from users where id = $1', [row.user_id]);
      await c.query('commit'); return { name: u.rows[0]!.name, lang: row.lang, tz: row.tz };
    } catch (e) { await c.query('rollback').catch(() => {}); throw e; } finally { c.release(); }
  });
  app.get('/bot/me', async (req, reply) => {
    const q = z.object({ chatId }).parse(req.query); const l = await linkedUser(q.chatId);
    return l ? { lang: l.lang, tz: l.tz } : reply.code(404).send({ error: 'not_linked' });
  });
  app.post('/bot/lang', async (req, reply) => {
    const b = z.object({ chatId, lang }).parse(req.body); const r = await db.query('update telegram_links set lang = $2 where chat_id = $1', [b.chatId, b.lang]);
    return r.rowCount ? { ok: true } : reply.code(404).send({ error: 'not_linked' });
  });
  app.post('/bot/unlink', async (req, reply) => { const b = z.object({ chatId }).parse(req.body); await db.query('delete from telegram_links where chat_id = $1', [b.chatId]); return reply.code(204).send(); });

  /** Current (non-deleted) records of one collection for the linked account. */
  app.get('/bot/records', async (req, reply) => {
    const q = z.object({ chatId, collection: z.enum(['items', 'events', 'wishes', 'bills', 'savings', 'goals', 'activity', 'settings']), id: z.string().max(64).optional() }).parse(req.query);
    const l = await linkedUser(q.chatId); if (!l) return reply.code(404).send({ error: 'not_linked' });
    const r = await db.query(`select id, data, updated_at from records where user_id = $1 and collection = $2 and not deleted and ($3::text is null or id = $3) order by rev limit 5000`, [l.user_id, q.collection, q.id ?? null]);
    reply.header('cache-control', 'no-store');
    return { records: r.rows.map((x) => ({ id: x.id, data: x.data, updatedAt: x.updated_at.toISOString() })) };
  });
  app.post('/bot/changes', async (req, reply) => {
    const b = z.object({ chatId, changes: z.array(change).min(1).max(20) }).parse(req.body);
    const l = await linkedUser(b.chatId); if (!l) return reply.code(404).send({ error: 'not_linked' });
    const r = await applyChanges(db, l.user_id, b.changes, cfg.MAX_RECORDS_PER_USER);
    if (!r.ok) return reply.code(413).send({ error: r.error });
    return { applied: r.applied, rejected: r.rejected };
  });

  /** Who should get a morning brief / evening review right now (their local time is in the window, the setting is on, not yet sent today). */
  app.get('/bot/due', async () => {
    const r = await db.query<{ chat_id: string; tz: string; lang: 'en' | 'fa'; morning_sent: string | null; evening_sent: string | null; morning: string | null; evening: string | null }>(
      `select l.chat_id, l.tz, l.lang, to_char(l.morning_sent, 'YYYY-MM-DD') as morning_sent, to_char(l.evening_sent, 'YYYY-MM-DD') as evening_sent,
              s.data->>'morning' as morning, s.data->>'evening' as evening
         from telegram_links l left join records s on s.user_id = l.user_id and s.collection = 'settings' and s.id = 'main' and not s.deleted`);
    const due: { chatId: number; lang: 'en' | 'fa'; tz: string; kind: 'morning' | 'evening'; localDate: string }[] = [];
    for (const x of r.rows) {
      const { date, minutes } = localParts(now(), x.tz);
      for (const kind of ['morning', 'evening'] as const) {
        if (x[kind] === 'false' || x[`${kind}_sent`] === date || !inWindow(kind, minutes)) continue;
        due.push({ chatId: Number(x.chat_id), lang: x.lang, tz: x.tz, kind, localDate: date });
      }
    }
    return { due };
  });
  app.post('/bot/ack', async (req, reply) => {
    const b = z.object({ chatId, kind: z.enum(['morning', 'evening']), localDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(req.body);
    const col = b.kind === 'morning' ? 'morning_sent' : 'evening_sent';
    const r = await db.query(`update telegram_links set ${col} = $2 where chat_id = $1`, [b.chatId, b.localDate]);
    return r.rowCount ? reply.code(204).send() : reply.code(404).send({ error: 'not_linked' });
  });
}
