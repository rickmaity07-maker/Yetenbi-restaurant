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

-- Online orders (delivery and pickup). Prices are computed on the server from the menu.
create table if not exists orders (
  id             bigserial primary key,
  reference      text not null unique,              -- e.g. YO-7KQ2
  status_token   text not null,                     -- secret part of the status-page link
  status         text not null default 'new' check (status in ('new', 'accepted', 'ready', 'on_the_way', 'completed', 'rejected', 'cancelled')),
  method         text not null check (method in ('delivery', 'pickup')),
  name           text not null,
  phone          text not null,
  email          text not null default '',
  street         text not null default '',
  postcode       text not null default '',
  city           text not null default '',
  address_note   text not null default '',
  note           text not null default '',
  items          jsonb not null,                    -- [{ id, name, qty, unit }]
  subtotal       numeric(8,2) not null,
  delivery_fee   numeric(8,2) not null default 0,
  total          numeric(8,2) not null,
  payment        text not null check (payment in ('cash', 'card')),
  wanted         text not null default 'asap',      -- 'asap' or HH:MM (today)
  eta_minutes    int,
  staff_note     text not null default '',
  locale         text not null default 'de' check (locale in ('de', 'en', 'am')),
  user_id        bigint references users (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists orders_created_idx on orders (created_at desc);
create index if not exists orders_user_idx on orders (user_id);

-- Small key/value settings edited in /admin (e.g. ordering: minimum order, fees, delivery area, pause).
create table if not exists settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

-- Abuse protection for online ordering.
-- client_hash: keyed hash of the visitor's IP address (never the IP itself), cleared after 30 days.
alter table orders add column if not exists client_hash text;
alter table orders add column if not exists phone_key text;
create index if not exists orders_client_idx on orders (client_hash, created_at);
create index if not exists orders_phone_key_idx on orders (phone_key, created_at);

-- Guests the team has blocked from ordering online (phone, email or device). Expire after one year.
create table if not exists order_blocks (
  id          bigserial primary key,
  kind        text not null check (kind in ('phone', 'email', 'client')),
  value       text not null,
  label       text not null default '',               -- what the team sees, e.g. the phone number or "Gerät von YO-7KQ2"
  reason      text not null default '',
  created_at  timestamptz not null default now(),
  unique (kind, value)
);

-- Staff roles: kitchen staff (see the food, mark it cooked and packed) and drivers (mark deliveries done).
alter table users drop constraint if exists users_role_check;
alter table users add constraint users_role_check check (role in ('guest', 'owner', 'kitchen', 'driver'));

-- Kitchen steps between "accepted" and handing the order out.
alter table orders drop constraint if exists orders_status_check;
alter table orders add constraint orders_status_check
  check (status in ('new', 'accepted', 'cooked', 'packed', 'ready', 'on_the_way', 'completed', 'rejected', 'cancelled'));

-- The driver an order was handed to, and when each step happened (shown on the boards).
alter table orders add column if not exists driver_id bigint references users (id) on delete set null;
alter table orders add column if not exists accepted_at timestamptz;
alter table orders add column if not exists cooked_at timestamptz;
alter table orders add column if not exists packed_at timestamptz;
alter table orders add column if not exists out_at timestamptz;
alter table orders add column if not exists completed_at timestamptz;
create index if not exists orders_driver_idx on orders (driver_id, status);

-- Attempt limits (sign-in, password reset, sign-up, bookings). key: email or a keyed hash of the IP. Kept one day.
create table if not exists rate_hits (
  bucket      text not null,
  key         text not null,
  created_at  timestamptz not null default now()
);
create index if not exists rate_hits_idx on rate_hits (bucket, key, created_at);

-- Whether the account has shown it owns its email (Google sign-in, a password-reset link, or created by the owner).
-- Linking Google to an unproven account removes its password, so whoever registered the address first loses access.
alter table users add column if not exists email_verified boolean not null default false;
update users set email_verified = true where role <> 'guest' and email_verified = false;
