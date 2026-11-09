/**
 * Settings page styling: Artemis's glass look for the whole about:preferences
 * page (Zen's and Firefox's panes, Sine's page and every mod's settings
 * dialog), controlled by `artemis.settings.style`.
 *
 * Only ever runs inside about:preferences (loaded by artemis-settings.uc.js).
 * While the switch is on it:
 *   - loads styles/runtime/settings-page.css as an author sheet;
 *   - mirrors the browser window's resolved Artemis glass tokens and Zen's
 *     workspace background onto the page root as --artemis-s-* (read-only), so
 *     the page follows Artemis's transparency, blur, radius and spacing
 *     settings, the OS fallback and the active workspace;
 *   - marks the root [artemis-see-through] while the user has enabled Zen's
 *     browser.tabs.allow_transparent_browser (never written by Artemis).
 * Turning the switch off, disabling Artemis or unloading the page removes all
 * of it, which restores Zen's native settings page. Every step is guarded: if
 * anything fails, the page keeps Zen's look.
 */

const SHEET = "chrome://sine/content/Artemis/styles/runtime/settings-page.css";
const PREF = "artemis.settings.style";
const SEE_THROUGH_PREF = "browser.tabs.allow_transparent_browser";
// Window tokens mirrored as --artemis-s-<name>.
const ARTEMIS_TOKENS = ["glass-opacity", "glass-panel-opacity", "glass-filter", "radius", "space-factor", "accent"];
// Zen's workspace colours, mirrored as --artemis-s-zen-<name>.
const ZEN_TOKENS = ["main-browser-background", "primary-color"];

export function attachPageStyle(window) {
  const doc = window.document;
  const root = doc.documentElement;
  const wu = window.windowUtils;
  const sheetURI = Services.io.newURI(SHEET);
  const chromeWin = window.browsingContext?.topChromeWindow ?? null;
  const mirrored = new Set();
  let active = false;
  let timer = 0;
  let retryTimers = [];
  let chromeObserver = null;
  const reducedTransparency = chromeWin?.matchMedia?.("(prefers-reduced-transparency: reduce)") ?? null;

  const enabled = () => Services.prefs.getBoolPref(PREF, true);

  const setVar = (name, value) => {
    if (value) {
      root.style.setProperty(name, value);
      mirrored.add(name);
    } else {
      root.style.removeProperty(name);
      mirrored.delete(name);
    }
  };

  const mirror = () => {
    if (!active) return;
    try {
      const chromeRoot = chromeWin?.document?.documentElement;
      if (!chromeRoot) return;
      const cs = chromeWin.getComputedStyle(chromeRoot);
      for (const name of ARTEMIS_TOKENS) setVar(`--artemis-s-${name}`, cs.getPropertyValue(`--artemis-${name}`).trim());
      for (const name of ZEN_TOKENS) setVar(`--artemis-s-zen-${name}`, cs.getPropertyValue(`--zen-${name}`).trim());
    } catch (err) {
      console.error("[Artemis] Settings page: could not read the window's tokens:", err);
    }
  };

  // After Sine's, the window bridge's and Zen's own updates have landed.
  const scheduleMirror = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(mirror, 50);
  };

  const syncSeeThrough = () => {
    root.toggleAttribute("artemis-see-through", active && Services.prefs.getBoolPref(SEE_THROUGH_PREF, false));
  };

  const prefObserver = { observe: () => (enabled() ? activate() : deactivate()) };
  const tokenObserver = { observe: () => scheduleMirror() };
  const seeThroughObserver = { observe: () => syncSeeThrough() };

  function activate() {
    if (active) return;
    try {
      wu.loadSheet(sheetURI, wu.AUTHOR_SHEET);
    } catch (err) {
      console.error("[Artemis] Settings page styling unavailable:", err);
      return;
    }
    active = true;
    root.setAttribute("artemis-settings-page", "");
    mirror();
    // When Artemis is switched on with the page open, the window's tokens can
    // arrive after this point; read them again shortly afterwards.
    retryTimers = [500, 2000].map(ms => window.setTimeout(mirror, ms));
    syncSeeThrough();
    Services.prefs.addObserver("artemis.", tokenObserver);
    Services.prefs.addObserver(SEE_THROUGH_PREF, seeThroughObserver);
    reducedTransparency?.addEventListener("change", scheduleMirror);
    // Zen sets the workspace colours as inline variables on the window root.
    if (chromeWin?.document?.documentElement && chromeWin.MutationObserver) {
      chromeObserver = new chromeWin.MutationObserver(scheduleMirror);
      chromeObserver.observe(chromeWin.document.documentElement, { attributes: true });
    }
  }

  function deactivate() {
    if (!active) return;
    active = false;
    window.clearTimeout(timer);
    retryTimers.forEach(t => window.clearTimeout(t));
    retryTimers = [];
    Services.prefs.removeObserver("artemis.", tokenObserver);
    Services.prefs.removeObserver(SEE_THROUGH_PREF, seeThroughObserver);
    reducedTransparency?.removeEventListener("change", scheduleMirror);
    chromeObserver?.disconnect();
    chromeObserver = null;
    for (const name of [...mirrored]) setVar(name, "");
    root.removeAttribute("artemis-settings-page");
    root.removeAttribute("artemis-see-through");
    try {
      wu.removeSheet(sheetURI, wu.AUTHOR_SHEET);
    } catch {}
  }

  Services.prefs.addObserver(PREF, prefObserver);
  if (enabled()) activate();

  return {
    get active() { return active; },
    destroy() {
      Services.prefs.removeObserver(PREF, prefObserver);
      deactivate();
    },
  };
}
