import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { db } from "./db";

/*
  "Sign in with Google" (OAuth 2.0 authorization code flow with PKCE and a state check).
  Needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET from Google Cloud Console → Credentials → OAuth client (Web),
  with the redirect URI https://<domain>/api/auth/google/callback.
*/

export const isGoogleConfigured = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const OAUTH_COOKIE = "yt_oauth";

const b64url = (buf: Buffer) => buf.toString("base64url");

export function newOAuthRequest() {
  const state = b64url(randomBytes(24));
  const verifier = b64url(randomBytes(48));
  const challenge = b64url(createHash("sha256").update(verifier).digest());
  return { state, verifier, challenge };
}

export function authorizeUrl(origin: string, state: string, challenge: string) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: `${origin}/api/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export type GoogleProfile = { sub: string; email: string; emailVerified: boolean; name: string };

export async function exchangeCode(origin: string, code: string, verifier: string): Promise<GoogleProfile | null> {
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: `${origin}/api/auth/google/callback`,
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
  });
  if (!tokenRes.ok) return null;
  const { access_token } = (await tokenRes.json()) as { access_token?: string };
  if (!access_token) return null;
  const infoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${access_token}` } });
  if (!infoRes.ok) return null;
  const info = (await infoRes.json()) as { sub?: string; email?: string; email_verified?: boolean; name?: string };
  if (!info.sub || !info.email) return null;
  return { sub: info.sub, email: info.email.toLowerCase(), emailVerified: Boolean(info.email_verified), name: info.name || info.email.split("@")[0] };
}

/** Finds the account for a Google profile, linking an existing account with the same verified email, or creates one. */
export async function upsertGoogleUser(p: GoogleProfile) {
  const [bySub] = (await db()`select id, role from users where google_sub = ${p.sub}`) as { id: string; role: string }[];
  if (bySub) return { id: Number(bySub.id), role: bySub.role };
  /*
    Linking to an account with the same email. If that account never proved it owns the address, someone else may
    have registered it first ("pre-hijacking"): their password is removed and their sessions end, so only the
    real owner of the Google account gets in. They can set a new password in the profile.
  */
  const [linked] = (await db()`
    with old as (select id, email_verified from users where lower(email) = ${p.email} and google_sub is null)
    update users u set google_sub = ${p.sub}, password_hash = case when old.email_verified then u.password_hash else 'none' end, email_verified = true
    from old where u.id = old.id
    returning u.id, u.role, old.email_verified as was_verified
  `) as { id: string; role: string; was_verified: boolean }[];
  if (linked) {
    if (!linked.was_verified) await db()`delete from sessions where user_id = ${linked.id}`;
    return { id: Number(linked.id), role: linked.role };
  }
  const [created] = (await db()`
    insert into users (email, name, password_hash, google_sub, email_verified) values (${p.email}, ${p.name.slice(0, 80)}, 'none', ${p.sub}, true) returning id, role
  `) as { id: string; role: string }[];
  return { id: Number(created.id), role: created.role };
}
