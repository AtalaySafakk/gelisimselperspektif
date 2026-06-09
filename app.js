/**
 * Plesk Node.js entry point — starts Next.js production server.
 * Application startup file in Plesk: app.js
 */
const { spawn } = require("child_process");
const path = require("path");

const port = process.env.PORT || 3000;
const nextBin = path.join(__dirname, "node_modules", "next", "dist", "bin", "next");

const child = spawn(process.execPath, [nextBin, "start", "-p", String(port)], {
  stdio: "inherit",
  env: process.env,
  cwd: __dirname,
});

child.on("exit", (code) => process.exit(code ?? 0));
