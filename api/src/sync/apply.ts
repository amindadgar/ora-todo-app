import { z } from 'zod';
import type { Db } from '../db.js';

export const COLLECTIONS = ['items', 'events', 'wishes', 'bills', 'savings', 'goals', 'activity', 'settings'] as const;
const MAX_DATA_BYTES = 16 * 1024;

export const change = z.object({
  collection: z.enum(COLLECTIONS),
  id: z.string().regex(/^[\w.:-]{1,64}$/),
  updatedAt: z.iso.datetime({ offset: true }),
  deleted: z.boolean().optional(),
  data: z.record(z.string(), z.unknown()).optional()
}).refine((c) => c.deleted || c.data !== undefined, { message: 'data is required unless deleted' })
  .refine((c) => !c.data || JSON.stringify(c.data).length <= MAX_DATA_BYTES, { message: 'record too large' });
export const pushBody = z.object({ changes: z.array(change).max(200) });
export interface Row { collection: string; id: string; data: unknown; updated_at: Date; deleted: boolean; rev: string }
export const out = (r: Row) => ({ collection: r.collection, id: r.id, data: r.deleted ? null : r.data, updatedAt: r.updated_at.toISOString(), deleted: r.deleted, rev: Number(r.rev) });
export type Change = z.infer<typeof change>;

/**
 * Apply a batch of changes for one user, last-write-wins per record by `updatedAt`. Shared by the app's sync endpoint and the Telegram bot.
 * Returns 'too_many_records' (nothing applied) if it would grow the account past `maxRecords`.
 */
export async function applyChanges(db: Db, uid: string, changes: Change[], maxRecords: number): Promise<{ ok: true; applied: number; rejected: ReturnType<typeof out>[]; cursor: number } | { ok: false; error: 'too_many_records' }> {
  const c = await db.connect();
  try {
    await c.query('begin');
    await c.query('select pg_advisory_xact_lock(hashtextextended($1, 0))', [uid]);          // serialize one user's pushes → cursor stays gap-free
    // cap growth only: updates to records that already exist are always allowed
    const have = Number((await c.query<{ n: string }>('select count(*) as n from records where user_id = $1', [uid])).rows[0]!.n);
    const existing = changes.length ? Number((await c.query<{ n: string }>(
      `select count(*) as n from records r join unnest($2::text[], $3::text[]) as t(collection, id) on r.collection = t.collection and r.id = t.id where r.user_id = $1`,
      [uid, changes.map((x) => x.collection), changes.map((x) => x.id)])).rows[0]!.n) : 0;
    if (have + (changes.length - existing) > maxRecords) { await c.query('rollback'); return { ok: false, error: 'too_many_records' }; }
    const maxTs = Date.now() + 60_000;                                                     // a fast clock can't win forever
    let applied = 0; const rejected: ReturnType<typeof out>[] = [];
    for (const ch of changes) {
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
    return { ok: true, applied, rejected, cursor };
  } catch (e) { await c.query('rollback').catch(() => {}); throw e; } finally { c.release(); }
}
