import "server-only";
import { randomBytes, randomInt } from "node:crypto";
import type { Locale } from "@/lib/i18n";
import { DEFAULT_SETTINGS, ITEM_BY_ID, totals, type OrderInput, type OrderSettings, type OrderStatus } from "@/lib/ordering";
import { db } from "./db";

export type OrderLine = { id: string; name: string; qty: number; unit: number };
export type Order = {
  id: number;
  reference: string;
  statusToken: string;
  status: OrderStatus;
  method: "delivery" | "pickup";
  name: string;
  phone: string;
  email: string;
  street: string;
  postcode: string;
  city: string;
  addressNote: string;
  note: string;
  items: OrderLine[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  payment: "cash" | "card";
  wanted: string;
  etaMinutes: number | null;
  staffNote: string;
  locale: Locale;
  createdAt: string;
  updatedAt: string;
};

type Row = Record<string, unknown>;
const toOrder = (r: Row): Order => ({
  id: Number(r.id),
  reference: String(r.reference),
  statusToken: String(r.status_token),
  status: r.status as OrderStatus,
  method: r.method as Order["method"],
  name: String(r.name),
  phone: String(r.phone),
  email: String(r.email),
  street: String(r.street),
  postcode: String(r.postcode),
  city: String(r.city),
  addressNote: String(r.address_note),
  note: String(r.note),
  items: r.items as OrderLine[],
  subtotal: Number(r.subtotal),
  deliveryFee: Number(r.delivery_fee),
  total: Number(r.total),
  payment: r.payment as Order["payment"],
  wanted: String(r.wanted),
  etaMinutes: r.eta_minutes == null ? null : Number(r.eta_minutes),
  staffNote: String(r.staff_note),
  locale: r.locale as Locale,
  createdAt: new Date(String(r.created_at)).toISOString(),
  updatedAt: new Date(String(r.updated_at)).toISOString(),
});

/* ---------- settings ---------- */

export async function getOrderSettings(): Promise<OrderSettings> {
  const [row] = (await db()`select value from settings where key = 'ordering'`) as { value: Partial<OrderSettings> }[];
  return { ...DEFAULT_SETTINGS, ...(row?.value ?? {}) };
}

export async function saveOrderSettings(s: OrderSettings) {
  await db()`
    insert into settings (key, value, updated_at) values ('ordering', ${JSON.stringify(s)}::jsonb, now())
    on conflict (key) do update set value = excluded.value, updated_at = now()
  `;
}

/* ---------- orders ---------- */

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newReference = () => "YO-" + Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");

/** Stores a validated order. Names and prices come from the menu on the server, never from the browser. */
export async function createOrder(input: OrderInput, settings: OrderSettings, locale: Locale, userId: number | null) {
  const lines: OrderLine[] = input.items.map((l) => {
    const item = ITEM_BY_ID.get(l.id)!;
    return { id: l.id, name: item.name.de, qty: l.qty, unit: item.price };
  });
  const t = totals(input.items, input.method, settings);
  const delivery = input.method === "delivery";
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const [row] = (await db()`
        insert into orders (reference, status_token, method, name, phone, email, street, postcode, city, address_note, note,
                            items, subtotal, delivery_fee, total, payment, wanted, locale, user_id)
        values (${newReference()}, ${randomBytes(18).toString("base64url")}, ${input.method}, ${input.name.trim()}, ${input.phone.trim()},
                ${input.email.trim().toLowerCase()}, ${delivery ? input.street.trim() : ""}, ${delivery ? input.postcode.trim() : ""},
                ${delivery ? input.city.trim() || "Würzburg" : ""}, ${delivery ? input.addressNote.trim() : ""}, ${input.note.trim()},
                ${JSON.stringify(lines)}::jsonb, ${t.subtotal}, ${t.fee}, ${t.total}, ${input.payment}, ${input.wanted}, ${locale}, ${userId})
        returning *
      `) as Row[];
      return toOrder(row);
    } catch (error) {
      if (!(error instanceof Error && /unique/i.test(error.message))) throw error;
    }
  }
  throw new Error("Could not allocate an order reference.");
}

/** Recent orders for the flood check (per phone number, last hour). */
export async function recentOrdersByPhone(phone: string) {
  const [row] = (await db()`
    select count(*)::int as n from orders where phone = ${phone.trim()} and created_at > now() - interval '1 hour'
  `) as { n: number }[];
  return row.n;
}

/** Today's and still-open orders for the admin board, newest first. */
export async function listActiveOrders() {
  const rows = (await db()`
    select * from orders
    where status in ('new', 'accepted', 'ready', 'on_the_way')
       or created_at > (now() at time zone 'Europe/Berlin')::date at time zone 'Europe/Berlin'
    order by created_at desc
  `) as Row[];
  return rows.map(toOrder);
}

export async function findOrder(reference: string, token: string) {
  const [row] = (await db()`select * from orders where reference = ${reference} and status_token = ${token}`) as Row[];
  return row ? toOrder(row) : null;
}

export async function listOrdersForUser(userId: number) {
  const rows = (await db()`select * from orders where user_id = ${userId} order by created_at desc limit 30`) as Row[];
  return rows.map(toOrder);
}

export async function setOrderStatus(id: number, status: OrderStatus, eta: number | null, staffNote: string) {
  const [row] = (await db()`
    update orders set status = ${status}, eta_minutes = coalesce(${eta}, eta_minutes), staff_note = ${staffNote}, updated_at = now()
    where id = ${id} returning *
  `) as Row[];
  return row ? toOrder(row) : null;
}

/** Data retention: orders older than 180 days are removed. */
export async function purgeOldOrders() {
  await db()`delete from orders where created_at < now() - interval '180 days'`;
}
