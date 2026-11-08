// Full Sine rebuild (re-runs scripts, reloads styles): what toggling a JS mod does.
const manager = ChromeUtils.importESModule("chrome://userscripts/content/core/manager.sys.mjs").default;
await manager.rebuildMods();
await new Promise(r => Services.wm.getMostRecentWindow("navigator:browser").setTimeout(r, 1500));
return { artemis: !!Services.wm.getMostRecentWindow("navigator:browser").Artemis };
