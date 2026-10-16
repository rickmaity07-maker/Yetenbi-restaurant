-- 0004: service app, second round: seats and "later" courses, split bills, no double rounds, staff PINs,
-- receipts by QR code, feedback and crash reports from the app.

-- Each dish can belong to one guest's seat (null = for the table), and can wait until the waiter calls it ("held").
alter table table_check_items add column if not exists seat int check (seat between 1 and 40);
-- fired_at: when a held dish went to the kitchen; payment_id: set when paid in a split bill.
alter table table_check_items add column if not exists fired_at timestamptz;
alter table table_check_items add column if not exists payment_id bigint;
alter table table_check_items drop constraint if exists table_check_items_status_check;
alter table table_check_items add constraint table_check_items_status_check
  check (status in ('held', 'sent', 'ready', 'served', 'void'));

-- A round sent twice (bad Wi-Fi, the waiter taps again) is booked once: the app sends the same key both times.
create table if not exists table_round_keys (
  key        text primary key,
  check_id   bigint not null references table_checks (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Payments: one row per guest who pays (a check paid at once has one). The check closes when they add up.
create table if not exists table_check_payments (
  id         bigserial primary key,
  check_id   bigint not null references table_checks (id) on delete cascade,
  method     text not null check (method in ('cash', 'card')),
  amount     numeric(8,2) not null check (amount > 0),
  tip        numeric(8,2) not null default 0,
  given      numeric(8,2),
  label      text not null default '',                  -- e.g. "Platz 2" or "1/3"
  client_key text unique,                               -- the same payment sent twice is booked once
  by_name    text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists table_check_payments_check_idx on table_check_payments (check_id);

-- Every check paid so far gets its payment row, so the day's figures can come from payments alone.
insert into table_check_payments (check_id, method, amount, tip, given, by_name, created_at)
select c.id, c.payment, c.total, c.tip, c.given, c.closed_by_name, c.closed_at
from table_checks c
where c.status = 'paid' and c.payment is not null and c.total > 0
  and not exists (select 1 from table_check_payments p where p.check_id = c.id);

-- A paid check with more than one payment method.
alter table table_checks drop constraint if exists table_checks_payment_check;
alter table table_checks add constraint table_checks_payment_check check (payment in ('cash', 'card', 'mixed'));

-- The guest's copy of the bill, opened from a QR code in the app (/beleg/<token>).
alter table table_checks add column if not exists receipt_token text unique;

-- A 4-digit PIN to switch waiters on a shared phone or tablet (scrypt hash, set in /admin/team).
alter table users add column if not exists pin_hash text;

-- What testers write with "Send feedback" in the app, with a screenshot (JPEG, base64).
create table if not exists app_feedback (
  id          bigserial primary key,
  user_name   text not null default '',
  message     text not null default '',
  screen      text not null default '',
  screenshot  text,
  app_version text not null default '',
  device      text not null default '',
  done        boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Crashes reported by the app on its next start.
create table if not exists app_crashes (
  id          bigserial primary key,
  app_version text not null default '',
  device      text not null default '',
  android     text not null default '',
  trace       text not null,
  created_at  timestamptz not null default now()
);
