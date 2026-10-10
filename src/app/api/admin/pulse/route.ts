import { getCurrentUser } from "@/lib/server/auth";
import { getPulse } from "@/lib/server/dashboard";

/* Live alert counters for the admin and kitchen screens (polled every few seconds). Team only. */
export async function GET() {
  const me = await getCurrentUser();
  if (!me || (me.role !== "owner" && me.role !== "kitchen")) return Response.json({ code: "forbidden" }, { status: 403 });
  return Response.json(await getPulse(), { headers: { "Cache-Control": "no-store" } });
}
