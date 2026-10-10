import "server-only";
import { createHash } from "node:crypto";

/*
  Cloudinary for photos uploaded in /admin. Needs CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and
  CLOUDINARY_API_SECRET (cloudinary.com → Dashboard). The secret never leaves the server: the browser gets a
  signature for one upload into the "yetenbi/" folder, valid for one hour, and only signed-in owners get one.
*/

export const isCloudinaryConfigured = () =>
  Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

const cloud = () => process.env.CLOUDINARY_CLOUD_NAME!;
const api = (path: string) => `https://api.cloudinary.com/v1_1/${cloud()}/${path}`;

export const FOLDER = "yetenbi";
export const ALLOWED_FORMATS = "jpg,jpeg,png,webp,avif,heic";

/** Cloudinary's signature: SHA-1 of the sorted parameters followed by the secret. */
function sign(params: Record<string, string | number>) {
  const base = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("sha1").update(base + process.env.CLOUDINARY_API_SECRET).digest("hex");
}

/** Everything the browser needs to upload one file directly to Cloudinary. */
export function uploadTicket(publicId: string) {
  const params = { public_id: publicId, timestamp: Math.floor(Date.now() / 1000), allowed_formats: ALLOWED_FORMATS };
  return { url: api("image/upload"), cloudName: cloud(), apiKey: process.env.CLOUDINARY_API_KEY!, ...params, signature: sign(params) };
}

export type Resource = { public_id: string; secure_url: string; width: number; height: number; format: string; bytes: number };

/** Looks the uploaded file up in our own account (so nothing else can be saved as a photo). */
export async function findResource(publicId: string): Promise<Resource | null> {
  const auth = Buffer.from(`${process.env.CLOUDINARY_API_KEY}:${process.env.CLOUDINARY_API_SECRET}`).toString("base64");
  const res = await fetch(api(`resources/image/upload/${publicId.split("/").map(encodeURIComponent).join("/")}`), {
    headers: { Authorization: `Basic ${auth}` },
    cache: "no-store",
  });
  return res.ok ? ((await res.json()) as Resource) : null;
}

/** Deletes a photo that is no longer used. Failures are only logged. */
export async function destroy(publicId: string) {
  try {
    const params = { public_id: publicId, timestamp: Math.floor(Date.now() / 1000), invalidate: "true" };
    const body = new URLSearchParams({ ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])), api_key: process.env.CLOUDINARY_API_KEY!, signature: sign(params) });
    await fetch(api("image/destroy"), { method: "POST", body });
  } catch (error) {
    console.error("Cloudinary delete failed", publicId, error);
  }
}

/** A ~16px blurred copy as a data URL, shown while the real photo loads. */
export async function blurPreview(secureUrl: string) {
  try {
    const res = await fetch(secureUrl.replace("/image/upload/", "/image/upload/w_16,e_blur:200,q_40,f_jpg/"));
    if (!res.ok) return "";
    return `data:image/jpeg;base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch {
    return "";
  }
}
