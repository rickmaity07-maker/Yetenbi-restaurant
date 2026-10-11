import "server-only";
import { restaurant } from "@/lib/data";
import type { Reservation } from "../reservations";

// The .ics calendar file attached to a booking confirmation.

const VISIT_LENGTH_MS = 2 * 60 * 60 * 1000;

/** Converts a Würzburg wall-clock time to the real moment in UTC (handles summer time). */
function berlinTimeToUtc(date: string, time: string) {
  const guess = new Date(`${date}T${time}:00Z`);
  const berlin = new Date(guess.toLocaleString("en-US", { timeZone: "Europe/Berlin" }));
  const utc = new Date(guess.toLocaleString("en-US", { timeZone: "UTC" }));
  return new Date(guess.getTime() - (berlin.getTime() - utc.getTime()));
}

/** 2026-10-16T18:30:00.000Z → 20261016T183000Z */
function icsTimestamp(date: Date) {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

export function calendarFile(reservation: Reservation) {
  const start = berlinTimeToUtc(reservation.date, reservation.time);
  const end = new Date(start.getTime() + VISIT_LENGTH_MS);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Yetenbi//Reservierung//DE",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${reservation.reference}@yetenbi`,
    `DTSTAMP:${icsTimestamp(new Date())}`,
    `DTSTART:${icsTimestamp(start)}`,
    `DTEND:${icsTimestamp(end)}`,
    `SUMMARY:Yetenbi (${reservation.guests})`,
    `LOCATION:Yetenbi\\, ${restaurant.street}\\, ${restaurant.city}`,
    `DESCRIPTION:${reservation.reference}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
