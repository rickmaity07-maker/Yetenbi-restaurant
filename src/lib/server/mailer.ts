import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { restaurant } from "@/lib/data";
import type { Locale } from "@/lib/i18n";
import type { Reservation } from "./reservations";

/*
  Booking emails, sent through a Gmail account with 2-Step Verification and an App Password
  (myaccount.google.com/apppasswords). SMTP_HOST switches to any other mail server.

  To the guest, in the language they booked in:  received · confirmed (+ calendar file) · declined
  To the restaurant (RESERVATION_NOTIFY_EMAIL):   every new request, with a link to /admin

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

const copy: Record<Locale, Record<Kind, { subject: (r: Reservation) => string; intro: string }> & { labels: string[]; outro: string; staffNote: string }> = {
  de: {
    received: { subject: (r) => `Eure Anfrage bei Yetenbi (${r.reference})`, intro: "danke für eure Anfrage. Sie ist bei uns angekommen, wir melden uns, sobald der Tisch fest ist." },
    confirmed: { subject: (r) => `Bestätigt: euer Tisch bei Yetenbi (${r.reference})`, intro: "euer Tisch ist reserviert. Wir freuen uns auf euch! Im Anhang findet ihr einen Kalendereintrag." },
    declined: { subject: (r) => `Eure Anfrage bei Yetenbi (${r.reference})`, intro: "leider können wir zu dieser Zeit keinen Tisch anbieten. Ruft uns gerne an, dann finden wir eine andere Zeit." },
    labels: ["Datum", "Uhrzeit", "Personen", "Nummer"],
    outro: "Bis bald in der Theaterstraße 6, Würzburg.",
    staffNote: "Nachricht vom Restaurant",
  },
  en: {
    received: { subject: (r) => `Your request at Yetenbi (${r.reference})`, intro: "thank you for your request. It has reached us, and we'll be in touch as soon as your table is set." },
    confirmed: { subject: (r) => `Confirmed: your table at Yetenbi (${r.reference})`, intro: "your table is booked. We look forward to seeing you! A calendar entry is attached." },
    declined: { subject: (r) => `Your request at Yetenbi (${r.reference})`, intro: "unfortunately we can't offer a table at that time. Give us a call and we'll find another one." },
    labels: ["Date", "Time", "Guests", "Reference"],
    outro: "See you soon at Theaterstraße 6, Würzburg.",
    staffNote: "Message from the restaurant",
  },
  am: {
    received: { subject: (r) => `ጥያቄዎ ደርሶናል – Yetenbi (${r.reference})`, intro: "ስለ ጥያቄዎ እናመሰግናለን። ደርሶናል፤ ቦታው ሲዘጋጅ እናሳውቅዎታለን።" },
    confirmed: { subject: (r) => `ተረጋግጧል፦ ቦታዎ በYetenbi (${r.reference})`, intro: "ቦታዎ ተይዟል። በጉጉት እንጠብቅዎታለን! የቀን መቁጠሪያ ፋይል ተያይዟል።" },
    declined: { subject: (r) => `ጥያቄዎ – Yetenbi (${r.reference})`, intro: "ይቅርታ፣ በዚህ ሰዓት ቦታ የለንም። እባክዎ ይደውሉልን፣ ሌላ ሰዓት እንፈልግልዎታለን።" },
    labels: ["ቀን", "ሰዓት", "የሰው ብዛት", "ቁጥር"],
    outro: "በቅርቡ እንገናኝ፣ Theaterstraße 6, Würzburg።",
    staffNote: "ከምግብ ቤቱ መልእክት",
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

export async function sendGuestEmail(kind: Kind, r: Reservation) {
  if (!isMailerConfigured()) return;
  const c = copy[r.locale];
  const note = r.staffNote ? `<p style="margin:16px 0 0;padding:12px 16px;border-left:2px solid #c9a24a;color:#e0d6c3"><em>${esc(c.staffNote)}:</em><br>${esc(r.staffNote)}</p>` : "";
  try {
    await mailer().sendMail({
      from: from(),
      to: r.email,
      replyTo: process.env.RESERVATION_NOTIFY_EMAIL,
      subject: c[kind].subject(r),
      html: layout(esc(r.name) + ",", `<p style="margin:0">${esc(c[kind].intro)}</p>${detailsTable(r)}${note}<p style="margin:22px 0 0;color:#b9ab92">${esc(c.outro)}</p>`),
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
