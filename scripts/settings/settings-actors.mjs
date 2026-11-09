/**
 * Window actors for the Settings pages that Sine's script loader does not
 * reliably reach. Registered while at least one Artemis browser window is
 * running (artemis.uc.js retains/releases them), so disabling Artemis
 * unregisters them and every page drops what Artemis added.
 *
 *  - ArtemisAddons (child only): Extensions and Themes (about:addons) is a
 *    parent-process page; its child attaches the same page styling as the
 *    Settings page (page.mjs attachPageStyle). This does not depend on Sine's
 *    per-mod include list, which an installed copy may not refresh.
 *  - ArtemisKeyboard (parent + child): Keyboard Shortcuts (about:keyboard) runs
 *    in the privileged-about content process, where Sine runs no mod scripts
 *    and Zen exposes no workspace colours. The parent reads the values the
 *    other Settings pages mirror; the child sets them as --artemis-s-*
 *    variables, used by styles/pages/settings-keyboard.css (which falls back
 *    to Artemis's named steps without them).
 */

const BASE = "chrome://sine/content/Artemis/scripts/settings/";
const ACTORS = {
  ArtemisAddons: {
    child: { esModuleURI: BASE + "addons-child.mjs", events: { DOMContentLoaded: {} } },
    matches: ["about:addons*"],
    messageManagerGroups: ["browsers"],
  },
  ArtemisKeyboard: {
    parent: { esModuleURI: BASE + "keyboard-parent.mjs" },
    child: { esModuleURI: BASE + "keyboard-child.mjs", events: { DOMContentLoaded: {} } },
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
  for (const browser of openBrowsers("about:addons")) {
    try {
      browser.contentWindow?.windowGlobalChild?.getActor("ArtemisAddons").start();
    } catch {}
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
}
