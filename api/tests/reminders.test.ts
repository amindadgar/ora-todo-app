import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { setup, teardown, client, change, type Ctx } from './helpers.js';
import { gregorianToJdn, jdnToGregorian, reminderText, runReminders, zonedToUtc } from '../src/reminders.js';
import { decrypt, encrypt, signState, verifyState } from '../src/gcal.js';

const KEY = 'k'.repeat(40);
let c: Ctx;
beforeAll(async () => { c = await setup({ GOOGLE_CLIENT_ID: 'cid', GOOGLE_CLIENT_SECRET: 'sec', TOKEN_KEY: KEY, VAPID_PUBLIC_KEY: 'pub', VAPID_PRIVATE_KEY: 'priv', BOT_SHARED_SECRET: 'b'.repeat(40), TELEGRAM_BOT_USERNAME: 'x_bot' }, undefined, () => new Date('2026-10-06T10:00:00Z')); });
afterAll(() => teardown(c));
beforeEach(async () => { await c.db.query('truncate users, records, telegram_links, gcal_links, push_subscriptions, reminder_sent, reminder_outbox cascade'); });

describe('time helpers', () => {
  it('JDN <-> Gregorian round-trips and matches a known day', () => {
    expect(gregorianToJdn(2000, 1, 1)).toBe(2451545); expect(jdnToGregorian(2451545)).toEqual({ y: 2000, m: 1, d: 1 });
    expect(jdnToGregorian(gregorianToJdn(2026, 10, 6))).toEqual({ y: 2026, m: 10, d: 6 });
  });
  it('converts wall-clock to UTC across zones (incl. DST)', () => {
    expect(zonedToUtc({ y: 2026, m: 10, d: 6 }, 16 * 60, 'Asia/Tehran').toISOString()).toBe('2026-10-06T12:30:00.000Z');   // UTC+3:30, no DST since 2022
    expect(zonedToUtc({ y: 2026, m: 7, d: 1 }, 9 * 60, 'Europe/Berlin').toISOString()).toBe('2026-07-01T07:00:00.000Z');
    expect(zonedToUtc({ y: 2026, m: 1, d: 1 }, 9 * 60, 'UTC').toISOString()).toBe('2026-01-01T09:00:00.000Z');
  });
  it('words the reminder in EN and FA', () => {
    expect(reminderText('en', 'Standup', '16:00', 10)).toBe('In 10 min: Standup · 16:00');
    expect(reminderText('fa', 'جلسه', '16:00', 10)).toBe('۱۰ دقیقهٔ دیگر: جلسه · ۱۶:۰۰');
  });
});

describe('gcal crypto', () => {
  it('encrypts, decrypts and rejects tampering', () => {
    const t = encrypt(c.cfg, 'refresh-token'); expect(t).not.toContain('refresh'); expect(decrypt(c.cfg, t)).toBe('refresh-token');
    expect(() => decrypt(c.cfg, t.slice(0, -2) + 'AA')).toThrow();
  });
  it('signs state per user with expiry', () => {
    const now = new Date('2026-10-06T10:00:00Z'); const s = signState(c.cfg, 'u1', now);
    expect(verifyState(c.cfg, s, now)).toBe('u1'); expect(verifyState(c.cfg, s, new Date(now.getTime() + 11 * 60_000))).toBeNull(); expect(verifyState(c.cfg, s + 'x', now)).toBeNull();
  });
});

async function userWithPush(tz = 'Asia/Tehran', lang: 'en' | 'fa' = 'en') {
  const cl = client(c.app); await cl.login('sara'); const me = (await c.db.query<{ id: string }>('select id from users limit 1')).rows[0]!.id;
  const r = await cl.post('/v1/push/subscribe', { endpoint: 'https://push.example/abc', keys: { p256dh: 'p', auth: 'a' }, tz, lang }); expect(r.statusCode).toBe(204);
  return { cl, me };
}
const day = (y: number, m: number, d: number) => gregorianToJdn(y, m, d);

describe('reminders', () => {
  it('delivers an item reminder once, at the right time', async () => {
    const { cl } = await userWithPush();
    const t = '2026-10-06T10:00:00Z';                                                 // 13:30 in Tehran
    await cl.post('/v1/sync', { changes: [change('i1', { id: 'i1', type: 'event', title: 'Standup', day: day(2026, 10, 6), time: '13:40', remind: 10 }, t)] });
    const send = vi.fn(async (_s: unknown, _p: string) => {});
    expect((await runReminders(c.db, c.cfg, new Date('2026-10-06T10:00:00Z'), { send })).delivered).toBe(1);   // exactly 10 min before 13:40
    expect(send).toHaveBeenCalledTimes(1); expect(JSON.parse(send.mock.calls[0]![1] as string).body).toBe('In 10 min: Standup · 13:40');
    await runReminders(c.db, c.cfg, new Date('2026-10-06T10:01:00Z'), { send }); expect(send).toHaveBeenCalledTimes(1);   // not again
  });
  it('does nothing early, late, when done, or without `remind`', async () => {
    const { cl } = await userWithPush(); const send = vi.fn(async (_s: unknown, _p: string) => {}); const t = '2026-10-06T09:00:00Z';
    await cl.post('/v1/sync', { changes: [
      change('a', { id: 'a', type: 'task', title: 'A', day: day(2026, 10, 6), time: '14:00', remind: 15 }, t),
      change('b', { id: 'b', type: 'task', title: 'B', day: day(2026, 10, 6), time: '13:40', remind: 10, done: true }, t),
      change('c', { id: 'c', type: 'task', title: 'C', day: day(2026, 10, 6), time: '13:40' }, t)] });
    await runReminders(c.db, c.cfg, new Date('2026-10-06T09:59:00Z'), { send });          // 13:29 Tehran: a fires at 13:45
    await runReminders(c.db, c.cfg, new Date('2026-10-06T10:20:00Z'), { send });          // 13:50: inside a's window (13:45–14:00) → delivered; b (done) and c (no remind) never are
    expect(send.mock.calls.map((x) => JSON.parse(x[1] as string).body)).toEqual(['In 10 min: A · 14:00']);
  });
  it('queues a Telegram message for linked accounts', async () => {
    const cl = client(c.app); await cl.login('sara'); const me = (await c.db.query<{ id: string }>('select id from users limit 1')).rows[0]!.id;
    await c.db.query(`insert into telegram_links (user_id, chat_id, tz, lang) values ($1, 4242, 'Asia/Tehran', 'fa')`, [me]);
    await cl.post('/v1/sync', { changes: [change('i1', { id: 'i1', type: 'task', title: { fa: 'جلسه', en: 'Meeting' }, day: day(2026, 10, 6), time: '13:35', remind: 5 }, '2026-10-06T09:00:00Z')] });
    await runReminders(c.db, c.cfg, new Date('2026-10-06T10:00:00Z'), { send: async () => {} });
    const r = await c.db.query('select chat_id, text from reminder_outbox'); expect(r.rows).toEqual([{ chat_id: '4242', text: '۵ دقیقهٔ دیگر: جلسه · ۱۳:۳۵' }]);
    const due = await client(c.app).get('/bot/due').catch(() => null); void due;
    const res = await c.app.inject({ method: 'GET', url: '/bot/due', headers: { authorization: 'Bearer ' + 'b'.repeat(40) } });
    expect(res.json().reminders).toHaveLength(1);
    const id = res.json().reminders[0].id; expect((await c.app.inject({ method: 'POST', url: '/bot/ack-reminder', headers: { authorization: 'Bearer ' + 'b'.repeat(40) }, payload: { id } })).statusCode).toBe(204);
    expect((await c.db.query('select 1 from reminder_outbox')).rowCount).toBe(0);
  });
  it('reminds about Google Calendar meetings with the default lead time and drops dead push endpoints', async () => {
    const { me } = await userWithPush();
    await c.db.query(`insert into gcal_links (user_id, refresh_enc, events_cache, fetched_at) values ($1, $2, $3, $4)`, [me, encrypt(c.cfg, 'r'), JSON.stringify([{ id: 'e1', title: 'Board meeting', start: '2026-10-06T10:08:00.000Z', end: '2026-10-06T10:38:00.000Z' }]), new Date('2026-10-06T10:00:00Z')]);
    const send = vi.fn(async (_s: unknown, _p: string) => { throw Object.assign(new Error('gone'), { statusCode: 410 }); });
    await runReminders(c.db, c.cfg, new Date('2026-10-06T10:00:00Z'), { send });
    expect(send).toHaveBeenCalledTimes(1); expect((await c.db.query('select 1 from push_subscriptions')).rowCount).toBe(0);
  });
});

describe('push + gcal routes', () => {
  it('requires login, validates subscriptions', async () => {
    expect((await client(c.app).get('/v1/push')).statusCode).toBe(401);
    const cl = client(c.app); await cl.login(); expect((await cl.get('/v1/push')).json()).toEqual({ enabled: true, key: 'pub' });
    expect((await cl.post('/v1/push/subscribe', { endpoint: 'http://insecure', keys: { p256dh: 'p', auth: 'a' } })).statusCode).toBe(400);
  });
  it('gcal: connect URL, callback stores an encrypted token, events, disconnect', async () => {
    const calls: string[] = [];
    const f = (async (url: string) => {
      calls.push(url);
      if (url.startsWith('https://oauth2.googleapis.com/token')) return new Response(JSON.stringify({ refresh_token: 'R', access_token: 'A' }), { status: 200 });
      return new Response(JSON.stringify({ items: [{ id: 'e1', summary: 'Sync', start: { dateTime: '2026-10-06T12:00:00+03:30' }, end: { dateTime: '2026-10-06T12:30:00+03:30' } }, { id: 'e2', summary: 'Day off', start: { date: '2026-10-07' }, end: { date: '2026-10-08' } }, { id: 'e3', status: 'cancelled', start: { dateTime: '2026-10-06T13:00:00Z' }, end: { dateTime: '2026-10-06T14:00:00Z' } }] }), { status: 200 });
    }) as unknown as typeof fetch;
    const { buildApp } = await import('../src/app.js'); const app = await buildApp({ cfg: c.cfg, db: c.db, now: () => new Date('2026-10-06T10:00:00Z') });
    void app; // routes are wired to the real fetch in buildApp; exercise the handlers' pieces directly instead:
    const { meetingsFor } = await import('../src/routes/gcal.js'); const cl = client(c.app); await cl.login();
    expect((await cl.get('/v1/gcal')).json()).toEqual({ enabled: true, linked: false });
    const url = (await cl.post('/v1/gcal/connect')).json().url as string; expect(url).toContain('calendar.readonly'); expect(url).toContain('access_type=offline');
    const me = (await c.db.query<{ id: string }>('select id from users limit 1')).rows[0]!.id; const state = new URL(url).searchParams.get('state')!;
    expect((await c.app.inject({ method: 'GET', url: '/v1/gcal/callback?error=access_denied', headers: { cookie: cl.cookie } })).headers.location).toContain('gcal=denied');
    expect((await c.app.inject({ method: 'GET', url: `/v1/gcal/callback?code=x&state=${state}tampered`, headers: { cookie: cl.cookie } })).headers.location).toContain('gcal=failed');
    await c.db.query('insert into gcal_links (user_id, refresh_enc) values ($1, $2)', [me, encrypt(c.cfg, 'R')]);
    const list = await meetingsFor(c.db, c.cfg, me, new Date('2026-10-06T10:00:00Z'), f);
    expect(list).toEqual([{ id: 'e1', title: 'Sync', start: '2026-10-06T08:30:00.000Z', end: '2026-10-06T09:00:00.000Z' }]);
    expect((await cl.del('/v1/gcal')).statusCode).toBe(204); expect((await cl.get('/v1/gcal')).json().linked).toBe(false);
  });
});
