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
      if (window.Artemis === instance) delete window.Artemis;
    },
  };

  window.Artemis = instance;

  if (typeof window.addUnloadListener === "function") {
    window.addUnloadListener(() => instance.destroy());
  }
})();
