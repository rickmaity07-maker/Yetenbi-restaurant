import { restaurant } from "./data";
import { toMinutes, weekdayOf, WEEK } from "./hours";
import { isEmail } from "./validate";

/*
  Booking rules shared by the form, the API route and the admin page, so all three agree.
  Validation returns codes, not sentences, so each language can word them (see lib/i18n).
*/

export const BOOKING = {
  intervalMinutes: 30,
  lastSeatingBeforeClose: 90, // last table 90 minutes before closing
  maxGuests: 12,
  maxDaysAhead: 90,
};

export type BookingRequest = {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  guests: number;
  name: string;
  email: string;
  phone: string;
  note: string;
};

export type BookingErrorCode = "date" | "past" | "far" | "closed" | "time" | "slot" | "guests" | "tooMany" | "name" | "email" | "phone" | "note";
export type BookingErrors = Partial<Record<keyof BookingRequest, BookingErrorCode>>;

const pad = (n: number) => String(n).padStart(2, "0");
const fromMinutes = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

/** Today's date in Berlin as YYYY-MM-DD. */
export function todayISO(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(now);
}

export function addDays(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return t.toISOString().slice(0, 10);
}

/** Bookable start times on a date: every half hour from opening to the last seating (none on closed days). */
export function slotsFor(date: string, closures: string[] = []) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || closures.includes(date)) return [];
  const day = WEEK[weekdayOf(date)];
  if (!day) return [];
  const start = toMinutes(day.open);
  const end = toMinutes(day.close) - BOOKING.lastSeatingBeforeClose;
  const out: string[] = [];
  for (let m = start; m <= end; m += BOOKING.intervalMinutes) out.push(fromMinutes(m));
  return out;
}

export function validateBooking(
  input: Partial<BookingRequest>,
  today = todayISO(),
  closures: string[] = [],
  options: { emailOptional?: boolean } = {},
): BookingErrors {
  const e: BookingErrors = {};
  if (!input.date || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) e.date = "date";
  else if (input.date < today) e.date = "past";
  else if (input.date > addDays(today, BOOKING.maxDaysAhead)) e.date = "far";
  else if (!WEEK[weekdayOf(input.date)] || closures.includes(input.date)) e.date = "closed";

  if (!input.time) e.time = "time";
  else if (input.date && !e.date && !slotsFor(input.date, closures).includes(input.time)) e.time = "slot";

  if (!input.guests || input.guests < 1) e.guests = "guests";
  else if (input.guests > BOOKING.maxGuests) e.guests = "tooMany";

  if (!input.name || input.name.trim().length < 2 || input.name.length > 80) e.name = "name";
  const emailMissing = !input.email;
  if ((emailMissing && !options.emailOptional) || (!emailMissing && (input.email!.length > 120 || !isEmail(input.email!)))) e.email = "email";
  if (!input.phone || !/^[+\d][\d\s()/-]{5,24}$/.test(input.phone.trim())) e.phone = "phone";
  if (input.note && input.note.length > 280) e.note = "note";
  return e;
}

/** Fallback when no database is connected: the request goes out as a prepared WhatsApp message. */
export function whatsappLink(r: BookingRequest, dateLabel: string) {
  const lines = [
    "Hallo Yetenbi, ich möchte gerne einen Tisch reservieren:",
    "",
    `Name: ${r.name.trim()}`,
    `Datum: ${dateLabel}`,
    `Uhrzeit: ${r.time} Uhr`,
    `Personen: ${r.guests}`,
    `Telefon: ${r.phone.trim()}`,
    `E-Mail: ${r.email.trim()}`,
    ...(r.note.trim() ? [`Anmerkung: ${r.note.trim()}`] : []),
  ];
  return `https://wa.me/${restaurant.phoneHref.replace("tel:+", "")}?text=${encodeURIComponent(lines.join("\n"))}`;
}
