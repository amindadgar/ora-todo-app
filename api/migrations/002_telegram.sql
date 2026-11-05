-- Telegram bot: one linked chat per account, plus short-lived one-time link codes (only hashes stored).
create table telegram_links (
  user_id      uuid primary key references users(id) on delete cascade,
  chat_id      bigint not null unique,
  tz           text not null default 'UTC',
  lang         text not null default 'en' check (lang in ('en', 'fa')),
  morning_sent date,
  evening_sent date,
  linked_at    timestamptz not null default now()
);

create table telegram_link_codes (
  code_hash  bytea primary key,
  user_id    uuid not null references users(id) on delete cascade,
  tz         text not null,
  lang       text not null check (lang in ('en', 'fa')),
  expires_at timestamptz not null
);
create index telegram_link_codes_user_idx on telegram_link_codes (user_id);
