import { APP_LOGIN } from "@/lib/features";
import { createAppToken, DEMO_EMAIL } from "@/lib/server/app-auth";
import { db, hasDatabase } from "@/lib/server/db";
import { isLimited, recordHit, visitorKey } from "@/lib/server/rate-limit";

/*
  POST /api/app/login/demo -> { token, user }, only while APP_LOGIN is off (see lib/features.ts).
  Signs the app in as the shared "Demo" service account, created on first use. It has no password, so it can't sign
  in on the website. With APP_LOGIN on this answers "login_required" and the app shows its login screen.
*/
export async function POST(request: Request) {
  if (APP_LOGIN) return Response.json({ code: "login_required" }, { status: 403 });
  if (!hasDatabase()) return Response.json({ code: "unavailable" }, { status: 503 });
  const ip = await visitorKey(request);
  if (await isLimited("app-demo", ip, { max: 30, minutes: 15 }))
    return Response.json({ code: "too_many" }, { status: 429 });
  await recordHit("app-demo", ip);

  const [user] = (await db()`
    insert into users (email, name, phone, password_hash, locale, role, email_verified)
    values (${DEMO_EMAIL}, 'Demo', '', 'none', 'de', 'service', true)
    on conflict (email) do update set role = 'service'
    returning id, email, name, role, locale
  `) as { id: string; email: string; name: string; role: string; locale: string }[];
  const token = await createAppToken(Number(user.id));
  return Response.json({ token, user: { ...user, id: Number(user.id) } });
}
