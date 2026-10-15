import { updateInfo } from "@/lib/server/app-releases";

/*
  GET /api/app/version?current=<versionCode>
  Asked by the app on start and every half hour, signed in or not, so it needs no token.
*/
export async function GET(request: Request) {
  const current = Number(new URL(request.url).searchParams.get("current") ?? 0);
  if (!Number.isInteger(current) || current < 0) return Response.json({ code: "current_invalid" }, { status: 422 });
  return Response.json(await updateInfo(current), { headers: { "Cache-Control": "no-store" } });
}
