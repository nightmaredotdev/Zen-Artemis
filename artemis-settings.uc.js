// Artemis Settings bootstrap. Loaded by Sine into about:preferences and
// about:settings. Re-entrant.
// It attaches the settings enhancer, which decorates Artemis's own Sine
// settings dialog only. The glass styling of the Settings pages
// (artemis.settings.style) is attached by a window actor before the page's
// first paint (scripts/settings/settings-actors.mjs), not here: Sine runs this
// script after the page has painted.
// Sine keeps ONE unload callback per script and window (a second
// addUnloadListener call replaces the first), so everything this script adds
// is torn down by a single callback.

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
    const core = ChromeUtils.importESModule("chrome://sine/content/Artemis/scripts/artemis.sys.mjs");
    const enhancer = ChromeUtils.importESModule("chrome://sine/content/Artemis/scripts/settings/enhancer.mjs");
    window.ArtemisSettings = enhancer.attachEnhancer(window, core);
  } catch (err) {
    console.error("[Artemis] Settings enhancer unavailable:", err);
  }

  if (typeof window.addUnloadListener === "function") {
    const settings = window.ArtemisSettings;
    window.addUnloadListener(() => {
      try {
        settings?.destroy();
      } catch {}
    });
  }
})();
