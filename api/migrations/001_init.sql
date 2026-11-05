-- Ora API schema v1
create table users (
  id            uuid primary key default gen_random_uuid(),
  google_sub    text not null unique,
  email         text not null,
  name          text not null,
  picture       text,
  created_at    timestamptz not null default now(),
  last_login_at timestamptz not null default now()
);

-- Opaque session tokens: only the SHA-256 hash is stored.
create table sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  token_hash bytea not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  user_agent text
);
create index sessions_user_idx on sessions (user_id);
create index sessions_expires_idx on sessions (expires_at);

-- Every synced entity (task, key date, goal, setting, ...) is one row. `rev` is a monotonic pull cursor;
-- `updated_at` is the client's edit time and decides conflicts (last write wins). Deletes are tombstones.
create sequence records_rev_seq;
create table records (
  user_id    uuid not null references users(id) on delete cascade,
  collection text not null,
  id         text not null,
  data       jsonb,
  updated_at timestamptz not null,
  deleted    boolean not null default false,
  rev        bigint not null default nextval('records_rev_seq'),
  primary key (user_id, collection, id)
);
create index records_pull_idx on records (user_id, rev);
create index records_tombstone_idx on records (updated_at) where deleted;
