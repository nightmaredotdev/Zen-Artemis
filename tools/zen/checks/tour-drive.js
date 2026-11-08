// Drives the tour card by clicking its real buttons.
// ARGS.actions: list of "next" | "back" | "skip" | "finish" | "open" | "pick:<option label>" | "wait"
const win = Services.wm.getMostRecentWindow("navigator:browser");
const doc = win.document;
const sleep = ms => new Promise(r => win.setTimeout(r, ms));
const card = () => doc.getElementById("artemis-tour");
const log = [];
for (const a of ARGS.actions || []) {
  if (a === "open") { ChromeUtils.importESModule("chrome://sine/content/Artemis/scripts/artemis.sys.mjs").requestTour(); await sleep(400); log.push("open:" + !!card()); continue; }
  if (a === "wait") { await sleep(500); continue; }
  const c = card();
  if (!c) { log.push(a + ": no card"); continue; }
  const buttons = [...c.querySelectorAll("button")];
  let target = null;
  if (a === "next") target = buttons.find(b => b.textContent === "Next");
  else if (a === "back") target = buttons.find(b => b.textContent === "Back");
  else if (a === "skip") target = buttons.find(b => b.textContent === "Skip");
  else if (a === "finish") target = buttons.find(b => b.textContent === "Done");
  else if (a.startsWith("pick:")) {
    const [, rowLabel, opt] = a.split(":");
    const row = [...c.querySelectorAll(".artemis-tour-row")].find(r => r.querySelector(".artemis-tour-label").textContent === rowLabel);
    target = row && [...row.querySelectorAll("button")].find(b => b.textContent === opt);
  }
  if (!target) { log.push(a + ": not found"); continue; }
  target.click();
  await sleep(250);
  log.push(a + " -> " + (card()?.querySelector(".artemis-tour-title")?.textContent ?? "closed"));
}
const core = ChromeUtils.importESModule("chrome://sine/content/Artemis/scripts/artemis.sys.mjs");
return { log, tourState: core.tourState(), userValues: Object.fromEntries(Services.prefs.getChildList("artemis.").filter(n => Services.prefs.prefHasUserValue(n)).map(n => [n, Services.prefs.getPrefType(n) === 32 ? Services.prefs.getStringPref(n) : Services.prefs.getPrefType(n) === 64 ? Services.prefs.getIntPref(n) : Services.prefs.getBoolPref(n)])) };
