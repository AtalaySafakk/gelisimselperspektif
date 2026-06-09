/**
 * Plesk Node.js entry point — starts Next.js production server.
 * Application startup file in Plesk: app.js
 */
const { spawn } = require("child_process");
const path = require("path");

const port = process.env.PORT || 3000;
const hostname = process.env.HOSTNAME || "0.0.0.0";
const nextBin = path.join(__dirname, "node_modules", "next", "dist", "bin", "next");

console.log(`[app.js] Starting Next.js on ${hostname}:${port}`);

const child = spawn(
  process.execPath,
  [nextBin, "start", "-H", hostname, "-p", String(port)],
  {
    stdio: "inherit",
    env: process.env,
    cwd: __dirname,
  },
);

child.on("exit", (code) => {
  console.error(`[app.js] Next.js exited with code ${code ?? "unknown"}`);
  process.exit(code ?? 1);
});
