import "server-only";
import { db } from "./db";
import { phoneKey } from "./order-guard";

/*
  Guests as one list: orders, reservations and accounts brought together by email address (or, without one,
  by phone number). Only what is stored anyway is shown (orders and reservations are deleted after 180 days).
*/

type Row = Record<string, unknown>;

const customerKey = (email: string, phone: string) =>
  email.trim() ? email.trim().toLowerCase() : `tel:${phoneKey(phone)}`;
export const encodeKey = (key: string) => Buffer.from(key).toString("base64url");
export const decodeKey = (encoded: string) => {
  try {
    return Buffer.from(encoded, "base64url").toString("utf8");
  } catch {
    return "";
  }
};

type CustomerOrder = { reference: string; createdAt: string; status: string; method: string; total: number };
type CustomerBooking = {
  reference: string;
  date: string;
  time: string;
  guests: number;
  status: string;
  source: string;
};

type Customer = {
  key: string;
  name: string;
  email: string;
  phone: string;
  hasAccount: boolean;
  orders: CustomerOrder[];
  bookings: CustomerBooking[];
  revenue: number;
  completed: number;
  rejected: number;
  lastSeen: string;
  blocked: boolean;
  note: string;
};

/** Builds the guest list from everything stored: orders, bookings, guest accounts, team notes and blocks. */
async function load() {
  const [orderRows, bookingRows, accountRows, noteRows, blockRows] = (await Promise.all([
    db()`select reference, created_at, status, method, total, name, email, phone, phone_key from orders order by created_at desc`,
    db()`select reference, date::text, time, guests, status, source, name, email, phone, created_at from reservations order by date desc, time desc`,
    db()`select email, name, phone, created_at from users where role = 'guest'`,
    db()`select key, note from customer_notes`,
    db()`select kind, value from order_blocks`,
  ])) as Row[][];

  const customers = new Map<string, Customer>();

  /** The customer for this email (or phone), created on first sight. Keeps the latest activity date. */
  function customerFor(row: Row, seenAt: string, phone = String(row.phone ?? "")) {
    const email = String(row.email ?? "");
    const key = customerKey(email, phone);
    let customer = customers.get(key);
    if (!customer) {
      customer = {
        key,
        name: String(row.name),
        email,
        phone,
        hasAccount: false,
        orders: [],
        bookings: [],
        revenue: 0,
        completed: 0,
        rejected: 0,
        lastSeen: seenAt,
        blocked: false,
        note: "",
      };
      customers.set(key, customer);
    }
    if (seenAt > customer.lastSeen) customer.lastSeen = seenAt;
    if (!customer.email && email) customer.email = email;
    if (!customer.phone && phone) customer.phone = phone;
    return customer;
  }

  for (const order of orderRows) {
    const createdAt = new Date(String(order.created_at)).toISOString();
    const customer = customerFor(order, createdAt);
    customer.orders.push({
      reference: String(order.reference),
      createdAt,
      status: String(order.status),
      method: String(order.method),
      total: Number(order.total),
    });
    if (order.status === "completed") {
      customer.completed++;
      customer.revenue += Number(order.total);
    }
    if (order.status === "rejected" || order.status === "cancelled") customer.rejected++;
  }

  for (const booking of bookingRows) {
    const customer = customerFor(booking, new Date(String(booking.created_at)).toISOString());
    customer.bookings.push({
      reference: String(booking.reference),
      date: String(booking.date),
      time: String(booking.time),
      guests: Number(booking.guests),
      status: String(booking.status),
      source: String(booking.source),
    });
  }

  // Accounts are matched by email only; the phone number on the account is just shown.
  for (const account of accountRows) {
    const customer = customerFor(account, new Date(String(account.created_at)).toISOString(), "");
    customer.hasAccount = true;
    if (!customer.phone && account.phone) customer.phone = String(account.phone);
    if (account.name) customer.name = String(account.name);
  }

  const notes = new Map(noteRows.map((note) => [String(note.key), String(note.note)]));
  const blocked = new Set(blockRows.map((block) => `${block.kind}:${block.value}`));
  for (const customer of customers.values()) {
    customer.note = notes.get(customer.key) ?? "";
    const emailBlocked = customer.email !== "" && blocked.has(`email:${customer.email.toLowerCase()}`);
    const phoneBlocked = customer.phone !== "" && blocked.has(`phone:${phoneKey(customer.phone)}`);
    customer.blocked = emailBlocked || phoneBlocked;
  }

  return [...customers.values()];
}

/** All guests, most recent first, optionally filtered by name, email or (4+ digits of the) phone number. */
export async function listCustomers(search: string) {
  const needle = search.trim().toLowerCase();
  const digits = needle.replace(/\D/g, "");
  const matches = (customer: Customer) =>
    !needle ||
    customer.name.toLowerCase().includes(needle) ||
    customer.email.includes(needle) ||
    (digits.length >= 4 && customer.phone.replace(/\D/g, "").includes(digits));

  return (await load()).filter(matches).sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
}

export async function getCustomer(key: string) {
  return (await load()).find((customer) => customer.key === key) ?? null;
}

export async function saveNote(key: string, note: string, by: string) {
  if (!note.trim()) {
    await db()`delete from customer_notes where key = ${key}`;
    return;
  }
  await db()`
    insert into customer_notes (key, note, updated_by) values (${key}, ${note}, ${by})
    on conflict (key) do update set note = excluded.note, updated_by = excluded.updated_by, updated_at = now()
  `;
}

/**
  Everything stored about a signed-in guest (DSGVO Art. 15/20): the account, orders and bookings, the team's note,
  order blocks, attempt counters and audit entries about them. Records matched only by email address (made while
  signed out) are included once the account has proved it owns that address, so nobody can register someone else's
  email and read their data.
*/
export async function personalData(user: { id: number; email: string }) {
  const email = user.email.toLowerCase();
  const [account] =
    (await db()`select id, email, name, phone, role, locale, email_verified, google_sub is not null as google, created_at from users where id = ${user.id}`) as Row[];
  const verified = Boolean(account?.email_verified);
  const [orders, reservations] = (await Promise.all([
    db()`
      select reference, created_at, status, method, name, phone, email, street, postcode, city, address_note, note, items,
             subtotal, deposit, delivery_fee, total, payment, wanted, eta_minutes, staff_note, locale,
             accepted_at, cooked_at, packed_at, out_at, completed_at, updated_at, client_hash is not null as device_hash_stored
      from orders where user_id = ${user.id} or (${verified} and lower(email) = ${email}) order by created_at desc`,
    db()`
      select reference, date::text, time, guests, name, email, phone, note, locale, status, staff_note, source, created_at, updated_at
      from reservations where user_id = ${user.id} or (${verified} and lower(email) = ${email}) order by date desc, time desc`,
  ])) as Row[][];
  const phoneKeys = [...new Set(orders.map((o) => phoneKey(String(o.phone))).filter(Boolean))];
  const references = [...orders, ...reservations].map((r) => String(r.reference));
  const [notes, blocks, attempts, audit] = (await Promise.all([
    verified ? db()`select note, updated_at, updated_by from customer_notes where key = ${email}` : Promise.resolve([]),
    db()`select kind, label, reason, created_at from order_blocks
         where (kind = 'email' and ${verified} and value = ${email}) or (kind = 'phone' and value = any(${phoneKeys}))`,
    verified
      ? db()`select bucket, created_at from rate_hits where key = ${email} order by created_at desc`
      : Promise.resolve([]),
    db()`select at, actor, role, area, action, target from audit_log
         where target = any(${references}) or (${verified} and lower(target) = ${email}) order by at desc`,
  ])) as Row[][];
  return {
    exportedAt: new Date().toISOString(),
    account,
    orders,
    reservations,
    teamNote: notes[0] ?? null,
    orderBlocks: blocks,
    signInAndResetAttempts: attempts,
    auditLog: audit,
    note: verified
      ? undefined
      : "Bestellungen und Reservierungen ohne Anmeldung sind nur enthalten, wenn das Konto seine E-Mail-Adresse bestätigt hat (z. B. über „Passwort vergessen“). Sonst schreibt uns bitte.",
  };
}

/** Removes what the team keeps about a guest under their email when they delete their account. */
export async function forgetEmail(email: string) {
  const key = email.toLowerCase();
  await db()`delete from customer_notes where key = ${key}`;
  await db()`delete from rate_hits where key = ${key}`;
}

/** Data retention: notes about guests of whom nothing else is stored any more (no account, order or booking left). */
export async function purgeOrphanNotes() {
  const live = new Set((await load()).map((c) => c.key));
  const notes = (await db()`select key from customer_notes`) as { key: string }[];
  const orphans = notes.map((n) => n.key).filter((k) => !live.has(k));
  if (orphans.length) await db()`delete from customer_notes where key = any(${orphans})`;
}
