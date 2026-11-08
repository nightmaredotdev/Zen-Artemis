import { Marionette } from "./marionette.mjs";
const m = new Marionette(2829);
await m.connect();
await m.send("WebDriver:NewSession", { capabilities: {} });
// Force-quit skips the normal pref save, so save explicitly first.
try {
  await m.send("Marionette:SetContext", { value: "chrome" });
  await m.run("Services.prefs.savePrefFile(null);");
} catch {}
await m.quit();
console.log("quit sent");
