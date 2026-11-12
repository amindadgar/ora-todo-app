-- Google Calendar (read-only): one link per account. The refresh token is stored AES-256-GCM encrypted.
create table gcal_links (
  user_id        uuid primary key references users(id) on delete cascade,
  refresh_enc    text not null,
  connected_at   timestamptz not null default now(),
  events_cache   jsonb not null default '[]',
  fetched_at     timestamptz
);
-- Web Push subscriptions (one per browser/device) and the time zone/language to word notifications in.
create table push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  tz         text not null default 'UTC',
  lang       text not null default 'en' check (lang in ('en', 'fa')),
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on push_subscriptions (user_id);
-- Which reminders were already delivered (idempotency across scheduler ticks and restarts).
create table reminder_sent (
  user_id uuid not null references users(id) on delete cascade,
  key     text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, key)
);
-- Telegram reminders waiting for the Worker to pick up (it polls /bot/due).
create table reminder_outbox (
  id         bigserial primary key,
  user_id    uuid not null references users(id) on delete cascade,
  chat_id    bigint not null,
  text       text not null,
  created_at timestamptz not null default now()
);
