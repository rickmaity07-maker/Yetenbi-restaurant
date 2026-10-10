import { timingSafeEqual } from "node:crypto";
import { hasDatabase } from "@/lib/server/db";
import { purgeRateHits } from "@/lib/server/rate-limit";
import { purgeOld } from "@/lib/server/reservations";
import { purgeExpiredAuth } from "@/lib/server/auth";
import { purgeOldOrders } from "@/lib/server/orders";
import { purgeGuardData } from "@/lib/server/order-guard";

/* Daily data-retention job (Vercel Cron, see vercel.json): removes reservations older than 180 days. */
export async function GET(request: Request) {
  const expected = Buffer.from(`Bearer ${process.env.CRON_SECRET ?? ""}`);
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  if (!process.env.CRON_SECRET || given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!hasDatabase()) return Response.json({ removed: 0 });
  const removed = await purgeOld();
  await purgeExpiredAuth();
  await purgeOldOrders();
  await purgeGuardData();
  await purgeRateHits();
  return Response.json({ removed });
}
