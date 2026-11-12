import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Config } from './config.js';

export interface Meeting { id: string; title: string; start: string; end: string }   // ISO 8601 instants

const key = (cfg: Config) => createHash('sha256').update('ora-gcal|' + (cfg.TOKEN_KEY ?? '')).digest();
export const gcalEnabled = (cfg: Config) => !!(cfg.GOOGLE_CLIENT_ID && cfg.GOOGLE_CLIENT_SECRET && cfg.TOKEN_KEY);
export const redirectUri = (cfg: Config) => `${(cfg.PUBLIC_URL ?? cfg.ALLOWED_ORIGINS[0] ?? '').replace(/\/$/, '')}/api/v1/gcal/callback`;

export function encrypt(cfg: Config, plain: string): string {
  const iv = randomBytes(12); const c = createCipheriv('aes-256-gcm', key(cfg), iv);
  const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString('base64url')).join('.');
}
export function decrypt(cfg: Config, token: string): string {
  const [iv, tag, enc] = token.split('.').map((x) => Buffer.from(x ?? '', 'base64url'));
  const d = createDecipheriv('aes-256-gcm', key(cfg), iv!); d.setAuthTag(tag!);
  return Buffer.concat([d.update(enc!), d.final()]).toString('utf8');
}

/** Signed, expiring OAuth `state` that binds the callback to the user who started it. */
export function signState(cfg: Config, userId: string, now: Date): string {
  const body = Buffer.from(JSON.stringify({ u: userId, e: now.getTime() + 10 * 60_000 })).toString('base64url');
  return body + '.' + createHmac('sha256', key(cfg)).update(body).digest('base64url');
}
export function verifyState(cfg: Config, state: string, now: Date): string | null {
  const [body, sig] = state.split('.'); if (!body || !sig) return null;
  const want = createHmac('sha256', key(cfg)).update(body).digest();
  const got = Buffer.from(sig, 'base64url'); if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
  try { const p = JSON.parse(Buffer.from(body, 'base64url').toString()) as { u: string; e: number }; return p.e > now.getTime() ? p.u : null; } catch { return null; }
}

export function authUrl(cfg: Config, state: string): string {
  const q = new URLSearchParams({ client_id: cfg.GOOGLE_CLIENT_ID!, redirect_uri: redirectUri(cfg), response_type: 'code', scope: 'https://www.googleapis.com/auth/calendar.readonly',
    access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true', state });
  return 'https://accounts.google.com/o/oauth2/v2/auth?' + q;
}

type Fetch = typeof fetch;
export async function exchangeCode(cfg: Config, code: string, f: Fetch = fetch): Promise<string> {
  const r = await f('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: cfg.GOOGLE_CLIENT_ID!, client_secret: cfg.GOOGLE_CLIENT_SECRET!, redirect_uri: redirectUri(cfg), grant_type: 'authorization_code' }) });
  const j = (await r.json()) as { refresh_token?: string }; if (!r.ok || !j.refresh_token) throw new Error('token_exchange_failed');
  return j.refresh_token;
}
async function accessToken(cfg: Config, refresh: string, f: Fetch): Promise<string> {
  const r = await f('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ refresh_token: refresh, client_id: cfg.GOOGLE_CLIENT_ID!, client_secret: cfg.GOOGLE_CLIENT_SECRET!, grant_type: 'refresh_token' }) });
  const j = (await r.json()) as { access_token?: string; error?: string }; if (!r.ok || !j.access_token) throw Object.assign(new Error(j.error ?? 'refresh_failed'), { revoked: j.error === 'invalid_grant' });
  return j.access_token;
}
/** Timed (not all-day), non-cancelled, non-declined events of the primary calendar in [from, to). */
export async function fetchMeetings(cfg: Config, refresh: string, from: Date, to: Date, f: Fetch = fetch): Promise<Meeting[]> {
  const at = await accessToken(cfg, refresh, f);
  const q = new URLSearchParams({ timeMin: from.toISOString(), timeMax: to.toISOString(), singleEvents: 'true', orderBy: 'startTime', maxResults: '100' });
  const r = await f('https://www.googleapis.com/calendar/v3/calendars/primary/events?' + q, { headers: { authorization: 'Bearer ' + at } });
  if (!r.ok) throw new Error('calendar_failed_' + r.status);
  const j = (await r.json()) as { items?: { id: string; status?: string; summary?: string; start?: { dateTime?: string }; end?: { dateTime?: string }; attendees?: { self?: boolean; responseStatus?: string }[] }[] };
  const out: Meeting[] = [];
  for (const e of j.items ?? []) {
    if (e.status === 'cancelled' || !e.start?.dateTime || !e.end?.dateTime) continue;
    if (e.attendees?.some((a) => a.self && a.responseStatus === 'declined')) continue;
    out.push({ id: e.id, title: (e.summary || '').slice(0, 200), start: new Date(e.start.dateTime).toISOString(), end: new Date(e.end.dateTime).toISOString() });
  }
  return out;
}
