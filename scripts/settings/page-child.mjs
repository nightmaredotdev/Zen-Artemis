/**
 * Settings page actor child (see settings-actors.mjs) for the parent-process
 * Settings pages: Settings (about:preferences, about:settings) and Extensions
 * and Themes (about:addons). It attaches the page styling (page.mjs) as soon
 * as the page's document element exists, before the first paint, so the page
 * never shows Zen's look first; it removes it when the actor goes away (page
 * unload, or Artemis disabled). Artemis's own settings dialog enhancer is
 * still attached by Sine's script (artemis-settings.uc.js).
 */

import { attachPageStyle } from "chrome://sine/content/Artemis/scripts/settings/page.mjs";

const PAGES = ["about:preferences", "about:settings", "about:addons"];

export class ArtemisSettingsPageChild extends JSWindowActorChild {
  #handle = null;

  // DOMDocElementInserted: before the first paint. DOMContentLoaded is a
  // fallback (start() runs once).
  handleEvent() {
    this.start();
  }

  start() {
    if (this.#handle) return;
    const win = this.contentWindow;
    const href = win?.document?.location?.href ?? "";
    if (!win?.document?.documentElement || !PAGES.some(page => href.startsWith(page))) return;
    try {
      this.#handle = attachPageStyle(win);
    } catch (err) {
      console.error("[Artemis] Settings page styling unavailable:", err);
    }
  }

  didDestroy() {
    try {
      this.#handle?.destroy();
    } catch {}
    this.#handle = null;
  }
}
