/**
 * Plesk + Phusion Passenger entry point for Next.js.
 * Startup file in Plesk Node.js panel: app.js
 *
 * Passenger spawn() ile başlatılan child process kabul etmez — HTTP server export/listen gerekir.
 */
const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");

const nextApp = next({ dev: false, dir: __dirname });
const handle = nextApp.getRequestHandler();

nextApp
  .prepare()
  .then(() => {
    const server = createServer((req, res) => {
      const parsedUrl = parse(req.url, true);
      handle(req, res, parsedUrl);
    });

    // Plesk Phusion Passenger
    if (typeof PhusionPassenger !== "undefined") {
      server.listen("passenger");
      console.log("[app.js] Next.js ready (Phusion Passenger)");
      return;
    }

    const port = process.env.PORT || 3000;
    const hostname = process.env.HOSTNAME || "0.0.0.0";
    server.listen(port, hostname, () => {
      console.log(`[app.js] Next.js ready on http://${hostname}:${port}`);
    });
  })
  .catch((err) => {
    console.error("[app.js] Next.js failed to start:", err);
    process.exit(1);
  });
