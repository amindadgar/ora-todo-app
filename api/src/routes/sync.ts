import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Db } from '../db.js';
import type { Config } from '../config.js';

export const COLLECTIONS = ['items', 'events', 'wishes', 'bills', 'savings', 'goals', 'activity', 'settings'] as const;
const MAX_DATA_BYTES = 16 * 1024;

const change = z.object({
  collection: z.enum(COLLECTIONS),
  id: z.string().regex(/^[\w.:-]{1,64}$/),
  updatedAt: z.iso.datetime({ offset: true }),
  deleted: z.boolean().optional(),
  data: z.record(z.string(), z.unknown()).optional()
}).refine((c) => c.deleted || c.data !== undefined, { message: 'data is required unless deleted' })
  .refine((c) => !c.data || JSON.stringify(c.data).length <= MAX_DATA_BYTES, { message: 'record too large' });
const pushBody = z.object({ changes: z.array(change).max(200) });
const pullQuery = z.object({ since: z.coerce.number().int().min(0).default(0), limit: z.coerce.number().int().min(1).max(500).default(500) });

interface Row { collection: string; id: string; data: unknown; updated_at: Date; deleted: boolean; rev: string }
const out = (r: Row) => ({ collection: r.collection, id: r.id, data: r.deleted ? null : r.data, updatedAt: r.updated_at.toISOString(), deleted: r.deleted, rev: Number(r.rev) });

export function syncRoutes(app: FastifyInstance, db: Db, cfg: Config) {
  /** Pull everything that changed after `since` (a cursor returned by a previous call). */
  app.get('/v1/sync', async (req, reply) => {
    const q = pullQuery.parse(req.query); const uid = req.user!.id;
    const { rows } = await db.query<Row>(
      `select collection, id, data, updated_at, deleted, rev from records where user_id = $1 and rev > $2 order by rev limit $3`, [uid, q.since, q.limit + 1]);
    const hasMore = rows.length > q.limit; const page = hasMore ? rows.slice(0, q.limit) : rows;
    reply.header('cache-control', 'no-store');
    return { records: page.map(out), cursor: page.length ? Number(page[page.length - 1]!.rev) : q.since, hasMore };
  });

  /** Push local changes. Last write wins per record by `updatedAt`; losers come back in `rejected` with the server's version. */
  app.post('/v1/sync', async (req, reply) => {
    const body = pushBody.parse(req.body); const uid = req.user!.id;
    const c = await db.connect();
    try {
      await c.query('begin');
      await c.query('select pg_advisory_xact_lock(hashtextextended($1, 0))', [uid]);          // serialize one user's pushes → cursor stays gap-free
      // cap growth only: updates to records that already exist are always allowed
      const have = Number((await c.query<{ n: string }>('select count(*) as n from records where user_id = $1', [uid])).rows[0]!.n);
      const existing = body.changes.length ? Number((await c.query<{ n: string }>(
        `select count(*) as n from records r join unnest($2::text[], $3::text[]) as t(collection, id) on r.collection = t.collection and r.id = t.id where r.user_id = $1`,
        [uid, body.changes.map((x) => x.collection), body.changes.map((x) => x.id)])).rows[0]!.n) : 0;
      if (have + (body.changes.length - existing) > cfg.MAX_RECORDS_PER_USER) { await c.query('rollback'); return reply.code(413).send({ error: 'too_many_records' }); }
      const maxTs = Date.now() + 60_000;                                                     // a fast clock can't win forever
      let applied = 0; const rejected: ReturnType<typeof out>[] = [];
      for (const ch of body.changes) {
        const ts = new Date(Math.min(Date.parse(ch.updatedAt), maxTs)); const del = !!ch.deleted;
        const r = await c.query(
          `insert into records (user_id, collection, id, data, updated_at, deleted) values ($1, $2, $3, $4, $5, $6)
           on conflict (user_id, collection, id) do update
             set data = excluded.data, updated_at = excluded.updated_at, deleted = excluded.deleted, rev = nextval('records_rev_seq')
             where records.updated_at < excluded.updated_at
           returning rev`, [uid, ch.collection, ch.id, del ? null : JSON.stringify(ch.data), ts, del]);
        if (r.rowCount) applied++;
        else { const cur = await c.query<Row>('select collection, id, data, updated_at, deleted, rev from records where user_id = $1 and collection = $2 and id = $3', [uid, ch.collection, ch.id]); if (cur.rows[0]) rejected.push(out(cur.rows[0])); }
      }
      const cursor = Number((await c.query<{ m: string | null }>('select max(rev) as m from records where user_id = $1', [uid])).rows[0]!.m ?? 0);
      await c.query('commit');
      return { applied, rejected, cursor };
    } catch (e) { await c.query('rollback').catch(() => {}); throw e; } finally { c.release(); }
  });
}
