import { after } from "next/server";
import { validateBooking, type BookingRequest } from "@/lib/booking";
import { LOCALES, type Locale } from "@/lib/i18n";
import { hasDatabase } from "@/lib/server/db";
import { notifyRestaurant, sendGuestEmail } from "@/lib/server/mailer";
import { createReservation, recentCount } from "@/lib/server/reservations";
import { upcomingClosures } from "@/lib/server/closures";
import { getCurrentUser } from "@/lib/server/auth";

/*
  Reservation requests from the website. A valid request is stored as "pending", the guest gets a
  receipt and the restaurant a notification; the owner accepts or declines it in /admin.
  Without a database the form falls back to WhatsApp (the client sees 503 "unavailable").
*/
export async function POST(request: Request) {
  if (!hasDatabase()) return Response.json({ code: "unavailable" }, { status: 503 });

  let body: Partial<BookingRequest> & { locale?: string; website?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ code: "invalid" }, { status: 400 });
  }

  // Honeypot: real visitors never see or fill the "website" field.
  if (body.website) return Response.json({ reference: "YT-0000" }, { status: 201 });

  const clean: BookingRequest = {
    date: String(body.date ?? ""),
    time: String(body.time ?? ""),
    guests: Number(body.guests),
    name: String(body.name ?? "").trim(),
    email: String(body.email ?? "").trim().toLowerCase(),
    phone: String(body.phone ?? "").trim(),
    note: String(body.note ?? "").trim(),
  };
  const locale: Locale = (LOCALES as readonly string[]).includes(body.locale ?? "") ? (body.locale as Locale) : "de";

  const closures = (await upcomingClosures()).map((c) => c.date);
  const errors = validateBooking(clean, undefined, closures);
  if (Object.keys(errors).length) return Response.json({ code: "errors", errors }, { status: 422 });

  // Each request emails the restaurant, so one address can't flood it: 3 open requests, 10 a day.
  const recent = await recentCount(clean.email);
  if (recent.open >= 3 || recent.day >= 10) return Response.json({ code: "busy" }, { status: 429 });

  const me = await getCurrentUser();
  const reservation = await createReservation(clean, locale, { userId: me?.id ?? null });
  const origin = new URL(request.url).origin;
  after(async () => {
    await notifyRestaurant(reservation, origin);
    await sendGuestEmail("received", reservation, origin);
  });

  return Response.json({ reference: reservation.reference }, { status: 201 });
}
