import "server-only";
import { createHmac } from "node:crypto";
import { signingKey } from "./cancel-token";
import { db } from "./db";

/*
  Protection against prank and flood orders. Every online order rings the kitchen, so the server checks,
  before an order is stored:
    1. the phone number, email or device is not blocked by the team (/admin/bestellungen → "sperren"),
    2. not too many orders from the same phone number or the same device (IP address, stored only as a keyed hash),
    3. not too many unconfirmed orders waiting at once (the kitchen is not flooded),
    4. a very large first order from an unknown phone number is taken by phone instead.
  The team still accepts every order by hand and sees warning labels (first order, rejected before) on the board.
*/
export const LIMITS = {
  perPhonePerHour: 3,
  perDevicePerHour: 3,
  perDevicePerDay: 6,
  maxUnconfirmed: 8, // orders in "new" at the same time
  largeFirstOrder: 150, // € – above this, first-time guests are asked to call
};

type GuardCode = "blocked" | "busy" | "kitchen" | "large";

/** Same number however it is typed: "0176 123", "+49 176-123" and "0049176123" all become "49176123". */
export function phoneKey(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (phone.trim().startsWith("+")) return digits;
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("0")) return "49" + digits.slice(1);
  return digits;
}

/** Keyed hash of the visitor's IP address. The address itself is never stored. */
export function clientHash(request: Request) {
  const ip = request.headers.get("x-real-ip") || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return ip ? createHmac("sha256", signingKey()).update(`client:${ip}`).digest("base64url").slice(0, 32) : null;
}

export async function checkOrder(g: {
  phoneKey: string;
  email: string;
  clientHash: string | null;
  total: number;
}): Promise<GuardCode | null> {
  const email = g.email.trim().toLowerCase();
  const [r] = (await db()`
    select
      (select count(*) from order_blocks
        where (kind = 'phone' and value = ${g.phoneKey})
           or (kind = 'email' and value = ${email} and ${email} <> '')
           or (kind = 'client' and value = ${g.clientHash}))::int as blocked,
      (select count(*) from orders where phone_key = ${g.phoneKey} and created_at > now() - interval '1 hour')::int as phone_hour,
      (select count(*) from orders where client_hash = ${g.clientHash} and created_at > now() - interval '1 hour')::int as device_hour,
      (select count(*) from orders where client_hash = ${g.clientHash} and created_at > now() - interval '1 day')::int as device_day,
      (select count(*) from orders where status = 'new' and created_at > now() - interval '3 hours')::int as unconfirmed,
      (select count(*) from orders where phone_key = ${g.phoneKey} and status = 'completed')::int as completed
  `) as Record<string, number>[];
  if (r.blocked > 0) return "blocked";
  if (
    r.phone_hour >= LIMITS.perPhonePerHour ||
    r.device_hour >= LIMITS.perDevicePerHour ||
    r.device_day >= LIMITS.perDevicePerDay
  )
    return "busy";
  if (r.unconfirmed >= LIMITS.maxUnconfirmed) return "kitchen";
  if (g.total > LIMITS.largeFirstOrder && r.completed === 0) return "large";
  return null;
}

/* ---------- block list (admin) ---------- */

export type Block = {
  id: number;
  kind: "phone" | "email" | "client";
  label: string;
  reason: string;
  createdAt: string;
};

/** Blocks the phone number, email and device of an order. Returns false if the order does not exist. */
export async function blockOrderGuest(orderId: number, reason: string) {
  const [o] =
    (await db()`select reference, phone, phone_key, email, client_hash from orders where id = ${orderId}`) as Record<
      string,
      string | null
    >[];
  if (!o) return false;
  const pk = o.phone_key || phoneKey(String(o.phone));
  const entries: [Block["kind"], string, string][] = [["phone", pk, String(o.phone)]];
  if (o.email) entries.push(["email", o.email, o.email]);
  if (o.client_hash) entries.push(["client", o.client_hash, `Gerät von ${o.reference}`]);
  for (const [kind, value, label] of entries) {
    await db()`insert into order_blocks (kind, value, label, reason) values (${kind}, ${value}, ${label}, ${reason}) on conflict (kind, value) do nothing`;
  }
  return true;
}

export async function blockPhone(phone: string, reason: string) {
  await db()`
    insert into order_blocks (kind, value, label, reason) values ('phone', ${phoneKey(phone)}, ${phone.trim()}, ${reason})
    on conflict (kind, value) do nothing
  `;
}

export async function listBlocks(): Promise<Block[]> {
  const rows =
    (await db()`select id, kind, label, reason, created_at from order_blocks order by created_at desc`) as Record<
      string,
      unknown
    >[];
  return rows.map((r) => ({
    id: Number(r.id),
    kind: r.kind as Block["kind"],
    label: String(r.label),
    reason: String(r.reason),
    createdAt: new Date(String(r.created_at)).toISOString(),
  }));
}

export async function removeBlock(id: number) {
  await db()`delete from order_blocks where id = ${id}`;
}

/** Data retention: device hashes are kept 30 days, blocks one year. */
export async function purgeGuardData() {
  await db()`update orders set client_hash = null where client_hash is not null and created_at < now() - interval '30 days'`;
  await db()`delete from order_blocks where created_at < now() - interval '365 days'`;
}
