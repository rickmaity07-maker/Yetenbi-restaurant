import { menu, type L, type MenuItem } from "./data";
import { berlinNow, toMinutes, WEEK } from "./hours";
import { isEmail } from "./validate";

/*
  Online ordering rules, shared by the order page and the API (the server recomputes everything).
  The business values below are starting defaults; the owner changes them in /admin (stored in Neon).
*/

export type OrderSettings = {
  paused: boolean;
  delivery: boolean;
  pickup: boolean;
  minOrder: number; // € for delivery
  deliveryFee: number; // €
  freeDeliveryFrom: number; // € (0 = never free)
  postcodes: string[]; // delivery area
  deliveryMinutes: number; // typical delivery time
  pickupMinutes: number; // typical pickup time
  /** Temporary: take orders at any time, also outside opening hours and on closed days (switch off for normal service). */
  ignoreHours: boolean;
};

// TODO: Placeholder values; the owner should confirm them in /admin → Bestellungen → Einstellungen.
export const DEFAULT_SETTINGS: OrderSettings = {
  paused: false,
  delivery: true,
  pickup: true,
  minOrder: 15,
  deliveryFee: 2.5,
  freeDeliveryFrom: 40,
  postcodes: ["97070", "97072", "97074", "97076", "97078", "97080", "97082", "97084"],
  deliveryMinutes: 45,
  pickupMinutes: 20,
  ignoreHours: false,
};

export const LAST_ORDER_BEFORE_CLOSE = 30; // minutes
export const MAX_QTY = 20;

export type OrderableItem = { id: string; categoryId: string; name: L; description?: L; amharic?: string; price: number; tags?: MenuItem["tags"] };

const toNumber = (price: string) => Number(price.replace(",", "."));

/** Everything that can be ordered. The coffee ceremony is served at the table only. */
export const ORDERABLE: OrderableItem[] = menu.flatMap((category) =>
  category.items
    .map((item, i) => ({ item, i }))
    .filter(({ item }) => item.name.de !== "Jebena Buna")
    .map(({ item, i }) => ({
      id: `${category.id}-${i}`,
      categoryId: category.id,
      name: item.name,
      description: item.description,
      amharic: item.amharic,
      price: toNumber(item.price),
      tags: item.tags,
    })),
);
export const ITEM_BY_ID = new Map(ORDERABLE.map((i) => [i.id, i]));

export type Method = "delivery" | "pickup";
export type Payment = "cash" | "card";
export type CartLine = { id: string; qty: number };

export type OrderInput = {
  method: Method;
  items: CartLine[];
  name: string;
  phone: string;
  email: string;
  street: string;
  postcode: string;
  city: string;
  addressNote: string;
  note: string;
  payment: Payment;
  wanted: string; // "asap" or HH:MM
};

export const round2 = (n: number) => Math.round(n * 100) / 100;

export function totals(items: CartLine[], method: Method, s: OrderSettings) {
  const subtotal = round2(items.reduce((sum, l) => sum + (ITEM_BY_ID.get(l.id)?.price ?? 0) * l.qty, 0));
  const fee = method === "delivery" && !(s.freeDeliveryFrom > 0 && subtotal >= s.freeDeliveryFrom) ? s.deliveryFee : 0;
  return { subtotal, fee: round2(fee), total: round2(subtotal + fee) };
}

const pad = (n: number) => String(n).padStart(2, "0");
const hhmm = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

/** Whether orders are accepted right now, and the times that can be chosen for later today. */
export function orderWindow(method: Method, s: OrderSettings, closedToday = false, now = new Date()) {
  const { day, minutes } = berlinNow(now);
  if (s.paused) return { open: false, asap: false, slots: [] as string[] };
  const lead = method === "delivery" ? s.deliveryMinutes : s.pickupMinutes;
  if (s.ignoreHours) {
    // any time today: as soon as possible, or later in 15-minute steps until 23:45
    const slots: string[] = [];
    for (let m = Math.ceil((minutes + lead) / 15) * 15; m <= 23 * 60 + 45; m += 15) slots.push(hhmm(m));
    return { open: true, asap: true, slots };
  }
  const hours = WEEK[day];
  if (!hours || closedToday) return { open: false, asap: false, slots: [] as string[] };
  const open = toMinutes(hours.open);
  const last = toMinutes(hours.close) - LAST_ORDER_BEFORE_CLOSE;
  const asap = minutes >= open && minutes <= last;
  // scheduled: from the later of now+lead and opening+lead, in 15-minute steps, until closing - 15
  const from = Math.ceil(Math.max(minutes + lead, open + lead) / 15) * 15;
  const slots: string[] = [];
  for (let m = from; m <= toMinutes(hours.close) - 15; m += 15) slots.push(hhmm(m));
  return { open: minutes <= last, asap, slots };
}

export type OrderErrorCode =
  | "empty"
  | "item"
  | "method"
  | "closed"
  | "time"
  | "min"
  | "postcode"
  | "street"
  | "name"
  | "phone"
  | "email"
  | "note";
export type OrderErrors = Partial<Record<"items" | "method" | "wanted" | "street" | "postcode" | "name" | "phone" | "email" | "note", OrderErrorCode>>;

export function validateOrder(o: OrderInput, s: OrderSettings, closedToday = false, now = new Date()): OrderErrors {
  const e: OrderErrors = {};
  if (!o.items.length) e.items = "empty";
  else if (o.items.some((l) => !ITEM_BY_ID.has(l.id) || !Number.isInteger(l.qty) || l.qty < 1 || l.qty > MAX_QTY)) e.items = "item";

  if (o.method !== "delivery" && o.method !== "pickup") e.method = "method";
  else if ((o.method === "delivery" && !s.delivery) || (o.method === "pickup" && !s.pickup)) e.method = "method";

  if (!e.method) {
    const w = orderWindow(o.method, s, closedToday, now);
    if (!w.open) e.wanted = "closed";
    else if (o.wanted === "asap" ? !w.asap : !w.slots.includes(o.wanted)) e.wanted = "time";
  }

  if (o.method === "delivery" && !e.items) {
    if (totals(o.items, o.method, s).subtotal < s.minOrder) e.items = "min";
    if (!s.postcodes.includes(o.postcode.trim())) e.postcode = "postcode";
    if (o.street.trim().length < 4 || o.street.length > 120) e.street = "street";
  }

  if (o.name.trim().length < 2 || o.name.length > 80) e.name = "name";
  if (!/^[+\d][\d\s()/-]{5,24}$/.test(o.phone.trim())) e.phone = "phone";
  if (o.email && !isEmail(o.email)) e.email = "email";
  if (o.note.length > 400 || o.addressNote.length > 200) e.note = "note";
  return e;
}

/*
  Order flow. Delivery: new → accepted (owner) → cooked → packed (kitchen) → on_the_way (owner hands it to a driver)
  → completed (driver, "delivered"). Pickup: … → packed → ready (owner) → completed (owner, "picked up").
*/
export type OrderStatus = "new" | "accepted" | "cooked" | "packed" | "ready" | "on_the_way" | "completed" | "rejected" | "cancelled";

/** Orders that are still being worked on. */
export const OPEN_STATUSES: OrderStatus[] = ["new", "accepted", "cooked", "packed", "ready", "on_the_way"];

export type StaffRole = "owner" | "kitchen" | "driver";

/** Which status each role may move an order to, from which status. Checked on the server for every button. */
export function canMove(role: StaffRole, from: OrderStatus, to: OrderStatus, method: Method) {
  if (role === "kitchen") return (from === "accepted" && to === "cooked") || (from === "cooked" && to === "packed");
  if (role === "driver") return from === "on_the_way" && to === "completed";
  // owner: every step, so the shop also runs on days without kitchen or driver accounts
  if (to === "cancelled") return OPEN_STATUSES.includes(from) && from !== "new";
  const flow: Partial<Record<OrderStatus, OrderStatus[]>> = {
    new: ["accepted", "rejected"],
    accepted: ["cooked"],
    cooked: ["packed"],
    packed: [method === "delivery" ? "on_the_way" : "ready"],
    ready: ["completed"],
    on_the_way: ["completed"],
  };
  return flow[from]?.includes(to) ?? false;
}

export const formatEuro = (n: number, dateLocale: string) =>
  new Intl.NumberFormat(dateLocale === "am-ET" ? "de-DE" : dateLocale, { style: "currency", currency: "EUR" }).format(n);
