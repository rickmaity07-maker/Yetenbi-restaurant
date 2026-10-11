import { berlinNow, toMinutes, WEEK, type DayHours } from "./hours";
import { isEmail } from "./validate";
import type { Catalog } from "./menu";

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
  /** Reusable packaging notice (VerpackG §§ 33, 34): "offer" reusable boxes, accept guests' "own" containers, or "none". */
  reusable: "none" | "offer" | "own";
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
  reusable: "none",
};

export const LAST_ORDER_BEFORE_CLOSE = 30; // minutes
const MAX_QTY = 20;

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

const roundCents = (amount: number) => Math.round(amount * 100) / 100;

/** Food and drink, deposit (Pfand), delivery fee, priced from the menu. Minimum order and free delivery count the food only. */
export function totals(items: CartLine[], method: Method, settings: OrderSettings, catalog: Catalog) {
  const sumOf = (field: "price" | "deposit") =>
    roundCents(items.reduce((sum, line) => sum + (catalog.get(line.id)?.[field] ?? 0) * line.qty, 0));

  const subtotal = sumOf("price");
  const deposit = sumOf("deposit");
  const freeDelivery = settings.freeDeliveryFrom > 0 && subtotal >= settings.freeDeliveryFrom;
  const fee = method === "delivery" && !freeDelivery ? roundCents(settings.deliveryFee) : 0;
  return { subtotal, deposit, fee, total: roundCents(subtotal + deposit + fee) };
}

/** 1110 → "18:30" (minutes since midnight to a clock time). */
function clockTime(minutesOfDay: number) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(Math.floor(minutesOfDay / 60))}:${pad(minutesOfDay % 60)}`;
}

/** Clock times every 15 minutes from `first` (rounded up) to `last`. */
function quarterHours(first: number, last: number) {
  const slots: string[] = [];
  for (let minute = Math.ceil(first / 15) * 15; minute <= last; minute += 15) slots.push(clockTime(minute));
  return slots;
}

const closed = () => ({ open: false, asap: false, slots: [] as string[] });

/** Whether orders are accepted right now, and the times that can be chosen for later today. */
export function orderWindow(
  method: Method,
  settings: OrderSettings,
  closedToday = false,
  now = new Date(),
  week: DayHours[] = WEEK,
) {
  if (settings.paused) return closed();

  const { day, minutes: nowMinutes } = berlinNow(now);
  const preparation = method === "delivery" ? settings.deliveryMinutes : settings.pickupMinutes;

  // Temporary setting: any time today, until 23:45.
  if (settings.ignoreHours) {
    return { open: true, asap: true, slots: quarterHours(nowMinutes + preparation, 23 * 60 + 45) };
  }

  const today = week[day];
  if (!today || closedToday) return closed();

  const opens = toMinutes(today.open);
  const closes = toMinutes(today.close);
  const lastOrder = closes - LAST_ORDER_BEFORE_CLOSE;
  // Later today: from whichever is later, now or opening time, plus the preparation time; until 15 minutes before closing.
  const firstSlot = Math.max(nowMinutes, opens) + preparation;
  return {
    open: nowMinutes <= lastOrder,
    asap: nowMinutes >= opens && nowMinutes <= lastOrder,
    slots: quarterHours(firstSlot, closes - 15),
  };
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
export type OrderErrors = Partial<
  Record<"items" | "method" | "wanted" | "street" | "postcode" | "name" | "phone" | "email" | "note", OrderErrorCode>
>;

const PHONE_PATTERN = /^[+\d][\d\s()/-]{5,24}$/;

/** Checks an order against the menu, the settings and today's hours. Used by the order page and again by the API. */
export function validateOrder(
  order: OrderInput,
  settings: OrderSettings,
  catalog: Catalog,
  closedToday = false,
  now = new Date(),
  week: DayHours[] = WEEK,
): OrderErrors {
  const errors: OrderErrors = {};

  const badLine = (line: CartLine) =>
    !catalog.has(line.id) || !Number.isInteger(line.qty) || line.qty < 1 || line.qty > MAX_QTY;
  if (order.items.length === 0) errors.items = "empty";
  else if (order.items.some(badLine)) errors.items = "item";

  const methodOffered =
    (order.method === "delivery" && settings.delivery) || (order.method === "pickup" && settings.pickup);
  if (!methodOffered) errors.method = "method";

  if (!errors.method) {
    const window = orderWindow(order.method, settings, closedToday, now, week);
    const timeOffered = order.wanted === "asap" ? window.asap : window.slots.includes(order.wanted);
    if (!window.open) errors.wanted = "closed";
    else if (!timeOffered) errors.wanted = "time";
  }

  if (order.method === "delivery" && !errors.items) {
    if (totals(order.items, order.method, settings, catalog).subtotal < settings.minOrder) errors.items = "min";
    if (!settings.postcodes.includes(order.postcode.trim())) errors.postcode = "postcode";
    if (order.street.trim().length < 4 || order.street.length > 120) errors.street = "street";
  }

  if (order.name.trim().length < 2 || order.name.length > 80) errors.name = "name";
  if (!PHONE_PATTERN.test(order.phone.trim())) errors.phone = "phone";
  if (order.email && !isEmail(order.email)) errors.email = "email";
  if (order.note.length > 400 || order.addressNote.length > 200) errors.note = "note";
  return errors;
}

/*
  Order flow. Delivery: new → accepted (owner) → cooked → packed (kitchen) → on_the_way (owner hands it to a driver)
  → completed (driver, "delivered"). Pickup: … → packed → ready (owner) → completed (owner, "picked up").
*/
export type OrderStatus =
  | "new"
  | "accepted"
  | "cooked"
  | "packed"
  | "ready"
  | "on_the_way"
  | "completed"
  | "rejected"
  | "cancelled";

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

/** Prices in the visitor's language. Amharic uses the German format, which browsers support everywhere. */
export function formatEuro(amount: number, dateLocale: string) {
  const locale = dateLocale === "am-ET" ? "de-DE" : dateLocale;
  return new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(amount);
}
