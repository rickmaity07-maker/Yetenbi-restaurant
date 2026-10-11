import "server-only";
import type { Locale } from "@/lib/i18n";
import { button, emailLayout, escapeHtml, paragraph } from "./html";
import { isMailerConfigured, sendEmail } from "./send";
import { passwordResetTexts, verificationTexts } from "./texts";

type LinkEmail = { subject: string; intro: string; button: string; outro: string };

/** Greeting, one sentence, a button with the link, and a grey closing line. */
function linkEmailHtml(name: string, text: LinkEmail, link: string) {
  const body =
    paragraph(text.intro) + button(link, text.button) + paragraph(text.outro, "margin-top:24px;color:#b9ab92");
  return emailLayout(`${escapeHtml(name)},`, body);
}

/** Password reset link. Returns false when email isn't set up or sending failed (the form then says so). */
export async function sendPasswordReset(to: string, name: string, locale: Locale, link: string) {
  if (!isMailerConfigured()) return false;
  const text = passwordResetTexts[locale];
  return sendEmail({ to, subject: text.subject, html: linkEmailHtml(name, text, link) }, "password reset");
}

/** The link that confirms a new account owns its email address. Returns false when it could not be sent. */
export async function sendEmailVerification(to: string, name: string, locale: Locale, link: string) {
  if (!isMailerConfigured()) return false;
  const text = verificationTexts[locale];
  return sendEmail({ to, subject: text.subject, html: linkEmailHtml(name, text, link) }, "email verification");
}
