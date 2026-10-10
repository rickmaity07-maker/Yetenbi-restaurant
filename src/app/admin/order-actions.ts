"use server";

import { revalidatePath } from "next/cache";
import { OPEN_STATUSES, type OrderSettings, type OrderStatus } from "@/lib/ordering";
import { requireOwner } from "@/lib/server/auth";
import { sendOrderEmail } from "@/lib/server/mailer";
import { blockOrderGuest, blockPhone, removeBlock } from "@/lib/server/order-guard";
import { moveOrder } from "@/lib/server/order-flow";
import { findOrderById, getOrderSettings, saveOrderSettings, setOrderStatus } from "@/lib/server/orders";

/** Moves an order one step (accept with ETA, reject, kitchen steps, hand to a driver, done, cancel); emails follow. */
export async function updateOrder(form: FormData) {
  const me = await requireOwner();
  const id = Number(form.get("id"));
  const from = String(form.get("from")) as OrderStatus;
  const status = String(form.get("status")) as OrderStatus;
  if (!Number.isInteger(id)) return;
  const etaRaw = Number(form.get("eta"));
  const eta = Number.isFinite(etaRaw) && etaRaw > 0 ? Math.min(180, Math.round(etaRaw)) : null;
  const note = form.has("note") ? String(form.get("note")).slice(0, 300).trim() : undefined;
  const driverId = Number(form.get("driver")) || null;
  await moveOrder(me, id, from, status, { eta, staffNote: note, driverId });
  revalidatePath("/admin/bestellungen");
}

/**
  Blocks the guest of an order (phone number, email and device) from ordering online.
  An open order is rejected or cancelled at the same time.
*/
export async function blockGuest(form: FormData) {
  await requireOwner();
  const id = Number(form.get("id"));
  if (!Number.isInteger(id)) return;
  // decided from the stored status, not from what the form claims
  const current = (await findOrderById(id))?.status;
  if (!current) return;
  const reason = String(form.get("note") ?? "").slice(0, 300).trim();
  if (!(await blockOrderGuest(id, reason))) return;
  const next: OrderStatus | null = current === "new" ? "rejected" : OPEN_STATUSES.includes(current) ? "cancelled" : null;
  if (next) {
    const order = await setOrderStatus(id, next, null, reason);
    if (order) await sendOrderEmail(next, order);
  }
  revalidatePath("/admin/bestellungen");
}

export type BlockState = { ok?: string; error?: string } | null;

export async function addPhoneBlock(_: BlockState, form: FormData): Promise<BlockState> {
  await requireOwner();
  const phone = String(form.get("phone") ?? "").trim();
  if (phone.replace(/\D/g, "").length < 6) return { error: "Bitte eine Telefonnummer eingeben." };
  await blockPhone(phone, String(form.get("reason") ?? "").slice(0, 300).trim());
  revalidatePath("/admin/bestellungen");
  return { ok: "Gesperrt." };
}

export async function unblock(form: FormData) {
  await requireOwner();
  const id = Number(form.get("id"));
  if (Number.isInteger(id)) await removeBlock(id);
  revalidatePath("/admin/bestellungen");
}

export type SettingsState = { ok?: string; error?: string } | null;

export async function saveSettings(_: SettingsState, form: FormData): Promise<SettingsState> {
  await requireOwner();
  const current = await getOrderSettings();
  const num = (k: string, fallback: number) => {
    const v = Number(String(form.get(k) ?? "").replace(",", "."));
    return Number.isFinite(v) && v >= 0 ? Math.round(v * 100) / 100 : fallback;
  };
  const postcodes = String(form.get("postcodes") ?? "")
    .split(/[\s,;]+/)
    .map((p) => p.trim())
    .filter((p) => /^\d{5}$/.test(p));
  const next: OrderSettings = {
    paused: form.get("paused") === "on",
    ignoreHours: form.get("ignoreHours") === "on",
    reusable: (["offer", "own"] as const).find((v) => v === form.get("reusable")) ?? "none",
    delivery: form.get("delivery") === "on",
    pickup: form.get("pickup") === "on",
    minOrder: num("minOrder", current.minOrder),
    deliveryFee: num("deliveryFee", current.deliveryFee),
    freeDeliveryFrom: num("freeDeliveryFrom", current.freeDeliveryFrom),
    postcodes: postcodes.length ? [...new Set(postcodes)] : current.postcodes,
    deliveryMinutes: Math.min(180, Math.max(10, Math.round(num("deliveryMinutes", current.deliveryMinutes)))),
    pickupMinutes: Math.min(180, Math.max(5, Math.round(num("pickupMinutes", current.pickupMinutes)))),
  };
  await saveOrderSettings(next);
  revalidatePath("/admin/bestellungen");
  return { ok: "Gespeichert." };
}
