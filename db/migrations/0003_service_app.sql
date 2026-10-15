-- 0003: the service app for waiters (Android phones and tablets): tables, table orders, kitchen tickets, app updates.

-- Service staff: take orders at the tables in the app; on the website they only see the download page.
alter table users drop constraint if exists users_role_check;
alter table users add constraint users_role_check check (role in ('guest', 'owner', 'kitchen', 'driver', 'service'));

-- The restaurant's tables, edited in /admin/service. id is stable so open checks keep their table when renamed.
create table if not exists dining_tables (
  id        text primary key,
  label     text not null,                            -- what the team calls it, e.g. "4" or "Fenster"
  area      text not null default '',                 -- e.g. "Innen", "Terrasse"
  seats     int  not null default 4 check (seats between 1 and 40),
  position  int  not null default 0,
  active    boolean not null default true             -- false: removed, kept for old checks
);
-- Yetenbi has four tables, numbered 1 to 4 (more can be added in /admin/service).
insert into dining_tables (id, label, area, seats, position)
select 't' || n, n::text, '', 4, n from generate_series(1, 4) as n
on conflict do nothing;

-- A check (Rechnung) per table visit. At most one open check per table.
create sequence if not exists table_check_seq;
create table if not exists table_checks (
  id             bigserial primary key,
  number         int  not null default nextval('table_check_seq'),
  table_id       text not null references dining_tables (id) on delete restrict,
  table_label    text not null,                     -- copied, so history keeps the name it had
  guests         int  not null default 2 check (guests between 1 and 40),
  note           text not null default '',
  status         text not null default 'open' check (status in ('open', 'paid', 'void')),
  rounds         int  not null default 0,           -- how many times something was sent to the kitchen
  opened_by      bigint references users (id) on delete set null,
  opened_by_name text not null default '',
  opened_at      timestamptz not null default now(),
  closed_at      timestamptz,
  closed_by_name text not null default '',
  payment        text check (payment in ('cash', 'card')),
  total          numeric(8,2) not null default 0,   -- set when paid
  tip            numeric(8,2) not null default 0,
  given          numeric(8,2),                      -- cash handed over (for the change)
  updated_at     timestamptz not null default now()
);
create unique index if not exists table_checks_one_open on table_checks (table_id) where status = 'open';
create index if not exists table_checks_status_idx on table_checks (status, closed_at desc);

-- Every dish or drink on a check. Name and price are copied at the moment of ordering.
-- Food goes to the kitchen (sent -> ready -> served); drinks are made by the service (served at once).
create table if not exists table_check_items (
  id           bigserial primary key,
  check_id     bigint not null references table_checks (id) on delete cascade,
  round        int  not null,
  item_id      text not null,
  name         jsonb not null,                      -- {de, en, am}
  unit         numeric(8,2) not null check (unit >= 0),
  qty          int  not null check (qty between 1 and 99),
  note         text not null default '',            -- e.g. "ohne Zwiebeln", "extra scharf"
  kitchen      boolean not null default true,
  status       text not null default 'sent' check (status in ('sent', 'ready', 'served', 'void')),
  void_reason  text not null default '',
  added_by_name text not null default '',
  created_at   timestamptz not null default now(),
  ready_at     timestamptz,
  served_at    timestamptz
);
create index if not exists table_check_items_check_idx on table_check_items (check_id, round);
create index if not exists table_check_items_kitchen_idx on table_check_items (status) where kitchen;

-- App sign-ins are bearer tokens in the existing sessions table; this tells them apart from browser cookies.
alter table sessions add column if not exists kind text not null default 'web';

-- Online updates for the service app: one row per published version.
create table if not exists app_releases (
  id            bigserial primary key,
  version_code  int  not null unique,
  version_name  text not null,
  url           text not null,
  sha256        text not null,
  size_bytes    bigint not null,
  notes         text not null default '',
  notes_en      text not null default '',
  mandatory     boolean not null default false,     -- older versions are locked until they update
  published     boolean not null default true,
  created_at    timestamptz not null default now()
);
