/**
 * Plesk varsayılan index.html Node proxy'den önce sunulur — kaldır/yedekle.
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const defaults = ["index.html", "index.htm", "default.html", "default.htm"];

for (const name of defaults) {
  const filePath = path.join(root, name);
  if (!fs.existsSync(filePath)) continue;
  const backup = `${filePath}.plesk-default.bak`;
  fs.renameSync(filePath, backup);
  console.log(`Moved ${name} → ${path.basename(backup)}`);
}

console.log("Plesk default static pages disabled (if any existed).");
