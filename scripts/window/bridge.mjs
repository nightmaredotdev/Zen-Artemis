/**
 * Window bridge: mirrors Artemis custom-value (string) prefs to
 * --artemis-live-<name> on the window root, validated, whenever they change
 * from any source (settings, about:config, reset, restore). Sine only
 * refreshes its own variables for edits made in its settings dialog.
 */

import { getSettings, isValid, getValue } from "../core/schema.mjs";

const liveName = pref => `--artemis-live-${pref.split(".").pop()}`;

export function createBridge(window) {
  const root = window.document.documentElement;
  const strings = [...getSettings().values()].filter(s => s.type === "string").map(s => s.name);

  const apply = name => {
    const value = getValue(name);
    if (value !== undefined && isValid(name, value)) root.style.setProperty(liveName(name), value);
    else root.style.removeProperty(liveName(name));
  };

  const observer = { observe: (_s, _t, name) => strings.includes(name) && apply(name) };

  return {
    init() {
      strings.forEach(apply);
      Services.prefs.addObserver("artemis.", observer);
    },
    destroy() {
      Services.prefs.removeObserver("artemis.", observer);
      strings.forEach(n => root.style.removeProperty(liveName(n)));
    },
  };
}
