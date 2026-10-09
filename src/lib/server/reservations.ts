import "server-only";
import { randomInt } from "node:crypto";
import type { BookingRequest } from "@/lib/booking";
import type { Locale } from "@/lib/i18n";
import { db } from "./db";

export type Status = "pending" | "confirmed" | "declined" | "cancelled";

export type Reservation = BookingRequest & {
  id: number;
  reference: string;
  locale: Locale;
  status: Status;
  staffNote: string;
  createdAt: string;
};

type Row = {
  id: string;
  reference: string;
  date: string;
  time: string;
  guests: number;
  name: string;
  email: string;
  phone: string;
  note: string;
  locale: Locale;
  status: Status;
  staff_note: string;
  created_at: string;
};

const toReservation = (r: Row): Reservation => ({
  id: Number(r.id),
  reference: r.reference,
  date: String(r.date).slice(0, 10),
  time: r.time,
  guests: r.guests,
  name: r.name,
  email: r.email,
  phone: r.phone,
  note: r.note,
  locale: r.locale,
  status: r.status,
  staffNote: r.staff_note,
  createdAt: String(r.created_at),
});

// No 0/O/1/I so references can be read out on the phone.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newReference = () => "YT-" + Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");

/** Open requests and requests in the last day for an email address (flood protection). */
export async function recentCount(email: string) {
  const [row] = (await db()`
    select count(*) filter (where status = 'pending' and date >= (now() at time zone 'Europe/Berlin')::date)::int as open,
           count(*) filter (where created_at > now() - interval '1 day')::int as day
    from reservations where lower(email) = lower(${email})
  `) as { open: number; day: number }[];
  return row;
}

export async function createReservation(input: BookingRequest, locale: Locale) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const [row] = (await db()`
        insert into reservations (reference, date, time, guests, name, email, phone, note, locale)
        values (${newReference()}, ${input.date}, ${input.time}, ${input.guests}, ${input.name}, ${input.email}, ${input.phone}, ${input.note}, ${locale})
        returning *
      `) as Row[];
      return toReservation(row);
    } catch (error) {
      // reference collision: try another code
      if (!(error instanceof Error && /unique/i.test(error.message))) throw error;
    }
  }
  throw new Error("Could not allocate a reservation reference.");
}

/** Reservations from `fromDate` on (default: today in Berlin), oldest first. */
export async function listReservations(fromDate?: string) {
  const rows = (fromDate
    ? await db()`select * from reservations where date >= ${fromDate} order by date, time, id`
    : await db()`select * from reservations where date >= (now() at time zone 'Europe/Berlin')::date order by date, time, id`) as Row[];
  return rows.map(toReservation);
}

export async function setStatus(id: number, status: Status, staffNote: string) {
  const [row] = (await db()`
    update reservations set status = ${status}, staff_note = ${staffNote}, updated_at = now()
    where id = ${id} returning *
  `) as Row[];
  return row ? toReservation(row) : null;
}

/** Data retention: personal data of reservations older than 180 days is removed. */
export async function purgeOld() {
  const rows = (await db()`delete from reservations where date < (now() at time zone 'Europe/Berlin')::date - 180 returning id`) as { id: string }[];
  return rows.length;
}
