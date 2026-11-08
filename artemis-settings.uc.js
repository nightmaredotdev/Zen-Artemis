// Artemis settings enhancer bootstrap. Loaded by Sine into about:preferences.
// Re-entrant; does nothing unless Artemis's own settings dialog is present.

(() => {
  if (window.ArtemisSettings?.destroy) {
    try {
      window.ArtemisSettings.destroy();
    } catch {}
  }
  let core, enhancer;
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
