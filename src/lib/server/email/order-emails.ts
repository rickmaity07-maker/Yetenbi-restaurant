import "server-only";
import { siteUrl } from "@/lib/site-url";
import type { Order } from "../orders";
import {
  button,
  emailLayout,
  escapeHtml,
  formatEuro,
  list,
  paragraph,
  priceTable,
  quote,
  smallPrint,
  textLink,
} from "./html";
import { isMailerConfigured, restaurantInbox, sendEmail } from "./send";
import { orderTexts, type OrderEmailKind } from "./texts";

/** Link to the page where the guest follows their order live. */
export function orderStatusUrl(origin: string, order: Order) {
  return `${origin}/bestellung?r=${encodeURIComponent(order.reference)}&t=${order.statusToken}`;
}

function orderPriceTable(order: Order, totalLabel: string) {
  const lines: [string, number][] = order.items.map((line) => [`${line.qty} × ${line.name}`, line.qty * line.unit]);
  const extras: [string, number][] = [];
  if (order.deposit) extras.push(["+ Pfand", order.deposit]);
  if (order.deliveryFee) extras.push(["+ Lieferung", order.deliveryFee]);
  return priceTable(lines, extras, totalLabel, order.total);
}

function wantedTime(order: Order) {
  return order.wanted === "asap" ? "so schnell wie möglich" : `${order.wanted} Uhr`;
}

function methodName(order: Order) {
  return order.method === "delivery" ? "Lieferung" : "Abholung";
}

/** Every step of an order, to the guest in their language. */
export async function sendOrderEmail(kind: OrderEmailKind, order: Order, origin = siteUrl()) {
  if (!isMailerConfigured() || !order.email) return;

  const text = orderTexts[order.locale];
  const { subject, intro } = text[kind](order);

  let body = paragraph(intro);
  if (order.staffNote) body += quote(order.staffNote);
  if (kind !== "rejected" && kind !== "cancelled") body += orderPriceTable(order, text.total);
  body += button(orderStatusUrl(origin, order), text.status);
  if (kind === "received" || kind === "accepted") {
    body += smallPrint(`${escapeHtml(text.terms)} ${textLink(`${origin}/bestellbedingungen`, text.termsLink)}`);
  }

  await sendEmail(
    {
      to: order.email,
      replyTo: restaurantInbox(),
      subject,
      html: emailLayout(`${escapeHtml(order.name)},`, body),
    },
    `guest order ${kind} ${order.reference}`,
  );
}

/** A new order, to the restaurant. */
export async function notifyRestaurantOrder(order: Order, origin = siteUrl()) {
  if (!isMailerConfigured()) return;

  let address = "Abholung";
  if (order.method === "delivery") {
    address = `${order.street}, ${order.postcode} ${order.city}`;
    if (order.addressNote) address += ` (${order.addressNote})`;
  }
  const payment = order.payment === "cash" ? "bar" : "Karte bei Übergabe";

  let body =
    `<p style="margin:0"><strong>${escapeHtml(order.name)}</strong> · ${escapeHtml(order.phone)}<br>` +
    `${escapeHtml(address)}<br>Zeit: ${escapeHtml(wantedTime(order))} · Zahlung: ${payment}</p>`;
  if (order.note) body += quote(order.note);
  body += orderPriceTable(order, "Summe");
  body += button(`${origin}/admin/bestellungen`, "Bestellung annehmen");

  await sendEmail(
    {
      to: restaurantInbox(),
      replyTo: order.email || undefined,
      subject: `Neue Bestellung ${order.reference}: ${methodName(order)}, ${formatEuro(order.total)}`,
      html: emailLayout("Neue Bestellung", body),
    },
    `restaurant new order ${order.reference}`,
  );
}

type StaffEmailKind = "kitchen" | "packed" | "driver" | "completed";

/** Subject, heading and body of each email to the team. Each one contains only what that person needs. */
function staffEmail(kind: StaffEmailKind, order: Order, origin: string) {
  const method = methodName(order);
  switch (kind) {
    // To every kitchen account when an order is accepted: the food only, no prices or guest details.
    case "kitchen": {
      let timing = `${method} · ${wantedTime(order)}`;
      if (order.etaMinutes) timing += ` · fertig in ca. ${order.etaMinutes} Min.`;
      let body = paragraph(timing);
      body += list(order.items.map((line) => `${line.qty} × ${line.name}`));
      if (order.note) body += quote(order.note);
      body += button(`${origin}/kueche`, "Zur Küche");
      return {
        subject: `Küche: ${order.reference} zubereiten (${method})`,
        heading: "Neue Bestellung für die Küche",
        body,
      };
    }

    // To the restaurant when the kitchen has packed an order.
    case "packed": {
      const next = order.method === "delivery" ? "Bitte einem Fahrer übergeben." : "Bitte als abholbereit markieren.";
      const body =
        paragraph(`${order.name} · ${method} · ${formatEuro(order.total)}`) +
        paragraph(next, "margin-top:8px") +
        button(`${origin}/admin/bestellungen`, "Zur Verwaltung");
      return { subject: `${order.reference} ist verpackt (${method})`, heading: "Bereit zur Übergabe", body };
    }

    // To the driver the order was handed to: where to go and how much to collect.
    case "driver": {
      let address = `${escapeHtml(order.street)}, ${escapeHtml(order.postcode)} ${escapeHtml(order.city)}`;
      if (order.addressNote) address += `<br><em>${escapeHtml(order.addressNote)}</em>`;
      const phone = `<a href="tel:${escapeHtml(order.phone)}" style="color:#e7cd8a">${escapeHtml(order.phone)}</a>`;
      const collect = order.payment === "cash" ? "Bar kassieren" : "Kartenzahlung bei Übergabe";
      const body =
        `<p style="margin:0"><strong>${escapeHtml(order.name)}</strong> · ${phone}<br>${address}</p>` +
        `<p style="margin:12px 0 0">${collect}: <strong>${formatEuro(order.total)}</strong></p>` +
        button(`${origin}/lieferung`, "Zu meinen Lieferungen");
      return { subject: `Lieferung ${order.reference}: ${order.street}`, heading: "Neue Lieferung für dich", body };
    }

    // To the restaurant when an order has been delivered or picked up.
    case "completed": {
      const delivered = order.method === "delivery";
      let summary = `${order.name} · ${method} · ${formatEuro(order.total)} (${order.payment === "cash" ? "bar" : "Karte"})`;
      if (order.driverName) summary += ` · Fahrer: ${order.driverName}`;
      return {
        subject: `${order.reference} ${delivered ? "geliefert" : "abgeholt"}`,
        heading: delivered ? "Zugestellt" : "Abgeholt",
        body: paragraph(summary) + button(`${origin}/admin/bestellungen`, "Zur Verwaltung"),
      };
    }
  }
}

export async function notifyStaffOrder(
  kind: StaffEmailKind,
  order: Order,
  recipients: (string | undefined)[],
  origin = siteUrl(),
) {
  const addresses = [...new Set(recipients.filter((address): address is string => Boolean(address)))];
  if (!isMailerConfigured() || addresses.length === 0) return;

  const { subject, heading, body } = staffEmail(kind, order, origin);
  await sendEmail(
    { to: addresses.join(", "), subject, html: emailLayout(heading, body) },
    `staff ${kind} ${order.reference}`,
  );
}
