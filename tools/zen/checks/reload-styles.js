// Reloads Artemis CSS in the test browser (Sine rebuild with style reload).
const manager = ChromeUtils.importESModule("chrome://userscripts/content/core/manager.sys.mjs").default;
await manager.rebuildMods(false, true);
await new Promise(r => Services.wm.getMostRecentWindow("navigator:browser").setTimeout(r, 800));
return "reloaded";
