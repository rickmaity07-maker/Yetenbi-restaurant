import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { restaurant } from "@/lib/data";
import type { Locale } from "@/lib/i18n";
import type { Reservation } from "./reservations";
import type { Order } from "./orders";
import { cancelUrl } from "./cancel-token";
import { siteUrl } from "@/lib/site-url";

/*
  Booking emails, sent through a Gmail account with 2-Step Verification and an App Password
  (myaccount.google.com/apppasswords). SMTP_HOST switches to any other mail server.

  To the guest, in the language they booked in:  received · confirmed (+ calendar file) · declined
  To the restaurant (RESERVATION_NOTIFY_EMAIL):   every new request, with a link to /admin
  Orders: the guest gets every step; kitchen and drivers get what they need (notifyStaffOrder).

  Nothing is sent until GMAIL_USER, GMAIL_APP_PASSWORD and RESERVATION_NOTIFY_EMAIL are set,
  and an email failure never loses or blocks a booking.
*/

let transporter: Transporter | null = null;

export const isMailerConfigured = () =>
  Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD && process.env.RESERVATION_NOTIFY_EMAIL);

function mailer() {
  const auth = { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD };
  transporter ??= process.env.SMTP_HOST
    ? nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT ?? 587), secure: process.env.SMTP_PORT === "465", auth })
    : nodemailer.createTransport({ service: "gmail", auth });
  return transporter;
}

const from = () => `${process.env.GMAIL_FROM_NAME ?? "Yetenbi Restaurant & Café"} <${process.env.GMAIL_USER}>`;
const esc = (v: string) => v.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const dateLocale: Record<Locale, string> = { de: "de-DE", en: "en-GB", am: "am-ET" };
const longDate = (date: string, locale: Locale) =>
  new Date(`${date}T12:00:00Z`).toLocaleDateString(dateLocale[locale], { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/* ---------- copy ---------- */

type Kind = "received" | "confirmed" | "declined";

const copy: Record<Locale, Record<Kind, { subject: (r: Reservation) => string; intro: string }> & { labels: string[]; outro: string; staffNote: string; cancel: string }> = {
  de: {
    received: { subject: (r) => `Eure Anfrage bei Yetenbi (${r.reference})`, intro: "danke für eure Anfrage. Sie ist bei uns angekommen, wir melden uns, sobald der Tisch fest ist." },
    confirmed: { subject: (r) => `Bestätigt: euer Tisch bei Yetenbi (${r.reference})`, intro: "euer Tisch ist reserviert. Wir freuen uns auf euch! Im Anhang findet ihr einen Kalendereintrag." },
    declined: { subject: (r) => `Eure Anfrage bei Yetenbi (${r.reference})`, intro: "leider können wir zu dieser Zeit keinen Tisch anbieten. Ruft uns gerne an, dann finden wir eine andere Zeit." },
    labels: ["Datum", "Uhrzeit", "Personen", "Nummer"],
    outro: "Bis bald in der Theaterstraße 6, Würzburg.",
    staffNote: "Nachricht vom Restaurant",
    cancel: "Doch verhindert? Hier könnt ihr die Reservierung stornieren.",
  },
  en: {
    received: { subject: (r) => `Your request at Yetenbi (${r.reference})`, intro: "thank you for your request. It has reached us, and we'll be in touch as soon as your table is set." },
    confirmed: { subject: (r) => `Confirmed: your table at Yetenbi (${r.reference})`, intro: "your table is booked. We look forward to seeing you! A calendar entry is attached." },
    declined: { subject: (r) => `Your request at Yetenbi (${r.reference})`, intro: "unfortunately we can't offer a table at that time. Give us a call and we'll find another one." },
    labels: ["Date", "Time", "Guests", "Reference"],
    outro: "See you soon at Theaterstraße 6, Würzburg.",
    staffNote: "Message from the restaurant",
    cancel: "Can't make it after all? Cancel your reservation here.",
  },
  am: {
    received: { subject: (r) => `ጥያቄዎ ደርሶናል – Yetenbi (${r.reference})`, intro: "ስለ ጥያቄዎ እናመሰግናለን። ደርሶናል፤ ቦታው ሲዘጋጅ እናሳውቅዎታለን።" },
    confirmed: { subject: (r) => `ተረጋግጧል፦ ቦታዎ በYetenbi (${r.reference})`, intro: "ቦታዎ ተይዟል። በጉጉት እንጠብቅዎታለን! የቀን መቁጠሪያ ፋይል ተያይዟል።" },
    declined: { subject: (r) => `ጥያቄዎ – Yetenbi (${r.reference})`, intro: "ይቅርታ፣ በዚህ ሰዓት ቦታ የለንም። እባክዎ ይደውሉልን፣ ሌላ ሰዓት እንፈልግልዎታለን።" },
    labels: ["ቀን", "ሰዓት", "የሰው ብዛት", "ቁጥር"],
    outro: "በቅርቡ እንገናኝ፣ Theaterstraße 6, Würzburg።",
    staffNote: "ከምግብ ቤቱ መልእክት",
    cancel: "መምጣት ካልቻሉ ቦታውን እዚህ ይሰርዙ።",
  },
};

/* ---------- layout ---------- */

function layout(heading: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#1c1712;font-family:Georgia,'Times New Roman',serif;color:#f4ecdc">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1c1712;padding:32px 12px"><tr><td align="center">
  <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;border:1px solid #6b5426;background:#27201a">
    <tr><td style="padding:28px 32px 8px;text-align:center;letter-spacing:6px;font-size:22px;color:#e7cd8a;font-weight:bold">YETENBI</td></tr>
    <tr><td style="padding:0 32px 18px;text-align:center;font-size:11px;letter-spacing:3px;color:#b9ab92;text-transform:uppercase">Restaurant &amp; Café · Würzburg</td></tr>
    <tr><td style="padding:0 32px"><div style="border-top:1px solid #6b5426"></div></td></tr>
    <tr><td style="padding:26px 32px 4px;font-size:22px;color:#f4ecdc">${heading}</td></tr>
    <tr><td style="padding:8px 32px 30px;font-size:16px;line-height:1.6;color:#e0d6c3">${body}</td></tr>
    <tr><td style="padding:16px 32px 26px;font-size:12px;color:#b9ab92;border-top:1px solid #3a2f24">${esc(restaurant.street)}, ${esc(restaurant.city)} · ${esc(restaurant.phone)}</td></tr>
  </table></td></tr></table></body></html>`;
}

function detailsTable(r: Reservation) {
  const c = copy[r.locale];
  const values = [longDate(r.date, r.locale), `${r.time}`, String(r.guests), r.reference];
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px 0;width:100%">${c.labels
    .map((l, i) => `<tr><td style="padding:6px 0;color:#c9a24a;font-size:12px;letter-spacing:2px;text-transform:uppercase;width:40%">${esc(l)}</td><td style="padding:6px 0;font-size:17px;color:#f4ecdc">${esc(values[i])}</td></tr>`)
    .join("")}</table>`;
}

/* ---------- calendar file ---------- */

/** The UTC instant of a wall-clock time in Würzburg (daylight saving included). */
function berlinToUtc(date: string, time: string) {
  const guess = new Date(`${date}T${time}:00Z`);
  const local = new Date(guess.toLocaleString("en-US", { timeZone: "Europe/Berlin" }));
  const utc = new Date(guess.toLocaleString("en-US", { timeZone: "UTC" }));
  return new Date(guess.getTime() - (local.getTime() - utc.getTime()));
}
const icsStamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

function ics(r: Reservation) {
  const start = berlinToUtc(r.date, r.time);
  const end = new Date(start.getTime() + 2 * 3600 * 1000);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Yetenbi//Reservierung//DE",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${r.reference}@yetenbi`,
    `DTSTAMP:${icsStamp(new Date())}`,
    `DTSTART:${icsStamp(start)}`,
    `DTEND:${icsStamp(end)}`,
    `SUMMARY:Yetenbi (${r.guests})`,
    `LOCATION:Yetenbi\\, ${restaurant.street}\\, ${restaurant.city}`,
    `DESCRIPTION:${r.reference}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

/* ---------- senders ---------- */

export async function sendGuestEmail(kind: Kind, r: Reservation, origin = siteUrl()) {
  if (!isMailerConfigured() || !r.email) return; // phone bookings may have no email
  const c = copy[r.locale];
  const cancel =
    kind === "declined"
      ? ""
      : `<p style="margin:18px 0 0;font-size:14px"><a href="${esc(cancelUrl(origin, r.reference))}" style="color:#e7cd8a">${esc(c.cancel)}</a></p>`;
  const note = r.staffNote ? `<p style="margin:16px 0 0;padding:12px 16px;border-left:2px solid #c9a24a;color:#e0d6c3"><em>${esc(c.staffNote)}:</em><br>${esc(r.staffNote)}</p>` : "";
  try {
    await mailer().sendMail({
      from: from(),
      to: r.email,
      replyTo: process.env.RESERVATION_NOTIFY_EMAIL,
      subject: c[kind].subject(r),
      html: layout(esc(r.name) + ",", `<p style="margin:0">${esc(c[kind].intro)}</p>${detailsTable(r)}${note}${cancel}<p style="margin:22px 0 0;color:#b9ab92">${esc(c.outro)}</p>`),
      attachments: kind === "confirmed" ? [{ filename: "yetenbi.ics", content: ics(r), contentType: "text/calendar; charset=utf-8; method=PUBLISH" }] : [],
    });
  } catch (error) {
    console.error("Guest email failed", r.reference, error);
  }
}

export async function notifyRestaurant(r: Reservation, origin: string) {
  if (!isMailerConfigured()) return;
  const rows = [
    ["Datum", longDate(r.date, "de")],
    ["Uhrzeit", r.time],
    ["Personen", String(r.guests)],
    ["Name", r.name],
    ["Telefon", r.phone],
    ["E-Mail", r.email],
    ["Sprache", r.locale.toUpperCase()],
    ...(r.note ? [["Anmerkung", r.note]] : []),
  ];
  try {
    await mailer().sendMail({
      from: from(),
      to: process.env.RESERVATION_NOTIFY_EMAIL,
      replyTo: r.email,
      subject: `Neue Anfrage: ${r.guests} Pers., ${longDate(r.date, "de")} ${r.time} (${r.reference})`,
      html: layout(
        "Neue Reservierungsanfrage",
        `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%">${rows
          .map(([k, v]) => `<tr><td style="padding:5px 0;color:#c9a24a;font-size:12px;letter-spacing:2px;text-transform:uppercase;width:35%">${esc(k)}</td><td style="padding:5px 0">${esc(v)}</td></tr>`)
          .join("")}</table><p style="margin:24px 0 0"><a href="${esc(origin)}/admin" style="display:inline-block;background:#c9a24a;color:#1c1712;padding:12px 22px;border-radius:999px;text-decoration:none;font-family:Arial,sans-serif;font-weight:bold">Annehmen oder ablehnen</a></p>`,
      ),
    });
  } catch (error) {
    console.error("Restaurant email failed", r.reference, error);
  }
}

/** Tells the restaurant that a guest cancelled through the link in their email. */
export async function notifyRestaurantCancelled(r: Reservation, origin = siteUrl()) {
  if (!isMailerConfigured()) return;
  try {
    await mailer().sendMail({
      from: from(),
      to: process.env.RESERVATION_NOTIFY_EMAIL,
      subject: `Storniert: ${r.guests} Pers., ${longDate(r.date, "de")} ${r.time} (${r.reference})`,
      html: layout(
        "Ein Gast hat storniert",
        `<p style="margin:0">${esc(r.name)} hat die Reservierung ${esc(r.reference)} für ${esc(longDate(r.date, "de"))}, ${esc(r.time)} Uhr (${r.guests} Personen) storniert.</p><p style="margin:24px 0 0"><a href="${esc(origin)}/admin" style="color:#e7cd8a">Zur Übersicht</a></p>`,
      ),
    });
  } catch (error) {
    console.error("Cancellation email failed", r.reference, error);
  }
}

const resetCopy: Record<Locale, { subject: string; intro: string; button: string; outro: string }> = {
  de: {
    subject: "Passwort zurücksetzen – Yetenbi",
    intro: "über den Knopf unten könnt ihr ein neues Passwort für euer Yetenbi-Konto festlegen. Der Link ist eine Stunde gültig.",
    button: "Neues Passwort festlegen",
    outro: "Habt ihr das nicht angefordert? Dann ignoriert diese E-Mail einfach.",
  },
  en: {
    subject: "Reset your password – Yetenbi",
    intro: "use the button below to choose a new password for your Yetenbi account. The link is valid for one hour.",
    button: "Choose a new password",
    outro: "Didn't ask for this? Just ignore this email.",
  },
  am: {
    subject: "የይለፍ ቃል ዳግም ማስጀመሪያ – Yetenbi",
    intro: "ከታች ያለውን ቁልፍ በመጫን አዲስ የይለፍ ቃል ያዘጋጁ። ሊንኩ ለአንድ ሰዓት ያገለግላል።",
    button: "አዲስ የይለፍ ቃል",
    outro: "ይህን ካልጠየቁ ኢሜይሉን ችላ ይበሉ።",
  },
};

/** Password reset link; returns false when email is not configured (the page then says so). */
export async function sendPasswordReset(to: string, name: string, locale: Locale, link: string) {
  if (!isMailerConfigured()) return false;
  const c = resetCopy[locale];
  try {
    await mailer().sendMail({
      from: from(),
      to,
      subject: c.subject,
      html: layout(
        esc(name) + ",",
        `<p style="margin:0">${esc(c.intro)}</p><p style="margin:24px 0"><a href="${esc(link)}" style="display:inline-block;background:#c9a24a;color:#1c1712;padding:12px 22px;border-radius:999px;text-decoration:none;font-family:Arial,sans-serif;font-weight:bold">${esc(c.button)}</a></p><p style="margin:0;color:#b9ab92">${esc(c.outro)}</p>`,
      ),
    });
    return true;
  } catch (error) {
    console.error("Reset email failed", error);
    return false;
  }
}

/* ---------- online orders ---------- */

/** Every step of an order is emailed to the guest (if they gave an email address). */
export type OrderKind = "received" | "accepted" | "cooked" | "packed" | "ready" | "on_the_way" | "completed" | "rejected" | "cancelled";

const orderCopy: Record<Locale, Record<OrderKind, (o: Order) => { subject: string; intro: string }> & { status: string; total: string; delivery: string; pickup: string; terms: string; termsLink: string }> = {
  de: {
    received: (o) => ({ subject: `Eure Bestellung ${o.reference} ist eingegangen`, intro: "danke für eure Bestellung! Wir bestätigen sie gleich und sagen euch, wann sie fertig ist." }),
    accepted: (o) => ({
      subject: `Bestellung ${o.reference} angenommen`,
      intro: `eure Bestellung ist angenommen. ${o.method === "delivery" ? "Lieferung" : "Abholbereit"} in etwa ${o.etaMinutes ?? 30} Minuten.`,
    }),
    cooked: (o) => ({ subject: `Bestellung ${o.reference}: Essen ist fertig`, intro: "euer Essen ist fertig gekocht und wird jetzt verpackt." }),
    packed: (o) => ({
      subject: `Bestellung ${o.reference} ist verpackt`,
      intro: o.method === "delivery" ? "eure Bestellung ist verpackt und geht gleich an den Fahrer." : "eure Bestellung ist verpackt und gleich abholbereit.",
    }),
    ready: (o) => ({ subject: `Bestellung ${o.reference} ist abholbereit`, intro: "eure Bestellung wartet auf euch in der Theaterstraße 6. Bis gleich!" }),
    on_the_way: (o) => ({ subject: `Bestellung ${o.reference} ist unterwegs`, intro: "eure Bestellung ist unterwegs zu euch. Guten Appetit!" }),
    completed: (o) => ({
      subject: o.method === "delivery" ? `Bestellung ${o.reference} geliefert` : `Bestellung ${o.reference} abgeholt`,
      intro: `eure Bestellung wurde ${o.method === "delivery" ? "geliefert" : "abgeholt"}. Danke und guten Appetit!`,
    }),
    cancelled: (o) => ({ subject: `Bestellung ${o.reference} storniert`, intro: "eure Bestellung wurde storniert. Bei Fragen ruft uns bitte an." }),
    rejected: (o) => ({ subject: `Bestellung ${o.reference}`, intro: "leider können wir eure Bestellung gerade nicht annehmen. Bitte ruft uns an, wir helfen gerne weiter." }),
    status: "Status ansehen",
    total: "Summe (inkl. MwSt.)",
    terms: "Es gelten unsere Bestellbedingungen. Für frisch zubereitete Speisen besteht kein Widerrufsrecht (§ 312g Abs. 2 BGB).",
    termsLink: "Bestellbedingungen ansehen",
    delivery: "Lieferung",
    pickup: "Abholung",
  },
  en: {
    received: (o) => ({ subject: `Your order ${o.reference} has arrived`, intro: "thank you for your order! We'll confirm it shortly and tell you when it will be ready." }),
    accepted: (o) => ({
      subject: `Order ${o.reference} accepted`,
      intro: `your order is accepted. ${o.method === "delivery" ? "Delivery" : "Ready for pick-up"} in about ${o.etaMinutes ?? 30} minutes.`,
    }),
    cooked: (o) => ({ subject: `Order ${o.reference}: food is ready`, intro: "your food is cooked and is being packed now." }),
    packed: (o) => ({
      subject: `Order ${o.reference} is packed`,
      intro: o.method === "delivery" ? "your order is packed and goes to the driver shortly." : "your order is packed and will be ready for pick-up in a moment.",
    }),
    ready: (o) => ({ subject: `Order ${o.reference} is ready for pick-up`, intro: "your order is waiting for you at Theaterstraße 6. See you soon!" }),
    on_the_way: (o) => ({ subject: `Order ${o.reference} is on its way`, intro: "your order is on its way to you. Enjoy your meal!" }),
    completed: (o) => ({
      subject: o.method === "delivery" ? `Order ${o.reference} delivered` : `Order ${o.reference} picked up`,
      intro: `your order has been ${o.method === "delivery" ? "delivered" : "picked up"}. Thank you, and enjoy your meal!`,
    }),
    cancelled: (o) => ({ subject: `Order ${o.reference} cancelled`, intro: "your order has been cancelled. Please call us if you have any questions." }),
    rejected: (o) => ({ subject: `Order ${o.reference}`, intro: "unfortunately we can't take your order right now. Please give us a call and we'll help." }),
    status: "View status",
    total: "Total (incl. VAT)",
    terms: "Our ordering terms apply. Freshly prepared food has no right of withdrawal (§ 312g(2) German Civil Code).",
    termsLink: "Read the ordering terms",
    delivery: "Delivery",
    pickup: "Pick-up",
  },
  am: {
    received: (o) => ({ subject: `ትዕዛዝዎ ${o.reference} ደርሶናል`, intro: "ስለ ትዕዛዝዎ እናመሰግናለን! በቅርቡ አረጋግጠን መቼ እንደሚደርስ እናሳውቅዎታለን።" }),
    accepted: (o) => ({
      subject: `ትዕዛዝ ${o.reference} ተቀባይነት አግኝቷል`,
      intro: `ትዕዛዝዎ ተቀባይነት አግኝቷል። በግምት በ${o.etaMinutes ?? 30} ደቂቃ ${o.method === "delivery" ? "ይደርሳል" : "ዝግጁ ይሆናል"}።`,
    }),
    cooked: (o) => ({ subject: `ትዕዛዝ ${o.reference}፦ ምግቡ ተዘጋጅቷል`, intro: "ምግብዎ ተበስሏል፤ አሁን እየታሸገ ነው።" }),
    packed: (o) => ({
      subject: `ትዕዛዝ ${o.reference} ታሽጓል`,
      intro: o.method === "delivery" ? "ትዕዛዝዎ ታሽጓል፤ በቅርቡ ለአድራሹ ይሰጣል።" : "ትዕዛዝዎ ታሽጓል፤ በቅርቡ ለመውሰድ ዝግጁ ይሆናል።",
    }),
    ready: (o) => ({ subject: `ትዕዛዝ ${o.reference} ለመውሰድ ዝግጁ ነው`, intro: "ትዕዛዝዎ Theaterstraße 6 ላይ ይጠብቅዎታል። በቅርቡ እንገናኝ!" }),
    on_the_way: (o) => ({ subject: `ትዕዛዝ ${o.reference} በመንገድ ላይ ነው`, intro: "ትዕዛዝዎ ወደ እርስዎ በመንገድ ላይ ነው። መልካም ምግብ!" }),
    completed: (o) => ({
      subject: o.method === "delivery" ? `ትዕዛዝ ${o.reference} ደርሷል` : `ትዕዛዝ ${o.reference} ተወስዷል`,
      intro: `ትዕዛዝዎ ${o.method === "delivery" ? "ደርሷል" : "ተወስዷል"}። እናመሰግናለን፣ መልካም ምግብ!`,
    }),
    cancelled: (o) => ({ subject: `ትዕዛዝ ${o.reference} ተሰርዟል`, intro: "ትዕዛዝዎ ተሰርዟል። ጥያቄ ካለዎ እባክዎ ይደውሉልን።" }),
    rejected: (o) => ({ subject: `ትዕዛዝ ${o.reference}`, intro: "ይቅርታ፣ አሁን ትዕዛዝዎን መቀበል አንችልም። እባክዎ ይደውሉልን።" }),
    status: "ሁኔታውን ይመልከቱ",
    total: "ድምር (ተ.እ.ታ. ጨምሮ)",
    terms: "የትዕዛዝ ደንቦቻችን ይተገበራሉ። ትኩስ ለተዘጋጀ ምግብ የመሰረዝ መብት የለም።",
    termsLink: "የትዕዛዝ ደንቦችን ይመልከቱ",
    delivery: "ማድረስ",
    pickup: "መውሰድ",
  },
};

const euro = (n: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(n);
export const orderStatusUrl = (origin: string, o: Order) => `${origin}/bestellung?r=${encodeURIComponent(o.reference)}&t=${o.statusToken}`;

function orderTable(o: Order, totalLabel: string) {
  const rows = o.items
    .map((l) => `<tr><td style="padding:4px 0">${l.qty} × ${esc(l.name)}</td><td style="padding:4px 0;text-align:right">${euro(l.qty * l.unit)}</td></tr>`)
    .join("");
  const deposit = o.deposit ? `<tr><td style="padding:4px 0;color:#b9ab92">+ Pfand</td><td style="padding:4px 0;text-align:right;color:#b9ab92">${euro(o.deposit)}</td></tr>` : "";
  const fee = o.deliveryFee ? `<tr><td style="padding:4px 0;color:#b9ab92">+ Lieferung</td><td style="padding:4px 0;text-align:right;color:#b9ab92">${euro(o.deliveryFee)}</td></tr>` : "";
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0;font-size:15px">${rows}${deposit}${fee}<tr><td style="padding:10px 0 0;border-top:1px solid #6b5426;color:#e7cd8a">${esc(totalLabel)}</td><td style="padding:10px 0 0;border-top:1px solid #6b5426;text-align:right;color:#e7cd8a;font-size:18px">${euro(o.total)}</td></tr></table>`;
}

export async function sendOrderEmail(kind: OrderKind, o: Order, origin = siteUrl()) {
  if (!isMailerConfigured() || !o.email) return;
  const c = orderCopy[o.locale];
  const { subject, intro } = c[kind](o);
  const note = o.staffNote ? `<p style="margin:12px 0 0;padding:12px 16px;border-left:2px solid #c9a24a">${esc(o.staffNote)}</p>` : "";
  try {
    await mailer().sendMail({
      from: from(),
      to: o.email,
      replyTo: process.env.RESERVATION_NOTIFY_EMAIL,
      subject,
      html: layout(
        esc(o.name) + ",",
        `<p style="margin:0">${esc(intro)}</p>${note}${kind === "rejected" || kind === "cancelled" ? "" : orderTable(o, c.total)}<p style="margin:20px 0 0"><a href="${esc(orderStatusUrl(origin, o))}" style="display:inline-block;background:#c9a24a;color:#1c1712;padding:12px 22px;border-radius:999px;text-decoration:none;font-family:Arial,sans-serif;font-weight:bold">${esc(c.status)}</a></p>${
          kind === "received" || kind === "accepted"
            ? `<p style="margin:20px 0 0;font-size:12px;color:#b9ab92">${esc(c.terms)} <a href="${esc(origin)}/bestellbedingungen" style="color:#e7cd8a">${esc(c.termsLink)}</a></p>`
            : ""
        }`,
      ),
    });
  } catch (error) {
    console.error("Order email failed", o.reference, error);
  }
}

export async function notifyRestaurantOrder(o: Order, origin = siteUrl()) {
  if (!isMailerConfigured()) return;
  const where = o.method === "delivery" ? `${o.street}, ${o.postcode} ${o.city}${o.addressNote ? ` (${o.addressNote})` : ""}` : "Abholung";
  try {
    await mailer().sendMail({
      from: from(),
      to: process.env.RESERVATION_NOTIFY_EMAIL,
      replyTo: o.email || undefined,
      subject: `Neue Bestellung ${o.reference}: ${o.method === "delivery" ? "Lieferung" : "Abholung"}, ${euro(o.total)}`,
      html: layout(
        "Neue Bestellung",
        `<p style="margin:0"><strong>${esc(o.name)}</strong> · ${esc(o.phone)}<br>${esc(where)}<br>Zeit: ${o.wanted === "asap" ? "so schnell wie möglich" : esc(o.wanted) + " Uhr"} · Zahlung: ${o.payment === "cash" ? "bar" : "Karte bei Übergabe"}</p>${
          o.note ? `<p style="margin:12px 0 0;border-left:2px solid #c9a24a;padding-left:12px">${esc(o.note)}</p>` : ""
        }${orderTable(o, "Summe")}<p style="margin:20px 0 0"><a href="${esc(origin)}/admin/bestellungen" style="display:inline-block;background:#c9a24a;color:#1c1712;padding:12px 22px;border-radius:999px;text-decoration:none;font-family:Arial,sans-serif;font-weight:bold">Bestellung annehmen</a></p>`,
      ),
    });
  } catch (error) {
    console.error("Restaurant order email failed", o.reference, error);
  }
}

/* ---------- staff ---------- */

const button = (href: string, text: string) =>
  `<p style="margin:20px 0 0"><a href="${esc(href)}" style="display:inline-block;background:#c9a24a;color:#1c1712;padding:12px 22px;border-radius:999px;text-decoration:none;font-family:Arial,sans-serif;font-weight:bold">${esc(text)}</a></p>`;

/** Food only, without prices or guest details: what the kitchen needs. */
const kitchenList = (o: Order) =>
  `<ul style="margin:12px 0 0;padding-left:18px">${o.items.map((l) => `<li style="padding:2px 0">${l.qty} × ${esc(l.name)}</li>`).join("")}</ul>${
    o.note ? `<p style="margin:12px 0 0;border-left:2px solid #c9a24a;padding-left:12px">${esc(o.note)}</p>` : ""
  }`;

export type StaffKind = "kitchen" | "packed" | "driver" | "completed";

/**
  Emails to the team as an order moves on:
  kitchen   – accepted order, to every kitchen account (food only)
  packed    – ready to hand out, to the restaurant
  driver    – handed to a driver, to that driver (address, phone, amount to collect)
  completed – delivered or picked up, to the restaurant
*/
export async function notifyStaffOrder(kind: StaffKind, o: Order, to: (string | undefined)[], origin = siteUrl()) {
  const recipients = [...new Set(to.filter((v): v is string => Boolean(v)))];
  if (!isMailerConfigured() || !recipients.length) return;
  const way = o.method === "delivery" ? "Lieferung" : "Abholung";
  const when = o.wanted === "asap" ? "so schnell wie möglich" : `${esc(o.wanted)} Uhr`;
  const mail: Record<StaffKind, { subject: string; heading: string; body: string }> = {
    kitchen: {
      subject: `Küche: ${o.reference} zubereiten (${way})`,
      heading: "Neue Bestellung für die Küche",
      body: `<p style="margin:0">${way} · ${when}${o.etaMinutes ? ` · fertig in ca. ${o.etaMinutes} Min.` : ""}</p>${kitchenList(o)}${button(`${origin}/kueche`, "Zur Küche")}`,
    },
    packed: {
      subject: `${o.reference} ist verpackt (${way})`,
      heading: "Bereit zur Übergabe",
      body: `<p style="margin:0">${esc(o.name)} · ${way} · ${euro(o.total)}</p><p style="margin:8px 0 0">${
        o.method === "delivery" ? "Bitte einem Fahrer übergeben." : "Bitte als abholbereit markieren."
      }</p>${button(`${origin}/admin/bestellungen`, "Zur Verwaltung")}`,
    },
    driver: {
      subject: `Lieferung ${o.reference}: ${o.street}`,
      heading: "Neue Lieferung für dich",
      body: `<p style="margin:0"><strong>${esc(o.name)}</strong> · <a href="tel:${esc(o.phone)}" style="color:#e7cd8a">${esc(o.phone)}</a><br>${esc(o.street)}, ${esc(o.postcode)} ${esc(o.city)}${
        o.addressNote ? `<br><em>${esc(o.addressNote)}</em>` : ""
      }</p><p style="margin:12px 0 0">${o.payment === "cash" ? "Bar kassieren" : "Kartenzahlung bei Übergabe"}: <strong>${euro(o.total)}</strong></p>${button(`${origin}/lieferung`, "Zu meinen Lieferungen")}`,
    },
    completed: {
      subject: `${o.reference} ${o.method === "delivery" ? "geliefert" : "abgeholt"}`,
      heading: o.method === "delivery" ? "Zugestellt" : "Abgeholt",
      body: `<p style="margin:0">${esc(o.name)} · ${way} · ${euro(o.total)} (${o.payment === "cash" ? "bar" : "Karte"})${
        o.driverName ? ` · Fahrer: ${esc(o.driverName)}` : ""
      }</p>${button(`${origin}/admin/bestellungen`, "Zur Verwaltung")}`,
    },
  };
  const m = mail[kind];
  try {
    await mailer().sendMail({ from: from(), to: recipients.join(", "), subject: m.subject, html: layout(m.heading, m.body) });
  } catch (error) {
    console.error("Staff order email failed", kind, o.reference, error);
  }
}
