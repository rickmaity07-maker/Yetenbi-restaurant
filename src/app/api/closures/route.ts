import { connection } from "next/server";
import { hasDatabase } from "@/lib/server/db";
import { upcomingClosures } from "@/lib/server/closures";

/* Public list of upcoming closed days, so the form and the hours table can show them. */
export async function GET() {
  await connection();
  if (!hasDatabase()) return Response.json({ closures: [] });
  try {
    return Response.json(
      { closures: await upcomingClosures() },
      { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } },
    );
  } catch {
    return Response.json({ closures: [] });
  }
}
