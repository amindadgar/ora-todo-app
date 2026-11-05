/** Worker logic against the REAL api + Postgres (only Telegram is faked). Needs the local test database (see api/tests/helpers.ts). */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setup, teardown, client, change, type Ctx } from '../../api/tests/helpers';
import { handleUpdate, runDue, type Deps } from '../src/bot';
import { oraClient } from '../src/ora';
import { TelegramError, type Keyboard } from '../src/telegram';
import { dayFromG } from '../../web/src/lib/calendar';
import worker, { type Env } from '../src/index';

const SECRET = 'z'.repeat(40); const T = dayFromG(2026, 10, 6);                      // Tue 6 Oct 2026 (14 Mehr 1405)
let clock = new Date('2026-10-06T06:00:00Z');                                        // 09:30 in Tehran
let ctx: Ctx; let base = ''; let n = 0; const ids = () => `id${++n}`;
interface Sent { chatId: number; text: string; keyboard?: Keyboard; edited?: boolean }
let sent: Sent[] = []; let answers: (string | undefined)[] = []; let failWith: TelegramError | null = null;

const deps = (): Deps => ({
  ora: oraClient(base, SECRET), now: () => clock, uid: ids,
  tg: {
    send: async (chatId, text, keyboard) => { if (failWith) throw failWith; sent.push({ chatId, text, keyboard }); return {}; },
    edit: async (chatId, _m, text, keyboard) => { sent.push({ chatId, text, keyboard, edited: true }); return {}; },
    answer: async (_id, text) => { answers.push(text); return {}; }
  } as Deps['tg']
});
const say = (chatId: number, text: string) => handleUpdate({ message: { message_id: 1, text, chat: { id: chatId, type: 'private' } } }, deps());
const press = (chatId: number, data: string) => handleUpdate({ callback_query: { id: 'cb', data, message: { message_id: 7, chat: { id: chatId, type: 'private' } } } }, deps());
const last = () => sent[sent.length - 1]!;

beforeAll(async () => {
  ctx = await setup({ BOT_SHARED_SECRET: SECRET, TELEGRAM_BOT_USERNAME: 'ora_test_bot' }, undefined, () => clock);
  await ctx.app.listen({ port: 0, host: '127.0.0.1' }); base = `http://127.0.0.1:${(ctx.app.server.address() as { port: number }).port}`;
});
afterAll(() => teardown(ctx));
beforeEach(async () => { await ctx.db.query('truncate users, sessions, records, telegram_links, telegram_link_codes cascade'); sent = []; answers = []; failWith = null; clock = new Date('2026-10-06T06:00:00Z'); });

let ip = 0;
async function link(chatId: number, lang: 'en' | 'fa' = 'en', id = 'sara', tz = 'Asia/Tehran') {
  const a = client(ctx.app); await a.login(id, 'Sara Test');
  const r = await a.post('/v1/telegram/link-code', { tz, lang }, { 'x-forwarded-for': `10.7.0.${++ip}` });
  await say(chatId, `/start ${new URL(r.json().url).searchParams.get('start')}`); return a;
}
const records = async (a: ReturnType<typeof client>, collection: string) => (await a.get('/v1/sync')).json().records.filter((r: { collection: string; deleted: boolean }) => r.collection === collection && !r.deleted) as { id: string; data: Record<string, unknown> }[];

describe('linking', () => {
  it('links via the deep-link code and greets in the language chosen in the app', async () => {
    await link(1, 'fa'); expect(last().text).toContain('وصل شدی'); expect(last().text).toContain('Sara Test');
    expect((await ctx.db.query('select chat_id::int c, lang from telegram_links')).rows).toEqual([{ c: 1, lang: 'fa' }]);
  });
  it('rejects bad/used codes and asks unlinked chats to connect (both languages)', async () => {
    await say(5, '/start totally-wrong-code'); expect(last().text).toContain('expired'); expect(last().text).toContain('منقضی');
    await say(5, 'dentist tomorrow 5pm'); expect(last().text).toContain('Connect Telegram'); expect(last().text).toContain('اتصال تلگرام');
    await say(5, '/today'); expect(last().text).toContain('Connect Telegram');
  });
  it('ignores group chats and non-text updates', async () => {
    await handleUpdate({ message: { message_id: 1, text: '/start abc', chat: { id: -100, type: 'group' } } }, deps()); await handleUpdate({}, deps()); expect(sent).toEqual([]);
  });
  it('/stop disconnects, /lang switches language, /help works', async () => {
    await link(1, 'en'); await say(1, '/help'); expect(last().text).toContain('/today');
    await say(1, '/lang'); expect(last().text).toBe('زبان: فارسی.'); await say(1, '/lang'); expect(last().text).toBe('Language: English.');
    await say(1, '/stop'); expect(last().text).toContain('Disconnected'); await say(1, 'milk'); expect(last().text).toContain('Connect Telegram');
    await say(1, '/nonsense'); expect(sent).toHaveLength(7);
  });
});

describe('adding entries by chatting (same parser as the app)', () => {
  it('"dentist tomorrow 5pm" → event tomorrow 17:00, visible in the app, undoable', async () => {
    const a = await link(1, 'en'); await say(1, 'dentist tomorrow 5pm');
    expect(last().text).toContain('Saved'); expect(last().text).toContain('<b>dentist</b>'); expect(last().text).toContain('Event'); expect(last().text).toContain('5:00 pm'); expect(last().text).toContain('Tomorrow, Wednesday');
    const [ev] = await records(a, 'items'); expect(ev!.data).toMatchObject({ type: 'event', title: 'dentist', day: T + 1, time: '17:00' });
    const undo = last().keyboard![0]![0]!; expect(undo.callback_data).toBe(`u:items:${ev!.id}`);
    clock = new Date(clock.getTime() + 5000);                                                  // the tap happens a moment later (ties go to the server copy)
    await press(1, undo.callback_data); expect(last()).toMatchObject({ edited: true, text: 'Removed.' }); expect(await records(a, 'items')).toEqual([]);
  });
  it('Persian: "فردا ساعت ۵ دندانپزشکی" → assumes 17:00 and says so', async () => {
    const a = await link(1, 'fa'); await say(1, 'فردا ساعت ۵ دندانپزشکی');
    expect(last().text).toContain('ذخیره شد'); expect(last().text).toContain('<b>دندانپزشکی</b>'); expect(last().text).toContain('۱۷:۰۰'); expect(last().text).toContain('صبح یا عصر نگفتی');
    expect((await records(a, 'items'))[0]!.data).toMatchObject({ type: 'event', day: T + 1, time: '17:00' });
  });
  it('money, goals, key dates, wishes land in the right collections', async () => {
    const a = await link(1, 'en'); await say(1, '250K taxi'); expect(last().text).toContain('250K toman'); expect(last().text).toContain('Transport');
    await say(1, 'read 20 books'); await say(1, "Dad's birthday in 55 days"); await say(1, 'day trip to Kashan someday'); await say(1, 'rent 18M on the 1st next month');
    expect((await records(a, 'items'))[0]!.data).toMatchObject({ type: 'expense', amount: 250000, cat: 'transport', day: T });
    expect((await records(a, 'goals'))[0]!.data).toMatchObject({ target: 20, have: 0 }); expect((await records(a, 'events'))[0]!.data).toMatchObject({ yearly: true, day: T + 55 });
    expect(await records(a, 'wishes')).toHaveLength(1); expect((await records(a, 'bills'))[0]!.data).toMatchObject({ amount: 18000000 });
  });
  it('respects the user\'s time zone for "today" and "tomorrow"', async () => {
    const a = await link(1, 'en', 'ny', 'America/New_York'); clock = new Date('2026-10-07T02:00:00Z');   // still Tue 6 Oct 22:00 in New York, already Wed in UTC
    await say(1, 'call mum tomorrow'); expect((await records(a, 'items'))[0]!.data.day).toBe(T + 1);
  });
  it('uses the account currency from the app settings', async () => {
    const a = await link(1, 'en'); await a.post('/v1/sync', { changes: [change('main', { currency: 'rial' }, '2026-10-06T05:00:00.000Z', 'settings')] }); await say(1, '250K taxi'); expect(last().text).toContain('2.5M rial');
  });
  it('says so when there is no usable title; never injects HTML', async () => {
    await link(1, 'en'); await say(1, 'tomorrow 5pm'); expect(last().text).toContain('couldn’t find a title');
    await say(1, '<b>x</b> & <script>'); expect(last().text).toContain('&lt;b&gt;x&lt;/b&gt;'); expect(last().text).not.toContain('<script>');
  });
});

describe('/today and marking done', () => {
  it('lists today in order with a ✓ button per open task; tapping completes it (and feeds the Goals charts)', async () => {
    const a = await link(1, 'en'); const t = '2026-10-06T05:00:00.000Z';
    await a.post('/v1/sync', { changes: [
      change('a', { id: 'a', type: 'task', title: 'Walk', day: T, time: '07:00' }, t), change('b', { id: 'b', type: 'task', title: 'Report', day: T, time: '10:00' }, t),
      change('r', { id: 'r', type: 'reminder', title: 'Sync', day: T, time: '15:30' }, t), change('c', { id: 'c', type: 'task', title: 'Tomorrow', day: T + 1, time: '' }, t),
      change('m', { id: 'm', type: 'expense', title: 'Taxi', day: T, time: '', amount: 5 }, t)] });
    await say(1, '/today'); const m = last(); expect(m.text).toContain('Today'); expect(m.text.indexOf('Walk')).toBeLessThan(m.text.indexOf('Report')); expect(m.text).not.toContain('Tomorrow'); expect(m.text).not.toContain('Taxi');
    expect(m.keyboard!.map((r) => r[0]!.callback_data)).toEqual(['d:a', 'd:b']);                     // reminders aren't completable
    await press(1, 'd:a'); expect(last()).toMatchObject({ edited: true }); expect(last().text).toContain('✅ Walk'); expect(answers.at(-1)).toBe('Done 🎉');
    expect((await records(a, 'items')).find((r) => r.id === 'a')!.data).toMatchObject({ done: true, doneAt: T, doneB: 0 });     // 09:30 local → morning bucket
    expect((await records(a, 'activity'))[0]!.data).toEqual({ day: T, b: [1, 0, 0, 0] });
    await press(1, 'd:a'); expect(answers.at(-1)).toBe('Already done'); expect((await records(a, 'activity'))[0]!.data).toEqual({ day: T, b: [1, 0, 0, 0] });   // not counted twice
    clock = new Date('2026-10-06T16:00:00Z'); await press(1, 'd:b'); expect((await records(a, 'activity'))[0]!.data).toEqual({ day: T, b: [1, 0, 1, 0] });     // 19:30 local → bucket 2 (16:00–20:00)
  });
  it('an empty day and an unknown task are handled', async () => {
    await link(1, 'fa'); await say(1, '/today'); expect(last().text).toContain('برنامه‌ای نداری'); await press(1, 'd:ghost'); expect(sent).toHaveLength(2);
  });
});

describe('morning brief and evening review (cron)', () => {
  const settings = (a: ReturnType<typeof client>, data: object) => a.post('/v1/sync', { changes: [change('main', data, '2026-10-06T03:00:00.000Z', 'settings')] });
  it('sends each once per day at the right local time, with the right content', async () => {
    const a = await link(1, 'en'); const t = '2026-10-06T03:00:00.000Z';
    await a.post('/v1/sync', { changes: [change('a', { id: 'a', type: 'task', title: 'Walk', day: T, time: '07:00' }, t), change('b', { id: 'b', type: 'task', title: 'Report', day: T, time: '10:00', done: true }, t)] });
    sent = []; clock = new Date('2026-10-06T03:30:00Z'); expect(await runDue(deps())).toEqual({ sent: 0, failed: 0 });           // 07:00 Tehran: too early
    clock = new Date('2026-10-06T04:05:00Z'); expect(await runDue(deps())).toEqual({ sent: 1, failed: 0 }); const m = last();             // 07:35
    expect(m.text).toContain('Good morning'); expect(m.text).toContain('2 things'); expect(m.text).toContain('⬜ Walk'); expect(m.text).toContain('✅ Report'); expect(m.keyboard!.map((r) => r[0]!.callback_data)).toEqual(['d:a']);
    expect(await runDue(deps())).toEqual({ sent: 0, failed: 0 });                                                                      // once only
    clock = new Date('2026-10-06T18:35:00Z'); expect(await runDue(deps())).toEqual({ sent: 1, failed: 0 });                            // 22:05
    expect(last().text).toContain('finished 1 of 2'); expect(last().text).toContain('Still open:'); expect(last().text).toContain('Walk');
    clock = new Date('2026-10-07T04:10:00Z'); expect((await runDue(deps())).sent).toBe(1); expect(last().text).toContain('Nothing planned');   // next day
    void settings;
  });
  it('honours the app switches', async () => {
    const a = await link(1, 'fa'); await settings(a, { morning: false, evening: true }); clock = new Date('2026-10-06T04:05:00Z'); expect((await runDue(deps())).sent).toBe(0);
    clock = new Date('2026-10-06T18:35:00Z'); expect((await runDue(deps())).sent).toBe(1); expect(last().text).toContain('مرور شب');
  });
  it('a user who blocked the bot is unlinked instead of retried forever', async () => {
    await link(1, 'en'); clock = new Date('2026-10-06T04:05:00Z'); failWith = new TelegramError(403, 'Forbidden: bot was blocked by the user');
    expect(await runDue(deps())).toEqual({ sent: 0, failed: 1 }); expect((await ctx.db.query('select count(*)::int n from telegram_links')).rows[0].n).toBe(0);
  });
  it('a transient Telegram failure is not acknowledged, so the next tick retries', async () => {
    await link(1, 'en'); clock = new Date('2026-10-06T04:05:00Z'); failWith = new TelegramError(500, 'oops'); expect((await runDue(deps())).failed).toBe(1);
    failWith = null; expect((await runDue(deps())).sent).toBe(1);
  });
});

describe('webhook endpoint', () => {
  const env = { TELEGRAM_BOT_TOKEN: 't', TELEGRAM_WEBHOOK_SECRET: 'w'.repeat(32), BOT_SHARED_SECRET: SECRET, ORA_API_URL: 'http://x' } as Env;
  const hook = (secret: string | null, body: unknown = { message: { message_id: 1, chat: { id: -1, type: 'group' } } }) =>
    worker.fetch(new Request('https://w/webhook', { method: 'POST', headers: secret ? { 'x-telegram-bot-api-secret-token': secret } : {}, body: JSON.stringify(body) }), env, { waitUntil: () => {} });
  it('only accepts Telegram\'s secret header', async () => {
    expect((await hook(null)).status).toBe(403); expect((await hook('wrong')).status).toBe(403); expect((await hook('w'.repeat(31))).status).toBe(403); expect((await hook('w'.repeat(32))).status).toBe(200);
    expect((await worker.fetch(new Request('https://w/webhook', { method: 'POST', headers: { 'x-telegram-bot-api-secret-token': 'w'.repeat(32) }, body: 'not json' }), env, { waitUntil: () => {} })).status).toBe(400);
  });
  it('does not expose anything else, and refuses everything when the secret is unset', async () => {
    expect((await worker.fetch(new Request('https://w/other'), env, { waitUntil: () => {} })).status).toBe(404); expect((await worker.fetch(new Request('https://w/webhook'), env, { waitUntil: () => {} })).status).toBe(404);
    const noSecret = { ...env, TELEGRAM_WEBHOOK_SECRET: '' } as Env; expect((await worker.fetch(new Request('https://w/webhook', { method: 'POST', headers: { 'x-telegram-bot-api-secret-token': '' }, body: '{}' }), noSecret, { waitUntil: () => {} })).status).toBe(403);
  });
});
