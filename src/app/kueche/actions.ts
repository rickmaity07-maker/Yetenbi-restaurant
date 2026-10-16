"use server";

import { revalidatePath, updateTag } from "next/cache";
import type { OrderStatus } from "@/lib/ordering";
import { audit } from "@/lib/server/audit";
import { requireRole } from "@/lib/server/auth";
import { setAvailable } from "@/lib/server/menu";
import { moveOrder } from "@/lib/server/order-flow";
import { markRoundReady } from "@/lib/server/service";

/** "Essen fertig" and "Verpackt". The guest is emailed at each step; when packed, the restaurant too. */
export async function kitchenStep(form: FormData) {
  const me = await requireRole(["kitchen", "owner"], "/kueche");
  const id = Number(form.get("id"));
  if (!Number.isInteger(id)) return;
  await moveOrder(me, id, String(form.get("from")) as OrderStatus, String(form.get("status")) as OrderStatus);
  revalidatePath("/kueche");
}

/**
  "Aus" / "Wieder da" for a dish: the website's menu and order page grey it out, and the waiters' app within seconds.
*/
export async function kitchenSoldOut(form: FormData) {
  const me = await requireRole(["kitchen", "owner"], "/kueche");
  const id = String(form.get("dish") ?? "");
  const available = form.get("available") === "1";
  if (!/^[a-z0-9-]{1,40}$/i.test(id)) return;
  await setAvailable(id, available);
  await audit(me, "menu", available ? "Wieder verfügbar (Küche)" : "Ausverkauft gemeldet (Küche)", id);
  updateTag("menu");
  revalidatePath("/kueche");
}

/** "Fertig" on a table ticket: the round is at the pass and the waiters' app rings. */
export async function tableReady(form: FormData) {
  await requireRole(["kitchen", "owner"], "/kueche");
  const checkId = Number(form.get("check"));
  const round = Number(form.get("round"));
  if (!Number.isInteger(checkId) || !Number.isInteger(round)) return;
  await markRoundReady(checkId, round);
  revalidatePath("/kueche");
}
