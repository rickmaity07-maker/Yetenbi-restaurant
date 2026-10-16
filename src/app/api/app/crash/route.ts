import { reportError } from "@/lib/server/alerts";
import { db, hasDatabase } from "@/lib/server/db";
import { isLimited, recordHit, visitorKey } from "@/lib/server/rate-limit";

/*
  POST { trace, appVersion, device, android }: a crash of the service app, sent on its next start (signed in or
  not, since it may have crashed before). Kept for /admin/service and emailed like a server error.
*/
export async function POST(request: Request) {
  if (!hasDatabase()) return Response.json({ code: "unavailable" }, { status: 503 });
  const ip = await visitorKey(request);
  if (await isLimited("app-crash", ip, { max: 20, minutes: 60 }))
    return Response.json({ code: "too_many" }, { status: 429 });
  await recordHit("app-crash", ip);
  let input: Record<string, unknown>;
  try {
    input = await request.json();
  } catch {
    return Response.json({ code: "invalid_json" }, { status: 400 });
  }
  const text = (key: string, max: number) => String(input[key] ?? "").slice(0, max);
  const trace = text("trace", 12_000);
  if (!trace.trim()) return Response.json({ code: "trace_missing" }, { status: 422 });
  await db()`
    insert into app_crashes (app_version, device, android, trace)
    values (${text("appVersion", 20)}, ${text("device", 80)}, ${text("android", 20)}, ${trace})
  `;
  await reportError(`Service-App ${text("appVersion", 20)}`, new Error(trace.split("\n").slice(0, 12).join("\n")));
  return Response.json({ ok: true });
}
