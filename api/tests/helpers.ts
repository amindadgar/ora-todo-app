import type { FastifyInstance } from 'fastify';
import { loadConfig, type Config } from '../src/config.js';
import { createPool, migrate, type Db } from '../src/db.js';
import { buildApp } from '../src/app.js';
import type { TokenVerifier } from '../src/auth/google.js';

export const TEST_DB = process.env.DATABASE_URL_TEST ?? 'postgres://ora@127.0.0.1:5433/ora_test';
export const ORIGIN = 'http://localhost:5173';

export interface Ctx { app: FastifyInstance; db: Db; cfg: Config }
export async function setup(over: Record<string, string> = {}, verifier?: TokenVerifier): Promise<Ctx> {
  const cfg = loadConfig({ NODE_ENV: 'test', DATABASE_URL: TEST_DB, AUTH_MOCK: 'true', LOG_LEVEL: 'silent', ALLOWED_ORIGINS: ORIGIN, ...over });
  const db = createPool(TEST_DB); await migrate(db);
  await db.query('truncate users, sessions, records cascade');
  const app = await buildApp({ cfg, db, verifier }); await app.ready();
  return { app, db, cfg };
}
export const teardown = async (c: Ctx) => { await c.app.close(); await c.db.end(); };

/** Minimal cookie-jar client around fastify.inject */
export function client(app: FastifyInstance) {
  let cookie = '';
  const call = async (method: 'GET' | 'POST' | 'DELETE', url: string, body?: unknown, headers: Record<string, string> = {}) => {
    const h: Record<string, string> = { origin: ORIGIN, ...headers }; if (cookie) h.cookie = cookie;
    const res = await app.inject({ method, url, headers: h, ...(body !== undefined ? { payload: body as object } : {}) });
    const set = res.cookies.find((c) => c.name.endsWith('ora_sid')); if (set) cookie = set.value ? `${set.name}=${set.value}` : '';
    return res;
  };
  return {
    get: (u: string) => call('GET', u), post: (u: string, b?: unknown, h?: Record<string, string>) => call('POST', u, b ?? {}, h), del: (u: string) => call('DELETE', u),
    login: async (id = 'sara', name = 'Sara Test') => { const r = await call('POST', '/auth/google', { credential: `mock:${id}:${name}` }); if (r.statusCode !== 200) throw new Error('login failed ' + r.body); return r; },
    get cookie() { return cookie; }
  };
}
export const change = (id: string, data: object, updatedAt: string, collection = 'items', deleted = false) => ({ collection, id, data: deleted ? undefined : data, updatedAt, deleted });
