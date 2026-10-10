"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/server/auth";
import { moveOrder } from "@/lib/server/order-flow";

/** "Zugestellt": drivers only for their own deliveries. The guest and the restaurant are emailed. */
export async function markDelivered(form: FormData) {
  const me = await requireRole(["driver", "owner"], "/lieferung");
  const id = Number(form.get("id"));
  if (!Number.isInteger(id)) return;
  await moveOrder(me, id, "on_the_way", "completed");
  revalidatePath("/lieferung");
}
