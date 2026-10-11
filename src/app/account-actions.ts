"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { siteUrl } from "@/lib/site-url";
import { clearHits, isLimited, RATE, recordHit, visitorKey } from "@/lib/server/rate-limit";
import { LOCALES, type Locale } from "@/lib/i18n";
import {
  authenticate,
  consumeResetToken,
  createResetToken,
  createUser,
  deleteUser,
  endSession,
  findUserByEmail,
  getPasswordHash,
  requireUser,
  setPassword,
  startSession,
  updateUser,
  verifyPassword,
} from "@/lib/server/auth";
import { hasDatabase } from "@/lib/server/db";
import { homeFor } from "@/lib/roles";
import { isEmail, safeNext } from "@/lib/validate";
import { notifyRestaurantCancelled, sendPasswordReset } from "@/lib/server/email";
import { cancelForUser } from "@/lib/server/reservations";
import { audit } from "@/lib/server/audit";
import { forgetEmail } from "@/lib/server/customers";

/*
  Account actions. They return codes (not sentences) so the forms can word them in the visitor's language
  (account.errors in lib/i18n).
*/

type AccountState = { error?: AccountError; ok?: boolean } | null;
type AccountError =
  | "credentials"
  | "exists"
  | "name"
  | "email"
  | "phone"
  | "password"
  | "token"
  | "current"
  | "unavailable"
  | "mail"
  | "google"
  | "throttled";

const str = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const asLocale = (v: string): Locale => ((LOCALES as readonly string[]).includes(v) ? (v as Locale) : "de");
const emailOk = isEmail;
const phoneOk = (v: string) => !v || /^[+\d][\d\s()/-]{5,24}$/.test(v);
const passwordOk = (v: string) => v.length >= 8 && v.length <= 200;
const slowDown = () => new Promise((r) => setTimeout(r, 700));

export async function login(_: AccountState, form: FormData): Promise<AccountState> {
  if (!hasDatabase()) return { error: "unavailable" };
  const email = str(form, "email").toLowerCase().slice(0, 120);
  const ip = await visitorKey();
  if (
    (await isLimited("login-email", email, RATE.loginPerEmail)) ||
    (await isLimited("login-ip", ip, RATE.loginPerIp))
  ) {
    await slowDown();
    return { error: "throttled" };
  }
  const user = await authenticate(email, String(form.get("password") ?? ""));
  if (!user) {
    await Promise.all([recordHit("login-email", email), recordHit("login-ip", ip), slowDown()]);
    return { error: "credentials" };
  }
  await clearHits("login-email", email);
  if (user.role !== "guest") await audit(user, "login", "Angemeldet", user.email);
  await startSession(user.id);
  const next = safeNext(str(form, "next"));
  redirect(next || homeFor(user.role));
}

export async function register(_: AccountState, form: FormData): Promise<AccountState> {
  if (!hasDatabase()) return { error: "unavailable" };
  const name = str(form, "name");
  const email = str(form, "email").toLowerCase();
  const phone = str(form, "phone");
  const password = String(form.get("password") ?? "");
  if (name.length < 2 || name.length > 80) return { error: "name" };
  if (!emailOk(email)) return { error: "email" };
  if (!phoneOk(phone)) return { error: "phone" };
  if (!passwordOk(password)) return { error: "password" };
  const ip = await visitorKey();
  if (await isLimited("register-ip", ip, RATE.registerPerIp)) return { error: "throttled" };
  await recordHit("register-ip", ip);
  if (await findUserByEmail(email)) {
    await slowDown();
    return { error: "exists" };
  }
  const user = await createUser({ name, email, phone, password, locale: asLocale(str(form, "locale")) });
  await startSession(user.id);
  redirect(safeNext(str(form, "next")) || "/profil");
}

export async function logout() {
  await endSession();
  redirect("/");
}

export async function requestReset(_: AccountState, form: FormData): Promise<AccountState> {
  if (!hasDatabase()) return { error: "unavailable" };
  const email = str(form, "email").toLowerCase().slice(0, 120);
  const ip = await visitorKey();
  // Same answer when limited, so the form can't be used to bomb someone's inbox or probe for accounts.
  if (
    (await isLimited("reset-email", email, RATE.resetPerEmail)) ||
    (await isLimited("reset-ip", ip, RATE.resetPerIp))
  ) {
    await slowDown();
    return { ok: true };
  }
  await Promise.all([recordHit("reset-email", email), recordHit("reset-ip", ip)]);
  const row = await findUserByEmail(email);
  if (row) {
    const token = await createResetToken(Number(row.id));
    // The link always points at the real site, never at whatever host the request named.
    const sent = await sendPasswordReset(row.email, row.name, row.locale, `${siteUrl()}/passwort?token=${token}`);
    if (!sent) return { error: "mail" };
  } else {
    await slowDown();
  }
  // Same answer whether or not the address has an account.
  return { ok: true };
}

export async function resetPassword(_: AccountState, form: FormData): Promise<AccountState> {
  const password = String(form.get("password") ?? "");
  if (!passwordOk(password)) return { error: "password" };
  const userId = await consumeResetToken(str(form, "token"));
  if (!userId) return { error: "token" };
  await setPassword(userId, password);
  await startSession(userId);
  redirect("/profil");
}

export async function updateProfile(_: AccountState, form: FormData): Promise<AccountState> {
  const me = await requireUser();
  const name = str(form, "name");
  const phone = str(form, "phone");
  if (name.length < 2 || name.length > 80) return { error: "name" };
  if (!phoneOk(phone)) return { error: "phone" };
  await updateUser(me.id, { name, phone, locale: asLocale(str(form, "locale")) });
  revalidatePath("/profil");
  return { ok: true };
}

export async function changePassword(_: AccountState, form: FormData): Promise<AccountState> {
  const me = await requireUser();
  const next = String(form.get("password") ?? "");
  const hash = await getPasswordHash(me.id);
  if (hash !== "none" && !(await verifyPassword(String(form.get("current") ?? ""), hash))) {
    await slowDown();
    return { error: "current" };
  }
  if (!passwordOk(next)) return { error: "password" };
  await setPassword(me.id, next); // signs out all other devices
  await startSession(me.id);
  return { ok: true };
}

export async function deleteAccount(_: AccountState, form: FormData): Promise<AccountState> {
  const me = await requireUser();
  const hash = await getPasswordHash(me.id);
  const confirmed =
    hash === "none"
      ? String(form.get("current") ?? "")
          .trim()
          .toLowerCase() === me.email
      : await verifyPassword(String(form.get("current") ?? ""), hash);
  if (!confirmed) {
    await slowDown();
    return { error: "current" };
  }
  await deleteUser(me.id);
  await forgetEmail(me.email);
  await endSession();
  redirect("/");
}

export async function cancelMyBooking(form: FormData) {
  const me = await requireUser();
  const reservation = await cancelForUser(Number(form.get("id")), me.id);
  if (reservation) await notifyRestaurantCancelled(reservation);
  revalidatePath("/profil");
}
