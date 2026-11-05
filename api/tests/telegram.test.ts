import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setup, teardown, client, change, type Ctx } from './helpers.js';
import { localParts, inWindow, validTimeZone } from '../src/telegram/time.js';

const SECRET = 'x'.repeat(40); let clock = new Date('2026-10-06T04:30:00Z'); let c: Ctx;
const env = { BOT_SHARED_SECRET: SECRET, TELEGRAM_BOT_USERNAME: 'ora_test_bot' };
beforeAll(async () => { c = await setup(env, undefined, () => clock); }); afterAll(() => teardown(c));
beforeEach(async () => { await c.db.query('truncate users, sessions, records, telegram_links, telegram_link_codes cascade'); clock = new Date('2026-10-06T04:30:00Z'); });

const bot = (method: 'GET' | 'POST', url: string, body?: unknown, secret: string | null = SECRET) =>
  c.app.inject({ method, url, headers: secret ? { authorization: `Bearer ${secret}` } : {}, ...(body !== undefined ? { payload: body as object } : {}) });
const T0 = '2026-10-06T10:00:00.000Z'; let ipn = 0; const ip = () => ({ 'x-forwarded-for': `10.9.${Math.floor(++ipn / 250)}.${ipn % 250}` });   // each call from a fresh "client IP" so the rate limiter doesn't interfere
/** sign in, create a link code, link chat `chat` through the bot endpoint */
async function linked(id = 'sara', chat = 111, o: { tz?: string; lang?: 'en' | 'fa' } = {}) {
  const a = client(c.app); await a.login(id, 'Sara Test'); const r = await a.post('/v1/telegram/link-code', { tz: o.tz ?? 'Asia/Tehran', lang: o.lang ?? 'fa' }, ip());
  const code = new URL(r.json().url).searchParams.get('start')!; const l = await bot('POST', '/bot/link', { code, chatId: chat }); return { a, code, link: l };
}

describe('time helpers', () => {
  it('local date/time in a zone (Tehran is UTC+3:30 in 2026)', () => { expect(localParts(new Date('2026-10-06T04:30:00Z'), 'Asia/Tehran')).toEqual({ date: '2026-10-06', minutes: 8 * 60 }); expect(localParts(new Date('2026-10-06T21:00:00Z'), 'Asia/Tehran').date).toBe('2026-10-07'); });
  it('windows and tz validation', () => { expect(inWindow('morning', 7 * 60 + 29)).toBe(false); expect(inWindow('morning', 7 * 60 + 30)).toBe(true); expect(inWindow('morning', 12 * 60)).toBe(false); expect(inWindow('evening', 23 * 60 + 59)).toBe(true);
    expect(validTimeZone('Europe/Berlin')).toBe(true); expect(validTimeZone('Mars/Base')).toBe(false); expect(validTimeZone(5)).toBe(false); });
});

describe('bot endpoint auth', () => {
  it('requires the shared secret (constant-time), and never accepts a session cookie', async () => {
    expect((await bot('GET', '/bot/me?chatId=1', undefined, null)).statusCode).toBe(401);
    expect((await bot('GET', '/bot/me?chatId=1', undefined, 'y'.repeat(40))).statusCode).toBe(401);
    expect((await bot('GET', '/bot/me?chatId=1', undefined, 'short')).statusCode).toBe(401);
    const a = client(c.app); await a.login(); const r = await c.app.inject({ method: 'GET', url: '/bot/me?chatId=1', headers: { cookie: a.cookie } }); expect(r.statusCode).toBe(401);
    expect((await bot('GET', '/bot/me?chatId=1')).statusCode).toBe(404);                        // authorized, but not linked
  });
  it('is disabled (503) when no secret is configured, and the secret must be long enough', async () => {
    const off = await setup({}); expect((await off.app.inject({ method: 'GET', url: '/bot/due', headers: { authorization: `Bearer ${SECRET}` } })).statusCode).toBe(503);
    expect((await client(off.app).get('/v1/telegram')).statusCode).toBe(401); const a = client(off.app); await a.login(); expect((await a.get('/v1/telegram')).json()).toMatchObject({ enabled: false });
    expect((await a.post('/v1/telegram/link-code', { lang: 'en' })).statusCode).toBe(503); await teardown(off);
    await expect(setup({ BOT_SHARED_SECRET: 'tooshort' })).rejects.toThrow(/BOT_SHARED_SECRET/); c = await setup(env, undefined, () => clock);
  });
});

describe('linking', () => {
  it('app → one-time code → bot link; status reflects it', async () => {
    const a = client(c.app); await a.login('sara'); expect((await a.get('/v1/telegram')).json()).toEqual({ enabled: true, linked: false, username: 'ora_test_bot' });
    const r = await a.post('/v1/telegram/link-code', { tz: 'Asia/Tehran', lang: 'fa' }, ip()); expect(r.statusCode).toBe(200); expect(r.json().url).toMatch(/^https:\/\/t\.me\/ora_test_bot\?start=[\w-]{20,}$/);
    const code = new URL(r.json().url).searchParams.get('start')!;
    const l = await bot('POST', '/bot/link', { code, chatId: 111 }); expect(l.statusCode).toBe(200); expect(l.json()).toEqual({ name: 'Sara Test', lang: 'fa', tz: 'Asia/Tehran' });
    expect((await a.get('/v1/telegram')).json().linked).toBe(true); expect((await bot('GET', '/bot/me?chatId=111')).json()).toEqual({ lang: 'fa', tz: 'Asia/Tehran' });
  });
  it('codes are single-use, expire, and are stored hashed', async () => {
    const { code } = await linked(); expect((await bot('POST', '/bot/link', { code, chatId: 222 })).statusCode).toBe(404);
    const a = client(c.app); await a.login('dana'); const r = await a.post('/v1/telegram/link-code', { lang: 'en' }, ip()); const code2 = new URL(r.json().url).searchParams.get('start')!;
    expect((await c.db.query('select 1 from telegram_link_codes where code_hash = $1', [Buffer.from(code2)])).rowCount).toBe(0);
    await c.db.query(`update telegram_link_codes set expires_at = now() - interval '1 second'`); expect((await bot('POST', '/bot/link', { code: code2, chatId: 333 })).statusCode).toBe(404);
    expect((await bot('POST', '/bot/link', { code: 'nope-nope-nope', chatId: 1 })).statusCode).toBe(404);
  });
  it('a bad/missing tz falls back to UTC; a new code replaces the old one', async () => {
    const a = client(c.app); await a.login(); const r1 = await a.post('/v1/telegram/link-code', { tz: 'Mars/Base', lang: 'en' }, ip()); const r2 = await a.post('/v1/telegram/link-code', { lang: 'en' }, ip());
    expect((await c.db.query('select tz from telegram_link_codes')).rows).toEqual([{ tz: 'UTC' }]);
    expect((await bot('POST', '/bot/link', { code: new URL(r1.json().url).searchParams.get('start'), chatId: 5 })).statusCode).toBe(404);
    expect((await bot('POST', '/bot/link', { code: new URL(r2.json().url).searchParams.get('start'), chatId: 5 })).statusCode).toBe(200);
  });
  it('one chat ↔ one account: re-linking moves the chat', async () => {
    await linked('a', 500); await linked('b', 500);
    const rows = (await c.db.query('select u.email from telegram_links l join users u on u.id = l.user_id')).rows; expect(rows).toEqual([{ email: 'b@example.com' }]);
  });
  it('unlink (bot and app) and lang change', async () => {
    const { a } = await linked('u1', 1); expect((await bot('POST', '/bot/lang', { chatId: 1, lang: 'en' })).statusCode).toBe(200); expect((await bot('GET', '/bot/me?chatId=1')).json().lang).toBe('en');
    expect((await bot('POST', '/bot/unlink', { chatId: 1 })).statusCode).toBe(204); expect((await bot('GET', '/bot/me?chatId=1')).statusCode).toBe(404);
    await linked('u1', 1); expect((await a.del('/v1/telegram')).statusCode).toBe(204); expect((await bot('GET', '/bot/me?chatId=1')).statusCode).toBe(404);
  });
  it('deleting the account removes the link', async () => { const { a } = await linked('gone', 9); await a.del('/v1/account'); expect((await c.db.query('select count(*)::int n from telegram_links')).rows[0].n).toBe(0); });
});

describe('abuse limits', () => {
  it('link-code creation is rate limited per client', async () => {
    const a = client(c.app); await a.login(); const h = { 'x-forwarded-for': '10.8.8.8' }; const codes: number[] = [];
    for (let i = 0; i < 12; i++) codes.push((await a.post('/v1/telegram/link-code', { lang: 'en' }, h)).statusCode);
    expect(codes.slice(0, 10).every((x) => x === 200)).toBe(true); expect(codes.slice(10)).toEqual([429, 429]);
  });
});

describe('records & changes via the bot', () => {
  it('reads and writes only the linked account\'s data; app sync sees the bot\'s writes', async () => {
    const { a } = await linked('sara', 1); const { a: b } = await linked('other', 2);
    await a.post('/v1/sync', { changes: [change('t1', { title: 'mine', day: 1 }, T0), change('s', { morning: true }, T0, 'settings')] }); await b.post('/v1/sync', { changes: [change('t9', { title: 'theirs' }, T0)] });
    const recs = (await bot('GET', '/bot/records?chatId=1&collection=items')).json().records; expect(recs.map((r: { id: string }) => r.id)).toEqual(['t1']);
    expect((await bot('GET', '/bot/records?chatId=1&collection=items&id=nope')).json().records).toEqual([]);
    const w = await bot('POST', '/bot/changes', { chatId: 1, changes: [change('t2', { title: 'from telegram' }, '2026-10-06T11:00:00.000Z')] }); expect(w.json().applied).toBe(1);
    expect((await a.get('/v1/sync')).json().records.map((r: { id: string }) => r.id).sort()).toEqual(['s', 't1', 't2']);
    expect((await b.get('/v1/sync')).json().records.map((r: { id: string }) => r.id)).toEqual(['t9']);
    expect((await bot('POST', '/bot/changes', { chatId: 999, changes: [change('x', {}, T0)] })).statusCode).toBe(404);
    expect((await bot('POST', '/bot/changes', { chatId: 1, changes: [{ collection: 'users', id: 'x', data: {}, updatedAt: T0 }] })).statusCode).toBe(400);
    expect((await bot('POST', '/bot/changes', { chatId: 1, changes: [] })).statusCode).toBe(400);
  });
  it('conflicts resolve like the app (older bot edit loses)', async () => {
    const { a } = await linked('sara', 1); await a.post('/v1/sync', { changes: [change('t1', { v: 'new' }, '2026-10-06T12:00:00.000Z')] });
    const r = (await bot('POST', '/bot/changes', { chatId: 1, changes: [change('t1', { v: 'old' }, '2026-10-06T09:00:00.000Z')] })).json(); expect(r.applied).toBe(0); expect(r.rejected[0].data).toEqual({ v: 'new' });
  });
});

describe('due notifications', () => {
  it('delivers morning at 07:30 local, evening at 22:00, once a day', async () => {
    await linked('sara', 1, { tz: 'Asia/Tehran' });                                            // Tehran = UTC+3:30
    clock = new Date('2026-10-06T03:59:00Z'); expect((await bot('GET', '/bot/due')).json().due).toEqual([]);                  // 07:29 local
    clock = new Date('2026-10-06T04:00:00Z'); const m = (await bot('GET', '/bot/due')).json().due; expect(m).toEqual([{ chatId: 1, lang: 'fa', tz: 'Asia/Tehran', kind: 'morning', localDate: '2026-10-06' }]);
    expect((await bot('POST', '/bot/ack', { chatId: 1, kind: 'morning', localDate: '2026-10-06' })).statusCode).toBe(204); expect((await bot('GET', '/bot/due')).json().due).toEqual([]);   // not twice
    clock = new Date('2026-10-06T08:30:00Z'); expect((await bot('GET', '/bot/due')).json().due).toEqual([]);                  // midday: nothing
    clock = new Date('2026-10-06T18:30:00Z'); expect((await bot('GET', '/bot/due')).json().due.map((d: { kind: string }) => d.kind)).toEqual(['evening']);    // 22:00 local
    await bot('POST', '/bot/ack', { chatId: 1, kind: 'evening', localDate: '2026-10-06' });
    clock = new Date('2026-10-07T04:10:00Z'); expect((await bot('GET', '/bot/due')).json().due.map((d: { kind: string }) => d.kind)).toEqual(['morning']);        // next day again
  });
  it('late ticks still deliver inside the window but never outside it', async () => {
    await linked('sara', 1, { tz: 'UTC' }); clock = new Date('2026-10-06T11:59:00Z'); expect((await bot('GET', '/bot/due')).json().due).toHaveLength(1); clock = new Date('2026-10-06T12:00:00Z'); expect((await bot('GET', '/bot/due')).json().due).toEqual([]);
  });
  it('respects the per-account switches synced from the app and each account\'s own zone', async () => {
    const { a } = await linked('off', 1, { tz: 'UTC' }); await linked('on', 2, { tz: 'America/New_York' }); await linked('berlin', 3, { tz: 'Europe/Berlin' });
    await a.post('/v1/sync', { changes: [change('main', { morning: false, evening: true }, T0, 'settings')] });
    clock = new Date('2026-10-06T07:30:00Z');                                                    // UTC 07:30 (off) · NY 03:30 · Berlin 09:30 (inside window)
    expect((await bot('GET', '/bot/due')).json().due.map((d: { chatId: number }) => d.chatId)).toEqual([3]);
    clock = new Date('2026-10-06T11:30:00Z');                                                    // NY 07:30 ✓ · Berlin 13:30 (past the morning window)
    expect((await bot('GET', '/bot/due')).json().due.map((d: { chatId: number }) => d.chatId)).toEqual([2]);
    clock = new Date('2026-10-06T22:00:00Z');                                                    // UTC 22:00 evening (switch on)
    expect((await bot('GET', '/bot/due')).json().due.filter((d: { chatId: number }) => d.chatId === 1).map((d: { kind: string }) => d.kind)).toEqual(['evening']);
  });
  it('ack validates input and unknown chats', async () => {
    expect((await bot('POST', '/bot/ack', { chatId: 77, kind: 'morning', localDate: '2026-10-06' })).statusCode).toBe(404); expect((await bot('POST', '/bot/ack', { chatId: 77, kind: 'lunch', localDate: '2026-10-06' })).statusCode).toBe(400);
    expect((await bot('POST', '/bot/ack', { chatId: 77, kind: 'morning', localDate: 'today' })).statusCode).toBe(400);
  });
});
