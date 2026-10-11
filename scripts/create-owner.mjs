// Creates (or promotes) an owner account for /admin.
// Usage: npm run owner:create -- owner@example.com "A long password" "Name"
import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import { neon } from "@neondatabase/serverless";

const [email, password, name = "Yetenbi"] = process.argv.slice(2);
if (!process.env.DATABASE_URL || !email || !password || password.length < 10) {
  console.error('Usage: npm run owner:create -- owner@example.com "password (10+ characters)" "Name"');
  process.exit(1);
}
const salt = randomBytes(16);
const key = await promisify(scrypt)(password, salt, 64);
const hash = `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
const sql = neon(process.env.DATABASE_URL);
await sql`
  insert into users (email, name, password_hash, role, email_verified) values (${email.toLowerCase()}, ${name}, ${hash}, 'owner', true)
  on conflict (email) do update set role = 'owner', password_hash = excluded.password_hash, email_verified = true
`;
