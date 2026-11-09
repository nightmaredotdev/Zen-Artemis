/**
 * Extensions and Themes (about:addons) actor child (see settings-actors.mjs).
 * The page lives in the parent process, so the child attaches the same page
 * styling as the Settings page and removes it when the actor goes away
 * (page unload, or Artemis disabled).
 */

import { attachPageStyle } from "chrome://sine/content/Artemis/scripts/settings/page.mjs";

export class ArtemisAddonsChild extends JSWindowActorChild {
  #handle = null;

  handleEvent(event) {
    if (event.type === "DOMContentLoaded") this.start();
  }

  start() {
    if (this.#handle) return;
    const win = this.contentWindow;
    if (!win?.document?.location?.href.startsWith("about:addons")) return;
    try {
      this.#handle = attachPageStyle(win);
    } catch (err) {
      console.error("[Artemis] Extensions and Themes styling unavailable:", err);
    }
  }

  didDestroy() {
    try {
      this.#handle?.destroy();
    } catch {}
    this.#handle = null;
  }
}
