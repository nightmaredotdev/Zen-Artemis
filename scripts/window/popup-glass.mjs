/**
 * Menu workspace glass (per browser window, part of artemis.popups.style).
 *
 * Applies to menus (context menus, menulist lists) and to the panels that are
 * not toolbar panels (autocomplete drop-downs, which open over web pages, and
 * the Ctrl+Tab switcher). Toolbar panels (arrow panels: Downloads, Extensions,
 * the app menu, site and Zen panels, previews) are genuinely translucent
 * instead (styles/features/popups/style.parts.css).
 *
 * Popups are separate OS windows. They can be translucent, but nothing can blur
 * what is behind them unless Windows draws its acrylic backdrop (only with
 * Windows transparency effects on, and only for menus); unblurred, the text
 * behind runs through the popup's text. So, like the Settings pages, these
 * popups show a copy of the window's workspace background, aligned to where
 * they open, under a translucent card layer. They read as a Settings card over
 * the workspace and stay fully readable.
 *
 * When a popup is positioned (before it appears) and shown, the module copies
 * Zen's workspace background layers (page.mjs readWindowVars, the same copy
 * the Settings pages use) relative to the popup's content box and sets them on
 * the popup as --artemis-popup-*. Drop-down lists of <select> elements are
 * left alone: websites can colour them.
 * Without them (no JS, or nothing to copy), the stylesheet keeps the solid
 * tinted surface. Nothing is written while the popups area is off.
 */

import { readWindowVars } from "chrome://sine/content/Artemis/scripts/settings/page.mjs";

const PREF = "artemis.popups.style";
const VARS = {
  "--artemis-s-zen-base": "--artemis-popup-base",
  "--artemis-s-zen-background": "--artemis-popup-bg",
  "--artemis-s-zen-bg-size": "--artemis-popup-bg-size",
  "--artemis-s-zen-bg-position": "--artemis-popup-bg-position",
  "--artemis-s-zen-bg-repeat": "--artemis-popup-bg-repeat",
};

export function createPopupGlass(window) {
  const onShown = event => {
    const popup = event.target;
    const isMenu = popup?.localName === "menupopup";
    const isOtherPanel = popup?.localName === "panel" && popup.getAttribute("type") !== "arrow";
    if (!isMenu && !isOtherPanel) return;
    if (popup.parentElement?.id === "ContentSelectDropdown") return;
    try {
      if (!Services.prefs.getBoolPref(PREF, true)) return;
      const content = popup.shadowRoot?.querySelector("[part~='content']");
      if (!content) return;
      const vars = readWindowVars(window, content);
      if (!vars["--artemis-s-zen-background"]) {
        clear(popup);
        return;
      }
      for (const [from, to] of Object.entries(VARS)) popup.style.setProperty(to, vars[from] ?? "");
      popup.setAttribute("artemis-glass", "");
    } catch {
      clear(popup);
    }
  };

  const clear = popup => {
    popup.removeAttribute("artemis-glass");
    for (const name of Object.values(VARS)) popup.style.removeProperty(name);
  };

  return {
    init() {
      window.addEventListener("popuppositioned", onShown, true);
      window.addEventListener("popupshown", onShown, true);
    },
    destroy() {
      window.removeEventListener("popuppositioned", onShown, true);
      window.removeEventListener("popupshown", onShown, true);
      for (const popup of window.document.querySelectorAll("[artemis-glass]")) clear(popup);
    },
  };
}
