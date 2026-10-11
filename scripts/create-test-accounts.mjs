// Creates the four test logins from .env.local (TEST_ADMIN_*, TEST_KITCHEN_*, TEST_DRIVER_*, TEST_GUEST_*)
// in the database at DATABASE_URL, already confirmed, so the device suite can run against it.
// Meant for the staging database. Usage: DATABASE_URL=<staging url> npm run test:accounts
import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import { neon } from "@neondatabase/serverless";

const ACCOUNTS = [
  ["ADMIN", "owner", "Test Inhaber"],
  ["KITCHEN", "kitchen", "Test Küche"],
  ["DRIVER", "driver", "Test Fahrer"],
  ["GUEST", "guest", "Test Gast"],
];

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);
const hash = async (password) => {
  const salt = randomBytes(16);
  const key = await promisify(scrypt)(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
};

for (const [name, role, displayName] of ACCOUNTS) {
  const email = process.env[`TEST_${name}_EMAIL`];
  const password = process.env[`TEST_${name}_PASSWORD`];
  if (!email || !password) {
    console.log(`Skipped ${role}: TEST_${name}_EMAIL / TEST_${name}_PASSWORD not set`);
    continue;
  }
  await sql`
    insert into users (email, name, phone, password_hash, role, email_verified)
    values (${email.toLowerCase()}, ${displayName}, '0931 000000', ${await hash(password)}, ${role}, true)
    on conflict (email) do update set role = excluded.role, password_hash = excluded.password_hash, email_verified = true
  `;
  console.log(`Ready: ${role} ${email}`);
}
