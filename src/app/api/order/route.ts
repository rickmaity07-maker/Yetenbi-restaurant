import { after } from "next/server";
import { todayISO } from "@/lib/booking";
import { LOCALES, type Locale } from "@/lib/i18n";
import { validateOrder, type OrderInput } from "@/lib/ordering";
import { getCurrentUser } from "@/lib/server/auth";
import { upcomingClosures } from "@/lib/server/closures";
import { hasDatabase } from "@/lib/server/db";
import { notifyRestaurantOrder, orderStatusUrl, sendOrderEmail } from "@/lib/server/mailer";
import { createOrder, getOrderSettings, recentOrdersByPhone } from "@/lib/server/orders";

/* Places an online order. Everything is re-validated and re-priced here; the browser's totals are ignored. */
export async function POST(request: Request) {
  if (!hasDatabase()) return Response.json({ code: "unavailable" }, { status: 503 });
  let body: Partial<OrderInput> & { locale?: string; website?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ code: "invalid" }, { status: 400 });
  }
  if (body.website) return Response.json({ code: "invalid" }, { status: 400 }); // honeypot

  const input: OrderInput = {
    method: body.method === "pickup" ? "pickup" : "delivery",
    items: Array.isArray(body.items) ? body.items.slice(0, 60).map((l) => ({ id: String(l?.id ?? ""), qty: Number(l?.qty) })) : [],
    name: String(body.name ?? ""),
    phone: String(body.phone ?? ""),
    email: String(body.email ?? "").trim(),
    street: String(body.street ?? ""),
    postcode: String(body.postcode ?? ""),
    city: String(body.city ?? ""),
    addressNote: String(body.addressNote ?? ""),
    note: String(body.note ?? ""),
    payment: body.payment === "card" ? "card" : "cash",
    wanted: String(body.wanted ?? "asap"),
  };
  const locale: Locale = (LOCALES as readonly string[]).includes(body.locale ?? "") ? (body.locale as Locale) : "de";

  const [settings, closures] = await Promise.all([getOrderSettings(), upcomingClosures()]);
  const closedToday = closures.some((c) => c.date === todayISO());
  const errors = validateOrder(input, settings, closedToday);
  if (Object.keys(errors).length) return Response.json({ code: "errors", errors }, { status: 422 });

  // Each order rings the kitchen: at most 3 orders per phone number per hour.
  if ((await recentOrdersByPhone(input.phone)) >= 3) return Response.json({ code: "busy" }, { status: 429 });

  const me = await getCurrentUser();
  const order = await createOrder(input, settings, locale, me?.id ?? null);
  const origin = new URL(request.url).origin;
  after(async () => {
    await notifyRestaurantOrder(order, origin);
    await sendOrderEmail("received", order, origin);
  });
  return Response.json({ reference: order.reference, statusUrl: orderStatusUrl("", order) }, { status: 201 });
}
