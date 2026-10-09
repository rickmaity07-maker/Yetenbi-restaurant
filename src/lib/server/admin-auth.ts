import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/*
  Owner login for /admin: one password (ADMIN_PASSWORD), kept in a signed, http-only cookie for 12 hours.
  The signing key is ADMIN_SESSION_SECRET, or derived from the password if that is not set
  (changing the password then signs everyone out).
*/

const COOKIE = "yt_admin";
const TTL_MS = 12 * 60 * 60 * 1000;

const secret = () => process.env.ADMIN_SESSION_SECRET || createHash("sha256").update(`yetenbi:${process.env.ADMIN_PASSWORD ?? ""}`).digest("hex");
const sign = (value: string) => createHmac("sha256", secret()).update(value).digest("hex");

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export const isAdminConfigured = () => Boolean(process.env.ADMIN_PASSWORD);

export function checkPassword(input: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  // compare digests so the comparison takes the same time whatever the input length
  const h = (v: string) => createHash("sha256").update(v).digest("hex");
  return safeEqual(h(input), h(expected));
}

export async function startSession() {
  const expires = String(Date.now() + TTL_MS);
  (await cookies()).set(COOKIE, `${expires}.${sign(expires)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: TTL_MS / 1000,
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export async function isAdmin() {
  if (!isAdminConfigured()) return false;
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return false;
  const [expires, mac] = raw.split(".");
  if (!expires || !mac || !safeEqual(mac, sign(expires))) return false;
  return Number(expires) > Date.now();
}
