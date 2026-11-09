// Artemis Settings page bootstrap. Loaded by Sine into about:preferences and
// about:settings (Extensions and Themes and Keyboard Shortcuts are styled
// through window actors, scripts/settings/settings-actors.mjs). Re-entrant.
// Two independent parts:
//   - page styling (artemis.settings.style): glass look for the whole page;
//   - settings enhancer: decorates Artemis's own Sine settings dialog only.
// Either part failing leaves the other, and Zen's page, working.
// Sine keeps ONE unload callback per script and window (a second
// addUnloadListener call replaces the first), so both parts are torn down by
// a single callback.

(() => {
  for (const handle of [window.ArtemisSettings, window.ArtemisSettingsPage]) {
    if (handle?.destroy) {
      try {
        handle.destroy();
      } catch {}
    }
  }
  delete window.ArtemisSettings;
  delete window.ArtemisSettingsPage;

  try {
    const page = ChromeUtils.importESModule("chrome://sine/content/Artemis/scripts/settings/page.mjs");
    window.ArtemisSettingsPage = page.attachPageStyle(window);
  } catch (err) {
    console.error("[Artemis] Settings page styling unavailable:", err);
  }

  try {
    const core = ChromeUtils.importESModule("chrome://sine/content/Artemis/scripts/artemis.sys.mjs");
    const enhancer = ChromeUtils.importESModule("chrome://sine/content/Artemis/scripts/settings/enhancer.mjs");
    window.ArtemisSettings = enhancer.attachEnhancer(window, core);
  } catch (err) {
    console.error("[Artemis] Settings enhancer unavailable:", err);
  }

  if (typeof window.addUnloadListener === "function") {
    const page = window.ArtemisSettingsPage;
    const settings = window.ArtemisSettings;
    window.addUnloadListener(() => {
      for (const handle of [settings, page]) {
        try {
          handle?.destroy();
        } catch {}
      }
    });
  }
})();
