/*
  Opening hours (from the restaurant's Google listing), Monday first.
  Used by the visit section, the facts list, the booking rules and the structured data for search engines.
*/

export type DayHours = { open: string; close: string } | null;

export const WEEK: DayHours[] = [
  { open: "11:00", close: "22:00" }, // Montag
  { open: "11:00", close: "22:00" }, // Dienstag
  { open: "16:00", close: "22:00" }, // Mittwoch
  { open: "11:00", close: "22:00" }, // Donnerstag
  { open: "11:00", close: "22:00" }, // Freitag
  { open: "11:00", close: "22:00" }, // Samstag
  { open: "16:00", close: "22:00" }, // Sonntag
];

/** Schema.org day names, Monday first (for JSON-LD). */
export const SCHEMA_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** Rows for display: consecutive days with the same hours are grouped ("Mo, Di", "Do–Sa"). */
export function groupedHours() {
  const rows: { days: number[]; hours: DayHours }[] = [];
  WEEK.forEach((h, i) => {
    const last = rows[rows.length - 1];
    const same = last && JSON.stringify(last.hours) === JSON.stringify(h) && last.days[last.days.length - 1] === i - 1;
    if (same) last.days.push(i);
    else rows.push({ days: [i], hours: h });
  });
  return rows;
}

/** Monday-first weekday index for a YYYY-MM-DD string, read as a calendar date (no time-zone drift). */
export function weekdayOf(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

/** Current Berlin time as weekday index and minutes since midnight. */
export function berlinNow(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Berlin",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const day = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(get("weekday"));
  return { day, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

export const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

/** Whether the restaurant is open right now, and when it next opens or closes. */
export function openState(now = new Date()) {
  const { day, minutes } = berlinNow(now);
  const today = WEEK[day];
  if (today && minutes >= toMinutes(today.open) && minutes < toMinutes(today.close)) return { open: true as const, until: today.close };
  if (today && minutes < toMinutes(today.open)) return { open: false as const, day, at: today.open };
  for (let k = 1; k <= 7; k++) {
    const d = (day + k) % 7;
    if (WEEK[d]) return { open: false as const, day: d, at: WEEK[d]!.open };
  }
  return { open: false as const, day, at: "" };
}
