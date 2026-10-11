"use server";

import { revalidatePath } from "next/cache";
import { createUser, findUserByEmail, findUserById, requireOwner, setPassword, setRole } from "@/lib/server/auth";
import type { Role } from "@/lib/roles";
import { isEmail } from "@/lib/validate";
import { audit } from "@/lib/server/audit";

export type TeamState = { ok?: string; error?: string } | null;

const STAFF: Role[] = ["owner", "kitchen", "driver"];
const asRole = (v: FormDataEntryValue | null) => (STAFF.includes(String(v) as Role) ? (String(v) as Role) : null);

/**
  Creates a login for a team member (email = login id, starting password set by the owner).
  An existing guest account with that email gets the role instead, keeping its password.
*/
export async function addStaff(_: TeamState, form: FormData): Promise<TeamState> {
  const me = await requireOwner();
  const name = String(form.get("name") ?? "").trim();
  const email = String(form.get("email") ?? "")
    .trim()
    .toLowerCase();
  const phone = String(form.get("phone") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const role = asRole(form.get("role"));
  if (!role) return { error: "Bitte eine Rolle wählen." };
  if (!isEmail(email)) return { error: "Bitte eine gültige E-Mail-Adresse eingeben." };
  const existing = await findUserByEmail(email);
  if (existing) {
    if (existing.role !== "guest") return { error: "Diese Person ist schon im Team. Rolle unten ändern." };
    // Anyone can sign up with any email address. If this guest account never proved it owns the address,
    // whoever registered it must not get team rights with their own password: it gets the starting password instead.
    if (!existing.email_verified) {
      if (password.length < 10 || password.length > 200) {
        return {
          error:
            "Zu dieser E-Mail gibt es ein unbestätigtes Gastkonto. Bitte ein Startpasswort (mind. 10 Zeichen) vergeben – es ersetzt das bisherige Passwort.",
        };
      }
      await setPassword(Number(existing.id), password);
    }
    await setRole(Number(existing.id), role);
    await audit(me, "team", `Rolle vergeben: ${role}`, email);
    revalidatePath("/admin/team");
    const login = existing.email_verified ? "mit dem eigenen Passwort" : "mit dem Startpasswort";
    return { ok: `${existing.name} ist jetzt im Team. Anmeldung ${login}.` };
  }
  if (name.length < 2 || name.length > 80) return { error: "Bitte einen Namen eingeben." };
  if (phone && !/^[+\d][\d\s()/-]{5,24}$/.test(phone)) return { error: "Die Telefonnummer ist ungültig." };
  if (password.length < 10 || password.length > 200)
    return { error: "Das Startpasswort braucht mindestens 10 Zeichen." };
  await createUser({ name, email, phone, password, locale: "de", role });
  await audit(me, "team", `Konto angelegt: ${role}`, email);
  revalidatePath("/admin/team");
  return { ok: `Konto angelegt. ${name} meldet sich unter /login mit ${email} an.` };
}

/** Changes a team member's role, or removes them from the team ("guest"). Owners cannot change their own role. */
export async function changeRole(form: FormData) {
  const me = await requireOwner();
  const id = Number(form.get("id"));
  const role = form.get("role") === "guest" ? "guest" : asRole(form.get("role"));
  if (!Number.isInteger(id) || id === me.id || !role) return;
  const who = await findUserById(id);
  await setRole(id, role);
  await audit(
    me,
    "team",
    role === "guest" ? "Aus dem Team entfernt" : `Rolle geändert: ${who?.role} → ${role}`,
    who?.email ?? `#${id}`,
  );
  revalidatePath("/admin/team");
}

/** Sets a new password for a team member (e.g. forgotten); they are signed out everywhere. */
export async function resetStaffPassword(_: TeamState, form: FormData): Promise<TeamState> {
  const me = await requireOwner();
  const id = Number(form.get("id"));
  const password = String(form.get("password") ?? "");
  const user = Number.isInteger(id) ? await findUserById(id) : null;
  if (!user || user.role === "guest") return { error: "Konto nicht gefunden." };
  if (password.length < 10 || password.length > 200) return { error: "Mindestens 10 Zeichen." };
  await setPassword(id, password);
  await audit(me, "team", "Passwort neu gesetzt", user.email);
  return { ok: "Neues Passwort gesetzt." };
}
