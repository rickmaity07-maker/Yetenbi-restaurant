"use server";

import { revalidatePath } from "next/cache";
import type { OrderSettings, OrderStatus } from "@/lib/ordering";
import { requireOwner } from "@/lib/server/auth";
import { sendOrderEmail } from "@/lib/server/mailer";
import { getOrderSettings, saveOrderSettings, setOrderStatus } from "@/lib/server/orders";

const NEXT: OrderStatus[] = ["accepted", "ready", "on_the_way", "completed", "rejected", "cancelled"];

/** Moves an order along; the guest is emailed on accept, on the way and reject. */
export async function updateOrder(form: FormData) {
  await requireOwner();
  const id = Number(form.get("id"));
  const status = String(form.get("status")) as OrderStatus;
  if (!Number.isInteger(id) || !NEXT.includes(status)) return;
  const etaRaw = Number(form.get("eta"));
  const eta = Number.isFinite(etaRaw) && etaRaw > 0 ? Math.min(180, Math.round(etaRaw)) : null;
  const note = String(form.get("note") ?? "").slice(0, 300).trim();
  const order = await setOrderStatus(id, status, eta, note);
  if (order && (status === "accepted" || status === "on_the_way" || status === "rejected")) await sendOrderEmail(status, order);
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
