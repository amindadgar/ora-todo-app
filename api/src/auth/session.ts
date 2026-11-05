import { createHash, randomBytes } from 'node:crypto';
import type { Db } from '../db.js';

export interface SessionUser { id: string; email: string; name: string; picture: string | null }
const hash = (token: string) => createHash('sha256').update(token).digest();

export async function createSession(db: Db, userId: string, ttlDays: number, userAgent?: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString('base64url');
  const { rows } = await db.query<{ expires_at: Date }>(
    `insert into sessions (user_id, token_hash, expires_at, user_agent) values ($1, $2, now() + make_interval(days => $3::int), $4) returning expires_at`,
    [userId, hash(token), ttlDays, userAgent?.slice(0, 200) ?? null]);
  return { token, expiresAt: rows[0]!.expires_at };
}

/** Resolve a session token to its user. Sliding expiry: extended once less than half the TTL remains. */
export async function resolveSession(db: Db, token: string, ttlDays: number): Promise<SessionUser | null> {
  const { rows } = await db.query<SessionUser & { sid: string; half: boolean }>(
    `select u.id, u.email, u.name, u.picture, s.id as sid, (s.expires_at < now() + make_interval(days => ($2::int / 2))) as half
       from sessions s join users u on u.id = s.user_id where s.token_hash = $1 and s.expires_at > now()`, [hash(token), ttlDays]);
  const r = rows[0]; if (!r) return null;
  if (r.half) await db.query(`update sessions set expires_at = now() + make_interval(days => $2::int) where id = $1`, [r.sid, ttlDays]);
  return { id: r.id, email: r.email, name: r.name, picture: r.picture };
}
export const destroySession = (db: Db, token: string) => db.query('delete from sessions where token_hash = $1', [hash(token)]);
