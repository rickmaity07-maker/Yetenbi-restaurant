"use server";

import { revalidatePath, updateTag } from "next/cache";
import type { L } from "@/lib/data";
import { ADDITIVES, ALLERGENS, DISH_TAGS, type GlutenClaim } from "@/lib/menu";
import { requireOwner } from "@/lib/server/auth";
import {
  createCategory,
  createDish,
  deleteCategory,
  deleteDish,
  move,
  readMenu,
  setAvailable,
  updateCategory,
  updateDish,
  type DishInput,
} from "@/lib/server/menu";

/* Create, edit, delete and reorder the menu. Every change refreshes the website's cached menu ("menu" tag). */

export type MenuState = { ok?: string; error?: string } | null;

const CODES = new Set(ALLERGENS.map((a) => a.code));
const NUMBERS = new Set(ADDITIVES.map((a) => a.code));
const CLAIMS: GlutenClaim[] = ["free", "noGluten", "none"];

const str = (form: FormData, key: string, max: number) => String(form.get(key) ?? "").trim().slice(0, max);
const num = (form: FormData, key: string) => {
  const raw = String(form.get(key) ?? "").replace(",", ".").trim();
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};
/** German is required; English and Amharic fall back to it when left empty. */
const text = (form: FormData, key: string, max: number): L | null => {
  const de = str(form, `${key}_de`, max);
  if (!de) return null;
  return { de, en: str(form, `${key}_en`, max) || de, am: str(form, `${key}_am`, max) || de };
};

function refresh() {
  updateTag("menu");
  revalidatePath("/admin/speisekarte");
}

/* ---------- categories ---------- */

export async function saveCategory(_: MenuState, form: FormData): Promise<MenuState> {
  await requireOwner();
  const id = str(form, "id", 60);
  const title = text(form, "title", 60);
  if (!title || title.de.length < 2) return { error: "Bitte einen Namen (Deutsch) eingeben." };
  const data = { title, note: text(form, "note", 400), drinks: form.get("drinks") === "on" };
  if (id) await updateCategory(id, data);
  else await createCategory(data);
  refresh();
  return { ok: id ? "Kategorie gespeichert." : "Kategorie angelegt." };
}

export async function removeCategory(_: MenuState, form: FormData): Promise<MenuState> {
  await requireOwner();
  if (!(await deleteCategory(str(form, "id", 60)))) return { error: "Nur leere Kategorien können gelöscht werden. Erst die Gerichte löschen oder verschieben." };
  refresh();
  return { ok: "Kategorie gelöscht." };
}

/* ---------- dishes ---------- */

export async function saveDish(_: MenuState, form: FormData): Promise<MenuState> {
  await requireOwner();
  const id = str(form, "id", 60);
  const categoryId = str(form, "categoryId", 60);
  const category = (await readMenu()).find((c) => c.id === categoryId);
  if (!category) return { error: "Bitte eine Kategorie wählen." };
  const name = text(form, "name", 80);
  if (!name || name.de.length < 2) return { error: "Bitte einen Namen (Deutsch) eingeben." };
  const price = num(form, "price");
  if (price === null || Number.isNaN(price) || price > 999) return { error: "Bitte einen Preis in Euro eingeben, z. B. 12,50." };
  const volume = num(form, "volume");
  const deposit = num(form, "deposit");
  if (Number.isNaN(volume) || (volume !== null && volume > 5)) return { error: "Menge bitte in Litern, z. B. 0,33." };
  if (Number.isNaN(deposit) || (deposit !== null && deposit > 5)) return { error: "Pfand bitte in Euro, z. B. 0,25." };

  const dish: DishInput = {
    categoryId,
    name,
    amharic: str(form, "amharic", 80),
    description: text(form, "description", 400),
    price: Math.round(price * 100) / 100,
    tags: form.getAll("tags").map(String).filter((t): t is DishInput["tags"][number] => (DISH_TAGS as string[]).includes(t)),
    gluten: CLAIMS.find((c) => c === form.get("gluten")) ?? "none",
    allergens: form.getAll("allergens").map(String).filter((c) => CODES.has(c)).sort(),
    additives: form.getAll("additives").map(Number).filter((n) => NUMBERS.has(n)).sort((a, b) => a - b),
    volume: category.drinks && volume ? Math.round(volume * 1000) / 1000 : null,
    deposit: category.drinks && deposit ? Math.round(deposit * 100) / 100 : 0,
    orderable: form.get("orderable") === "on",
    available: form.get("available") === "on",
  };
  if (id) await updateDish(id, dish);
  else await createDish(dish);
  refresh();
  return { ok: id ? "Gespeichert, auf der Website sichtbar." : "Gericht angelegt, auf der Website sichtbar." };
}

export async function removeDish(_: MenuState, form: FormData): Promise<MenuState> {
  await requireOwner();
  await deleteDish(str(form, "id", 60));
  refresh();
  return { ok: "Gelöscht." };
}

/** Quick switch: sold out today / available again. */
export async function toggleAvailable(form: FormData) {
  await requireOwner();
  await setAvailable(str(form, "id", 60), form.get("available") === "true");
  refresh();
}

export async function moveEntry(form: FormData) {
  await requireOwner();
  const kind = form.get("kind") === "category" ? "category" : "item";
  await move(kind, str(form, "id", 60), form.get("dir") === "up" ? -1 : 1);
  refresh();
}
