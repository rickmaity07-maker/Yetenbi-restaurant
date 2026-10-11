import { after } from "next/server";
import { todayISO } from "@/lib/booking";
import { LOCALES, type Locale } from "@/lib/i18n";
import { totals, validateOrder, type OrderInput } from "@/lib/ordering";
import { getCurrentUser } from "@/lib/server/auth";
import { upcomingClosures } from "@/lib/server/closures";
import { hasDatabase } from "@/lib/server/db";
import { notifyRestaurantOrder, orderStatusUrl, sendOrderEmail } from "@/lib/server/email";
import { checkOrder, clientHash, phoneKey } from "@/lib/server/order-guard";
import { createOrder, getOrderSettings } from "@/lib/server/orders";
import { getMenu } from "@/lib/server/menu";
import { catalogOf } from "@/lib/menu";
import { getBusiness } from "@/lib/server/business";

/*
  Places an online order. Only signed-in guests can order; the order goes to the account's email address.
  Everything is re-validated and re-priced here; the browser's totals are ignored.
*/
/** One line per dish, so sending the same dish twice can't get around the per-dish maximum. */
function mergeLines(lines: unknown[]) {
  const quantities = new Map<string, number>();
  for (const line of lines as { id?: unknown; qty?: unknown }[]) {
    const id = String(line?.id ?? "");
    quantities.set(id, (quantities.get(id) ?? 0) + Number(line?.qty));
  }
  return [...quantities].map(([id, qty]) => ({ id, qty }));
}

export async function POST(request: Request) {
  if (!hasDatabase()) return Response.json({ code: "unavailable" }, { status: 503 });
  const me = await getCurrentUser();
  if (!me) return Response.json({ code: "login" }, { status: 401 });
  let body: Partial<OrderInput> & { locale?: string; website?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ code: "invalid" }, { status: 400 });
  }
  if (body.website) return Response.json({ code: "invalid" }, { status: 400 }); // honeypot

  const input: OrderInput = {
    method: body.method === "pickup" ? "pickup" : "delivery",
    items: mergeLines(Array.isArray(body.items) ? body.items.slice(0, 60) : []),
    name: String(body.name ?? ""),
    phone: String(body.phone ?? ""),
    email: me.email,
    street: String(body.street ?? ""),
    postcode: String(body.postcode ?? ""),
    city: String(body.city ?? "").slice(0, 80),
    addressNote: String(body.addressNote ?? ""),
    note: String(body.note ?? ""),
    payment: body.payment === "card" ? "card" : "cash",
    wanted: String(body.wanted ?? "asap"),
  };
  const locale: Locale = (LOCALES as readonly string[]).includes(body.locale ?? "") ? (body.locale as Locale) : "de";

  const [settings, closures, menu, business] = await Promise.all([
    getOrderSettings(),
    upcomingClosures(),
    getMenu(),
    getBusiness(),
  ]);
  const catalog = catalogOf(menu);
  const closedToday = closures.some((closure) => closure.date === todayISO());
  const errors = validateOrder(input, settings, catalog, closedToday, new Date(), business.hours);
  if (Object.keys(errors).length) return Response.json({ code: "errors", errors }, { status: 422 });

  // Each order rings the kitchen: blocked guests, floods and very large first orders are stopped here (see order-guard).
  const guard = { phoneKey: phoneKey(input.phone), clientHash: clientHash(request) };
  const blockedBy = await checkOrder({
    ...guard,
    email: input.email,
    total: totals(input.items, input.method, settings, catalog).total,
  });
  if (blockedBy) {
    const status = { blocked: 403, busy: 429, kitchen: 429, large: 422 }[blockedBy];
    return Response.json({ code: blockedBy }, { status });
  }

  const order = await createOrder(input, settings, locale, me.id, guard, catalog);
  const origin = new URL(request.url).origin;
  after(async () => {
    await notifyRestaurantOrder(order, origin);
    await sendOrderEmail("received", order, origin);
  });
  return Response.json({ reference: order.reference, statusUrl: orderStatusUrl("", order) }, { status: 201 });
}
