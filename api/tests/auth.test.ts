import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setup, teardown, client, type Ctx } from './helpers.js';
import { loadConfig } from '../src/config.js';
import { AuthError } from '../src/auth/google.js';

let c: Ctx; beforeAll(async () => { c = await setup(); }); afterAll(() => teardown(c));

describe('health', () => {
  it('liveness and readiness', async () => {
    expect((await c.app.inject('/healthz')).json()).toEqual({ ok: true });
    expect((await c.app.inject('/readyz')).json()).toEqual({ ok: true });
  });
  it('sends security headers; unknown routes are 401 anonymously (nothing leaked) and JSON 404 when signed in', async () => {
    const r = await c.app.inject('/nope'); expect(r.statusCode).toBe(401); expect(r.headers['x-content-type-options']).toBe('nosniff');
    const a = client(c.app); await a.login('nf'); const n = await a.get('/nope'); expect(n.statusCode).toBe(404); expect(n.json()).toEqual({ error: 'not_found' });
  });
});

describe('google sign-in', () => {
  it('creates the user, sets an HttpOnly session cookie, /auth/me works', async () => {
    const a = client(c.app); const r = await a.login('sara', 'Sara Test');
    const ck = r.cookies.find((x) => x.name === 'ora_sid')!;
    expect(ck.httpOnly).toBe(true); expect(ck.sameSite).toBe('Lax'); expect(ck.path).toBe('/'); expect(ck.value.length).toBeGreaterThan(30);
    expect(r.json().user).toMatchObject({ email: 'sara@example.com', name: 'Sara Test', givenName: 'Sara' });
    const me = await a.get('/auth/me'); expect(me.statusCode).toBe(200); expect(me.json().user.email).toBe('sara@example.com'); expect(me.headers['cache-control']).toBe('no-store');
  });
  it('stores only a hash of the token and reuses the user on later sign-ins', async () => {
    const a = client(c.app); await a.login('dana', 'Dana'); const tok = a.cookie.split('=')[1]!;
    const { rows } = await c.db.query('select token_hash from sessions'); expect(rows.some((r) => Buffer.from(r.token_hash).toString('utf8') === tok)).toBe(false);
    await client(c.app).login('dana', 'Dana'); expect((await c.db.query(`select count(*)::int n from users where google_sub = 'mock-dana'`)).rows[0].n).toBe(1);
  });
  it('rejects unauthenticated requests', async () => {
    expect((await client(c.app).get('/auth/me')).statusCode).toBe(401); expect((await client(c.app).get('/v1/sync')).statusCode).toBe(401);
  });
  it('logout destroys the session server-side', async () => {
    const a = client(c.app); await a.login('lo'); const old = a.cookie; expect((await a.post('/auth/logout')).statusCode).toBe(204);
    const r = await c.app.inject({ method: 'GET', url: '/auth/me', headers: { cookie: old } }); expect(r.statusCode).toBe(401);
  });
  it('expired sessions are rejected', async () => {
    const a = client(c.app); await a.login('exp'); await c.db.query(`update sessions set expires_at = now() - interval '1 minute'`);
    expect((await a.get('/auth/me')).statusCode).toBe(401);
  });
  it('rejects bad credentials / bodies', async () => {
    const a = client(c.app);
    expect((await a.post('/auth/google', { credential: 'garbage' })).statusCode).toBe(503);   // mock mode on, but no GOOGLE_CLIENT_ID → real tokens unsupported
    expect((await a.post('/auth/google', { credential: 'mock:bad id!:x' })).statusCode).toBe(401);
    expect((await a.post('/auth/google', {})).statusCode).toBe(400);
    expect((await a.post('/auth/google', { credential: 'x'.repeat(5000) })).statusCode).toBe(400);
  });
});

describe('CSRF', () => {
  it('rejects state-changing requests without an allowed Origin', async () => {
    const a = client(c.app); await a.login('csrf');
    expect((await a.post('/v1/sync', { changes: [] }, { origin: 'https://evil.example' })).statusCode).toBe(403);
    const none = await c.app.inject({ method: 'POST', url: '/v1/sync', headers: { cookie: a.cookie }, payload: { changes: [] } }); expect(none.statusCode).toBe(403);
    expect((await a.post('/v1/sync', { changes: [] })).statusCode).toBe(200);
    expect((await c.app.inject({ method: 'POST', url: '/auth/google', headers: { origin: 'https://evil.example' }, payload: { credential: 'mock:x' } })).statusCode).toBe(403);
  });
});

describe('verifier mapping', () => {
  it('maps verifier errors to 401 / 503 and never leaks details', async () => {
    const bad = await setup({}, { verify: async () => { throw new AuthError('invalid_token', 'secret detail'); } }); const r = await client(bad.app).post('/auth/google', { credential: 'whatever' });
    expect(r.statusCode).toBe(401); expect(r.body).not.toContain('secret'); await teardown(bad);
    const off = await setup({}, { verify: async () => { throw new AuthError('not_configured', 'x'); } }); expect((await client(off.app).post('/auth/google', { credential: 'w' })).statusCode).toBe(503); await teardown(off);
    c = await setup();
  });
  it('a real verifier succeeds and its profile becomes the user', async () => {
    const ok = await setup({}, { verify: async () => ({ sub: 'g-1', email: 'real@gmail.com', name: 'Real Person', picture: 'https://p/x.png' }) });
    const a = client(ok.app); const r = await a.post('/auth/google', { credential: 'jwt' }); expect(r.json().user).toMatchObject({ email: 'real@gmail.com', picture: 'https://p/x.png' }); await teardown(ok); c = await setup();
  });
});

describe('config safety', () => {
  const base = { DATABASE_URL: 'postgres://x', NODE_ENV: 'production', ALLOWED_ORIGINS: 'https://ora.example' };
  it('refuses AUTH_MOCK and localhost origins in production', () => {
    expect(() => loadConfig({ ...base, AUTH_MOCK: 'true' })).toThrow(/AUTH_MOCK/);
    expect(() => loadConfig({ ...base, ALLOWED_ORIGINS: 'http://localhost:5173' })).toThrow(/localhost/);
    expect(loadConfig(base).ALLOWED_ORIGINS).toEqual(['https://ora.example']);
  });
  it('keeps the connection pool small by default and validates it', () => {
    expect(loadConfig({ DATABASE_URL: 'postgres://x' }).DB_POOL_MAX).toBe(5); expect(loadConfig({ DATABASE_URL: 'postgres://x', DB_POOL_MAX: '3' }).DB_POOL_MAX).toBe(3);
    expect(() => loadConfig({ DATABASE_URL: 'postgres://x', DB_POOL_MAX: '0' })).toThrow();
  });
  it('requires DATABASE_URL and ignores a mock credential when mock is off', async () => {
    expect(() => loadConfig({})).toThrow(/DATABASE_URL/);
    const off = await setup({ AUTH_MOCK: 'false' }); expect((await client(off.app).post('/auth/google', { credential: 'mock:sara' })).statusCode).toBe(503); await teardown(off); c = await setup();
  });
});
