// Answers the settings enhancer's real confirmation dialogs (Reset all /
// Restore) in one Marionette session with automatic prompt handling disabled.
// usage: node tools/zen/prompt-ui.mjs <resetAll|restore> <accept|dismiss>
import { Marionette } from "./marionette.mjs";

const [which, answer] = process.argv.slice(2);
const m = new Marionette(Number(process.env.ARTEMIS_MARIONETTE_PORT || 2829));
await m.connect();
await m.send("WebDriver:NewSession", { capabilities: { unhandledPromptBehavior: "ignore" } });
await m.send("Marionette:SetContext", { value: "chrome" });

const state = `return (async () => {
  const core = ChromeUtils.importESModule("chrome://sine/content/Artemis/scripts/artemis.sys.mjs");
  const users = Services.prefs.getChildList("artemis.").filter(n => Services.prefs.prefHasUserValue(n) && !n.startsWith("artemis.internal.")).sort();
  return { users, backups: (await core.backups.list()).map(b => b.reason) };
})();`;

const before = await m.run(state);
const label = which === "restore" ? "Restore backup" : "Reset all";
const clicked = await m.run(`
  const win = Services.wm.getMostRecentWindow("navigator:browser");
  const tab = [...win.gBrowser.tabs].find(t => t.linkedBrowser.currentURI?.spec.startsWith("about:preferences"));
  const cw = tab.linkedBrowser.contentWindow;
  const b = [...cw.document.querySelectorAll(".artemis-enhanced .artemis-footer button")].find(x => x.textContent === ${JSON.stringify(label)});
  if (!b || b.disabled) return "button unavailable";
  cw.setTimeout(() => b.click(), 0);
  return "clicked";
`);
await new Promise(r => setTimeout(r, 1200));
let text = null;
let error = null;
try {
  text = (await m.send("WebDriver:GetAlertText", {})).value;
  await m.send(answer === "accept" ? "WebDriver:AcceptAlert" : "WebDriver:DismissAlert", {});
} catch (e) {
  error = String(e);
}
await new Promise(r => setTimeout(r, 1500));
const after = await m.run(state);
console.log(JSON.stringify({ which, answer, clicked, dialogText: text, error, before, after }, null, 1));
m.close();
