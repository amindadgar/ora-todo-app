#!/usr/bin/env node
/**
 * Point Telegram at the deployed Worker and register the bot's command menu. Run once after `wrangler deploy` (safe to re-run).
 *
 *   TELEGRAM_BOT_TOKEN=... TELEGRAM_WEBHOOK_SECRET=... WORKER_URL=https://ora-bot.<you>.workers.dev  npm run set-webhook
 *   add --dry-run to print what would be sent (token redacted)
 *
 * The token is read from the environment only; it is never written anywhere.
 */
const { TELEGRAM_BOT_TOKEN: token, TELEGRAM_WEBHOOK_SECRET: secret, WORKER_URL: worker } = process.env;
const dry = process.argv.includes('--dry-run');
if (!token || !secret || !worker) { console.error('Set TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET and WORKER_URL.'); process.exit(1); }
if (secret.length < 24 || !/^[A-Za-z0-9_-]+$/.test(secret)) { console.error('TELEGRAM_WEBHOOK_SECRET must be 24+ chars of A-Z a-z 0-9 _ - (Telegram’s rule).'); process.exit(1); }
if (!worker.startsWith('https://')) { console.error('WORKER_URL must be https://…'); process.exit(1); }

const commands = {
  en: [['today', 'Your day — tap ✓ to finish tasks'], ['help', 'What I can do'], ['lang', 'Switch English / فارسی'], ['stop', 'Disconnect this chat']],
  fa: [['today', 'روز تو — برای انجام‌شدن ✓ را بزن'], ['help', 'کارهایی که بلدم'], ['lang', 'تغییر زبان English / فارسی'], ['stop', 'قطع اتصال این گفتگو']]
};
const toCmds = (l) => l.map(([command, description]) => ({ command, description }));
const calls = [
  ['setWebhook', { url: worker.replace(/\/$/, '') + '/webhook', secret_token: secret, allowed_updates: ['message', 'callback_query'], drop_pending_updates: true, max_connections: 10 }],
  ['setMyCommands', { commands: toCmds(commands.en) }],
  ['setMyCommands', { commands: toCmds(commands.fa), language_code: 'fa' }]
];
for (const [method, body] of calls) {
  if (dry) { console.log(method, JSON.stringify({ ...body, ...(body.secret_token ? { secret_token: '***' } : {}) })); continue; }
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  console.log(method, json.ok ? 'ok' : `FAILED: ${json.description ?? res.status}`); if (!json.ok) process.exit(1);
}
