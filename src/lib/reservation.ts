import { restaurant } from "./data";

export type Reservation = {
  name: string;
  phone: string;
  date: string; // yyyy-mm-dd
  time: string; // hh:mm
  guests: number;
  note: string;
};

export type ReservationErrors = Partial<Record<keyof Reservation, string>>;

// TODO: Confirm the real opening hours; slots currently run from opening (11:00) to 21:30.
export const timeSlots = Array.from({ length: 22 }, (_, i) => {
  const minutes = 11 * 60 + i * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
});

export const todayISO = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

export function validate(r: Reservation): ReservationErrors {
  const e: ReservationErrors = {};
  if (r.name.trim().length < 2) e.name = "Bitte geben Sie Ihren Namen an.";
  if (r.phone.replace(/[^\d+]/g, "").length < 6) e.phone = "Bitte geben Sie eine Telefonnummer an, unter der wir Sie erreichen.";
  if (!r.date) e.date = "Bitte wählen Sie ein Datum.";
  else if (r.date < todayISO()) e.date = "Das Datum liegt in der Vergangenheit.";
  if (!r.time) e.time = "Bitte wählen Sie eine Uhrzeit.";
  if (r.guests < 1 || r.guests > 20) e.guests = "Für mehr als 20 Personen rufen Sie uns bitte an.";
  return e;
}

const formatDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

/**
 * Delivery channel for a request. Today it opens WhatsApp with a prefilled message to the restaurant's
 * mobile number; swap this one function for an email/API call once a booking backend exists.
 */
export function reservationLink(r: Reservation) {
  const lines = [
    "Hallo Yetenbi, ich möchte gerne einen Tisch reservieren:",
    "",
    `Name: ${r.name.trim()}`,
    `Datum: ${formatDate(r.date)}`,
    `Uhrzeit: ${r.time} Uhr`,
    `Personen: ${r.guests}`,
    `Telefon: ${r.phone.trim()}`,
    ...(r.note.trim() ? [`Anmerkung: ${r.note.trim()}`] : []),
  ];
  const number = restaurant.phoneHref.replace("tel:+", "");
  return `https://wa.me/${number}?text=${encodeURIComponent(lines.join("\n"))}`;
}
