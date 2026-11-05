import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { Db } from '../db.js';
import type { Config } from '../config.js';
import { applyChanges, out, pushBody, type Row } from '../sync/apply.js';

const pullQuery = z.object({ since: z.coerce.number().int().min(0).default(0), limit: z.coerce.number().int().min(1).max(500).default(500) });


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
    const body = pushBody.parse(req.body);
    const r = await applyChanges(db, req.user!.id, body.changes, cfg.MAX_RECORDS_PER_USER);
    if (!r.ok) return reply.code(413).send({ error: r.error });
    return { applied: r.applied, rejected: r.rejected, cursor: r.cursor };
  });
}
