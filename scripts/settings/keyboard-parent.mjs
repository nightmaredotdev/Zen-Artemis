/**
 * Parent side of the Keyboard Shortcuts actor (see settings-actors.mjs).
 * Reads the values from the browser window that shows the page and sends
 * them to the child whenever they may have changed. Sends { active: false }
 * while the Settings page styling switch is off.
 */

import { readWindowVars, watchWindow, settingsEnabled, storeKeyboardVars, sampleEdgeColor } from "chrome://sine/content/Artemis/scripts/settings/page.mjs";

export class ArtemisKeyboardParent extends JSWindowActorParent {
  #stop = null;

  receiveMessage(message) {
    if (message.name === "ArtemisKeyboard:ready") this.start();
  }

  start() {
    if (this.#stop) {
      this.#push();
      return;
    }
    const embedder = this.browsingContext?.top?.embedderElement;
    const chromeWin = embedder?.ownerDocument?.defaultView;
    if (!chromeWin?.document) return;
    try {
      this.#stop = watchWindow(chromeWin, embedder, () => this.#push());
    } catch (err) {
      console.error("[Artemis] Keyboard Shortcuts: live updates unavailable:", err);
    }
    this.#push();
  }

  #push() {
    try {
      const active = settingsEnabled();
      const embedder = this.browsingContext?.top?.embedderElement;
      const chromeWin = embedder?.ownerDocument?.defaultView;
      const vars = active && embedder ? readWindowVars(chromeWin, embedder) : {};
      if (active && embedder) vars["--artemis-s-zen-edge"] = sampleEdgeColor(chromeWin, embedder);
      this.sendAsyncMessage("ArtemisKeyboard:vars", { active, vars });
      // The next Keyboard Shortcuts page opens with these values.
      storeKeyboardVars({ active, vars });
    } catch (err) {
      // The page may be going away; nothing to update.
    }
  }

  didDestroy() {
    this.#stop?.();
    this.#stop = null;
  }
}
