// Creates the tables in the database at DATABASE_URL and, the first time, copies the starting menu in.
// Usage: npm run db:setup   (reads .env.local if present; safe to run repeatedly)
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";
import { seedMenu } from "../db/menu-seed.mts";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set (add it to .env.local).");
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);
const schema = readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8");
// Run each statement separately (the HTTP driver takes one statement per call).
const statements = schema
  .split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n")
  .split(";")
  .map((s) => s.trim())
  .filter(Boolean);
for (const statement of statements) await sql.query(statement);
console.log(`Schema applied (${statements.length} statements).`);

// Menu: only when the menu tables are still empty, so edits made in /admin are never overwritten.
const [{ n }] = await sql`select count(*)::int as n from menu_categories`;
if (n === 0) {
  // Details entered earlier in /admin (stored as settings 'menu_info' before the menu moved to the database).
  const [old] = await sql`select value from settings where key = 'menu_info'`;
  const info = old?.value ?? {};
  let items = 0;
  for (const [c, category] of seedMenu.entries()) {
    const drinks = ["kaffee", "heiss", "kalt"].includes(category.id);
    await sql`insert into menu_categories (id, title, note, drinks, position)
              values (${category.id}, ${JSON.stringify(category.title)}::jsonb, ${category.note ? JSON.stringify(category.note) : null}::jsonb, ${drinks}, ${c})`;
    for (const [i, item] of category.items.entries()) {
      const id = `${category.id}-${i}`;
      const d = info[id] ?? {};
      const glutenTag = item.tags?.includes("glutenfree");
      const gluten = d.gluten && d.gluten !== "keep" ? d.gluten : glutenTag ? "free" : "none";
      await sql`insert into menu_items (id, category_id, name, amharic, description, price, tags, gluten, allergens, additives, volume, deposit, orderable, position)
        values (${id}, ${category.id}, ${JSON.stringify(item.name)}::jsonb, ${item.amharic ?? ""}, ${item.description ? JSON.stringify(item.description) : null}::jsonb,
                ${Number(item.price.replace(",", "."))}, ${(item.tags ?? []).filter((t) => t !== "glutenfree")}, ${gluten},
                ${d.allergens ?? []}, ${d.additives ?? []}, ${d.volume ?? null}, ${d.deposit ?? 0},
                ${item.name.de !== "Jebena Buna"}, ${i})`;
      items++;
    }
  }
  console.log(`Menu copied into the database (${seedMenu.length} categories, ${items} items).`);
}
