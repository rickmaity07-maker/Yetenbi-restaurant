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
