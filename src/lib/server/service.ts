import "server-only";
import type { L } from "@/lib/data";
import {
  checkTotal,
  validatePayment,
  type Check,
  type CheckItem,
  type DiningTable,
  type RoundLine,
} from "@/lib/service";
import { ApiError, type AppUser } from "./app-auth";
import { audit } from "./audit";
import { db } from "./db";
import { readMenu } from "./menu";

/*
  Table service in Neon (dining_tables, table_checks, table_check_items): what the waiters' app and the kitchen
  screen read and change. Every change re-reads the check, so the app always gets the whole current state back.
*/

type Row = Record<string, unknown>;
type Actor = Pick<AppUser, "id" | "name" | "role">;

const iso = (value: unknown) => (value == null ? null : new Date(String(value)).toISOString());

const toItem = (row: Row): CheckItem => ({
  id: Number(row.id),
  round: Number(row.round),
  itemId: String(row.item_id),
  name: row.name as L,
  unit: Number(row.unit),
  qty: Number(row.qty),
  note: String(row.note ?? ""),
  kitchen: Boolean(row.kitchen),
  status: row.status as CheckItem["status"],
  voidReason: String(row.void_reason ?? ""),
  addedBy: String(row.added_by_name ?? ""),
  createdAt: iso(row.created_at)!,
  readyAt: iso(row.ready_at),
  servedAt: iso(row.served_at),
});

const toCheck = (row: Row, items: CheckItem[]): Check => ({
  id: Number(row.id),
  number: Number(row.number),
  tableId: String(row.table_id),
  tableLabel: String(row.table_label),
  guests: Number(row.guests),
  note: String(row.note ?? ""),
  status: row.status as Check["status"],
  openedBy: String(row.opened_by_name ?? ""),
  openedAt: iso(row.opened_at)!,
  closedAt: iso(row.closed_at),
  closedBy: String(row.closed_by_name ?? ""),
  payment: (row.payment as Check["payment"]) ?? null,
  total: row.status === "open" ? checkTotal(items) : Number(row.total),
  tip: Number(row.tip ?? 0),
  given: row.given == null ? null : Number(row.given),
  items,
});

async function withItems(rows: Row[]) {
  if (rows.length === 0) return [];
  const ids = rows.map((row) => Number(row.id));
  const itemRows = (await db()`
    select * from table_check_items where check_id = any(${ids}::bigint[]) order by round, id
  `) as Row[];
  const items = itemRows.map((row) => ({ checkId: Number(row.check_id), item: toItem(row) }));
  return rows.map((row) =>
    toCheck(
      row,
      items.filter((entry) => entry.checkId === Number(row.id)).map((entry) => entry.item),
    ),
  );
}

/* ---------- tables ---------- */

export async function listTables(): Promise<DiningTable[]> {
  const rows = (await db()`select * from dining_tables where active order by position, id`) as Row[];
  return rows.map((row) => ({
    id: String(row.id),
    label: String(row.label),
    area: String(row.area),
    seats: Number(row.seats),
  }));
}

/**
  Replaces the table plan from the admin form. Tables keep their id when their label stays, so open checks stay put;
  tables no longer listed are switched off (old checks keep them), never deleted.
*/
export async function saveTables(user: Actor, plan: { label: string; area: string; seats: number }[]) {
  const sql = db();
  const existing = (await sql`select id, label, area from dining_tables`) as Row[];
  const key = (area: string, label: string) => `${area.toLowerCase()}|${label.toLowerCase()}`;
  const byKey = new Map(existing.map((row) => [key(String(row.area), String(row.label)), String(row.id)]));
  const keep: string[] = [];
  for (const [position, table] of plan.entries()) {
    const id = byKey.get(key(table.area, table.label)) ?? `x${Date.now().toString(36)}${position}`;
    keep.push(id);
    await sql`
      insert into dining_tables (id, label, area, seats, position, active)
      values (${id}, ${table.label}, ${table.area}, ${table.seats}, ${position}, true)
      on conflict (id) do update set label = excluded.label, area = excluded.area, seats = excluded.seats,
                                     position = excluded.position, active = true
    `;
  }
  await sql`update dining_tables set active = false where not (id = any(${keep}::text[]))`;
  await audit(user, "service", "Tischplan geändert", `${plan.length} Tische`);
}

/* ---------- checks ---------- */

export async function listOpenChecks() {
  return withItems((await db()`select * from table_checks where status = 'open' order by opened_at`) as Row[]);
}

export async function getCheck(id: number) {
  const [check] = await withItems((await db()`select * from table_checks where id = ${id}`) as Row[]);
  if (!check) throw new ApiError(404, "check_not_found");
  return check;
}

async function openOnly(id: number) {
  const check = await getCheck(id);
  if (check.status !== "open") throw new ApiError(409, "check_closed");
  return check;
}

/** The checks closed on one day (Berlin time), newest first, for the app's "Heute" and the admin page. */
export async function listClosedChecks(date: string) {
  return withItems(
    (await db()`
      select * from table_checks
      where status <> 'open' and (closed_at at time zone 'Europe/Berlin')::date = ${date}::date
      order by closed_at desc
    `) as Row[],
  );
}

export async function daySummary(date: string) {
  const [row] = (await db()`
    select count(*) filter (where status = 'paid')::int as paid,
           count(*) filter (where status = 'void')::int as voided,
           coalesce(sum(total) filter (where status = 'paid'), 0) as total,
           coalesce(sum(tip) filter (where status = 'paid'), 0) as tips,
           coalesce(sum(total) filter (where status = 'paid' and payment = 'cash'), 0) as cash,
           coalesce(sum(total) filter (where status = 'paid' and payment = 'card'), 0) as card,
           coalesce(sum(guests) filter (where status = 'paid'), 0)::int as guests
    from table_checks
    where status <> 'open' and (closed_at at time zone 'Europe/Berlin')::date = ${date}::date
  `) as Row[];
  return {
    date,
    paid: Number(row.paid),
    voided: Number(row.voided),
    total: Number(row.total),
    tips: Number(row.tips),
    cash: Number(row.cash),
    card: Number(row.card),
    guests: Number(row.guests),
  };
}

const guestsOf = (value: unknown, fallback?: number) => {
  if (value === undefined && fallback !== undefined) return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 40) throw new ApiError(422, "guests_invalid");
  return n;
};
const noteOf = (value: unknown, fallback = "") =>
  value === undefined
    ? fallback
    : String(value ?? "")
        .trim()
        .slice(0, 300);

async function tableOf(tableId: unknown) {
  const [table] = (await db()`select * from dining_tables where id = ${String(tableId ?? "")} and active`) as Row[];
  if (!table) throw new ApiError(404, "table_not_found");
  return table;
}

export async function openCheck(user: Actor, input: Record<string, unknown>) {
  const table = await tableOf(input.tableId);
  const guests = guestsOf(input.guests ?? 2);
  try {
    const [row] = (await db()`
      insert into table_checks (table_id, table_label, guests, note, opened_by, opened_by_name)
      values (${String(table.id)}, ${String(table.label)}, ${guests}, ${noteOf(input.note)}, ${user.id}, ${user.name})
      returning id
    `) as Row[];
    return getCheck(Number(row.id));
  } catch (error) {
    // The unique index allows one open check per table: someone else opened it a moment ago.
    if (String((error as { code?: string }).code) === "23505") throw new ApiError(409, "table_busy");
    throw error;
  }
}

/** Guests, note, or moving the whole check to another (free) table. */
export async function updateCheck(user: Actor, id: number, input: Record<string, unknown>) {
  const check = await openOnly(id);
  let tableId = check.tableId;
  let tableLabel = check.tableLabel;
  if (input.tableId !== undefined && input.tableId !== check.tableId) {
    const table = await tableOf(input.tableId);
    tableId = String(table.id);
    tableLabel = String(table.label);
  }
  try {
    await db()`
      update table_checks
      set guests = ${guestsOf(input.guests, check.guests)}, note = ${noteOf(input.note, check.note)},
          table_id = ${tableId}, table_label = ${tableLabel}, updated_at = now()
      where id = ${id}
    `;
  } catch (error) {
    if (String((error as { code?: string }).code) === "23505") throw new ApiError(409, "table_busy");
    throw error;
  }
  if (tableId !== check.tableId) {
    await audit(user, "service", "Tisch gewechselt", `${check.tableLabel} → ${tableLabel}`, { check: check.number });
  }
  return getCheck(id);
}

/**
  Books a round: every line re-priced from the menu (the app's prices are never trusted). Food is sent to the kitchen,
  drinks count as served straight away.
*/
export async function addRound(user: Actor, id: number, lines: RoundLine[]) {
  await openOnly(id);
  const menu = await readMenu();
  const dishes = new Map(
    menu.flatMap((category) => category.items.map((dish) => [dish.id, { dish, drinks: category.drinks }] as const)),
  );
  const rows = lines.map((line) => {
    const entry = dishes.get(line.itemId);
    if (!entry) throw new ApiError(422, "dish_not_found");
    if (!entry.dish.available) throw new ApiError(409, "dish_sold_out");
    return {
      item_id: entry.dish.id,
      name: entry.dish.name,
      unit: entry.dish.price,
      qty: line.qty,
      note: line.note,
      kitchen: !entry.drinks,
    };
  });
  const sql = db();
  const [bumped] = (await sql`
    update table_checks set rounds = rounds + 1, updated_at = now() where id = ${id} and status = 'open' returning rounds
  `) as Row[];
  if (!bumped) throw new ApiError(409, "check_closed");
  await sql`
    insert into table_check_items (check_id, round, item_id, name, unit, qty, note, kitchen, status, added_by_name, served_at)
    select ${id}, ${Number(bumped.rounds)}, x.item_id, x.name, x.unit, x.qty, x.note, x.kitchen,
           case when x.kitchen then 'sent' else 'served' end, ${user.name}, case when x.kitchen then null else now() end
    from jsonb_to_recordset(${JSON.stringify(rows)}::jsonb)
      as x(item_id text, name jsonb, unit numeric, qty int, note text, kitchen boolean)
  `;
  return getCheck(id);
}

/** serve: carried to the table. void: taken off the bill (with a reason, logged). */
export async function changeItem(user: Actor, checkId: number, itemId: number, input: Record<string, unknown>) {
  const check = await openOnly(checkId);
  const item = check.items.find((entry) => entry.id === itemId);
  if (!item) throw new ApiError(404, "item_not_found");
  if (item.status === "void") throw new ApiError(409, "item_void");
  if (input.action === "serve") {
    await db()`update table_check_items set status = 'served', served_at = now() where id = ${itemId} and status <> 'void' and check_id = ${checkId} and exists (select 1 from table_checks where id = ${checkId} and status = 'open')`;
  } else if (input.action === "void") {
    const reason = String(input.reason ?? "")
      .trim()
      .slice(0, 140);
    if (!reason) throw new ApiError(422, "reason_required");
    await db()`update table_check_items set status = 'void', void_reason = ${reason} where id = ${itemId} and check_id = ${checkId} and exists (select 1 from table_checks where id = ${checkId} and status = 'open')`;
    await audit(user, "service", "Position storniert", `Tisch ${check.tableLabel}: ${item.qty}× ${item.name.de}`, {
      check: check.number,
      reason,
    });
  } else throw new ApiError(422, "action_invalid");
  await db()`update table_checks set updated_at = now() where id = ${checkId}`;
  return getCheck(checkId);
}

/** "Alles serviert": everything waiting at the pass has been carried out. */
export async function serveReady(checkId: number) {
  await openOnly(checkId);
  await db()`
    update table_check_items set status = 'served', served_at = now()
    where status = 'ready' and check_id = ${checkId} and exists (select 1 from table_checks where id = ${checkId} and status = 'open')
  `;
  return getCheck(checkId);
}

export async function payCheck(user: Actor, id: number, input: Record<string, unknown>) {
  const check = await openOnly(id);
  const total = checkTotal(check.items);
  if (total <= 0) throw new ApiError(409, "nothing_to_pay");
  // The waiter charges what their screen shows; if someone changed the bill meanwhile, they must look again.
  if (input.expected !== undefined && Math.round(Number(input.expected) * 100) !== Math.round(total * 100))
    throw new ApiError(409, "total_changed");
  const payment = validatePayment(total, input);
  if ("error" in payment) throw new ApiError(422, payment.error!);
  // Paid only if the bill in the database still adds up to the amount charged (nothing added a moment ago).
  const [row] = (await db()`
    update table_checks
    set status = 'paid', payment = ${payment.method}, total = ${total}, tip = ${payment.tip}, given = ${payment.given},
        closed_at = now(), closed_by_name = ${user.name}, updated_at = now()
    where id = ${id} and status = 'open'
      and (select coalesce(sum(round(unit * 100) * qty), 0) from table_check_items where check_id = ${id} and status <> 'void')
          = ${Math.round(total * 100)}
    returning id
  `) as Row[];
  if (!row) throw new ApiError(409, (await getCheck(id)).status === "open" ? "total_changed" : "check_closed");
  // Food nobody marked as served is served by now.
  await db()`update table_check_items set status = 'served', served_at = coalesce(served_at, now()) where check_id = ${id} and status in ('sent', 'ready')`;
  return getCheck(id);
}

/** Cancels a check. Service staff only when nothing is left on it; owners always (logged). */
export async function voidCheck(user: Actor, id: number, reason: string) {
  const check = await openOnly(id);
  const owing = checkTotal(check.items);
  if (owing > 0 && user.role !== "owner") throw new ApiError(403, "void_owner_only");
  await db()`
    update table_checks set status = 'void', closed_at = now(), closed_by_name = ${user.name}, updated_at = now()
    where id = ${id} and status = 'open'
  `;
  await db()`update table_check_items set status = 'void', void_reason = ${reason.slice(0, 140) || "Tisch storniert"} where check_id = ${id} and status <> 'void'`;
  if (owing > 0)
    await audit(user, "service", "Tisch storniert", `Tisch ${check.tableLabel}`, {
      check: check.number,
      owing,
      reason,
    });
  return getCheck(id);
}

/** Owners: a check paid by mistake goes back to its table (if the table is free). */
export async function reopenCheck(user: Actor, id: number) {
  if (user.role !== "owner") throw new ApiError(403, "owner_only");
  const check = await getCheck(id);
  if (check.status !== "paid") throw new ApiError(409, "check_not_paid");
  try {
    await db()`
      update table_checks set status = 'open', payment = null, total = 0, tip = 0, given = null, closed_at = null,
                              closed_by_name = '', updated_at = now()
      where id = ${id}
    `;
  } catch (error) {
    if (String((error as { code?: string }).code) === "23505") throw new ApiError(409, "table_busy");
    throw error;
  }
  await audit(user, "service", "Bezahlte Rechnung wieder geöffnet", `Tisch ${check.tableLabel}`, {
    check: check.number,
    total: check.total,
  });
  return getCheck(id);
}

/* ---------- kitchen ---------- */

export type KitchenTicket = {
  checkId: number;
  round: number;
  table: string;
  waiter: string;
  sentAt: string;
  readyAt: string | null;
  items: { id: number; qty: number; name: string; note: string }[];
};

/** Food for the kitchen screen: open rounds (oldest first), plus rounds done in the last 20 minutes still at the pass. */
export async function listKitchenTickets(): Promise<KitchenTicket[]> {
  const rows = (await db()`
    select i.*, c.table_label from table_check_items i join table_checks c on c.id = i.check_id
    where i.kitchen and c.status = 'open'
      and (i.status = 'sent' or (i.status = 'ready' and i.ready_at > now() - interval '20 minutes'))
    order by i.created_at, i.id
  `) as Row[];
  const tickets = new Map<string, KitchenTicket>();
  for (const row of rows) {
    const key = `${row.check_id}-${row.round}`;
    const ticket = tickets.get(key) ?? {
      checkId: Number(row.check_id),
      round: Number(row.round),
      table: String(row.table_label),
      waiter: String(row.added_by_name ?? ""),
      sentAt: iso(row.created_at)!,
      readyAt: row.status === "ready" ? iso(row.ready_at) : null,
      items: [],
    };
    if (row.status === "sent") ticket.readyAt = null;
    ticket.items.push({
      id: Number(row.id),
      qty: Number(row.qty),
      name: (row.name as L).de,
      note: String(row.note ?? ""),
    });
    tickets.set(key, ticket);
  }
  return [...tickets.values()];
}

/** "Fertig": the round is at the pass; the waiters' app rings. */
export async function markRoundReady(checkId: number, round: number) {
  await db()`
    update table_check_items set status = 'ready', ready_at = now()
    where check_id = ${checkId} and round = ${round} and kitchen and status = 'sent'
  `;
}
