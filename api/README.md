# Ora — api

Node 22 · Fastify 5 · PostgreSQL (`pg`, plain SQL migrations) · zod · google-auth-library. Stateless; run any number of replicas.

```bash
cp .env.example .env     # DATABASE_URL, ALLOWED_ORIGINS, GOOGLE_CLIENT_ID, AUTH_MOCK (dev only)
npm run dev              # tsx watch; migrations run on startup under an advisory lock
npm test                 # real Postgres via DATABASE_URL_TEST
npm run build && npm start
```

## Configuration
| Variable | Default | Notes |
|---|---|---|
| `DATABASE_URL` | — (required) | |
| `PORT` / `HOST` | `8080` / `0.0.0.0` | on Railway use `HOST=::` so the private network (IPv6) reaches it |
| `ALLOWED_ORIGINS` | `http://localhost:5173` | comma separated; CSRF allow-list. Must not contain localhost in production |
| `GOOGLE_CLIENT_ID` | — | audience of Google ID tokens; without it `POST /auth/google` → 503 |
| `SESSION_TTL_DAYS` | `30` | sliding expiry |
| `MAX_RECORDS_PER_USER` | `20000` | growth cap (updates to existing records are always allowed) |
| `AUTH_MOCK` | `false` | dev/test only: accepts `mock:<id>:<name>`; the process refuses to start with it in production |

## HTTP API
All routes are behind the gateway at `/api/...` (the gateway strips `/api`). Errors are `{ "error": "<code>" }`.

| Method & path | Auth | |
|---|---|---|
| `GET /healthz`, `GET /readyz` | – | liveness; readiness (DB ping) |
| `POST /auth/google` `{credential}` | – | verify Google ID token → upsert user → `Set-Cookie` session → `{user}` (401 invalid, 503 not configured) |
| `GET /auth/me` | cookie | `{user}` |
| `POST /auth/logout` | – | revoke session, clear cookie (204) |
| `GET /v1/sync?since=<cursor>&limit=≤500` | cookie | `{records[], cursor, hasMore}` — records changed after `cursor` |
| `POST /v1/sync` `{changes[≤200]}` | cookie | `{applied, rejected[], cursor}` |
| `DELETE /v1/account` | cookie | delete the user and all their data (204) |

State-changing requests must send an `Origin` in `ALLOWED_ORIGINS` (browsers do this automatically).

### Sync model
A change is `{collection, id, updatedAt, deleted?, data?}`, collections: `items events wishes bills savings goals activity settings`.
* **Last write wins** per record by `updatedAt` (client edit time). A strictly older change is *rejected* and the server's copy is returned so the client converges.
* `updatedAt` is clamped to *now + 60 s* so a wrong clock can't win forever. Deletes are tombstones (kept 90 days).
* `rev` (a global sequence) is the pull cursor. A user's pushes are serialized with an advisory lock so cursors never skip records.
* Limits: ≤ 200 changes per push, ≤ 16 KB per record, ≤ 1 MB body.

### Schema
`users`, `sessions` (hash only), `records (user_id, collection, id, data jsonb, updated_at, deleted, rev)` — see `migrations/`.
Add a new numbered `NNN_name.sql`; they run once, in order, in a transaction.
