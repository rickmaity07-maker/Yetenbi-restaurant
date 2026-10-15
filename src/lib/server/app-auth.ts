import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { Locale } from "@/lib/i18n";
import type { Role } from "@/lib/roles";
import { db, hasDatabase } from "./db";

/*
  Sign-in for the service app (Android phones and tablets). Same accounts and passwords as the website, but the
  app keeps a bearer token instead of a cookie. Tokens live in the sessions table (kind 'app'), only as a SHA-256,
  for 30 days; a removed or demoted account is locked out on its next request. Service staff and owners may use it.
*/

export type AppUser = { id: number; email: string; name: string; role: Role; locale: Locale };

const TOKEN_DAYS = 30;
export const APP_ROLES: Role[] = ["service", "owner"];
const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export async function createAppToken(userId: number) {
  const token = `ytapp_${randomBytes(32).toString("base64url")}`;
  await db()`
    insert into sessions (token_hash, user_id, expires_at, kind)
    values (${sha256(token)}, ${userId}, now() + make_interval(days => ${TOKEN_DAYS}), 'app')
  `;
  return token;
}

/*
  "Sign in with Google" in the app: the app opens /api/auth/google?app=<challenge> in the browser, where challenge is
  the SHA-256 (base64url) of a secret only the app knows (PKCE). After Google, the browser is sent to APP_RETURN with a
  one-time code, valid for 2 minutes. The app swaps code + secret for a token; another app catching the code can't.
  Codes are rows of kind 'app-code' in sessions, stored as SHA-256 of code + challenge.
*/
export const APP_RETURN = "de.yetenbi.service://auth";
export const APP_CHALLENGE = /^[A-Za-z0-9_-]{43}$/;

export async function createAppCode(userId: number, challenge: string) {
  const code = randomBytes(24).toString("base64url");
  await db()`
    insert into sessions (token_hash, user_id, expires_at, kind)
    values (${sha256(`${code}.${challenge}`)}, ${userId}, now() + interval '2 minutes', 'app-code')
  `;
  return code;
}

/** The user id for a one-time code and the app's secret, or null. A code works once. */
export async function redeemAppCode(code: string, verifier: string) {
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const [row] = (await db()`
    delete from sessions
    where token_hash = ${sha256(`${code}.${challenge}`)} and kind = 'app-code' and expires_at > now()
    returning user_id
  `) as { user_id: string }[];
  return row ? Number(row.user_id) : null;
}

const bearer = (request: Request) => request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1] ?? null;

export async function revokeAppToken(request: Request) {
  const token = bearer(request);
  if (token) await db()`delete from sessions where token_hash = ${sha256(token)} and kind = 'app'`;
}

export async function appUser(request: Request): Promise<AppUser | null> {
  if (!hasDatabase()) return null;
  const token = bearer(request);
  if (!token) return null;
  const [row] = (await db()`
    select u.id, u.email, u.name, u.role, u.locale
    from sessions s join users u on u.id = s.user_id
    where s.token_hash = ${sha256(token)} and s.kind = 'app' and s.expires_at > now()
      and u.role in ('service', 'owner')
  `) as { id: string; email: string; name: string; role: Role; locale: Locale }[];
  return row ? { ...row, id: Number(row.id) } : null;
}

/** A refusal the app understands: a machine-readable code (translated in the app) and an HTTP status. */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(code);
  }
}

/*
  Wraps every app endpoint: checks the token, turns ApiError into a JSON answer and anything else into a logged 500
  (which also reaches the error alerts through instrumentation).
*/
export function appRoute<C>(fn: (request: Request, user: AppUser, ctx: C) => Promise<unknown>) {
  return async (request: Request, ctx: C) => {
    try {
      const user = await appUser(request);
      if (!user) return Response.json({ code: "unauthorized" }, { status: 401 });
      const result = await fn(request, user, ctx);
      return Response.json(result ?? { ok: true }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      if (error instanceof ApiError) return Response.json({ code: error.code }, { status: error.status });
      throw error;
    }
  };
}

export async function body<T = Record<string, unknown>>(request: Request): Promise<T> {
  try {
    const value = await request.json();
    if (!value || typeof value !== "object") throw new Error();
    return value as T;
  } catch {
    throw new ApiError(400, "invalid_json");
  }
}

/** The numeric id from a route segment, or a 404. */
export const idOf = (raw: string) => {
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id <= 0) throw new ApiError(404, "not_found");
  return id;
};
