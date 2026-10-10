import "server-only";
import { randomBytes } from "node:crypto";
import { cacheLife, cacheTag } from "next/cache";
import type { L } from "@/lib/data";
import type { Dish, GlutenClaim, Menu } from "@/lib/menu";
import { db, hasDatabase } from "./db";

/* The menu in Neon (menu_categories, menu_items). Pages read the cached copy; every change refreshes it ("menu" tag). */

type Row = Record<string, unknown>;

const toDish = (r: Row): Dish => ({
  id: String(r.id),
  categoryId: String(r.category_id),
  name: r.name as L,
  amharic: String(r.amharic ?? ""),
  description: (r.description as L | null) ?? null,
  price: Number(r.price),
  tags: (r.tags as Dish["tags"]) ?? [],
  gluten: r.gluten as GlutenClaim,
  allergens: (r.allergens as string[]) ?? [],
  additives: ((r.additives as number[]) ?? []).map(Number),
  volume: r.volume == null ? null : Number(r.volume),
  deposit: Number(r.deposit ?? 0),
  orderable: Boolean(r.orderable),
  available: Boolean(r.available),
});

/** The whole menu, categories and items in their order. Uncached; for the admin pages. */
export async function readMenu(): Promise<Menu> {
  const [cats, items] = (await Promise.all([
    db()`select * from menu_categories order by position, id`,
    db()`select * from menu_items order by position, id`,
  ])) as [Row[], Row[]];
  const dishes = items.map(toDish);
  return cats.map((c) => ({
    id: String(c.id),
    title: c.title as L,
    note: (c.note as L | null) ?? null,
    drinks: Boolean(c.drinks),
    items: dishes.filter((d) => d.categoryId === c.id),
  }));
}

/** The menu for the website, cached until it is edited. */
export async function getMenu(): Promise<Menu> {
  "use cache";
  cacheTag("menu");
  cacheLife("max");
  if (!hasDatabase()) return [];
  try {
    return await readMenu();
  } catch (error) {
    console.error("Could not load the menu", error);
    return [];
  }
}

/* ---------- categories ---------- */

const slug = (v: string) =>
  v
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24) || "kategorie";

export async function createCategory(c: { title: L; note: L | null; drinks: boolean }) {
  const base = slug(c.title.de);
  const [taken] = (await db()`select 1 from menu_categories where id = ${base}`) as Row[];
  const id = taken ? `${base}-${randomBytes(2).toString("hex")}` : base;
  await db()`
    insert into menu_categories (id, title, note, drinks, position)
    values (${id}, ${JSON.stringify(c.title)}::jsonb, ${c.note ? JSON.stringify(c.note) : null}::jsonb, ${c.drinks},
            (select coalesce(max(position), -1) + 1 from menu_categories))
  `;
  return id;
}

export async function updateCategory(id: string, c: { title: L; note: L | null; drinks: boolean }) {
  await db()`update menu_categories set title = ${JSON.stringify(c.title)}::jsonb, note = ${c.note ? JSON.stringify(c.note) : null}::jsonb, drinks = ${c.drinks} where id = ${id}`;
}

/** Only empty categories can be deleted; returns false otherwise. */
export async function deleteCategory(id: string) {
  const [{ n }] = (await db()`select count(*)::int as n from menu_items where category_id = ${id}`) as { n: number }[];
  if (n > 0) return false;
  await db()`delete from menu_categories where id = ${id}`;
  return true;
}

/* ---------- items ---------- */

export type DishInput = Omit<Dish, "id" | "categoryId"> & { categoryId: string };

export async function createDish(d: DishInput) {
  const id = `i-${randomBytes(4).toString("hex")}`;
  await db()`
    insert into menu_items (id, category_id, name, amharic, description, price, tags, gluten, allergens, additives, volume, deposit, orderable, available, position)
    values (${id}, ${d.categoryId}, ${JSON.stringify(d.name)}::jsonb, ${d.amharic}, ${d.description ? JSON.stringify(d.description) : null}::jsonb, ${d.price},
            ${d.tags}, ${d.gluten}, ${d.allergens}, ${d.additives}, ${d.volume}, ${d.deposit}, ${d.orderable}, ${d.available},
            (select coalesce(max(position), -1) + 1 from menu_items where category_id = ${d.categoryId}))
  `;
  return id;
}

export async function updateDish(id: string, d: DishInput) {
  await db()`
    update menu_items set
      category_id = ${d.categoryId}, name = ${JSON.stringify(d.name)}::jsonb, amharic = ${d.amharic},
      description = ${d.description ? JSON.stringify(d.description) : null}::jsonb, price = ${d.price}, tags = ${d.tags}, gluten = ${d.gluten},
      allergens = ${d.allergens}, additives = ${d.additives}, volume = ${d.volume}, deposit = ${d.deposit},
      orderable = ${d.orderable}, available = ${d.available}, updated_at = now()
    where id = ${id}
  `;
}

export async function deleteDish(id: string) {
  await db()`delete from menu_items where id = ${id}`;
}

export async function setAvailable(id: string, available: boolean) {
  await db()`update menu_items set available = ${available}, updated_at = now() where id = ${id}`;
}

/** Moves a category or an item one place up or down (swaps positions with its neighbour). */
export async function move(kind: "category" | "item", id: string, dir: -1 | 1) {
  const rows = (
    kind === "category"
      ? await db()`select id, position from menu_categories order by position, id`
      : await db()`select id, position from menu_items where category_id = (select category_id from menu_items where id = ${id}) order by position, id`
  ) as { id: string; position: number }[];
  const i = rows.findIndex((r) => r.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= rows.length) return;
  // renumber the whole list so equal or missing positions never get stuck
  const order = rows.map((r) => r.id);
  [order[i], order[j]] = [order[j], order[i]];
  for (const [position, rowId] of order.entries()) {
    if (kind === "category") await db()`update menu_categories set position = ${position} where id = ${rowId}`;
    else await db()`update menu_items set position = ${position} where id = ${rowId}`;
  }
}
