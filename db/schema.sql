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
