import pg from 'pg';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

export type Db = pg.Pool;
export const createPool = (url: string) => new pg.Pool({ connectionString: url, max: 10, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 5_000 });

const here = dirname(fileURLToPath(import.meta.url));
/** Run pending SQL migrations in order, under an advisory lock so concurrent starts can't race. */
export async function migrate(db: Db, dir = join(here, '..', 'migrations')): Promise<string[]> {
  const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();
  const c = await db.connect(); const ran: string[] = [];
  try {
    await c.query('select pg_advisory_lock(727001)');
    await c.query('create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())');
    const done = new Set((await c.query<{ name: string }>('select name from schema_migrations')).rows.map((r) => r.name));
    for (const f of files) {
      if (done.has(f)) continue;
      const sql = await readFile(join(dir, f), 'utf8');
      try { await c.query('begin'); await c.query(sql); await c.query('insert into schema_migrations(name) values ($1)', [f]); await c.query('commit'); ran.push(f); }
      catch (e) { await c.query('rollback'); throw new Error(`migration ${f} failed: ${(e as Error).message}`); }
    }
  } finally { await c.query('select pg_advisory_unlock(727001)').catch(() => {}); c.release(); }
  return ran;
}
