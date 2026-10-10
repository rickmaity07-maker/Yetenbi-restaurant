"use server";

import { revalidatePath, updateTag } from "next/cache";
import { ADDITIVES, ALL_ITEMS, ALLERGENS, DRINK_CATEGORIES, type GlutenClaim, type ItemInfo } from "@/lib/menu-info";
import { requireOwner } from "@/lib/server/auth";
import { readMenuInfo, saveMenuInfo } from "@/lib/server/menu-info";

export type MenuInfoState = { ok?: string; error?: string } | null;

const CODES = new Set(ALLERGENS.map((a) => a.code));
const NUMBERS = new Set(ADDITIVES.map((a) => a.code));
const CLAIMS: GlutenClaim[] = ["keep", "free", "noGluten", "none"];
const num = (v: FormDataEntryValue | null) => {
  const n = Number(String(v ?? "").replace(",", ".").trim());
  return Number.isFinite(n) && n > 0 ? Math.round(n * 1000) / 1000 : null;
};

/** Saves the details for one menu category (one form per category). The website refreshes right away. */
export async function saveCategory(_: MenuInfoState, form: FormData): Promise<MenuInfoState> {
  await requireOwner();
  const categoryId = String(form.get("category") ?? "");
  const items = ALL_ITEMS.filter((i) => i.categoryId === categoryId);
  if (!items.length) return { error: "Unbekannte Kategorie." };
  const info = await readMenuInfo();
  for (const { id } of items) {
    const volume = num(form.get(`${id}|volume`));
    const deposit = num(form.get(`${id}|deposit`));
    if (volume !== null && volume > 5) return { error: "Menge bitte in Litern angeben, z. B. 0,33." };
    if (deposit !== null && deposit > 5) return { error: "Pfand bitte in Euro angeben, z. B. 0,25." };
    const entry: ItemInfo = {
      allergens: form.getAll(`${id}|allergen`).map(String).filter((c) => CODES.has(c)).sort(),
      additives: form.getAll(`${id}|additive`).map(Number).filter((n) => NUMBERS.has(n)).sort((a, b) => a - b),
      volume: DRINK_CATEGORIES.has(categoryId) ? volume : null,
      deposit: DRINK_CATEGORIES.has(categoryId) ? (deposit ?? 0) : 0,
      gluten: CLAIMS.find((c) => c === form.get(`${id}|gluten`)) ?? "keep",
    };
    info[id] = entry;
  }
  await saveMenuInfo(info);
  updateTag("menu-info");
  revalidatePath("/admin/speisekarte");
  return { ok: "Gespeichert, auf der Website sichtbar." };
}
