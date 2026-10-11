/*
  Opening hours, Monday first. WEEK is the starting value; the owner edits the hours in /admin (lib/business),
  and the helpers below take the current week as a parameter.
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
export function groupedHours(week: DayHours[] = WEEK) {
  const rows: { days: number[]; hours: DayHours }[] = [];
  week.forEach((hours, day) => {
    const previous = rows[rows.length - 1];
    const continuesPrevious =
      previous && JSON.stringify(previous.hours) === JSON.stringify(hours) && previous.days.at(-1) === day - 1;
    if (continuesPrevious) previous.days.push(day);
    else rows.push({ days: [day], hours });
  });
  return rows;
}

/** Monday-first weekday index for a YYYY-MM-DD string, read as a calendar date (no time-zone drift). */
export function weekdayOf(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  const sundayFirst = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return (sundayFirst + 6) % 7;
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
  const part = (type: string) => parts.find((candidate) => candidate.type === type)?.value ?? "";
  const day = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(part("weekday"));
  return { day, minutes: Number(part("hour")) * 60 + Number(part("minute")) };
}

/** "18:30" → 1110 (minutes since midnight). */
export const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

/** Whether the restaurant is open right now, and when it next opens or closes. */
export function openState(now = new Date(), week: DayHours[] = WEEK) {
  const { day, minutes } = berlinNow(now);
  const today = week[day];
  if (today && minutes >= toMinutes(today.open) && minutes < toMinutes(today.close))
    return { open: true as const, until: today.close };
  if (today && minutes < toMinutes(today.open)) return { open: false as const, day, at: today.open };
  for (let daysAhead = 1; daysAhead <= 7; daysAhead++) {
    const nextDay = (day + daysAhead) % 7;
    if (week[nextDay]) return { open: false as const, day: nextDay, at: week[nextDay]!.open };
  }
  return { open: false as const, day, at: "" };
}
