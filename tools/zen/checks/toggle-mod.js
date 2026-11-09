// Disables or enables Artemis through Sine's own toggle (what the switch in
// Sine's mod list does) and reports what remains of Artemis in the window.
// Test profile only. ARGS.enabled: true | false; ARGS.id: another mod to
// toggle instead (e.g. "Nebula"); the report is always about Artemis.
const win = Services.wm.getMostRecentWindow("navigator:browser");
const sleep = ms => new Promise(r => win.setTimeout(r, ms));
const manager = ChromeUtils.importESModule("chrome://userscripts/content/core/manager.sys.mjs").default;
const utils = ChromeUtils.importESModule("chrome://userscripts/content/core/utils.sys.mjs").default;
const mods = await utils.getMods();
const id = ARGS.id || "Artemis";
if (mods[id] && mods[id].enabled !== ARGS.enabled) {
  await manager.toggleTheme(mods, id);
  await sleep(2500);
}
const root = win.document.documentElement;
const prefsTab = [...win.gBrowser.tabs].find(t => t.linkedBrowser.currentURI?.spec.startsWith("about:preferences"));
const pdoc = prefsTab?.linkedBrowser.contentWindow?.document;
const sheetText = await IOUtils.readUTF8(PathUtils.join(PathUtils.profileDir, "chrome", "sine-mods", "chrome.css"));
return {
  enabledInMods: (await utils.getMods()).Artemis.enabled,
  combinedSheetImportsArtemis: sheetText.includes("/Artemis/"),
  windowInstance: !!win.Artemis,
  liveVars: [...root.style].filter(p => p.startsWith("--artemis-live-")),
  tourCard: !!win.document.getElementById("artemis-tour"),
  enhancedDialog: pdoc ? pdoc.querySelectorAll(".artemis-enhanced").length : "no prefs tab",
  enhancerAdded: pdoc ? pdoc.querySelectorAll(".artemis-toolbar, .artemis-footer, .artemis-section").length : null,
  settingsPageStyled: pdoc ? pdoc.documentElement.hasAttribute("artemis-settings-page") : null,
  settingsPageVars: pdoc ? [...pdoc.documentElement.style].filter(p => p.startsWith("--artemis-s-")).length : null,
  scrollbarPart: (() => {
    const box = win.document.querySelector(".workspace-arrowscrollbox");
    const sb = box?.shadowRoot?.querySelector("scrollbox");
    return sb ? win.getComputedStyle(sb).scrollbarWidth : "n/a";
  })(),
};
