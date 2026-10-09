import "server-only";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let client: NeonQueryFunction<false, false> | null = null;

/* Without a database the site still works; reservations fall back to WhatsApp. */
export const hasDatabase = () => Boolean(process.env.DATABASE_URL);

/* Tagged-template query function: values are always sent as parameters, never spliced into SQL. */
export function db() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set.");
  client ??= neon(process.env.DATABASE_URL);
  return client;
}
