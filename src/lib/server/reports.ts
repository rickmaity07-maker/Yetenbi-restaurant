import "server-only";
import type { Menu } from "@/lib/menu";
import { db } from "./db";

/*
  Reports over a date range (Berlin calendar days, both ends included). Revenue counts completed orders only,
  as paid at the door: food and drinks + deposit + delivery fee.
*/

type Row = Record<string, unknown>;

type Range = { from: string; to: string };

type Report = {
  orders: { completed: number; revenue: number; average: number; deposit: number; fees: number; rejected: number; cancelled: number; all: number };
  byMethod: { method: string; count: number; revenue: number }[];
  byPayment: { payment: string; count: number; revenue: number }[];
  perDay: { day: string; revenue: number; orders: number }[];
  perHour: { hour: number; orders: number }[];
  topDishes: { id: string; name: string; qty: number; revenue: number }[];
  reservations: { confirmed: number; guests: number; declined: number; cancelled: number; website: number; phone: number };
};

const inRange = (col: string) => `(${col} at time zone 'Europe/Berlin')::date between $1::date and $2::date`;

export async function getReport({ from, to }: Range): Promise<Report> {
  const q = (text: string) => db().query(text, [from, to]) as Promise<Row[]>;
  const [sum, method, payment, days, hours, dishes, res] = await Promise.all([
    q(`select
         count(*) filter (where status = 'completed')::int as completed,
         coalesce(sum(total) filter (where status = 'completed'), 0)::float as revenue,
         coalesce(sum(deposit) filter (where status = 'completed'), 0)::float as deposit,
         coalesce(sum(delivery_fee) filter (where status = 'completed'), 0)::float as fees,
         count(*) filter (where status = 'rejected')::int as rejected,
         count(*) filter (where status = 'cancelled')::int as cancelled,
         count(*)::int as all
       from orders where ${inRange("created_at")}`),
    q(`select method, count(*)::int as count, coalesce(sum(total), 0)::float as revenue
       from orders where status = 'completed' and ${inRange("created_at")} group by method order by method`),
    q(`select payment, count(*)::int as count, coalesce(sum(total), 0)::float as revenue
       from orders where status = 'completed' and ${inRange("created_at")} group by payment order by payment`),
    q(`select d::date::text as day,
         coalesce(sum(o.total) filter (where o.status = 'completed'), 0)::float as revenue,
         count(o.id) filter (where o.status = 'completed')::int as orders
       from generate_series($1::date, $2::date, interval '1 day') d
       left join orders o on (o.created_at at time zone 'Europe/Berlin')::date = d::date
       group by d order by d`),
    q(`select extract(hour from created_at at time zone 'Europe/Berlin')::int as hour, count(*)::int as orders
       from orders where status = 'completed' and ${inRange("created_at")} group by 1 order by 1`),
    q(`select l->>'id' as id, max(l->>'name') as name, sum((l->>'qty')::int)::int as qty,
         sum((l->>'qty')::int * (l->>'unit')::numeric)::float as revenue
       from orders, jsonb_array_elements(items) l
       where status = 'completed' and ${inRange("created_at")}
       group by l->>'id' order by qty desc, revenue desc limit 12`),
    db().query(
      `select
         count(*) filter (where status = 'confirmed')::int as confirmed,
         coalesce(sum(guests) filter (where status = 'confirmed'), 0)::int as guests,
         count(*) filter (where status = 'declined')::int as declined,
         count(*) filter (where status = 'cancelled')::int as cancelled,
         count(*) filter (where source = 'website')::int as website,
         count(*) filter (where source = 'phone')::int as phone
       from reservations where date between $1::date and $2::date`,
      [from, to],
    ) as Promise<Row[]>,
  ]);
  const s = sum[0];
  const completed = Number(s.completed);
  const revenue = Number(s.revenue);
  return {
    orders: {
      completed,
      revenue,
      average: completed ? revenue / completed : 0,
      deposit: Number(s.deposit),
      fees: Number(s.fees),
      rejected: Number(s.rejected),
      cancelled: Number(s.cancelled),
      all: Number(s.all),
    },
    byMethod: method.map((m) => ({ method: String(m.method), count: Number(m.count), revenue: Number(m.revenue) })),
    byPayment: payment.map((p) => ({ payment: String(p.payment), count: Number(p.count), revenue: Number(p.revenue) })),
    perDay: days.map((d) => ({ day: String(d.day), revenue: Number(d.revenue), orders: Number(d.orders) })),
    perHour: hours.map((h) => ({ hour: Number(h.hour), orders: Number(h.orders) })),
    topDishes: dishes.map((d) => ({ id: String(d.id), name: String(d.name), qty: Number(d.qty), revenue: Number(d.revenue) })),
    reservations: {
      confirmed: Number(res[0].confirmed),
      guests: Number(res[0].guests),
      declined: Number(res[0].declined),
      cancelled: Number(res[0].cancelled),
      website: Number(res[0].website),
      phone: Number(res[0].phone),
    },
  };
}

/* ---------- CSV for the accountant (no names, addresses or contact details) ---------- */

const csvCell = (v: string | number) => {
  const s = typeof v === "number" ? v.toFixed(2).replace(".", ",") : v;
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
/** Semicolons and a byte-order mark, so German Excel opens it with the right columns and umlauts. */
const toCsv = (rows: (string | number)[][]) => "﻿" + rows.map((r) => r.map(csvCell).join(";")).join("\r\n") + "\r\n";

const STATUS_DE: Record<string, string> = {
  new: "neu", accepted: "angenommen", cooked: "zubereitet", packed: "verpackt", ready: "abholbereit",
  on_the_way: "unterwegs", completed: "abgeschlossen", rejected: "abgelehnt", cancelled: "storniert",
};

export async function ordersCsv({ from, to }: Range, menu: Menu) {
  const drinks = new Set(menu.filter((c) => c.drinks).flatMap((c) => c.items.map((i) => i.id)));
  const rows = (await db().query(
    `select reference, status, method, payment, items, deposit, delivery_fee, total,
       to_char(created_at at time zone 'Europe/Berlin', 'DD.MM.YYYY') as day,
       to_char(created_at at time zone 'Europe/Berlin', 'HH24:MI') as time
     from orders where ${inRange("created_at")} order by created_at`,
    [from, to],
  )) as Row[];
  const head = ["Datum", "Uhrzeit", "Nummer", "Status", "Art", "Zahlung", "Speisen (7 %)", "Getränke (19 %)", "Pfand", "Liefergebühr", "Summe"];
  const body = rows.map((r) => {
    const lines = r.items as { id: string; qty: number; unit: number }[];
    const food = lines.filter((l) => !drinks.has(l.id)).reduce((n, l) => n + l.qty * l.unit, 0);
    const drink = lines.filter((l) => drinks.has(l.id)).reduce((n, l) => n + l.qty * l.unit, 0);
    return [
      String(r.day), String(r.time), String(r.reference), STATUS_DE[String(r.status)] ?? String(r.status),
      r.method === "delivery" ? "Lieferung" : "Abholung", r.payment === "cash" ? "bar" : "Karte",
      food, drink, Number(r.deposit), Number(r.delivery_fee), Number(r.total),
    ];
  });
  return toCsv([head, ...body]);
}

export async function reservationsCsv({ from, to }: Range) {
  const rows = (await db().query(
    `select reference, to_char(date, 'DD.MM.YYYY') as day, time, guests, status, source
     from reservations where date between $1::date and $2::date order by date, time`,
    [from, to],
  )) as Row[];
  const status: Record<string, string> = { pending: "offen", confirmed: "bestätigt", declined: "abgelehnt", cancelled: "storniert" };
  return toCsv([
    ["Datum", "Uhrzeit", "Personen", "Status", "Quelle", "Nummer"],
    ...rows.map((r) => [String(r.day), String(r.time), String(r.guests), status[String(r.status)] ?? String(r.status), r.source === "phone" ? "Telefon" : "Website", String(r.reference)]),
  ]);
}
