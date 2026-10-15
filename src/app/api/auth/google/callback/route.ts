import { cookies } from "next/headers";
import { APP_RETURN, APP_ROLES, createAppCode } from "@/lib/server/app-auth";
import { startSession } from "@/lib/server/auth";
import { homeFor, type Role } from "@/lib/roles";
import { safeNext } from "@/lib/validate";
import { hasDatabase } from "@/lib/server/db";
import { exchangeCode, OAUTH_COOKIE, upsertGoogleUser } from "@/lib/server/google";

/*
  Google sends the visitor back here; we check the state, exchange the code and sign them in.
  Started from the service app, it signs nobody in here: it sends the browser back into the app with a one-time code
  (or an error code), which the app redeems at /api/app/login/google.
*/
export async function GET(request: Request) {
  const url = new URL(request.url);
  const store = await cookies();
  const raw = store.get(OAUTH_COOKIE)?.value;
  store.delete(OAUTH_COOKIE);

  let saved: { state: string; verifier: string; next: string; app?: string } | null = null;
  try {
    saved = raw ? JSON.parse(raw) : null;
  } catch {}
  const app = saved?.app || "";
  const toApp = (params: Record<string, string>) =>
    new Response(null, { status: 302, headers: { Location: `${APP_RETURN}?${new URLSearchParams(params)}` } });
  const fail = () => (app ? toApp({ error: "google" }) : Response.redirect(new URL("/login?error=google", url), 302));
  if (!saved || !hasDatabase()) return fail();

  const code = url.searchParams.get("code");
  if (!code || url.searchParams.get("state") !== saved.state) return fail();

  const profile = await exchangeCode(url.origin, code, saved.verifier);
  if (!profile || !profile.emailVerified) return fail();

  const user = await upsertGoogleUser(profile);
  if (app) {
    if (!APP_ROLES.includes(user.role as Role)) return toApp({ error: "no_app_access" });
    return toApp({ code: await createAppCode(user.id, app) });
  }
  await startSession(user.id);
  const next = safeNext(String(saved.next ?? ""));
  return Response.redirect(new URL(next || homeFor(user.role as Role), url), 302);
}
