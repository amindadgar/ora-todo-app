# Ora

A calm, bilingual daily planner — English (LTR) and Persian (RTL), light/dark, Jalali + Gregorian calendars.
Local-first PWA with an optional account: sign in with Google and your data syncs across devices.

**Design:** Yeganeh Akbari — [Behance](https://www.behance.net/yeganehakbarish) · [Dribbble](https://dribbble.com/yeganeh-akbari-sh)
**Implementation:** Amin Dadgar

## Architecture

```
            browser (PWA, offline-first: IndexedDB is the source of truth on the device)
                │  https, one origin
                ▼
   ┌──────────────────────────┐        Railway private network        ┌───────────────────────┐      ┌──────────────┐
   │ web  (Caddy)             │  /api/* ───────────────────────────▶  │ api  (Node + Fastify) │ ───▶ │  PostgreSQL  │
   │  • serves the built app  │   (prefix stripped)                    │  • verifies Google    │      │  users       │
   │  • security headers/CSP  │                                        │    ID tokens          │      │  sessions    │
   │  • gateway → api         │                                        │  • cookie sessions    │      │  records     │
   └──────────────────────────┘                                        │  • sync (pull/push)   │      └──────────────┘
                                                                       └───────────────────────┘
```

| Dir | Service | What it does |
|---|---|---|
| [`web/`](web/) | **web** | React + TypeScript PWA, built to static files and served by Caddy, which also reverse-proxies `/api/*` to the api service (same origin → no CORS, cookies "just work"). |
| [`api/`](api/) | **api** | Stateless Node/Fastify service: Google sign-in, sessions, and the sync API. Only reachable through the gateway (private network). |
| (Railway) | **Postgres** | Managed database (Railway template) with a persistent volume. |

Why this split: the frontend is static and cacheable, the API is stateless and horizontally scalable, and the database is isolated on the
private network. The api is never exposed publicly, so its attack surface is only what the gateway forwards.

### Accounts and data
* **Demo** — exactly the sample data from the design; stays on the device only. No server involved.
* **Google account** — starts empty. The browser gets a Google ID token, the **api verifies it** (signature, issuer, audience, expiry,
  verified email) and starts a session: an opaque random token in an `HttpOnly`, `Secure`, `SameSite=Lax` cookie (`__Host-` prefixed in production);
  only its SHA-256 hash is stored.
* **Sync** — every task/goal/key date/… is one record. The app works fully offline on its local copy; when online it pushes changes since the
  last sync and pulls what other devices changed (per-record **last write wins**, tombstones for deletes, a server cursor for pulls). Language and theme
  are device-local and not synced. Details: [`api/README.md`](api/README.md).

### Security notes
CSRF: state-changing requests must carry an allowed `Origin`. Rate limiting (global + stricter on sign-in). Input validated with zod, bodies ≤ 1 MB,
records ≤ 16 KB, per-user record cap. Sessions expire (30 days, sliding) and can be revoked (sign-out, account deletion). Caddy sets a strict CSP
(only Google's sign-in script/frames are allowed besides itself), HSTS, `nosniff`, no framing. Secrets only live in Railway variables.

## Run it locally

Requirements: Node 20+, PostgreSQL 14+ (or Docker).

```bash
# 1. a database
createdb ora_dev            # or: docker run -e POSTGRES_HOST_AUTH_METHOD=trust -p 5432:5432 postgres:16

# 2. api (http://localhost:8080)  — migrations run on start
cd api && npm install && cp .env.example .env     # edit DATABASE_URL (and GOOGLE_CLIENT_ID if you have one)
set -a && . ./.env && set +a && npm run dev

# 3. web (http://localhost:5173) — Vite proxies /api to the api, like the Caddy gateway does in production
cd web && npm install && cp .env.example .env.local && npm run dev
```

With `AUTH_MOCK=true` (api) you can try the account flow without Google: open `http://localhost:5173/?mockGoogle=anyname` and press
*Continue with Google*. This is refused when `NODE_ENV=production` and the web part is stripped from production builds.

Tests: `cd api && npm test` (needs `DATABASE_URL_TEST`, default `postgres://ora@127.0.0.1:5433/ora_test`), `cd web && npm test`,
and full-stack browser checks in `web/e2e/` (`reset-db.sh`, `flows.cjs`, `login.cjs`, `sync.cjs`).

## Deploy on Railway

One Railway project with three services, all in the same environment:

| Service | Source | Root dir | Variables |
|---|---|---|---|
| **Postgres** | Railway Postgres template | — | (generated) |
| **api** | this repo | `/api` | `DATABASE_URL=${{Postgres.DATABASE_URL}}`, `NODE_ENV=production`, `PORT=8080`, `HOST=::`, `ALLOWED_ORIGINS=https://<web domain>`, `GOOGLE_CLIENT_ID=<id>` |
| **web** | this repo | `/web` | `PORT=8080`, `API_UPSTREAM=http://api.railway.internal:8080`, `VITE_GOOGLE_CLIENT_ID=<id>` (build-time, public) |

Only **web** gets a public domain. Each service builds from its own `Dockerfile` and has a `railway.json` (health checks: api `/healthz`, web `/`).
Push to the connected branch and Railway redeploys. `/readyz` on the api checks the database.

### Keeping it cheap (3–4 users)
The stack is tuned to idle at roughly **150–170 MB RAM and ~0 CPU** in total (measured on Railway: Postgres ≈ 105 MB, web ≈ 28 MB, api ≈ 26 MB).
Railway bills memory/CPU by actual use plus the volume, so the expected bill is only a few dollars a month (≈ $2–3 at current Railway rates — check
the Usage page for your real number).

| Setting | Value | Why |
|---|---|---|
| Memory / CPU limits | api 0.25 GB · 0.5 vCPU, web 0.15 GB · 0.25 vCPU, Postgres 0.5 GB · 0.5 vCPU | safety caps: a bug or traffic spike can't run up the bill |
| `DB_POOL_MAX` (api) | `3` | fewer idle connections → less memory in Postgres too |
| `NODE_OPTIONS` (api) | `--max-old-space-size=96` | keeps Node's heap small |
| `LOG_LEVEL` (api) | `warn` | much less log volume |
| Replicas / regions | 1 / one region | no HA — fine for a personal app |
| Watch paths | `/api/**`, `/web/**` | a change in one folder doesn't rebuild the other service |
| Client polling | only while the tab is visible | background tabs don't keep the api and database busy |

Not enabled on purpose: **Serverless/app sleeping** (it would save well under a dollar but adds cold starts, and a sleeping private-network api
may not wake reliably behind the gateway), and **PR deploys**. The 5 GB Postgres volume is Railway's default size. As a last line of defence, set a
**usage limit** in the Railway dashboard (*Workspace → Usage → hard limit*, e.g. $5) so spending can never exceed what you choose.

### Google sign-in
1. Google Cloud Console → *APIs & Services → Credentials → OAuth client ID → Web application*.
2. *Authorized JavaScript origins*: your web domain (and `http://localhost:5173` for development).
3. Put the **same client ID** in `GOOGLE_CLIENT_ID` (api) and `VITE_GOOGLE_CLIENT_ID` (web), then redeploy web (it is baked in at build time).
Without it the demo path works and the Google button shows a setup hint.
