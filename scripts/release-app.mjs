/*
  Publishes a new version of the service app. Every phone and tablet sees it within 30 minutes (or right away on
  start), shows "Update available" in the notification bar and installs it with one tap.

    npm run app:release -- --notes "Neu: …" [--notes-en "New: …"] [--name 1.2.0] [--mandatory]
    npm run app:release -- --dry-run      builds and checks, uploads nothing

  Steps: picks the next version number, builds the signed release APK (android/, key from ~/.android-yetenbi),
  uploads it to Cloudinary (the account the website uses for photos) and records it in the database.
  Reads DATABASE_URL and CLOUDINARY_* from .env.local. Switch versions on or off in /admin/service.
*/
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

const root = path.resolve(import.meta.dirname, "..");
const android = path.join(root, "android");
const fail = (message) => {
  console.error(`✘ ${message}`);
  process.exit(1);
};

const { DATABASE_URL, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
if (!DATABASE_URL) fail("DATABASE_URL is missing (add it to .env.local).");
if (!flag("dry-run") && !(CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET))
  fail("CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET are needed to upload the app.");
const home = process.env.USERPROFILE ?? process.env.HOME ?? "";
if (!existsSync(path.join(home, ".android-yetenbi", "keystore.properties")))
  fail("Release key not found in ~/.android-yetenbi. Without it the devices can't install updates.");

const notes = option("notes") ?? "";
if (!notes && !flag("dry-run")) fail('Describe what changed: --notes "…"');
const sql = neon(DATABASE_URL);

// Next version: build number +1, the name bumps its last part unless given.
const [last] = await sql`select version_code, version_name from app_releases order by version_code desc limit 1`;
const versionCode = (last?.version_code ?? 0) + 1;
const versionName =
  option("name") ?? (last ? last.version_name.replace(/(\d+)$/, (n) => String(Number(n) + 1)) : "1.0.0");
if (!/^\d+\.\d+\.\d+$/.test(versionName)) fail(`Version name must look like 1.2.0, got ${versionName}`);
console.log(`→ Building ${versionName} (build ${versionCode}) …`);

// Full path: Windows may not run programs from the current folder.
const gradlew = path.join(android, process.platform === "win32" ? "gradlew.bat" : "gradlew");
execSync(`"${gradlew}" assembleRelease -PversionCode=${versionCode} -PversionName=${versionName} --console=plain -q`, {
  cwd: android,
  stdio: "inherit",
});

const apk = path.join(android, "app", "build", "outputs", "apk", "release", "app-release.apk");
const size = statSync(apk).size;
const bytes = readFileSync(apk);
const sha256 = createHash("sha256").update(bytes).digest("hex");
console.log(`✔ Built ${(size / 1024 / 1024).toFixed(1)} MB, SHA-256 ${sha256}`);
// Cloudinary's free plan takes "raw" files up to 10 MB.
if (size > 10 * 1024 * 1024) console.warn("! Larger than 10 MB: the upload fails on Cloudinary's free plan.");

if (flag("dry-run")) {
  console.log("Dry run: nothing uploaded or published.");
  process.exit(0);
}

console.log("→ Uploading …");
const params = {
  public_id: `yetenbi/app/yetenbi-service-${versionName}-${versionCode}.apk`,
  timestamp: Math.floor(Date.now() / 1000),
};
const signature = createHash("sha1")
  .update(
    Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join("&") + CLOUDINARY_API_SECRET,
  )
  .digest("hex");
const form = new FormData();
form.append("file", new Blob([bytes], { type: "application/vnd.android.package-archive" }), "app.apk");
for (const [k, v] of Object.entries(params)) form.append(k, String(v));
form.append("api_key", CLOUDINARY_API_KEY);
form.append("signature", signature);
const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/raw/upload`, {
  method: "POST",
  body: form,
});
const upload = await res.json();
if (!res.ok) fail(`Upload failed: ${upload?.error?.message ?? res.status}`);

await sql`
  insert into app_releases (version_code, version_name, url, sha256, size_bytes, notes, notes_en, mandatory)
  values (${versionCode}, ${versionName}, ${upload.secure_url}, ${sha256}, ${size}, ${notes}, ${option("notes-en") ?? ""}, ${flag("mandatory")})
`;
console.log(`✔ Published ${versionName} (build ${versionCode})${flag("mandatory") ? " as a mandatory update" : ""}`);
console.log(`  ${upload.secure_url}`);
