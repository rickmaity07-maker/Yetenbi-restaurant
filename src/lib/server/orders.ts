import "server-only";
import { randomBytes, randomInt } from "node:crypto";
import type { Locale } from "@/lib/i18n";
import { DEFAULT_SETTINGS, ITEM_BY_ID, OPEN_STATUSES, totals, type OrderInput, type OrderSettings, type OrderStatus } from "@/lib/ordering";
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
  hasAccount: boolean;
  driverId: number | null;
  /** Name of the driver (only filled by the board queries). */
  driverName?: string;
  acceptedAt: string | null;
  cookedAt: string | null;
  packedAt: string | null;
  outAt: string | null;
  completedAt: string | null;
  /** Warning labels for the admin board (only filled by listActiveOrders). */
  risk?: { completedBefore: number; rejectedBefore: number; blocked: boolean };
  createdAt: string;
  updatedAt: string;
};

type Row = Record<string, unknown>;
const iso = (v: unknown) => (v == null ? null : new Date(String(v)).toISOString());
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
  hasAccount: r.user_id != null,
  driverId: r.driver_id == null ? null : Number(r.driver_id),
  driverName: r.driver_name == null ? undefined : String(r.driver_name),
  acceptedAt: iso(r.accepted_at),
  cookedAt: iso(r.cooked_at),
  packedAt: iso(r.packed_at),
  outAt: iso(r.out_at),
  completedAt: iso(r.completed_at),
  risk:
    r.completed_before == null
      ? undefined
      : { completedBefore: Number(r.completed_before), rejectedBefore: Number(r.rejected_before), blocked: Boolean(r.blocked) },
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
export async function createOrder(
  input: OrderInput,
  settings: OrderSettings,
  locale: Locale,
  userId: number | null,
  guard: { phoneKey: string; clientHash: string | null },
) {
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
                            items, subtotal, delivery_fee, total, payment, wanted, locale, user_id, phone_key, client_hash)
        values (${newReference()}, ${randomBytes(18).toString("base64url")}, ${input.method}, ${input.name.trim()}, ${input.phone.trim()},
                ${input.email.trim().toLowerCase()}, ${delivery ? input.street.trim() : ""}, ${delivery ? input.postcode.trim() : ""},
                ${delivery ? input.city.trim() || "Würzburg" : ""}, ${delivery ? input.addressNote.trim() : ""}, ${input.note.trim()},
                ${JSON.stringify(lines)}::jsonb, ${t.subtotal}, ${t.fee}, ${t.total}, ${input.payment}, ${input.wanted}, ${locale}, ${userId},
                ${guard.phoneKey}, ${guard.clientHash})
        returning *
      `) as Row[];
      return toOrder(row);
    } catch (error) {
      if (!(error instanceof Error && /unique/i.test(error.message))) throw error;
    }
  }
  throw new Error("Could not allocate an order reference.");
}

/** Today's and still-open orders for the admin board, newest first, with warning labels. */
export async function listActiveOrders() {
  const rows = (await db()`
    select o.*, d.name as driver_name,
      (select count(*) from orders p where p.phone_key = o.phone_key and p.id <> o.id and p.status = 'completed')::int as completed_before,
      (select count(*) from orders p
        where p.id <> o.id and p.status in ('rejected', 'cancelled')
          and (p.phone_key = o.phone_key or p.client_hash = o.client_hash))::int as rejected_before,
      exists (select 1 from order_blocks b
        where (b.kind = 'phone' and b.value = o.phone_key)
           or (b.kind = 'email' and b.value = o.email and o.email <> '')
           or (b.kind = 'client' and b.value = o.client_hash)) as blocked
    from orders o left join users d on d.id = o.driver_id
    where o.status = any(${OPEN_STATUSES}::text[])
       or o.created_at > (now() at time zone 'Europe/Berlin')::date at time zone 'Europe/Berlin'
    order by o.created_at desc
  `) as Row[];
  return rows.map(toOrder);
}

/** What the kitchen works on: accepted, cooked and (today) packed orders, oldest first. */
export async function listKitchenOrders() {
  const rows = (await db()`
    select * from orders
    where status in ('accepted', 'cooked')
       or (status = 'packed' and created_at > now() - interval '12 hours')
    order by created_at
  `) as Row[];
  return rows.map(toOrder);
}

/** A driver's deliveries: on the way, plus what they delivered today. Owners (driverId null) see every driver's. */
export async function listDriverOrders(driverId: number | null) {
  const rows = (await db()`
    select o.*, d.name as driver_name from orders o left join users d on d.id = o.driver_id
    where o.method = 'delivery'
      and (${driverId}::bigint is null or o.driver_id = ${driverId})
      and (o.status = 'on_the_way'
           or (o.status = 'completed' and o.completed_at > (now() at time zone 'Europe/Berlin')::date at time zone 'Europe/Berlin'))
    order by o.status = 'completed', o.out_at
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

export async function findOrderById(id: number) {
  const [row] = (await db()`select * from orders where id = ${id}`) as Row[];
  return row ? toOrder(row) : null;
}

export async function setOrderStatus(id: number, status: OrderStatus, eta: number | null, staffNote: string) {
  const [row] = (await db()`
    update orders set status = ${status}, eta_minutes = coalesce(${eta}, eta_minutes), staff_note = ${staffNote}, updated_at = now()
    where id = ${id} returning *
  `) as Row[];
  return row ? toOrder(row) : null;
}

/**
  Moves an order one step, only if it is still in the status the button was shown for (two people pressing at
  once, or an old screen, change nothing). Stamps the time of the step. Returns the updated order or null.
*/
export async function advanceOrder(
  id: number,
  from: OrderStatus,
  to: OrderStatus,
  opts: { driverId?: number | null; onlyDriver?: number; eta?: number | null; staffNote?: string } = {},
) {
  const [row] = (await db()`
    update orders set
      status = ${to},
      updated_at = now(),
      eta_minutes = coalesce(${opts.eta ?? null}::int, eta_minutes),
      staff_note = coalesce(${opts.staffNote ?? null}::text, staff_note),
      accepted_at = case when ${to} = 'accepted' then now() else accepted_at end,
      cooked_at = case when ${to} = 'cooked' then now() else cooked_at end,
      packed_at = case when ${to} = 'packed' then now() else packed_at end,
      out_at = case when ${to} in ('on_the_way', 'ready') then now() else out_at end,
      completed_at = case when ${to} = 'completed' then now() else completed_at end,
      driver_id = case when ${to} = 'on_the_way' then ${opts.driverId ?? null}::bigint else driver_id end
    where id = ${id} and status = ${from}
      and (${opts.onlyDriver ?? null}::bigint is null or driver_id = ${opts.onlyDriver ?? null})
    returning *
  `) as Row[];
  return row ? toOrder(row) : null;
}

/** Data retention: orders older than 180 days are removed. */
export async function purgeOldOrders() {
  await db()`delete from orders where created_at < now() - interval '180 days'`;
}
