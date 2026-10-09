import { cookies } from "next/headers";
import { authorizeUrl, isGoogleConfigured, newOAuthRequest, OAUTH_COOKIE } from "@/lib/server/google";

/* Starts "Sign in with Google": remembers state + PKCE verifier in a short-lived cookie, then redirects to Google. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  if (!isGoogleConfigured()) return Response.redirect(new URL("/login?error=google", url), 302);
  const next = url.searchParams.get("next") ?? "";
  const { state, verifier, challenge } = newOAuthRequest();
  (await cookies()).set(OAUTH_COOKIE, JSON.stringify({ state, verifier, next }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth/google",
    maxAge: 600,
  });
  return Response.redirect(authorizeUrl(url.origin, state, challenge), 302);
}
