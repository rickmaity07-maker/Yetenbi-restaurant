import { hasDatabase } from "@/lib/server/db";
import { purgeOld } from "@/lib/server/reservations";
import { purgeExpiredAuth } from "@/lib/server/auth";
import { purgeOldOrders } from "@/lib/server/orders";

/* Daily data-retention job (Vercel Cron, see vercel.json): removes reservations older than 180 days. */
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  if (!hasDatabase()) return Response.json({ removed: 0 });
  const removed = await purgeOld();
  await purgeExpiredAuth();
  await purgeOldOrders();
  return Response.json({ removed });
}
