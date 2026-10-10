import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { Photo, Photos } from "@/lib/photos";
import { db, hasDatabase } from "./db";

/** Uploaded photos by slot. Cached with the page; saving a photo refreshes it ("photos" tag). */
export async function getPhotos(): Promise<Photos> {
  "use cache";
  cacheTag("photos");
  cacheLife("max");
  if (!hasDatabase()) return {};
  try {
    const [row] = (await db()`select value from settings where key = 'photos'`) as { value: Photos }[];
    return row?.value ?? {};
  } catch (error) {
    console.error("Could not load photos", error);
    return {};
  }
}

async function readFresh(): Promise<Photos> {
  const [row] = (await db()`select value from settings where key = 'photos'`) as { value: Photos }[];
  return row?.value ?? {};
}

async function write(photos: Photos) {
  await db()`
    insert into settings (key, value, updated_at) values ('photos', ${JSON.stringify(photos)}::jsonb, now())
    on conflict (key) do update set value = excluded.value, updated_at = now()
  `;
}

/** Stores a photo for a slot and returns the one it replaced (to delete it on Cloudinary). */
export async function setPhoto(slot: string, photo: Photo) {
  const photos = await readFresh();
  const previous = photos[slot];
  await write({ ...photos, [slot]: photo });
  return previous ?? null;
}

/** Goes back to the built-in picture; returns the removed photo. */
export async function clearPhoto(slot: string) {
  const photos = await readFresh();
  const previous = photos[slot];
  if (!previous) return null;
  delete photos[slot];
  await write(photos);
  return previous;
}

export const listPhotos = readFresh;
