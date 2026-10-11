import "server-only";
import nodemailer, { type SendMailOptions, type Transporter } from "nodemailer";

// Emails go out through a Gmail account (GMAIL_USER + an App Password), or any other
// mail server when SMTP_HOST is set. Nothing is sent until the variables below are set.

export function isMailerConfigured() {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD && process.env.RESERVATION_NOTIFY_EMAIL);
}

/** The restaurant's own inbox (new bookings, new orders, cancellations). */
export function restaurantInbox() {
  return process.env.RESERVATION_NOTIFY_EMAIL;
}

let transporter: Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;

  const auth = { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD };
  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_PORT === "465",
      auth,
    });
  } else {
    transporter = nodemailer.createTransport({ service: "gmail", auth });
  }
  return transporter;
}

function sender() {
  const name = process.env.GMAIL_FROM_NAME ?? "Yetenbi Restaurant & Café";
  return `${name} <${process.env.GMAIL_USER}>`;
}

type Email = Pick<SendMailOptions, "to" | "replyTo" | "subject" | "html" | "attachments">;

/**
 * Sends one email. Returns false instead of throwing, because a failed email must never
 * break a booking or an order. `description` is only used in the error log.
 */
export async function sendEmail(email: Email, description: string): Promise<boolean> {
  try {
    await getTransporter().sendMail({ from: sender(), ...email });
    return true;
  } catch (error) {
    console.error(`Email failed: ${description}`, error);
    return false;
  }
}
