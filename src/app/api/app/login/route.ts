import { APP_ROLES, createAppToken } from "@/lib/server/app-auth";
import { audit } from "@/lib/server/audit";
import { authenticate } from "@/lib/server/auth";
import { hasDatabase } from "@/lib/server/db";
import { clearHits, isLimited, RATE, recordHit, visitorKey } from "@/lib/server/rate-limit";

/*
  POST /api/app/login { email, password } -> { token, user }
  Same accounts as the website; only service staff and owners may use the app. Failed attempts count towards the
  website's limits (per email and per connection).
*/
export async function POST(request: Request) {
  if (!hasDatabase()) return Response.json({ code: "unavailable" }, { status: 503 });
  let input: { email?: unknown; password?: unknown };
  try {
    input = await request.json();
  } catch {
    return Response.json({ code: "invalid_json" }, { status: 400 });
  }
  const email = String(input.email ?? "")
    .trim()
    .toLowerCase()
    .slice(0, 200);
  const password = String(input.password ?? "").slice(0, 200);
  const ip = await visitorKey(request);
  if ((await isLimited("login-email", email, RATE.loginPerEmail)) || (await isLimited("login-ip", ip, RATE.loginPerIp)))
    return Response.json({ code: "too_many" }, { status: 429 });

  const user = email && password ? await authenticate(email, password) : null;
  if (!user) {
    await Promise.all([recordHit("login-email", email), recordHit("login-ip", ip)]);
    return Response.json({ code: "credentials" }, { status: 401 });
  }
  if (!APP_ROLES.includes(user.role)) return Response.json({ code: "no_app_access" }, { status: 403 });

  await clearHits("login-email", email);
  const token = await createAppToken(user.id);
  await audit(user, "login", "In der Service-App angemeldet", user.email);
  return Response.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, locale: user.locale },
  });
}
