// Applies the migrations in db/migrations that have not run yet, in file-name order.
// Each one runs in a single transaction together with its row in schema_migrations, so a failed
// migration leaves nothing half done. Statements end with ";" at the end of a line.
import { readdirSync, readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const folder = new URL("./migrations/", import.meta.url);

function statementsOf(file) {
  return readFileSync(new URL(file, folder), "utf8")
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .split(/;\s*$/m)
    .map((statement) => statement.trim())
    .filter(Boolean);
}

export async function migrate(databaseUrl) {
  const sql = neon(databaseUrl);
  await sql`create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())`;
  const applied = new Set((await sql`select name from schema_migrations`).map((row) => row.name));

  const pending = readdirSync(folder)
    .filter((file) => file.endsWith(".sql") && !applied.has(file))
    .sort();
  for (const file of pending) {
    await sql.transaction([
      ...statementsOf(file).map((statement) => sql.query(statement)),
      sql`insert into schema_migrations (name) values (${file})`,
    ]);
    console.log(`Applied ${file}`);
  }
  return pending;
}
