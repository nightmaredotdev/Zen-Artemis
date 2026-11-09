// Artemis Settings pages bootstrap. Loaded by Sine into about:preferences,
// about:settings and about:addons. Re-entrant. Two independent parts:
//   - page styling (artemis.settings.style): glass look for the whole page;
//   - settings enhancer: decorates Artemis's own Sine settings dialog only
//     (settings page only).
// Either part failing leaves the other, and Zen's page, working.

(() => {
  for (const handle of [window.ArtemisSettings, window.ArtemisSettingsPage]) {
    if (handle?.destroy) {
      try {
        handle.destroy();
      } catch {}
    }
  }
  let core, enhancer, page;
  try {
    page = ChromeUtils.importESModule("chrome://sine/content/Artemis/scripts/settings/page.mjs");
    const pageHandle = page.attachPageStyle(window);
    window.ArtemisSettingsPage = pageHandle;
    if (typeof window.addUnloadListener === "function") {
      window.addUnloadListener(() => pageHandle.destroy());
    }
  } catch (err) {
    console.error("[Artemis] Settings page styling unavailable:", err);
  }
  // Artemis's own Sine dialog exists only on the settings page (not about:addons).
  if (!/^about:(preferences|settings)/.test(window.location.href)) {
    return;
  }
  try {
    core = ChromeUtils.importESModule("chrome://sine/content/Artemis/scripts/artemis.sys.mjs");
    enhancer = ChromeUtils.importESModule("chrome://sine/content/Artemis/scripts/settings/enhancer.mjs");
  } catch (err) {
    console.error("[Artemis] Settings enhancer unavailable:", err);
    return;
  }
  const handle = enhancer.attachEnhancer(window, core);
  window.ArtemisSettings = handle;
  if (typeof window.addUnloadListener === "function") {
    window.addUnloadListener(() => handle.destroy());
  }
})();
