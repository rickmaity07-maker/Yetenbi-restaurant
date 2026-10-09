"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { checkPassword, endSession, isAdmin, startSession } from "@/lib/server/admin-auth";
import { sendGuestEmail } from "@/lib/server/mailer";
import { setStatus, type Status } from "@/lib/server/reservations";

export async function login(_: unknown, form: FormData) {
  const password = String(form.get("password") ?? "");
  if (!checkPassword(password)) {
    // slow down guessing
    await new Promise((r) => setTimeout(r, 900));
    return { error: "Das Passwort stimmt nicht." };
  }
  await startSession();
  redirect("/admin");
}

export async function logout() {
  await endSession();
  redirect("/admin/login");
}

/** Accept or decline a request; the guest is emailed in their language. */
export async function decide(form: FormData) {
  if (!(await isAdmin())) redirect("/admin/login");
  const id = Number(form.get("id"));
  const status = String(form.get("status")) as Status;
  const note = String(form.get("note") ?? "").slice(0, 400).trim();
  if (!Number.isInteger(id) || !["confirmed", "declined", "cancelled", "pending"].includes(status)) return;
  const reservation = await setStatus(id, status, note);
  if (reservation && (status === "confirmed" || status === "declined")) await sendGuestEmail(status, reservation);
  revalidatePath("/admin");
}
