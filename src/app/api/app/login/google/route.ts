import { APP_ROLES, createAppToken, redeemAppCode } from "@/lib/server/app-auth";
import { audit } from "@/lib/server/audit";
import { findUserById } from "@/lib/server/auth";
import { hasDatabase } from "@/lib/server/db";
import { isLimited, RATE, recordHit, visitorKey } from "@/lib/server/rate-limit";

/*
  POST /api/app/login/google { code, verifier } -> { token, user }
  Second half of "Sign in with Google" in the app (see createAppCode): swaps the one-time code from the browser and
  the app's PKCE secret for an app token. Wrong codes count towards the per-connection sign-in limit.
*/
export async function POST(request: Request) {
  if (!hasDatabase()) return Response.json({ code: "unavailable" }, { status: 503 });
  let input: { code?: unknown; verifier?: unknown };
  try {
    input = await request.json();
  } catch {
    return Response.json({ code: "invalid_json" }, { status: 400 });
  }
  const code = String(input.code ?? "").slice(0, 100);
  const verifier = String(input.verifier ?? "").slice(0, 200);
  const ip = await visitorKey(request);
  if (await isLimited("login-ip", ip, RATE.loginPerIp)) return Response.json({ code: "too_many" }, { status: 429 });

  const userId = code && verifier ? await redeemAppCode(code, verifier) : null;
  const user = userId ? await findUserById(userId) : null;
  if (!user) {
    await recordHit("login-ip", ip);
    return Response.json({ code: "google" }, { status: 401 });
  }
  if (!APP_ROLES.includes(user.role)) return Response.json({ code: "no_app_access" }, { status: 403 });

  const token = await createAppToken(user.id);
  await audit(user, "login", "In der Service-App angemeldet (Google)", user.email);
  return Response.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, locale: user.locale },
  });
}
