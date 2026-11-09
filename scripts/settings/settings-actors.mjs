/**
 * Window actors that style the Settings pages. Registered while at least one
 * Artemis browser window is running (artemis.uc.js retains/releases them), so
 * disabling Artemis unregisters them and every page drops what Artemis added.
 * Both act when the page's document element is inserted, before its first
 * paint, so a page never shows Zen's look before Artemis's (Sine's script
 * loader runs much later, after the page has painted).
 *
 *  - ArtemisSettingsPage (child only): Settings (about:preferences,
 *    about:settings) and Extensions and Themes (about:addons) are
 *    parent-process pages; the child attaches the page styling (page.mjs
 *    attachPageStyle). This does not depend on Sine's per-mod include list,
 *    which an installed copy may not refresh.
 *  - ArtemisKeyboard (parent + child): Keyboard Shortcuts (about:keyboard) runs
 *    in the privileged-about content process, where Sine runs no mod scripts
 *    and Zen exposes no workspace colours. The child first applies the values
 *    the Settings pages last published (shared data, read synchronously), then
 *    the parent sends the live values for its own window; the child sets them
 *    as --artemis-s-* variables, used by styles/pages/settings-keyboard.css
 *    (which falls back to Artemis's named steps without them).
 */

import { publishKeyboardVars, KEYBOARD_VARS_KEY } from "chrome://sine/content/Artemis/scripts/settings/page.mjs";

const BASE = "chrome://sine/content/Artemis/scripts/settings/";
const ACTORS = {
  ArtemisSettingsPage: {
    child: {
      esModuleURI: BASE + "page-child.mjs",
      events: { DOMDocElementInserted: { capture: true }, DOMContentLoaded: {} },
    },
    matches: ["about:preferences*", "about:settings*", "about:addons*"],
    messageManagerGroups: ["browsers"],
  },
  ArtemisKeyboard: {
    parent: { esModuleURI: BASE + "keyboard-parent.mjs" },
    child: {
      esModuleURI: BASE + "keyboard-child.mjs",
      events: { DOMDocElementInserted: { capture: true }, DOMContentLoaded: {} },
    },
    matches: ["about:keyboard*"],
    messageManagerGroups: ["browsers"],
  },
};
let users = 0;

function openBrowsers(prefix) {
  const out = [];
  for (const win of Services.wm.getEnumerator("navigator:browser")) {
    for (const browser of win.gBrowser?.browsers ?? []) {
      if (browser.currentURI?.spec.startsWith(prefix)) out.push(browser);
    }
  }
  return out;
}

export function retain() {
  users += 1;
  if (users > 1) return;
  for (const [name, options] of Object.entries(ACTORS)) {
    try {
      ChromeUtils.registerWindowActor(name, options);
    } catch (err) {
      console.error(`[Artemis] Settings page actor ${name} unavailable:`, err);
    }
  }
  // Pages already open (Artemis switched on mid-session) are styled now.
  for (const prefix of ["about:preferences", "about:settings", "about:addons"]) {
    for (const browser of openBrowsers(prefix)) {
      try {
        browser.contentWindow?.windowGlobalChild?.getActor("ArtemisSettingsPage").start();
      } catch {}
    }
  }
  // First values for Keyboard Shortcuts (the Settings pages and the page's
  // own actor keep them current), once the window's theme has settled.
  const win = Services.wm.getMostRecentWindow("navigator:browser");
  if (win?.gBrowser) {
    publishKeyboardVars(win, win.gBrowser.selectedBrowser);
    win.setTimeout(() => {
      if (users > 0 && !win.closed) publishKeyboardVars(win, win.gBrowser.selectedBrowser);
    }, 2000);
  }
  for (const browser of openBrowsers("about:keyboard")) {
    try {
      browser.browsingContext.currentWindowGlobal.getActor("ArtemisKeyboard").start();
    } catch {}
  }
}

export function release() {
  if (users === 0) return;
  users -= 1;
  if (users > 0) return;
  for (const name of Object.keys(ACTORS)) {
    try {
      ChromeUtils.unregisterWindowActor(name);
    } catch {}
  }
  try {
    Services.ppmm.sharedData.delete(KEYBOARD_VARS_KEY);
    Services.ppmm.sharedData.flush();
  } catch {}
}
