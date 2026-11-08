const win = Services.wm.getMostRecentWindow("navigator:browser");
const manager = ChromeUtils.importESModule("chrome://userscripts/content/core/manager.sys.mjs").default;
const sleep = ms => new Promise(r => win.setTimeout(r, ms));
const out = {};
const first = win.Artemis;
out.before = first?.loadedAt;
// Does Sine find our unload callback under the expected key?
const stillLoaded = await manager.triggerUnloadListener("chrome://sine/content/Artemis/artemis.uc.js", win);
out.triggerReturned = stillLoaded;
out.afterTrigger = win.Artemis ? "instance remains" : "destroyed";
// Full rebuild (what toggling any JS mod does): script should run exactly once again
await manager.rebuildMods(); await sleep(1500);
out.afterRebuild = win.Artemis?.loadedAt;
out.newInstance = !!win.Artemis && win.Artemis !== first;
await manager.rebuildMods(); await sleep(1500);
out.afterSecondRebuild = win.Artemis?.loadedAt;
return out;
