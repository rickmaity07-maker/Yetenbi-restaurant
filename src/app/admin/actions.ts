"use server";

import { revalidatePath } from "next/cache";
import { validateBooking, type BookingRequest } from "@/lib/booking";
import { requireOwner } from "@/lib/server/auth";
import { addClosure, removeClosure, upcomingClosures } from "@/lib/server/closures";
import { sendGuestEmail } from "@/lib/server/mailer";
import { createReservation, setStatus, type Status } from "@/lib/server/reservations";

export type AdminState = { error?: string; ok?: string } | null;

/** Accept, decline or cancel a request; the guest is emailed in their language. */
export async function decide(form: FormData) {
  await requireOwner();
  const id = Number(form.get("id"));
  const status = String(form.get("status")) as Status;
  const note = String(form.get("note") ?? "").slice(0, 400).trim();
  if (!Number.isInteger(id) || !["confirmed", "declined", "cancelled", "pending"].includes(status)) return;
  const reservation = await setStatus(id, status, note);
  if (reservation && (status === "confirmed" || status === "declined")) await sendGuestEmail(status, reservation);
  revalidatePath("/admin");
}

/** A reservation taken by phone: confirmed straight away, email optional. */
export async function addPhoneBooking(_: AdminState, form: FormData): Promise<AdminState> {
  await requireOwner();
  const input: BookingRequest = {
    date: String(form.get("date") ?? ""),
    time: String(form.get("time") ?? ""),
    guests: Number(form.get("guests")),
    name: String(form.get("name") ?? "").trim(),
    email: String(form.get("email") ?? "").trim().toLowerCase(),
    phone: String(form.get("phone") ?? "").trim(),
    note: String(form.get("note") ?? "").trim(),
  };
  const closures = (await upcomingClosures()).map((c) => c.date);
  const errors = validateBooking(input, undefined, closures, { emailOptional: true });
  const labels: Record<string, string> = {
    date: "Datum fehlt oder liegt in der Vergangenheit.",
    past: "Das Datum liegt in der Vergangenheit.",
    far: "Höchstens 90 Tage im Voraus.",
    closed: "An diesem Tag ist geschlossen.",
    time: "Uhrzeit fehlt.",
    slot: "Zu dieser Uhrzeit sind keine Reservierungen möglich.",
    guests: "Personenzahl fehlt.",
    tooMany: "Mehr als 12 Personen bitte direkt planen.",
    name: "Name fehlt.",
    email: "Die E-Mail-Adresse ist ungültig.",
    phone: "Telefonnummer fehlt oder ist ungültig.",
    note: "Anmerkung zu lang.",
  };
  const first = Object.values(errors)[0];
  if (first) return { error: labels[first] };
  const reservation = await createReservation(input, "de", { source: "phone", status: "confirmed" });
  if (reservation.email) await sendGuestEmail("confirmed", reservation);
  revalidatePath("/admin");
  return { ok: `Eingetragen: ${reservation.reference}` };
}

export async function addClosedDay(_: AdminState, form: FormData): Promise<AdminState> {
  await requireOwner();
  const date = String(form.get("date") ?? "");
  const note = String(form.get("note") ?? "").trim().slice(0, 120);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Bitte ein Datum wählen." };
  await addClosure(date, note);
  revalidatePath("/admin");
  return { ok: "Schließtag gespeichert." };
}

export async function removeClosedDay(form: FormData) {
  await requireOwner();
  await removeClosure(String(form.get("date") ?? ""));
  revalidatePath("/admin");
}
