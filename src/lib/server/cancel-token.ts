import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/*
  Signed cancellation links for guests: /stornieren?r=YT-4K7Q&s=<signature>.
  Only someone with the email (which contains the link) can cancel; the key never leaves the server.
*/
/** Server-side signing key (also used for the order guard's device hashes). */
export function signingKey() {
  if (process.env.ADMIN_SESSION_SECRET) return process.env.ADMIN_SESSION_SECRET;
  // Without a secret anyone could forge cancel links, so production refuses to run without one.
  if (process.env.NODE_ENV === "production") throw new Error("ADMIN_SESSION_SECRET is not set.");
  return createHash("sha256")
    .update(`yetenbi-dev:${process.env.ADMIN_PASSWORD ?? ""}`)
    .digest("hex");
}

const cancelSignature = (reference: string) =>
  createHmac("sha256", signingKey()).update(`cancel:${reference}`).digest("base64url").slice(0, 32);

export function checkCancelSignature(reference: string, signature: string) {
  const a = Buffer.from(cancelSignature(reference));
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const cancelUrl = (origin: string, reference: string) =>
  `${origin}/stornieren?r=${encodeURIComponent(reference)}&s=${cancelSignature(reference)}`;
