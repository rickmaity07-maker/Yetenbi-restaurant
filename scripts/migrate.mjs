// Brings the database at DATABASE_URL up to date. Usage: npm run db:migrate
import { migrate } from "../db/migrate.mjs";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set (add it to .env.local).");
  process.exit(1);
}
const applied = await migrate(process.env.DATABASE_URL);
console.log(applied.length ? "Database is up to date." : "Nothing to do: the database is up to date.");
