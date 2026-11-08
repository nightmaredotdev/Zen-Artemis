/**
 * Window bridge.
 *
 * 1. Mirrors Artemis custom-value (string) prefs to --artemis-live-<name> on the
 *    window root, validated, whenever they change from any source (settings,
 *    about:config, reset, restore). Sine only refreshes its own variables for
 *    edits made in its settings dialog.
 * 2. Marks the root with `artemis-explicit-glass` while the user has explicitly
 *    chosen a glass transparency or blur in Artemis. CSS cannot tell a user value
 *    from a default, and tokens.css uses this attribute so that an explicit
 *    Artemis choice takes precedence over the OS "reduce transparency" default
 *    (v1.0.0 bug: the OS setting silently overrode an explicit 10% opacity).
 */

import { getSettings, isValid, getValue, isUserSet } from "../core/schema.mjs";

const liveName = pref => `--artemis-live-${pref.split(".").pop()}`;
const GLASS_PREFS = [
  "artemis.appearance.transparency",
  "artemis.appearance.transparency-custom",
  "artemis.appearance.blur",
  "artemis.appearance.blur-custom",
];
const EXPLICIT_ATTR = "artemis-explicit-glass";

export function createBridge(window) {
  const root = window.document.documentElement;
  const strings = [...getSettings().values()].filter(s => s.type === "string").map(s => s.name);

  const apply = name => {
    const value = getValue(name);
    if (value !== undefined && isValid(name, value)) root.style.setProperty(liveName(name), value);
    else root.style.removeProperty(liveName(name));
  };

  const applyExplicitGlass = () => {
    root.toggleAttribute(EXPLICIT_ATTR, GLASS_PREFS.some(isUserSet));
  };

  const observer = {
    observe: (_s, _t, name) => {
      if (strings.includes(name)) apply(name);
      if (GLASS_PREFS.includes(name)) applyExplicitGlass();
    },
  };

  return {
    init() {
      strings.forEach(apply);
      applyExplicitGlass();
      Services.prefs.addObserver("artemis.", observer);
    },
    destroy() {
      Services.prefs.removeObserver("artemis.", observer);
      strings.forEach(n => root.style.removeProperty(liveName(n)));
      root.removeAttribute(EXPLICIT_ATTR);
    },
  };
}
