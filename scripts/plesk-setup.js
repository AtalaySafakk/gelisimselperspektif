/**
 * Plesk "Run Node.js commands" panel env okumaz — httpdocs/.env yükler.
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.join(__dirname, "..");
const envPath = path.join(root, ".env");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return false;
  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
  return true;
}

function run(label, command) {
  console.log(`\n▶ ${label}\n`);
  execSync(command, { stdio: "inherit", cwd: root, env: process.env, shell: true });
}

const loaded = loadEnvFile(envPath);

if (!process.env.DATABASE_URL) {
  console.error(`
❌ DATABASE_URL bulunamadı.

Plesk → Custom environment variables burada ÇALIŞMAZ (Run Node.js commands).
File Manager → httpdocs → ".env" dosyası oluşturun (package.json ile aynı klasör).

${loaded ? "`.env` var ama DATABASE_URL satırı yok veya hatalı." : "`.env` dosyası yok — .env.plesk.example dosyasına bakın."}
`);
  process.exit(1);
}

run("prisma generate", "npm run db:generate");
run("prisma migrate deploy", "npm run migrate:deploy");
run("next build", "npm run build");

console.log("\n✅ plesk:setup tamam. Node.js uygulamasını Restart edin.\n");
