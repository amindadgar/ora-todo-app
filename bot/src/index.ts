import { handleUpdate, runDue, type Deps, type Update } from './bot';
import { oraClient } from './ora';
import { telegramClient } from './telegram';

export interface Env { TELEGRAM_BOT_TOKEN: string; TELEGRAM_WEBHOOK_SECRET: string; BOT_SHARED_SECRET: string; ORA_API_URL: string }
interface Ctx { waitUntil(p: Promise<unknown>): void }

const deps = (env: Env): Deps => ({
  ora: oraClient(env.ORA_API_URL, env.BOT_SHARED_SECRET), tg: telegramClient(env.TELEGRAM_BOT_TOKEN), now: () => new Date(),
  uid: () => 'u' + Date.now().toString(36) + Math.floor(Math.random() * 1e4)
});
/** constant-time string compare */
function same(a: string, b: string) { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; }

export default {
  /** Telegram webhook: POST /webhook with the secret token header Telegram was told to send. */
  async fetch(req: Request, env: Env, ctx: Ctx): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === '/webhook' && req.method === 'POST') {
      if (!env.TELEGRAM_WEBHOOK_SECRET || !same(req.headers.get('x-telegram-bot-api-secret-token') ?? '', env.TELEGRAM_WEBHOOK_SECRET)) return new Response('forbidden', { status: 403 });
      let update: Update; try { update = (await req.json()) as Update; } catch { return new Response('bad request', { status: 400 }); }
      ctx.waitUntil(handleUpdate(update, deps(env)));          // answer Telegram immediately; handleUpdate never throws
      return new Response('ok');
    }
    return new Response(url.pathname === '/' ? 'ora-bot' : 'not found', { status: url.pathname === '/' ? 200 : 404 });
  },
  /** Cron: morning brief / evening review. */
  async scheduled(_event: unknown, env: Env, ctx: Ctx): Promise<void> { ctx.waitUntil(runDue(deps(env)).then((r) => { if (r.sent || r.failed) console.log('due', r); })); }
};
