import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import type { Db } from '../db.js';
import type { Config } from '../config.js';
import { AuthError, type TokenVerifier } from '../auth/google.js';
import { createSession, destroySession, type SessionUser } from '../auth/session.js';

export const cookieName = (cfg: Config) => (cfg.NODE_ENV === 'production' ? '__Host-ora_sid' : 'ora_sid');
export const publicUser = (u: SessionUser) => ({ id: u.id, email: u.email, name: u.name, givenName: u.name.split(/\s+/)[0] || u.name, picture: u.picture });

export function setSessionCookie(cfg: Config, reply: FastifyReply, token: string, expires: Date) {
  reply.setCookie(cookieName(cfg), token, { httpOnly: true, secure: cfg.NODE_ENV === 'production', sameSite: 'lax', path: '/', expires });
}
export const clearSessionCookie = (cfg: Config, reply: FastifyReply) => reply.clearCookie(cookieName(cfg), { path: '/', httpOnly: true, secure: cfg.NODE_ENV === 'production', sameSite: 'lax' });

export function authRoutes(app: FastifyInstance, db: Db, cfg: Config, verifier: TokenVerifier) {
  app.post('/auth/google', { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } }, async (req, reply) => {
    const { credential } = z.object({ credential: z.string().min(1).max(4096) }).parse(req.body);
    let p; try { p = await verifier.verify(credential); }
    catch (e) { if (e instanceof AuthError) return reply.code(e.code === 'not_configured' ? 503 : 401).send({ error: e.code }); throw e; }
    const { rows } = await db.query<SessionUser>(
      `insert into users (google_sub, email, name, picture) values ($1, $2, $3, $4)
       on conflict (google_sub) do update set email = excluded.email, name = excluded.name, picture = excluded.picture, last_login_at = now()
       returning id, email, name, picture`, [p.sub, p.email, p.name, p.picture ?? null]);
    const user = rows[0]!; const s = await createSession(db, user.id, cfg.SESSION_TTL_DAYS, req.headers['user-agent']);
    setSessionCookie(cfg, reply, s.token, s.expiresAt);
    return { user: publicUser(user) };
  });

  app.get('/auth/me', async (req, reply) => { reply.header('cache-control', 'no-store'); return { user: publicUser(req.user!) }; });

  app.post('/auth/logout', async (req, reply) => {
    const t = req.cookies[cookieName(cfg)]; if (t) await destroySession(db, t);
    clearSessionCookie(cfg, reply); return reply.code(204).send();
  });

  /** Permanently delete the account and all of its data. */
  app.delete('/v1/account', async (req, reply) => {
    await db.query('delete from users where id = $1', [req.user!.id]);
    clearSessionCookie(cfg, reply); return reply.code(204).send();
  });
}
