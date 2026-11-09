/**
 * Child side of the Keyboard Shortcuts actor (see settings-actors.mjs). Runs in
 * the about:keyboard page and only sets or removes --artemis-s-* variables and
 * the [artemis-settings-page] attribute on the page root. The page's own CSS
 * (styles/pages/settings-keyboard.css, gated on the switch) does the styling.
 *
 * When the document element is inserted (before the first paint) it applies
 * the values the Settings pages last published in shared data, so the page
 * opens with the workspace background instead of flashing the plain colour;
 * then it asks the parent for the live values of its own window.
 */

const SETTINGS_PREF = "artemis.settings.style";
// Same key as page.mjs KEYBOARD_VARS_KEY (not imported: that module is
// parent-process code).
const KEYBOARD_VARS_KEY = "Artemis:settingsKeyboardVars";

export class ArtemisKeyboardChild extends JSWindowActorChild {
  #names = new Set();
  #ready = false;

  handleEvent(event) {
    if (event.type === "DOMDocElementInserted" && !this.#ready) {
      try {
        const cached = Services.cpmm.sharedData.get(KEYBOARD_VARS_KEY);
        // The switch is checked here too: the published values may be older.
        if (cached?.active && Services.prefs.getBoolPref(SETTINGS_PREF, true)) this.#apply(cached);
      } catch {}
    }
    if (!this.#ready && this.document?.documentElement) {
      this.#ready = true;
      this.sendAsyncMessage("ArtemisKeyboard:ready");
    }
  }

  receiveMessage(message) {
    if (message.name === "ArtemisKeyboard:vars") this.#apply(message.data ?? {});
  }

  #apply({ active, vars }) {
    const root = this.document?.documentElement;
    if (!root) return;
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
