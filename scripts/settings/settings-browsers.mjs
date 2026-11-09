/**
 * Settings page browsers (per browser window, part of artemis.settings.style).
 *
 * Until a page has painted, its tab shows the empty <browser> element, which
 * Zen paints flat grey. Keyboard Shortcuts runs in its own process, so that
 * grey shows while the process starts or switches (measured 200–400 ms), and
 * it read as "Zen's colours first". While a tab loads or shows a Settings page,
 * this module marks its browser [artemis-settings-browser]; the chrome sheet
 * (styles/features/settings/style.css, gated on the switch) makes that browser
 * transparent, so the window's own workspace background shows until the page
 * paints the same background over it.
 *
 * It also publishes fresh values for Keyboard Shortcuts as such a load starts
 * (page.mjs publishKeyboardVars), so the page's first paint uses the current
 * workspace and the tab's own position, even right after startup or after a
 * workspace change with no Settings page open.
 *
 * Only top-level loads are considered; nothing is written for other pages.
 */

import { publishKeyboardVars, settingsEnabled } from "chrome://sine/content/Artemis/scripts/settings/page.mjs";

const ATTR = "artemis-settings-browser";
const PAGES = ["about:preferences", "about:settings", "about:addons", "about:keyboard"];
const isSettings = spec => typeof spec === "string" && PAGES.some(page => spec.startsWith(page));

export function createSettingsBrowsers(window) {
  const { STATE_START, STATE_IS_WINDOW } = Ci.nsIWebProgressListener;

  const mark = (browser, spec) => {
    const on = isSettings(spec);
    if (browser.hasAttribute(ATTR) !== on) browser.toggleAttribute(ATTR, on);
    if (on && spec.startsWith("about:keyboard") && settingsEnabled()) publishKeyboardVars(window, browser, { edge: true });
  };

  const listener = {
    onStateChange(browser, webProgress, request, flags) {
      if (!webProgress?.isTopLevel || !(flags & STATE_START) || !(flags & STATE_IS_WINDOW)) return;
      let spec = "";
      try {
        spec = request?.QueryInterface(Ci.nsIChannel).originalURI?.spec ?? request?.name ?? "";
      } catch {
        spec = request?.name ?? "";
      }
      try {
        mark(browser, spec);
      } catch {}
    },
    onLocationChange(browser, webProgress, request, location) {
      if (!webProgress?.isTopLevel) return;
      try {
        mark(browser, location?.spec ?? "");
      } catch {}
    },
    QueryInterface: ChromeUtils.generateQI(["nsIWebProgressListener", "nsISupportsWeakReference"]),
  };

  return {
    init() {
      const gBrowser = window.gBrowser;
      if (!gBrowser) return;
      gBrowser.addTabsProgressListener(listener);
      for (const browser of gBrowser.browsers) {
        try {
          if (isSettings(browser.currentURI?.spec)) browser.setAttribute(ATTR, "");
        } catch {}
      }
    },
    destroy() {
      const gBrowser = window.gBrowser;
      if (!gBrowser) return;
      try {
        gBrowser.removeTabsProgressListener(listener);
      } catch {}
      for (const browser of gBrowser.browsers) browser.removeAttribute(ATTR);
    },
  };
}
