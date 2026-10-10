import { connection } from "next/server";
import { todayISO } from "@/lib/booking";
import { DEFAULT_SETTINGS, orderWindow } from "@/lib/ordering";
import { upcomingClosures } from "@/lib/server/closures";
import { hasDatabase } from "@/lib/server/db";
import { getOrderSettings } from "@/lib/server/orders";
import { getMenuInfo } from "@/lib/server/menu-info";

/* What the order page needs: the owner's settings and whether delivery/pickup are possible right now. */
export async function GET() {
  await connection();
  if (!hasDatabase()) return Response.json({ available: false, settings: DEFAULT_SETTINGS });
  const [settings, closures, menuInfo] = await Promise.all([getOrderSettings(), upcomingClosures(), getMenuInfo()]);
  const closedToday = closures.some((c) => c.date === todayISO());
  return Response.json(
    {
      available: true,
      settings,
      menuInfo,
      closedToday,
      delivery: orderWindow("delivery", settings, closedToday),
      pickup: orderWindow("pickup", settings, closedToday),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
