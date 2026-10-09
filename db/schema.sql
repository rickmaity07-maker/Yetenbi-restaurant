-- Yetenbi table reservations. Applied by scripts/setup-db.mjs (safe to run repeatedly).

create table if not exists reservations (
  id          bigserial primary key,
  reference   text not null unique,              -- short code shown to the guest, e.g. YT-4K7Q
  date        date not null,
  time        text not null,                     -- HH:MM, Europe/Berlin wall clock
  guests      int  not null check (guests between 1 and 50),
  name        text not null,
  email       text not null,
  phone       text not null,
  note        text not null default '',
  locale      text not null default 'de' check (locale in ('de', 'en', 'am')),
  status      text not null default 'pending' check (status in ('pending', 'confirmed', 'declined', 'cancelled')),
  staff_note  text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists reservations_date_idx on reservations (date, time);
create index if not exists reservations_email_idx on reservations (lower(email), created_at);

-- Bookings taken by phone in /admin have no guest email and are marked 'phone'.
alter table reservations add column if not exists source text not null default 'website';

-- Days the restaurant is closed beyond the weekly hours (holidays, private events).
create table if not exists closures (
  date        date primary key,
  note        text not null default '',
  created_at  timestamptz not null default now()
);

-- Accounts: guests (profile, their bookings) and owners (admin). Passwords are scrypt hashes.
create table if not exists users (
  id             bigserial primary key,
  email          text not null unique,
  name           text not null,
  phone          text not null default '',
  password_hash  text not null,
  role           text not null default 'guest' check (role in ('guest', 'owner')),
  locale         text not null default 'de' check (locale in ('de', 'en', 'am')),
  created_at     timestamptz not null default now()
);

-- Sessions: only a SHA-256 of the cookie token is stored.
create table if not exists sessions (
  token_hash  text primary key,
  user_id     bigint not null references users (id) on delete cascade,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);
create index if not exists sessions_user_idx on sessions (user_id);

-- One-time password reset links (hash of the token, 1 hour).
create table if not exists password_resets (
  token_hash  text primary key,
  user_id     bigint not null references users (id) on delete cascade,
  expires_at  timestamptz not null
);

-- Bookings made while signed in belong to that account (kept if the account is deleted, without the link).
alter table reservations add column if not exists user_id bigint references users (id) on delete set null;
create index if not exists reservations_user_idx on reservations (user_id);

-- Accounts that sign in with Google (verified email); password_hash is "none" until they set one.
alter table users add column if not exists google_sub text unique;
