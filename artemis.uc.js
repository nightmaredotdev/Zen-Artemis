// Artemis browser-window bootstrap.
// Loaded by Sine into every browser.xhtml window. Must be re-entrant:
// Sine re-runs scripts when any JS mod is toggled.

(() => {
  const CORE_URL = "chrome://sine/content/Artemis/scripts/artemis.sys.mjs";

  // Destroy a previous instance on this window (re-run without unload).
  if (window.Artemis?.destroy) {
    try {
      window.Artemis.destroy();
    } catch (err) {
      console.warn("[Artemis] Failed to destroy previous instance:", err);
    }
  }

  let core;
  try {
    core = ChromeUtils.importESModule(CORE_URL);
  } catch (err) {
    console.error("[Artemis] Failed to load core module:", err);
    return;
  }

  // Fallback if the background module did not run (e.g. enabled mid-session).
  core.ensureSeeded("window");

  const modules = [];

  // Author-origin sheet for ::part() rules (ignored by Gecko in user sheets).
  const PARTS_URI = Services.io.newURI("chrome://sine/content/Artemis/parts.css");
  const windowUtils = window.windowUtils;
  try {
    windowUtils.loadSheet(PARTS_URI, windowUtils.AUTHOR_SHEET);
  } catch (err) {
    console.warn("[Artemis] Failed to load parts.css:", err);
  }

  // Per-window modules. Each has init(window) / destroy(window).
  const BASE = "chrome://sine/content/Artemis/scripts/";
  try {
    const { createBridge } = ChromeUtils.importESModule(BASE + "window/bridge.mjs");
    const { createOnboardingModule } = ChromeUtils.importESModule(BASE + "window/onboarding.mjs");
    const bridge = createBridge(window);
    modules.push({ init: () => bridge.init(), destroy: () => bridge.destroy() });
    modules.push(createOnboardingModule(core));
    // Settings pages styling (window actors,
    // registered while Artemis runs; see settings/settings-actors.mjs).
    const settingsActors = ChromeUtils.importESModule(BASE + "settings/settings-actors.mjs");
    modules.push({ init: () => settingsActors.retain(), destroy: () => settingsActors.release() });
    // Settings page tabs show the workspace background, not Zen's grey, until
    // the page paints (see settings/settings-browsers.mjs).
    const { createSettingsBrowsers } = ChromeUtils.importESModule(BASE + "settings/settings-browsers.mjs");
    modules.push(createSettingsBrowsers(window));
    // Menus and panels show the workspace background under a glass layer
    // (see window/popup-glass.mjs).
    const { createPopupGlass } = ChromeUtils.importESModule(BASE + "window/popup-glass.mjs");
    modules.push(createPopupGlass(window));
  } catch (err) {
    console.error("[Artemis] Failed to load window modules:", err);
  }
  for (const module of [...modules]) {
    try {
      module.init(window);
    } catch (err) {
      console.error("[Artemis] Module init failed:", err);
      modules.splice(modules.indexOf(module), 1);
    }
  }

  const instance = {
    loadedAt: Date.now(),
    modules,
    destroy() {
      for (const module of modules.splice(0).reverse()) {
        try {
          module.destroy(window);
        } catch (err) {
          console.warn("[Artemis] Module teardown failed:", err);
        }
      }
      try {
        windowUtils.removeSheet(PARTS_URI, windowUtils.AUTHOR_SHEET);
      } catch {}
      if (window.Artemis === instance) delete window.Artemis;
    },
  };

  window.Artemis = instance;

  if (typeof window.addUnloadListener === "function") {
    window.addUnloadListener(() => instance.destroy());
  }
})();
