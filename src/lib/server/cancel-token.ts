import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/*
  Signed cancellation links for guests: /stornieren?r=YT-4K7Q&s=<signature>.
  Only someone with the email (which contains the link) can cancel; the key never leaves the server.
*/
/** Server-side signing key (also used for the order guard's device hashes). */
export const signingKey = () =>
  process.env.ADMIN_SESSION_SECRET || createHash("sha256").update(`yetenbi-cancel:${process.env.ADMIN_PASSWORD ?? ""}`).digest("hex");

export const cancelSignature = (reference: string) => createHmac("sha256", signingKey()).update(`cancel:${reference}`).digest("base64url").slice(0, 32);

export function checkCancelSignature(reference: string, signature: string) {
  const a = Buffer.from(cancelSignature(reference));
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const cancelUrl = (origin: string, reference: string) => `${origin}/stornieren?r=${encodeURIComponent(reference)}&s=${cancelSignature(reference)}`;
