// Edge cases: tampered backup validation, live custom values (bridge),
// migration helpers, and re-entrancy after a full Sine rebuild.
const win = Services.wm.getMostRecentWindow("navigator:browser");
const doc = win.document;
const sleep = ms => new Promise(r => win.setTimeout(r, ms));
const core = ChromeUtils.importESModule("chrome://sine/content/Artemis/scripts/artemis.sys.mjs");
const storage = ChromeUtils.importESModule("chrome://sine/content/Artemis/scripts/core/storage.mjs");
const mig = ChromeUtils.importESModule("chrome://sine/content/Artemis/scripts/core/migrations.mjs");
const out = {};
// 1. Validation: unknown keys, internal prefs, wrong types, bad values and CSS injection are rejected.
out.validation = storage.validateSettings({
  "artemis.tabs.shape": "pill",
  "artemis.tabs.shape2": "pill",
  "artemis.internal.onboarding": "",
  "artemis.tabs.separators": "yes",
  "artemis.tabs.height": "huge",
  "artemis.appearance.accent-color": "red;} :root{display:none",
  "artemis.appearance.radius-custom": "12px",
  "browser.startup.homepage": "about:blank",
});
// 2. Bridge: custom accent applied live from a direct pref change (no Sine rebuild).
const v = n => win.getComputedStyle(doc.documentElement).getPropertyValue(n).trim();
Services.prefs.setStringPref("artemis.appearance.accent", "custom");
Services.prefs.setStringPref("artemis.appearance.accent-color", "#00b894"); await sleep(250);
out.bridge = { live: v("--artemis-live-accent-color"), accent: v("--artemis-accent") };
Services.prefs.setStringPref("artemis.appearance.accent-color", "nope;"); await sleep(250);
out.bridgeInvalid = { live: v("--artemis-live-accent-color") || "(removed)", accent: v("--artemis-accent") };
Services.prefs.clearUserPref("artemis.appearance.accent"); Services.prefs.clearUserPref("artemis.appearance.accent-color"); await sleep(200);
// 3. Migration helpers on throwaway prefs.
Services.prefs.setStringPref("artemis.test.old-name", "square");
Services.prefs.setStringPref("artemis.test.mapped", "classic");
Services.prefs.setStringPref("artemis.test.unknown", "weird");
const unresolved = [];
const ctx = mig.makeContext(unresolved);
ctx.rename("artemis.test.old-name", "artemis.test.new-name");
ctx.mapValue("artemis.test.mapped", { classic: "minimal" });
ctx.mapValue("artemis.test.unknown", { classic: "minimal" });
out.migration = {
  renamed: Services.prefs.getStringPref("artemis.test.new-name", "") + " / old gone: " + !Services.prefs.prefHasUserValue("artemis.test.old-name"),
  mapped: Services.prefs.getStringPref("artemis.test.mapped", ""),
  unknownKept: Services.prefs.getStringPref("artemis.test.unknown", ""),
  unresolved,
  currentSchema: mig.CURRENT_SCHEMA,
};
for (const n of ["artemis.test.new-name", "artemis.test.mapped", "artemis.test.unknown", "artemis.test.old-name"]) Services.prefs.clearUserPref(n);
// 4. Re-entrancy: full rebuild re-runs scripts in every window and about:preferences.
const manager = ChromeUtils.importESModule("chrome://userscripts/content/core/manager.sys.mjs").default;
const firstWin = win.Artemis;
await manager.rebuildMods(); await sleep(2000);
const prefsTab = [...win.gBrowser.tabs].find(t => t.linkedBrowser.currentURI?.spec.startsWith("about:preferences"));
const pdoc = prefsTab?.linkedBrowser.contentWindow.document;
out.reentrancy = {
  newWindowInstance: !!win.Artemis && win.Artemis !== firstWin,
  windowModules: win.Artemis?.modules?.length,
  tourCards: doc.querySelectorAll("#artemis-tour").length,
  enhancedDialogs: pdoc ? pdoc.querySelectorAll(".artemis-enhanced").length : "no prefs tab",
  toolbars: pdoc ? pdoc.querySelectorAll(".artemis-toolbar").length : null,
  footers: pdoc ? pdoc.querySelectorAll(".artemis-footer").length : null,
  sectionWrappers: pdoc ? pdoc.querySelectorAll(".artemis-section").length : null,
};
return out;
