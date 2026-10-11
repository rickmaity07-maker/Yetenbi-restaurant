import { getCurrentUser } from "@/lib/server/auth";
import { personalData } from "@/lib/server/customers";

/* DSGVO data export: everything stored about the signed-in guest, as a JSON download. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const body = JSON.stringify(await personalData(user), null, 2);
  return new Response(body, {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="yetenbi-daten.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
