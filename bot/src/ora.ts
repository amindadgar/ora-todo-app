/** Client for the Ora API's /bot/* endpoints (authenticated with a shared secret). */
export class OraError extends Error { constructor(public status: number, public code: string) { super(`${status} ${code}`); } }
export interface Rec { id: string; data: Record<string, unknown>; updatedAt: string }
export interface Change { collection: string; id: string; updatedAt: string; deleted?: boolean; data?: Record<string, unknown> }
export interface Due { chatId: number; lang: 'en' | 'fa'; tz: string; kind: 'morning' | 'evening'; localDate: string }
export type Lang = 'en' | 'fa';

export function oraClient(base: string, secret: string, f: typeof fetch = fetch) {
  const call = async <T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> => {
    const res = await f(base.replace(/\/$/, '') + path, { method, headers: { authorization: `Bearer ${secret}`, ...(body !== undefined ? { 'content-type': 'application/json' } : {}) }, body: body !== undefined ? JSON.stringify(body) : undefined });
    if (res.status === 204) return undefined as T;
    let json: unknown = null; try { json = await res.json(); } catch { /* proxy error page */ }
    if (!res.ok) throw new OraError(res.status, (json as { error?: string } | null)?.error ?? 'error');
    return json as T;
  };
  const notLinked = async <T>(p: Promise<T>): Promise<T | null> => { try { return await p; } catch (e) { if (e instanceof OraError && e.status === 404) return null; throw e; } };
  return {
    link: (code: string, chatId: number) => notLinked(call<{ name: string; lang: Lang; tz: string }>('POST', '/bot/link', { code, chatId })),
    me: (chatId: number) => notLinked(call<{ lang: Lang; tz: string }>('GET', `/bot/me?chatId=${chatId}`)),
    setLang: (chatId: number, lang: Lang) => call('POST', '/bot/lang', { chatId, lang }),
    unlink: (chatId: number) => call('POST', '/bot/unlink', { chatId }),
    records: async (chatId: number, collection: string, id?: string) => (await call<{ records: Rec[] }>('GET', `/bot/records?chatId=${chatId}&collection=${collection}${id ? `&id=${encodeURIComponent(id)}` : ''}`)).records,
    changes: (chatId: number, changes: Change[]) => call<{ applied: number }>('POST', '/bot/changes', { chatId, changes }),
    due: async () => (await call<{ due: Due[] }>('GET', '/bot/due')).due,
    ack: (d: Pick<Due, 'chatId' | 'kind' | 'localDate'>) => call('POST', '/bot/ack', d),
    /** Reminders ("In 10 min: …") the API queued for Telegram delivery. */
    reminders: async () => (await call<{ reminders?: { id: number; chatId: number; text: string }[] }>('GET', '/bot/due')).reminders ?? [],
    ackReminder: (id: number) => call('POST', '/bot/ack-reminder', { id })
  };
}
export type Ora = ReturnType<typeof oraClient>;
