// Reports Artemis runtime state in the most recent browser window.
const win = Services.wm.getMostRecentWindow("navigator:browser");
const core = ChromeUtils.importESModule("chrome://sine/content/Artemis/scripts/artemis.sys.mjs");
const card = win.document.getElementById("artemis-tour");
return {
  state: core.getState(),
  tourState: core.tourState(),
  tourOpen: !!card,
  tourTitle: card?.querySelector(".artemis-tour-title")?.textContent,
  modules: win.Artemis?.modules?.length,
  userValues: Services.prefs.getChildList("artemis.").filter(n => Services.prefs.prefHasUserValue(n)),
};
