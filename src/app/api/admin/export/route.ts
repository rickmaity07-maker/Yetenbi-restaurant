import { parseRange } from "@/lib/report-range";
import { getCurrentUser } from "@/lib/server/auth";
import { readMenu } from "@/lib/server/menu";
import { ordersCsv, reservationsCsv } from "@/lib/server/reports";

/* CSV export of orders or reservations for a period (owners only; no names or contact details). */
export async function GET(request: Request) {
  const me = await getCurrentUser();
  if (me?.role !== "owner") return new Response("Forbidden", { status: 403 });
  const url = new URL(request.url);
  const range = parseRange(Object.fromEntries(url.searchParams));
  const type = url.searchParams.get("typ") === "reservierungen" ? "reservierungen" : "bestellungen";
  const csv = type === "bestellungen" ? await ordersCsv(range, await readMenu()) : await reservationsCsv(range);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="yetenbi-${type}-${range.from}-bis-${range.to}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
