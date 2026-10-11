import "server-only";
import { db } from "./db";
import { phoneKey } from "./order-guard";

/*
  Guests as one list: orders, reservations and accounts brought together by email address (or, without one,
  by phone number). Only what is stored anyway is shown (orders and reservations are deleted after 180 days).
*/

type Row = Record<string, unknown>;

const customerKey = (email: string, phone: string) => (email.trim() ? email.trim().toLowerCase() : `tel:${phoneKey(phone)}`);
export const encodeKey = (key: string) => Buffer.from(key).toString("base64url");
export const decodeKey = (v: string) => {
  try {
    return Buffer.from(v, "base64url").toString("utf8");
  } catch {
    return "";
  }
};

type CustomerOrder = { reference: string; createdAt: string; status: string; method: string; total: number };
type CustomerBooking = { reference: string; date: string; time: string; guests: number; status: string; source: string };

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

async function load() {
  const [orders, bookings, users, notes, blocks] = (await Promise.all([
    db()`select reference, created_at, status, method, total, name, email, phone, phone_key from orders order by created_at desc`,
    db()`select reference, date::text, time, guests, status, source, name, email, phone, created_at from reservations order by date desc, time desc`,
    db()`select email, name, phone, created_at from users where role = 'guest'`,
    db()`select key, note from customer_notes`,
    db()`select kind, value from order_blocks`,
  ])) as Row[][];

  const map = new Map<string, Customer>();
  const get = (key: string, name: string, email: string, phone: string, seen: string) => {
    let c = map.get(key);
    if (!c) {
      c = { key, name, email, phone, hasAccount: false, orders: [], bookings: [], revenue: 0, completed: 0, rejected: 0, lastSeen: seen, blocked: false, note: "" };
      map.set(key, c);
    }
    if (seen > c.lastSeen) c.lastSeen = seen;
    if (!c.email && email) c.email = email;
    if (!c.phone && phone) c.phone = phone;
    return c;
  };

  for (const o of orders) {
    const at = new Date(String(o.created_at)).toISOString();
    const c = get(customerKey(String(o.email), String(o.phone)), String(o.name), String(o.email), String(o.phone), at);
    c.orders.push({ reference: String(o.reference), createdAt: at, status: String(o.status), method: String(o.method), total: Number(o.total) });
    if (o.status === "completed") {
      c.completed++;
      c.revenue += Number(o.total);
    }
    if (o.status === "rejected" || o.status === "cancelled") c.rejected++;
  }
  for (const b of bookings) {
    const at = new Date(String(b.created_at)).toISOString();
    const c = get(customerKey(String(b.email), String(b.phone)), String(b.name), String(b.email), String(b.phone), at);
    c.bookings.push({ reference: String(b.reference), date: String(b.date), time: String(b.time), guests: Number(b.guests), status: String(b.status), source: String(b.source) });
  }
  for (const u of users) {
    const c = get(customerKey(String(u.email), ""), String(u.name), String(u.email), String(u.phone), new Date(String(u.created_at)).toISOString());
    c.hasAccount = true;
    if (u.name) c.name = String(u.name);
  }
  const noteBy = new Map(notes.map((n) => [String(n.key), String(n.note)]));
  const blocked = new Set(blocks.map((b) => `${b.kind}:${b.value}`));
  for (const c of map.values()) {
    c.note = noteBy.get(c.key) ?? "";
    c.blocked = (c.email !== "" && blocked.has(`email:${c.email.toLowerCase()}`)) || (c.phone !== "" && blocked.has(`phone:${phoneKey(c.phone)}`));
  }
  return [...map.values()];
}

export async function listCustomers(q: string) {
  const all = await load();
  const needle = q.trim().toLowerCase();
  const digits = needle.replace(/\D/g, "");
  return all
    .filter((c) => !needle || c.name.toLowerCase().includes(needle) || c.email.includes(needle) || (digits.length >= 4 && c.phone.replace(/\D/g, "").includes(digits)))
    .sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
}

export async function getCustomer(key: string) {
  return (await load()).find((c) => c.key === key) ?? null;
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
