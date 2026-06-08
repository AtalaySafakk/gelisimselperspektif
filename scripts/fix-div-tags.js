const fs = require("fs");
const path = require("path");

const tag = { wrong: "motion", right: "motion".replace("motion", "div") };
const CLOSE_WRONG = `</${tag.wrong}>`;
const CLOSE_RIGHT = `</${tag.right}>`;
const OPEN_WRONG = `<${tag.wrong} `;
const OPEN_RIGHT = `<${tag.right} `;

function walk(dir) {
  for (const file of fs.readdirSync(dir)) {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (file.endsWith(".tsx") || file.endsWith(".ts")) {
      let content = fs.readFileSync(full, "utf8");
      const next = content
        .split(CLOSE_WRONG)
        .join(CLOSE_RIGHT)
        .split(OPEN_WRONG)
        .join(OPEN_RIGHT);
      if (next !== content) {
        fs.writeFileSync(full, next);
        console.log("fixed", full);
      }
    }
  }
}

walk(path.join(__dirname, "..", "src"));
