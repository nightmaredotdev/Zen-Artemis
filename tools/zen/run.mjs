// Runs a chrome-context script in the Artemis test profile over Marionette.
// usage: node.exe tools/zen/run.mjs <script.js> [screenshot.png]
// The script is a function body; it may use await and must `return` a JSON value.
// The test browser must be started with -marionette and MOZ_REMOTE_ALLOW_SYSTEM_ACCESS=1
// (see docs/TESTING.md). Port 2829 is set in the test profile's user.js.

import fs from "node:fs";
import { Marionette } from "./marionette.mjs";

const [scriptPath, screenshotPath] = process.argv.slice(2);
if (!scriptPath) {
  console.error("usage: node tools/zen/run.mjs <script.js> [screenshot.png]");
  process.exit(2);
}
const m = new Marionette(Number(process.env.ARTEMIS_MARIONETTE_PORT || 2829));
await m.start();
const body = `return (async () => {\n${fs.readFileSync(scriptPath, "utf8")}\n})();`;
let code = 0;
try {
  console.log(JSON.stringify(await m.run(body), null, 1));
} catch (e) {
  console.error(String(e));
  code = 1;
}
if (screenshotPath) fs.writeFileSync(screenshotPath, await m.screenshot());
m.close();
process.exit(code);
