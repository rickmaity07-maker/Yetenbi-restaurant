import "server-only";
import { db } from "./db";

/*
  Figures for the admin start page. "Today" is the Berlin calendar day. Revenue = completed orders
  (food, deposit and delivery fee, as paid at the door); rejected and cancelled orders do not count.
*/

type Dashboard = {
  orders: { today: number; open: number; new: number; packed: number; onTheWay: number };
  revenue: { today: number; sameDayLastWeek: number; last14: { day: string; total: number; orders: number }[] };
  reservations: { todayCount: number; todayGuests: number; pending: number };
  actions: {
    newOrders: { id: number; reference: string; method: string; total: number; createdAt: string; name: string }[];
    packed: { id: number; reference: string; method: string; name: string }[];
    pendingReservations: { id: number; reference: string; date: string; time: string; guests: number; name: string }[];
  };
  todaysBookings: { id: number; time: string; guests: number; name: string; status: string; source: string }[];
};

type Row = Record<string, unknown>;

export async function getDashboard(): Promise<Dashboard> {
  const [orderCountRows, dayRows, reservationCountRows, newOrders, packed, pending, bookings] = (await Promise.all([
    db()`
      select
        count(*) filter (where (created_at at time zone 'Europe/Berlin')::date = (now() at time zone 'Europe/Berlin')::date)::int as today,
        count(*) filter (where status in ('new','accepted','cooked','packed','ready','on_the_way'))::int as open,
        count(*) filter (where status = 'new')::int as new,
        count(*) filter (where status = 'packed')::int as packed,
        count(*) filter (where status = 'on_the_way')::int as on_the_way,
        coalesce(sum(total) filter (where status = 'completed' and (created_at at time zone 'Europe/Berlin')::date = (now() at time zone 'Europe/Berlin')::date), 0)::float as rev_today,
        coalesce(sum(total) filter (where status = 'completed' and (created_at at time zone 'Europe/Berlin')::date = (now() at time zone 'Europe/Berlin')::date - 7), 0)::float as rev_week_ago
      from orders where created_at > now() - interval '15 days' or status in ('new','accepted','cooked','packed','ready','on_the_way')
    `,
    db()`
      select d::date::text as day,
        coalesce(sum(o.total) filter (where o.status = 'completed'), 0)::float as total,
        count(o.id) filter (where o.status = 'completed')::int as orders
      from generate_series((now() at time zone 'Europe/Berlin')::date - 13, (now() at time zone 'Europe/Berlin')::date, interval '1 day') d
      left join orders o on (o.created_at at time zone 'Europe/Berlin')::date = d::date
      group by d order by d
    `,
    db()`
      select
        count(*) filter (where date = (now() at time zone 'Europe/Berlin')::date and status = 'confirmed')::int as today_count,
        coalesce(sum(guests) filter (where date = (now() at time zone 'Europe/Berlin')::date and status = 'confirmed'), 0)::int as today_guests,
        count(*) filter (where status = 'pending' and date >= (now() at time zone 'Europe/Berlin')::date)::int as pending
      from reservations where date >= (now() at time zone 'Europe/Berlin')::date
    `,
    db()`select id, reference, method, total, created_at, name from orders where status = 'new' order by created_at limit 10`,
    db()`select id, reference, method, name from orders where status = 'packed' order by packed_at nulls last limit 10`,
    db()`select id, reference, date::text, time, guests, name from reservations where status = 'pending' and date >= (now() at time zone 'Europe/Berlin')::date order by date, time limit 10`,
    db()`select id, time, guests, name, status, source from reservations where date = (now() at time zone 'Europe/Berlin')::date and status in ('confirmed','pending') order by time`,
  ])) as Row[][];
  const counts = orderCountRows[0];
  const reservations = reservationCountRows[0];
  return {
    orders: {
      today: Number(counts.today),
      open: Number(counts.open),
      new: Number(counts.new),
      packed: Number(counts.packed),
      onTheWay: Number(counts.on_the_way),
    },
    revenue: {
      today: Number(counts.rev_today),
      sameDayLastWeek: Number(counts.rev_week_ago),
      last14: dayRows.map((row) => ({ day: String(row.day), total: Number(row.total), orders: Number(row.orders) })),
    },
    reservations: {
      todayCount: Number(reservations.today_count),
      todayGuests: Number(reservations.today_guests),
      pending: Number(reservations.pending),
    },
    actions: {
      newOrders: newOrders.map((order) => ({
        id: Number(order.id),
        reference: String(order.reference),
        method: String(order.method),
        total: Number(order.total),
        createdAt: new Date(String(order.created_at)).toISOString(),
        name: String(order.name),
      })),
      packed: packed.map((order) => ({
        id: Number(order.id),
        reference: String(order.reference),
        method: String(order.method),
        name: String(order.name),
      })),
      pendingReservations: pending.map((reservation) => ({
        id: Number(reservation.id),
        reference: String(reservation.reference),
        date: String(reservation.date),
        time: String(reservation.time),
        guests: Number(reservation.guests),
        name: String(reservation.name),
      })),
    },
    todaysBookings: bookings.map((booking) => ({
      id: Number(booking.id),
      time: String(booking.time),
      guests: Number(booking.guests),
      name: String(booking.name),
      status: String(booking.status),
      source: String(booking.source),
    })),
  };
}

/** Small numbers for the live alerts (polled every few seconds). */
export async function getPulse() {
  const [row] = (await db()`
    select
      (select count(*) from orders where status = 'new')::int as new_orders,
      (select coalesce(max(id), 0) from orders)::int as last_order_id,
      (select count(*) from reservations where status = 'pending' and date >= (now() at time zone 'Europe/Berlin')::date)::int as pending_reservations,
      (select coalesce(max(id), 0) from reservations where source = 'website')::int as last_reservation_id,
      (select count(*) from orders where status in ('accepted','cooked'))::int as kitchen_queue,
      (select coalesce(max(extract(epoch from accepted_at)), 0) from orders)::float as last_accepted
  `) as Row[];
  return {
    newOrders: Number(row.new_orders),
    lastOrderId: Number(row.last_order_id),
    pendingReservations: Number(row.pending_reservations),
    lastReservationId: Number(row.last_reservation_id),
    kitchenQueue: Number(row.kitchen_queue),
    lastAccepted: Number(row.last_accepted),
  };
}
