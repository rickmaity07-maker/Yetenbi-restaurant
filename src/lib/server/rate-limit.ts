import "server-only";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { signingKey } from "./cancel-token";
import { db } from "./db";

/*
  Simple attempt limits stored in Neon (works across all serverless instances):
  password guessing, reset-email bombing, mass sign-ups and booking floods.
  Keys are emails or a keyed hash of the visitor's IP address, never the IP itself; rows are removed after a day.
*/

export const RATE = {
  loginPerEmail: { max: 10, minutes: 15 }, // failed sign-ins for one account
  loginPerIp: { max: 30, minutes: 15 }, // failed sign-ins from one connection
  resetPerEmail: { max: 3, minutes: 60 },
  resetPerIp: { max: 10, minutes: 60 },
  registerPerIp: { max: 5, minutes: 60 },
  bookPerIp: { max: 6, minutes: 60 },
} as const;
type Limit = { max: number; minutes: number };

const hashIp = (ip: string) => createHmac("sha256", signingKey()).update(`rate:${ip}`).digest("base64url").slice(0, 32);

/** Keyed hash of the visitor's IP (Vercel sets x-real-ip), or "unknown". */
export async function visitorKey(request?: Request) {
  const h = request ? request.headers : await headers();
  const ip = h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return ip ? hashIp(ip) : "unknown";
}

/** Whether `key` already used up the limit in its time window. */
export async function isLimited(bucket: string, key: string, limit: Limit) {
  const [row] = (await db()`
    select count(*)::int as n from rate_hits
    where bucket = ${bucket} and key = ${key} and created_at > now() - make_interval(mins => ${limit.minutes})
  `) as { n: number }[];
  return row.n >= limit.max;
}

export async function recordHit(bucket: string, key: string) {
  await db()`insert into rate_hits (bucket, key) values (${bucket}, ${key})`;
}

/** Forget failed attempts, e.g. after a successful sign-in. */
export async function clearHits(bucket: string, key: string) {
  await db()`delete from rate_hits where bucket = ${bucket} and key = ${key}`;
}

export async function purgeRateHits() {
  await db()`delete from rate_hits where created_at < now() - interval '1 day'`;
}
