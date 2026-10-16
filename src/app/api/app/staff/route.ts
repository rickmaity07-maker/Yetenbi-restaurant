import { appRoute } from "@/lib/server/app-auth";
import { db } from "@/lib/server/db";

/* GET: who can take over this phone with their PIN ("Wer bedient?"): service staff and owners with a PIN set. */
export const GET = appRoute(async () => {
  const rows = (await db()`
    select id, name from users where role in ('service', 'owner') and pin_hash is not null order by lower(name)
  `) as { id: string; name: string }[];
  return { staff: rows.map((row) => ({ id: Number(row.id), name: row.name })) };
});
