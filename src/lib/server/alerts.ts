import "server-only";
import { isLimited, recordHit } from "./rate-limit";
import { emailLayout, escapeHtml, paragraph } from "./email/html";
import { isMailerConfigured, sendEmail } from "./email/send";

/*
  Error alerts: a server error is logged and emailed to ERROR_ALERT_EMAIL (or, if that is not set, to the
  restaurant's inbox), at most once an hour per place, so a broken page can't flood the inbox.
  The email holds the place, the error message and the path without its query string (which can contain
  order or reset tokens). No guest data, cookies or headers are sent.
*/

const ALERTS_PER_PLACE = { max: 1, minutes: 60 };

function alertInbox() {
  return process.env.ERROR_ALERT_EMAIL || process.env.RESERVATION_NOTIFY_EMAIL;
}

/** Logs the error and, if allowed by the hourly limit, emails it. Never throws. */
export async function reportError(place: string, error: unknown, path?: string) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Error in ${place}:`, error);

  const inbox = alertInbox();
  if (!inbox || !isMailerConfigured()) return;
  try {
    if (await isLimited("alert", place, ALERTS_PER_PLACE)) return;
    await recordHit("alert", place);
    const where = path ? path.split("?")[0] : "";
    const body =
      paragraph(`Ort: ${place}${where ? ` (${where})` : ""}`) +
      `<pre style="margin:16px 0 0;white-space:pre-wrap;font-size:13px;color:#e0d6c3">${escapeHtml(message.slice(0, 2000))}</pre>` +
      paragraph(
        "Weitere Fehler an dieser Stelle werden für eine Stunde nicht erneut gemeldet. Details stehen in den Vercel-Logs.",
        "margin-top:16px;color:#b9ab92",
      );
    await sendEmail(
      { to: inbox, subject: `Fehler auf der Website: ${place}`, html: emailLayout("Ein Fehler ist aufgetreten", body) },
      "error alert",
    );
  } catch (alertError) {
    console.error("Could not send the error alert", alertError);
  }
}
