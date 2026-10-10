"use server";

import { revalidatePath } from "next/cache";
import type { OrderStatus } from "@/lib/ordering";
import { requireRole } from "@/lib/server/auth";
import { moveOrder } from "@/lib/server/order-flow";

/** "Essen fertig" and "Verpackt". The guest is emailed at each step; when packed, the restaurant too. */
export async function kitchenStep(form: FormData) {
  const me = await requireRole(["kitchen", "owner"], "/kueche");
  const id = Number(form.get("id"));
  if (!Number.isInteger(id)) return;
  await moveOrder(me, id, String(form.get("from")) as OrderStatus, String(form.get("status")) as OrderStatus);
  revalidatePath("/kueche");
}
