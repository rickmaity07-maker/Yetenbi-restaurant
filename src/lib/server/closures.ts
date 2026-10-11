import "server-only";
import { db } from "./db";

type Closure = { date: string; note: string };

/** Closed days from today (Berlin) on. */
export async function upcomingClosures(): Promise<Closure[]> {
  const rows = (await db()`
    select date::text as date, note from closures
    where date >= (now() at time zone 'Europe/Berlin')::date order by date
  `) as Closure[];
  return rows;
}

export async function addClosure(date: string, note: string) {
  await db()`insert into closures (date, note) values (${date}, ${note}) on conflict (date) do update set note = excluded.note`;
}

export async function removeClosure(date: string) {
  await db()`delete from closures where date = ${date}`;
}
