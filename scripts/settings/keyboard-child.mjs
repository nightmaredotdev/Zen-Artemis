/**
 * Child side of the Keyboard Shortcuts actor (see settings-actors.mjs). Runs in
 * the about:keyboard page and only sets or removes --artemis-s-* variables and
 * the [artemis-settings-page] attribute on the page root. The page's own CSS
 * (styles/pages/settings-keyboard.css, gated on the switch) does the styling.
 */

export class ArtemisKeyboardChild extends JSWindowActorChild {
  #names = new Set();

  handleEvent(event) {
    if (event.type === "DOMContentLoaded") this.sendAsyncMessage("ArtemisKeyboard:ready");
  }

  receiveMessage(message) {
    if (message.name !== "ArtemisKeyboard:vars") return;
    const root = this.document?.documentElement;
    if (!root) return;
    const { active, vars } = message.data ?? {};
    for (const name of [...this.#names]) {
      if (!active || !vars?.[name]) {
        root.style.removeProperty(name);
        this.#names.delete(name);
      }
    }
    if (active) {
      for (const [name, value] of Object.entries(vars ?? {})) {
        if (!name.startsWith("--artemis-s-") || !value) continue;
        root.style.setProperty(name, value);
        this.#names.add(name);
      }
    }
    root.toggleAttribute("artemis-settings-page", !!active);
  }

  didDestroy() {
    const root = this.document?.documentElement;
    if (!root) return;
    for (const name of this.#names) root.style.removeProperty(name);
    root.removeAttribute("artemis-settings-page");
  }
}
