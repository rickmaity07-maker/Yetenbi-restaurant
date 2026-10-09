import { cookies } from "next/headers";
import { startSession } from "@/lib/server/auth";
import { hasDatabase } from "@/lib/server/db";
import { exchangeCode, OAUTH_COOKIE, upsertGoogleUser } from "@/lib/server/google";

/* Google sends the visitor back here; we check the state, exchange the code and sign them in. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const fail = () => Response.redirect(new URL("/login?error=google", url), 302);
  const store = await cookies();
  const raw = store.get(OAUTH_COOKIE)?.value;
  store.delete(OAUTH_COOKIE);
  if (!raw || !hasDatabase()) return fail();

  let saved: { state: string; verifier: string; next: string };
  try {
    saved = JSON.parse(raw);
  } catch {
    return fail();
  }
  const code = url.searchParams.get("code");
  if (!code || url.searchParams.get("state") !== saved.state) return fail();

  const profile = await exchangeCode(url.origin, code, saved.verifier);
  if (!profile || !profile.emailVerified) return fail();

  const user = await upsertGoogleUser(profile);
  await startSession(user.id);
  const next = saved.next.startsWith("/") && !saved.next.startsWith("//") ? saved.next : "";
  return Response.redirect(new URL(next || (user.role === "owner" ? "/admin" : "/profil"), url), 302);
}
