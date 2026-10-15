import type { L } from "./data";

/*
  Table service: what the waiters' app sends and gets back. A check (Rechnung) belongs to one table visit; each
  time the waiter sends a round, food goes to the kitchen (sent -> ready -> served) and drinks are served at once.
  Prices always come from the menu on the server; the app only sends dish ids, quantities and notes.
*/

export type CheckStatus = "open" | "paid" | "void";
export type ItemStatus = "sent" | "ready" | "served" | "void";
export type PayMethod = "cash" | "card";

export type CheckItem = {
  id: number;
  round: number;
  itemId: string;
  name: L;
  unit: number;
  qty: number;
  note: string;
  kitchen: boolean;
  status: ItemStatus;
  voidReason: string;
  addedBy: string;
  createdAt: string;
  readyAt: string | null;
  servedAt: string | null;
};

export type Check = {
  id: number;
  number: number;
  tableId: string;
  tableLabel: string;
  guests: number;
  note: string;
  status: CheckStatus;
  openedBy: string;
  openedAt: string;
  closedAt: string | null;
  closedBy: string;
  payment: PayMethod | null;
  total: number;
  tip: number;
  given: number | null;
  items: CheckItem[];
};

export type DiningTable = { id: string; label: string; area: string; seats: number };

export type RoundLine = { itemId: string; qty: number; note: string };

export const MAX_LINES = 40;
export const MAX_NOTE = 140;

/** Cents-exact sum of the lines still on the bill (voided lines are free). */
export function checkTotal(items: Pick<CheckItem, "unit" | "qty" | "status">[]) {
  const cents = items
    .filter((item) => item.status !== "void")
    .reduce((sum, item) => sum + Math.round(item.unit * 100) * item.qty, 0);
  return cents / 100;
}

/** What the kitchen still has to cook, and what is waiting at the pass to be carried out. */
export function kitchenCounts(items: Pick<CheckItem, "kitchen" | "status" | "qty">[]) {
  let cooking = 0;
  let ready = 0;
  for (const item of items) {
    if (!item.kitchen) continue;
    if (item.status === "sent") cooking += item.qty;
    if (item.status === "ready") ready += item.qty;
  }
  return { cooking, ready };
}

/** Checks the round the app sends: known shape, 1–99 of each, short notes. Returns null when it is unusable. */
export function parseRound(input: unknown): RoundLine[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > MAX_LINES) return null;
  const lines: RoundLine[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") return null;
    const { itemId, qty, note } = raw as Record<string, unknown>;
    if (typeof itemId !== "string" || !/^[a-z0-9-]{1,40}$/i.test(itemId)) return null;
    if (typeof qty !== "number" || !Number.isInteger(qty) || qty < 1 || qty > 99) return null;
    if (note !== undefined && typeof note !== "string") return null;
    lines.push({ itemId, qty, note: (note ?? "").trim().slice(0, MAX_NOTE) });
  }
  return lines;
}

/** Tip and cash handed over must make sense for the amount due. */
export function validatePayment(total: number, input: { method?: unknown; tip?: unknown; given?: unknown }) {
  const method = input.method === "cash" || input.method === "card" ? input.method : null;
  if (!method) return { error: "method_invalid" as const };
  const tip = input.tip === undefined ? 0 : Number(input.tip);
  if (!Number.isFinite(tip) || tip < 0 || tip > 1000) return { error: "tip_invalid" as const };
  let given: number | null = null;
  if (method === "cash" && input.given !== undefined && input.given !== null) {
    given = Number(input.given);
    if (!Number.isFinite(given) || given < 0 || given > 10_000) return { error: "given_invalid" as const };
    if (Math.round(given * 100) < Math.round((total + tip) * 100)) return { error: "given_too_low" as const };
  }
  return { method, tip: Math.round(tip * 100) / 100, given };
}
