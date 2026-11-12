import webpush from 'web-push';
import type { Db } from './db.js';
import type { Config } from './config.js';
import { meetingsFor } from './routes/gcal.js';
import { localParts } from './telegram/time.js';
import { gcalEnabled } from './gcal.js';
import { pushEnabled } from './routes/push.js';

/** Julian Day Number (the app's `Day`) → proleptic Gregorian date. */
export function jdnToGregorian(jdn: number): { y: number; m: number; d: number } {
  const a = jdn + 32044, b = Math.floor((4 * a + 3) / 146097), c = a - Math.floor((146097 * b) / 4), d = Math.floor((4 * c + 3) / 1461), e = c - Math.floor((1461 * d) / 4), m = Math.floor((5 * e + 2) / 153);
  return { d: e - Math.floor((153 * m + 2) / 5) + 1, m: m + 3 - 12 * Math.floor(m / 10), y: 100 * b + d - 4800 + Math.floor(m / 10) };
}
export const gregorianToJdn = (y: number, m: number, d: number) => { const a = Math.floor((14 - m) / 12), yy = y + 4800 - a, mm = m + 12 * a - 3; return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045; };

const offsetMs = (at: number, tz: string) => { const p = localParts(new Date(at), tz); const [y, mo, d] = p.date.split('-').map(Number) as [number, number, number]; return Date.UTC(y, mo - 1, d, 0, p.minutes) - Math.floor(at / 60000) * 60000; };
/** The UTC instant of a wall-clock time (date + minutes since midnight) in a time zone. */
export function zonedToUtc(date: { y: number; m: number; d: number }, minutes: number, tz: string): Date {
  const guess = Date.UTC(date.y, date.m - 1, date.d, 0, minutes);
  let t = guess - offsetMs(guess, tz); t = guess - offsetMs(t, tz);
  return new Date(t);
}

const FA = '۰۱۲۳۴۵۶۷۸۹';
const faDigits = (s: string) => s.replace(/\d/g, (d) => FA[+d]!);
export function reminderText(lang: 'en' | 'fa', title: string, hm: string, minutes: number): string {
  if (lang === 'fa') return `${minutes > 0 ? faDigits(String(minutes)) + ' دقیقهٔ دیگر' : 'الان'}: ${title} · ${faDigits(hm)}`;
  return `${minutes > 0 ? `In ${minutes} min` : 'Now'}: ${title} · ${hm}`;
}
const titleOf = (t: unknown, lang: 'en' | 'fa'): string => typeof t === 'string' ? t : t && typeof t === 'object' ? String((t as Record<string, unknown>)[lang] ?? (t as Record<string, unknown>).en ?? (t as Record<string, unknown>).fa ?? '') : '';
const hm = (at: Date, tz: string) => { const m = localParts(at, tz).minutes; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };

export interface PushSub { endpoint: string; p256dh: string; auth: string }
export interface Deps { send?: (sub: PushSub, payload: string) => Promise<void>; fetch?: typeof fetch }

export function setupPush(cfg: Config) { if (pushEnabled(cfg)) webpush.setVapidDetails(cfg.VAPID_SUBJECT, cfg.VAPID_PUBLIC_KEY!, cfg.VAPID_PRIVATE_KEY!); }
const defaultSend = async (s: PushSub, payload: string) => { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 600 }); };

/** One scheduler tick: find reminders whose moment has come and deliver each exactly once (Web Push + Telegram outbox). */
export async function runReminders(db: Db, cfg: Config, now: Date, deps: Deps = {}): Promise<{ delivered: number }> {
  const send = deps.send ?? defaultSend; let delivered = 0;
  const users = await db.query<{ user_id: string }>('select user_id from push_subscriptions union select user_id from telegram_links');
  for (const { user_id: uid } of users.rows) {
    const subs = (await db.query<PushSub & { tz: string; lang: 'en' | 'fa' }>('select endpoint, p256dh, auth, tz, lang from push_subscriptions where user_id = $1', [uid])).rows;
    const tg = (await db.query<{ chat_id: string; tz: string; lang: 'en' | 'fa' }>('select chat_id, tz, lang from telegram_links where user_id = $1', [uid])).rows[0];
    const tz = tg?.tz ?? subs[0]?.tz ?? 'UTC';
    const due: { key: string; title: (l: 'en' | 'fa') => string; at: Date; minutes: number }[] = [];

    // 1) the user's own reminders (items with `remind` minutes before their time)
    const lp = localParts(now, tz); const [y, mo, d] = lp.date.split('-').map(Number) as [number, number, number]; const j = gregorianToJdn(y, mo, d);
    const items = await db.query<{ id: string; data: { day: number; time: string; remind: number; title: unknown } }>(
      `select id, data from records where user_id = $1 and collection = 'items' and not deleted and data->>'remind' is not null and coalesce(data->>'done', 'false') <> 'true'
         and data->>'time' ~ '^[0-9]{1,2}:[0-9]{2}$' and (data->>'day')::bigint between $2 and $3`, [uid, j - 1, j + 1]);
    for (const it of items.rows) {
      const [h, m] = it.data.time.split(':').map(Number) as [number, number]; const at = zonedToUtc(jdnToGregorian(it.data.day), h * 60 + m, tz); const mins = Math.max(0, Number(it.data.remind) || 0);
      due.push({ key: `item:${it.id}:${it.data.day}:${it.data.time}:${mins}`, title: (l) => titleOf(it.data.title, l), at, minutes: mins });
    }
    // 2) Google Calendar meetings, with the account's default lead time (0 = off)
    if (gcalEnabled(cfg)) {
      const s = await db.query<{ v: string | null }>(`select data->>'remindDefault' as v from records where user_id = $1 and collection = 'settings' and id = 'main' and not deleted`, [uid]);
      const lead = s.rows[0]?.v == null ? 10 : Number(s.rows[0].v) || 0;
      if (lead > 0) for (const ev of (await meetingsFor(db, cfg, uid, now, deps.fetch)) ?? []) due.push({ key: `gcal:${ev.id}:${ev.start}:${lead}`, title: () => ev.title || '·', at: new Date(ev.start), minutes: lead });
    }

    for (const x of due) {
      const from = x.at.getTime() - x.minutes * 60_000, to = x.minutes > 0 ? x.at.getTime() : x.at.getTime() + 5 * 60_000;
      if (now.getTime() < from || now.getTime() >= to) continue;
      const claim = await db.query('insert into reminder_sent (user_id, key) values ($1, $2) on conflict do nothing returning 1', [uid, x.key]); if (!claim.rowCount) continue;
      const minsLeft = Math.max(0, Math.ceil((x.at.getTime() - now.getTime()) / 60_000));
      for (const sub of subs) {
        const body = reminderText(sub.lang, x.title(sub.lang), hm(x.at, sub.tz), x.minutes > 0 ? minsLeft : 0);
        try { await send(sub, JSON.stringify({ title: 'Ora', body, tag: x.key })); delivered++; }
        catch (e) { const code = (e as { statusCode?: number }).statusCode; if (code === 404 || code === 410) await db.query('delete from push_subscriptions where endpoint = $1', [sub.endpoint]); }
      }
      if (tg) { await db.query('insert into reminder_outbox (user_id, chat_id, text) values ($1, $2, $3)', [uid, tg.chat_id, reminderText(tg.lang, x.title(tg.lang), hm(x.at, tg.tz), x.minutes > 0 ? minsLeft : 0)]); delivered++; }
    }
  }
  await db.query(`delete from reminder_sent where sent_at < now() - interval '3 days'`);
  await db.query(`delete from reminder_outbox where created_at < now() - interval '1 day'`);
  return { delivered };
}
