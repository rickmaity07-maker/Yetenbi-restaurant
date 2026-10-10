import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { MenuInfo } from "@/lib/menu-info";
import { db, hasDatabase } from "./db";

/** Allergens, additives, volumes, deposits and gluten claims from /admin → Speisekarte. Cached; saving refreshes it. */
export async function getMenuInfo(): Promise<MenuInfo> {
  "use cache";
  cacheTag("menu-info");
  cacheLife("max");
  if (!hasDatabase()) return {};
  try {
    return await readMenuInfo();
  } catch (error) {
    console.error("Could not load menu info", error);
    return {};
  }
}

export async function readMenuInfo(): Promise<MenuInfo> {
  const [row] = (await db()`select value from settings where key = 'menu_info'`) as { value: MenuInfo }[];
  return row?.value ?? {};
}

export async function saveMenuInfo(info: MenuInfo) {
  await db()`
    insert into settings (key, value, updated_at) values ('menu_info', ${JSON.stringify(info)}::jsonb, now())
    on conflict (key) do update set value = excluded.value, updated_at = now()
  `;
}
