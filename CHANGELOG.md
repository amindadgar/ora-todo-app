# Changelog

## 0.7.0 — Google Calendar and reminders
- api: read-only Google Calendar connection (OAuth code flow, refresh token AES-256-GCM encrypted, signed state), `/v1/gcal*`; Web Push (`/v1/push*`, VAPID); a minute scheduler that delivers reminders once (idempotent) to Web Push and to a Telegram outbox the Worker drains via `/bot/due`.
- web: *Settings → Reminders & calendar* (default lead time, notifications on this device, Connect Google Calendar); meetings appear on Home and in the Calendar agenda/dots and are avoided by the free-time suggestion; per-task "Remind me" in the edit sheet; new timed tasks get the default reminder.
- bot: sends queued reminders; cron is now every minute (redeploy the Worker).
- New env on the api: `GOOGLE_CLIENT_SECRET`, `TOKEN_KEY`, `PUBLIC_URL`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`. Calendar needs the Calendar API enabled and the redirect URI `<PUBLIC_URL>/api/v1/gcal/callback`.

## 0.6.0 — redesign pass
- Login: Google only, with three short value points; demo data is no longer offered on the login screen.
- Settings: grouped into Account, Appearance, Telegram, About and a single red "Delete my account and data" card. Removed the backup export/import, "Clear my data" and the duplicate main-calendar option (the Calendar tabs control it). Morning/evening switches appear only when Telegram is linked, tagged "Telegram only".
- Home: the phone header now has an avatar that opens Settings (theme/language live in Settings).
- Calendar: holiday fine print is a collapsible "About holiday dates".
- Key dates: next date highlighted, grouped into This month / Later. Wishlist: "Plan it" is a primary button.
- Goals and a new Insights screen (reports and the yearly review moved there).

## 0.5.0 — easy install to the home screen
- Install banner on Home (touch devices), *Settings → Install Ora*, and a login-screen link; native prompt on Chromium, step-by-step guides for iOS, Android, desktop Safari and in-app browsers (EN/FA).
- Richer manifest (id, scope, categories, any + maskable icons, "Add" shortcut), iOS home-screen icon and meta tags, correct manifest content type from the gateway.
- Platform detection is unit-tested (iPhone/iPad, Android, Firefox, WebViews, in-app browsers, desktop); a browser test covers each flow.

## 0.4.0 — Telegram bot
- New `bot/` Cloudflare Worker: webhook + cron. Type entries in English or Persian (same parser as the app), `/today` with ✓ buttons, `/lang`, `/stop`, Undo, morning brief (7:30) and evening review (22:00) in the user's time zone.
- api: Telegram link codes (one-time, hashed, 10 min), `/v1/telegram` for the app, `/bot/*` for the Worker (shared-secret auth), `/bot/due` + ack scheduling; push logic shared with `/v1/sync`.
- web: *Settings → Connect Telegram* (hidden unless the server has the bot configured); shared `buildEntry` used by the Add sheet and the bot.
- Tests: api 47, web 46, bot 18 (real api + Postgres), plus a full-stack browser test of the linking flow.

## 0.3.0 — backend and Railway deployment
- Monorepo: `web/` (frontend) and `api/` (backend), each with its own Dockerfile and `railway.json`.
- **api**: Fastify + PostgreSQL. Verifies Google ID tokens server-side, opaque cookie sessions (hash stored, `HttpOnly`/`Secure`/`SameSite`, `__Host-` in production),
  CSRF origin allow-list, rate limiting, zod validation, health/readiness endpoints, SQL migrations, account deletion.
- **Sync**: offline-first, per-record last-write-wins with tombstones and a pull cursor; the web app diffs its local store and syncs on change, focus, reconnect and every minute.
- **web** is now built by Docker and served by Caddy, which also proxies `/api/*` to the api over Railway's private network (one origin, strict CSP/HSTS).
- Client no longer trusts/decodes Google tokens; sign-in goes through the api. Settings shows sync status; added *Delete my account and data*.
- Railway project `ora`: Postgres + api + web, deployed from this branch.
- Tests: api 29 (real Postgres), web 43, browser suites for flows, login and multi-device sync.

## 0.2.0 — login flow
- Login screen (EN/FA, light/dark, phone → desktop): *Continue with Google* or *Try it with demo data*.
- Google accounts start empty and are stored in their own on-device namespace; the demo data keeps its original storage and stays unchanged.
- Greeting uses the Google account's first name; demo-only items (year-in-review card, "preview as new user", restore samples) are hidden for real accounts — *Clear my data* empties instead of restoring samples.
- Settings → Account: avatar, name, email, Sign out / Sign in with Google.
- Google Identity Services button when `VITE_GOOGLE_CLIENT_ID` is set; setup hint otherwise. Dev-only `?mockGoogle=<id>` test hook.
- Tests: 44 unit tests (incl. token decoding/validation) + login end-to-end script.

## 0.1.0 — first complete build
- Project: Vite + React + TypeScript PWA (installable, offline shell), self-hosted Figtree + Vazirmatn.
- Tokens transcribed from the Ora Design System v2.3 plugin (light + dark), type scale, spacing, radius, elevation, icons.
- English/Persian copy, Persian digits, RTL mirroring at every breakpoint.
- Responsive shell: phone (prototype), tablet, desktop with mirrored sidebar.
- Screens: Home, Add sheet (smart input), Edit sheet, Calendar (Jalali + Gregorian), Money, More, Key dates, Wishlist, Goals, Settings.
- Interactions: swipe complete/delete with undo, long-press edit, sheet drag-to-dismiss, month swipe, count-up/chart grow,
  strike-through, confetti, +1 floats, save-to-tab fly, circular theme reveal, splash; desktop ⋯ menus, right-click, shortcuts, wheel.
- Smart-input parser (EN/FA), Jalali calendar via jalaali-js, free-time suggestion, report charts computed from real completions.
- Data: IndexedDB, JSON export/import, undoable edits, sample data generated for the real current date.
- Tests: 39 unit tests + end-to-end interaction script.

### Differences from the prototype (intentional)
- "Today" is the real date (prototype was fixed at 6 Oct 2026); samples are generated relative to it.
- Goals charts are computed from completed tasks; the "year in review" card keeps the prototype's demo numbers.
- English expense categories recognise more words (fruit, bread, coffee…).
- Added Export/Import backup in Settings (new strings).
