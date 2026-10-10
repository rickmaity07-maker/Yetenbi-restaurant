import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { DEFAULT_BUSINESS, type Business } from "@/lib/business";
import { db, hasDatabase } from "./db";

/** Opening hours and legal details, cached until the owner saves them ("business" tag). */
export async function getBusiness(): Promise<Business> {
  "use cache";
  cacheTag("business");
  cacheLife("max");
  if (!hasDatabase()) return DEFAULT_BUSINESS;
  try {
    return await readBusiness();
  } catch (error) {
    console.error("Could not load business settings", error);
    return DEFAULT_BUSINESS;
  }
}

export async function readBusiness(): Promise<Business> {
  const [row] = (await db()`select value from settings where key = 'business'`) as { value: Partial<Business> }[];
  return { ...DEFAULT_BUSINESS, ...(row?.value ?? {}) };
}

export async function saveBusiness(b: Business) {
  await db()`
    insert into settings (key, value, updated_at) values ('business', ${JSON.stringify(b)}::jsonb, now())
    on conflict (key) do update set value = excluded.value, updated_at = now()
  `;
}
