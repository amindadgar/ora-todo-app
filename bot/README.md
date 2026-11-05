# Ora — Telegram bot (Cloudflare Worker)

A webhook-driven bot with no server of its own: Telegram POSTs each message to this Worker, and a cron trigger sends the morning brief / evening review.
It never touches the database — it talks to the Ora api's `/bot/*` endpoints with a shared secret.

**What it does** — for an account linked from *Ora → Settings → Connect Telegram*:
* **Type anything** ("dentist tomorrow 5pm", "۲۵۰ هزار تاکسی", "read 20 books") → parsed with the *same* smart-input code as the app (`web/src/lib`), saved, with an **Undo** button.
* **/today** → your day; tap **✓** to finish a task (it also feeds the Goals charts). **/lang**, **/help**, **/stop**.
* **Morning brief (7:30)** and **evening review (22:00)** in your own time zone, following the switches in Settings. Free-form times aren't supported (same as the app).

Cost: Cloudflare Workers free plan (100k requests/day, cron triggers included) and Telegram's free Bot API → **$0**. A 5-minute cron is ~290 invocations/day.

## Deploy (one time)

1. **Create the bot** — in Telegram open **@BotFather** → `/newbot` → pick a name and a username (ends in `bot`). It gives you a **token**. (Keep it secret; it only ever goes into step 4/5 below, never into the repo or chat.)
2. **Make two random secrets** (locally):
   ```bash
   openssl rand -hex 32   # → BOT_SHARED_SECRET   (Worker ↔ api)
   openssl rand -hex 24   # → TELEGRAM_WEBHOOK_SECRET   (Telegram ↔ Worker)
   ```
3. **Tell the api** — in Railway, service **api** → Variables:
   `BOT_SHARED_SECRET=<first secret>` and `TELEGRAM_BOT_USERNAME=<bot username without @>`. (The api redeploys; until both are set the Telegram button is hidden.)
4. **Deploy the Worker**:
   ```bash
   cd bot && npm install && npx wrangler login
   npx wrangler secret put TELEGRAM_BOT_TOKEN        # paste the token when prompted
   npx wrangler secret put TELEGRAM_WEBHOOK_SECRET   # second secret
   npx wrangler secret put BOT_SHARED_SECRET         # first secret (same as in Railway)
   npx wrangler deploy                               # prints https://ora-bot.<your-subdomain>.workers.dev
   ```
   If your site isn't `ora.amindadgar.com`, edit `ORA_API_URL` in `wrangler.toml` first (it must be the public `…/api` URL).
5. **Point Telegram at it** (also registers the `/` command menu in English and Persian):
   ```bash
   TELEGRAM_BOT_TOKEN=… TELEGRAM_WEBHOOK_SECRET=… WORKER_URL=https://ora-bot.<you>.workers.dev npm run set-webhook
   ```
6. In Ora open **Settings → Connect Telegram**, tap **Start** in the chat that opens.

## How it's secured
* The webhook only accepts requests carrying Telegram's `X-Telegram-Bot-Api-Secret-Token` (constant-time compare).
* The api's `/bot/*` endpoints require `Authorization: Bearer <BOT_SHARED_SECRET>` and refuse everything else — a browser session cookie can't call them.
* Linking uses a **one-time code** (24 chars, 10-minute life, stored hashed, consumed on use), created only from a signed-in session. One chat ↔ one account.
* Only private chats are handled; all message text is HTML-escaped before it is echoed back; a user who blocks the bot is unlinked automatically.

## Develop
```bash
npm test          # runs the Worker's logic against the REAL api + Postgres (needs the local test DB, see api/tests/helpers.ts); Telegram is faked
npm run typecheck
npx wrangler deploy --dry-run --outdir /tmp/bundle   # bundles without deploying
```
The parser, calendar and entry-building code is imported from `../web/src/lib` so the app and the bot can never disagree about what "tomorrow 5pm" means.

## Files
`src/index.ts` webhook + cron entry · `src/bot.ts` commands, parsing, /today, done, due messages · `src/ora.ts` api client · `src/telegram.ts` Bot API client · `scripts/set-webhook.mjs` one-time registration.
