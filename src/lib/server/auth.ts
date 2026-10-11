import "server-only";
import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import { homeFor, type Role } from "@/lib/roles";
import { db } from "./db";

/*
  One login for everyone. Guests get a profile with their bookings; owners are sent to /admin,
  kitchen staff to /kueche and drivers to /lieferung (see lib/roles).
  Passwords: scrypt with a random salt. Sessions: a random token in an http-only cookie, of which only
  a SHA-256 hash is stored in Neon, valid for 30 days.
*/

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;
const COOKIE = "yt_session";
const SESSION_DAYS = 30;

export type { Role };
export type User = {
  id: number;
  email: string;
  name: string;
  phone: string;
  role: Role;
  locale: Locale;
  createdAt: string;
};

type UserRow = {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: Role;
  locale: Locale;
  created_at: string;
  password_hash?: string;
};
const toUser = (r: UserRow): User => ({
  id: Number(r.id),
  email: r.email,
  name: r.name,
  phone: r.phone,
  role: r.role,
  locale: r.locale,
  createdAt: String(r.created_at),
});

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

/* ---------- passwords ---------- */

async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [scheme, saltB64, keyB64] = stored.split("$");
  if (scheme !== "scrypt" || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, "base64");
  const actual = await scryptAsync(password, Buffer.from(saltB64, "base64"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

/** Hash used to keep login timing the same whether or not the email exists. */
const DUMMY_HASH = "scrypt$AAAAAAAAAAAAAAAAAAAAAA==$" + Buffer.alloc(64).toString("base64");

/* ---------- users ---------- */

export async function findUserByEmail(email: string) {
  const [row] = (await db()`select * from users where lower(email) = lower(${email})`) as UserRow[];
  return row ?? null;
}

export async function createUser(input: {
  email: string;
  name: string;
  phone: string;
  password: string;
  locale: Locale;
  role?: Role;
}) {
  const hash = await hashPassword(input.password);
  const [row] = (await db()`
    insert into users (email, name, phone, password_hash, locale, role, email_verified)
    values (${input.email.toLowerCase()}, ${input.name}, ${input.phone}, ${hash}, ${input.locale}, ${input.role ?? "guest"}, ${(input.role ?? "guest") !== "guest"})
    returning *
  `) as UserRow[];
  return toUser(row);
}

/** Checks email and password; returns the user or null (constant work either way). */
export async function authenticate(email: string, password: string) {
  const row = await findUserByEmail(email);
  const ok = await verifyPassword(password, row?.password_hash ?? DUMMY_HASH);
  return row && ok ? toUser(row) : null;
}

export async function updateUser(id: number, data: { name: string; phone: string; locale: Locale }) {
  await db()`update users set name = ${data.name}, phone = ${data.phone}, locale = ${data.locale} where id = ${id}`;
}

export async function setPassword(id: number, password: string) {
  await db()`update users set password_hash = ${await hashPassword(password)} where id = ${id}`;
  await db()`delete from sessions where user_id = ${id}`; // sign out everywhere
}

export async function deleteUser(id: number) {
  await db()`delete from users where id = ${id}`;
}

export async function getPasswordHash(id: number) {
  const [row] = (await db()`select password_hash from users where id = ${id}`) as { password_hash: string }[];
  return row?.password_hash ?? DUMMY_HASH; // "none" for Google-only accounts
}

/* ---------- sessions ---------- */

export async function startSession(userId: number) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await db()`insert into sessions (token_hash, user_id, expires_at) values (${sha256(token)}, ${userId}, ${expires.toISOString()})`;
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function endSession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) await db()`delete from sessions where token_hash = ${sha256(token)}`;
  store.delete(COOKIE);
}

/** The signed-in user, or null. Reads the cookie, so callers render at request time. */
export async function getCurrentUser(): Promise<User | null> {
  if (!process.env.DATABASE_URL) return null;
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const [row] = (await db()`
    select u.* from sessions s join users u on u.id = s.user_id
    where s.token_hash = ${sha256(token)} and s.expires_at > now()
  `) as UserRow[];
  return row ? toUser(row) : null;
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** The signed-in user if they have one of the roles; others are sent to their own start page. */
export async function requireRole(roles: Role[], loginNext: string) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(loginNext)}`);
  if (!roles.includes(user.role)) redirect(homeFor(user.role));
  return user;
}

export const requireOwner = () => requireRole(["owner"], "/admin");

/* ---------- team ---------- */

type StaffMember = User & { googleOnly: boolean };

export async function listStaff(): Promise<StaffMember[]> {
  const rows = (await db()`select * from users where role <> 'guest' order by role, lower(name)`) as UserRow[];
  return rows.map((r) => ({ ...toUser(r), googleOnly: r.password_hash === "none" }));
}

export async function listDrivers() {
  const rows = (await db()`select * from users where role = 'driver' order by lower(name)`) as UserRow[];
  return rows.map(toUser);
}

/** Changes a role and signs the person out everywhere, so the new rights apply at once. */
export async function setRole(id: number, role: Role) {
  await db()`update users set role = ${role}, email_verified = email_verified or ${role !== "guest"} where id = ${id}`;
  await db()`delete from sessions where user_id = ${id}`;
}

export async function findUserById(id: number) {
  const [row] = (await db()`select * from users where id = ${id}`) as UserRow[];
  return row ? toUser(row) : null;
}

/** Email addresses of everyone with a role (for staff notifications). */
export async function staffEmails(role: Role) {
  const rows = (await db()`select email from users where role = ${role}`) as { email: string }[];
  return rows.map((r) => r.email);
}

/* ---------- password reset ---------- */

export async function createResetToken(userId: number) {
  const token = randomBytes(32).toString("base64url");
  await db()`delete from password_resets where user_id = ${userId}`;
  await db()`insert into password_resets (token_hash, user_id, expires_at) values (${sha256(token)}, ${userId}, now() + interval '1 hour')`;
  return token;
}

/** Uses up a reset token; returns the user id if it was valid. */
export async function consumeResetToken(token: string) {
  const [row] = (await db()`
    delete from password_resets where token_hash = ${sha256(token)} and expires_at > now() returning user_id
  `) as { user_id: string }[];
  if (!row) return null;
  // the link came by email, so the account owns its address
  await db()`update users set email_verified = true where id = ${row.user_id}`;
  return Number(row.user_id);
}

/** Removes expired sessions and reset links (called by the daily clean-up). */
export async function purgeExpiredAuth() {
  await db()`delete from sessions where expires_at < now()`;
  await db()`delete from password_resets where expires_at < now()`;
}
