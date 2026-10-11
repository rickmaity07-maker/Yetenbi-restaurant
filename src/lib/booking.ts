import { restaurant } from "./data";
import { toMinutes, weekdayOf, WEEK, type DayHours } from "./hours";
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

export type BookingErrorCode =
  "date" | "past" | "far" | "closed" | "time" | "slot" | "guests" | "tooMany" | "name" | "email" | "phone" | "note";
export type BookingErrors = Partial<Record<keyof BookingRequest, BookingErrorCode>>;

/** 1110 → "18:30" (minutes since midnight to a clock time). */
function clockTime(minutesOfDay: number) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(Math.floor(minutesOfDay / 60))}:${pad(minutesOfDay % 60)}`;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const PHONE_PATTERN = /^[+\d][\d\s()/-]{5,24}$/;

/** Today's date in Berlin as YYYY-MM-DD. */
export function todayISO(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin" }).format(now);
}

/** "2026-10-30" + 3 days → "2026-11-02". */
export function addDays(isoDate: string, days: number) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** Bookable start times on a date: every half hour from opening to the last seating (none on closed days). */
export function slotsFor(date: string, closures: string[] = [], week: DayHours[] = WEEK) {
  if (!DATE_PATTERN.test(date) || closures.includes(date)) return [];
  const hours = week[weekdayOf(date)];
  if (!hours) return [];
  const firstSeating = toMinutes(hours.open);
  const lastSeating = toMinutes(hours.close) - BOOKING.lastSeatingBeforeClose;
  const slots: string[] = [];
  for (let minute = firstSeating; minute <= lastSeating; minute += BOOKING.intervalMinutes)
    slots.push(clockTime(minute));
  return slots;
}

export function validateBooking(
  input: Partial<BookingRequest>,
  today = todayISO(),
  closures: string[] = [],
  options: { emailOptional?: boolean; week?: DayHours[] } = {},
): BookingErrors {
  const week = options.week ?? WEEK;
  const errors: BookingErrors = {};

  if (!input.date || !DATE_PATTERN.test(input.date)) errors.date = "date";
  else if (input.date < today) errors.date = "past";
  else if (input.date > addDays(today, BOOKING.maxDaysAhead)) errors.date = "far";
  else if (!week[weekdayOf(input.date)] || closures.includes(input.date)) errors.date = "closed";

  if (!input.time) errors.time = "time";
  else if (input.date && !errors.date && !slotsFor(input.date, closures, week).includes(input.time))
    errors.time = "slot";

  if (!input.guests || input.guests < 1) errors.guests = "guests";
  else if (input.guests > BOOKING.maxGuests) errors.guests = "tooMany";

  if (!input.name || input.name.trim().length < 2 || input.name.length > 80) errors.name = "name";

  // Phone bookings entered by the team may have no email; a given address must still be valid.
  if (input.email) {
    if (input.email.length > 120 || !isEmail(input.email)) errors.email = "email";
  } else if (!options.emailOptional) {
    errors.email = "email";
  }

  if (!input.phone || !PHONE_PATTERN.test(input.phone.trim())) errors.phone = "phone";
  if (input.note && input.note.length > 280) errors.note = "note";
  return errors;
}

/** Fallback when no database is connected: the request goes out as a prepared WhatsApp message. */
export function whatsappLink(request: BookingRequest, dateLabel: string) {
  const lines = [
    "Hallo Yetenbi, ich möchte gerne einen Tisch reservieren:",
    "",
    `Name: ${request.name.trim()}`,
    `Datum: ${dateLabel}`,
    `Uhrzeit: ${request.time} Uhr`,
    `Personen: ${request.guests}`,
    `Telefon: ${request.phone.trim()}`,
    `E-Mail: ${request.email.trim()}`,
    ...(request.note.trim() ? [`Anmerkung: ${request.note.trim()}`] : []),
  ];
  return `https://wa.me/${restaurant.phoneHref.replace("tel:+", "")}?text=${encodeURIComponent(lines.join("\n"))}`;
}
