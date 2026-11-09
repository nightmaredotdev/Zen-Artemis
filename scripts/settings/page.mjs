/**
 * Settings page styling: Artemis's glass look for the Settings experience
 * (about:preferences with Zen's and Firefox's panes, Sine's page and every
 * mod's settings dialog; about:addons), controlled by `artemis.settings.style`.
 * Keyboard Shortcuts (about:keyboard) gets the same values through
 * the Keyboard Shortcuts actor (settings-actors.mjs), which reuses
 * readWindowVars()/watchWindow(); Extensions and Themes attaches it through
 * an actor too.
 *
 * While the switch is on, attachPageStyle():
 *   - loads styles/runtime/settings-page.css as an author sheet (it imports
 *     the shared tokens, settings-tokens.css) and settings-controls.css as a
 *     user sheet (controls inside Firefox components' shadow trees, which
 *     author sheets cannot reach);
 *   - mirrors the browser window's resolved Artemis glass tokens and Zen's
 *     workspace background (the gradient Zen paints behind the window, aligned
 *     to the page's place in the window) onto the page root as --artemis-s-*
 *     (read-only), so the page follows Artemis's settings, the OS fallback and
 *     the active workspace, and reads as transparent;
 *   - marks the root [artemis-see-through] while the user has enabled Zen's
 *     browser.tabs.allow_transparent_browser (never written by Artemis);
 *   - marks where each card starts and ends in other mods' settings dialogs
 *     ([artemis-card]), from the rows that are actually visible, so every card
 *     keeps its rounded corners whatever rows a mod hides.
 * It also publishes the values for Keyboard Shortcuts (publishKeyboardVars),
 * so that page can apply them before its first paint.
 * Turning the switch off, disabling Artemis or unloading the page removes all
 * of it, which restores Zen's native page. Every step is guarded: if anything
 * fails, the page keeps Zen's look.
 */

const SHEET = "chrome://sine/content/Artemis/styles/runtime/settings-page.css";
const CONTROLS_SHEET = "chrome://sine/content/Artemis/styles/runtime/settings-controls.css";
// Shared with the Keyboard Shortcuts actor child (content process).
export const KEYBOARD_VARS_KEY = "Artemis:settingsKeyboardVars";
export const SETTINGS_PREF = "artemis.settings.style";
export const SEE_THROUGH_PREF = "browser.tabs.allow_transparent_browser";
// Window tokens mirrored as --artemis-s-<name>.
const ARTEMIS_TOKENS = ["glass-opacity", "glass-panel-opacity", "glass-filter", "radius", "space-factor", "accent"];
const BACKGROUND_VARS = ["--artemis-s-zen-background", "--artemis-s-zen-bg-size", "--artemis-s-zen-bg-position", "--artemis-s-zen-bg-repeat"];

export const settingsEnabled = () => Services.prefs.getBoolPref(SETTINGS_PREF, true);

const backgroundElement = chromeWin =>
  chromeWin?.gZenThemePicker?.browserBackgroundElement ??
  chromeWin?.document?.getElementById("zen-browser-background") ??
  null;

// Splits a computed CSS list ("a, b(c, d), e") at top-level commas only.
const splitList = value => {
  const out = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === "," && depth === 0) {
      out.push(value.slice(start, i).trim());
      start = i + 1;
    }
  }
  out.push(value.slice(start).trim());
  return out.filter(Boolean);
};

/**
 * Values to mirror onto a Settings page, read from the browser window that
 * shows it. `embedder` is the page's <browser> element in that window.
 * Returns { "--artemis-s-…": value }; empty values mean "use the fallback".
 */
export function readWindowVars(chromeWin, embedder) {
  const vars = {};
  const chromeRoot = chromeWin?.document?.documentElement;
  if (!chromeRoot) return vars;
  const cs = chromeWin.getComputedStyle(chromeRoot);
  for (const name of ARTEMIS_TOKENS) vars[`--artemis-s-${name}`] = cs.getPropertyValue(`--artemis-${name}`).trim();
  vars["--artemis-s-zen-primary-color"] = cs.getPropertyValue("--zen-primary-color").trim();
  vars["--artemis-s-zen-base"] = cs.backgroundColor;
  for (const name of BACKGROUND_VARS) vars[name] = "";

  // Zen paints the workspace background as gradient layers on
  // #zen-browser-background::after (not on the root, whose
  // --zen-main-browser-background is only a default), sized and positioned in
  // pixels across the whole window. The page shows a copy with every layer
  // shifted by the page's offset inside the window, so it lines up with what
  // Zen paints around the page.
  // A single-colour theme is a plain colour (background-color, no image);
  // it becomes the bottom layer of the copy.
  const bg = backgroundElement(chromeWin);
  const after = bg ? chromeWin.getComputedStyle(bg, "::after") : null;
  if (!after || !embedder) return vars;
  const hasImages = after.backgroundImage && after.backgroundImage !== "none";
  const color = after.backgroundColor;
  const hasColor = color && !/^rgba\(0, 0, 0, 0\)$|^transparent$/.test(color);
  if (!hasImages && !hasColor) return vars;
  const el = bg.getBoundingClientRect();
  const page = embedder.getBoundingClientRect();
  const dim = (token, full) =>
    token === "auto" ? full : token.endsWith("%") ? (full * parseFloat(token)) / 100 : parseFloat(token) || full;
  const offset = (token, full, size) =>
    token.endsWith("%") ? ((full - size) * parseFloat(token)) / 100 : parseFloat(token) || 0;
  const images = hasImages ? splitList(after.backgroundImage) : [];
  const sizes = hasImages
    ? splitList(after.backgroundSize).map(v => {
        const [w, h = "auto"] = v.split(/\s+/);
        return [dim(w, el.width), dim(h, el.height)];
      })
    : [];
  const positions = hasImages
    ? splitList(after.backgroundPosition).map((v, i) => {
        const [x, y = "0px"] = v.split(/\s+/);
        const [w, h] = sizes[i] ?? [el.width, el.height];
        return [offset(x, el.width, w), offset(y, el.height, h)];
      })
    : [];
  const repeats = hasImages ? splitList(after.backgroundRepeat) : [];
  while (repeats.length < images.length) repeats.push(repeats[repeats.length - 1] ?? "no-repeat");
  if (hasColor) {
    images.push(`linear-gradient(${color}, ${color})`);
    sizes.push([el.width, el.height]);
    positions.push([0, 0]);
    repeats.push("no-repeat");
  }
  const dx = el.left - page.left;
  const dy = el.top - page.top;
  vars["--artemis-s-zen-background"] = images.join(", ");
  vars["--artemis-s-zen-bg-size"] = sizes.map(([w, h]) => `${w.toFixed(1)}px ${h.toFixed(1)}px`).join(", ");
  vars["--artemis-s-zen-bg-position"] = positions.map(([x, y]) => `${(x + dx).toFixed(1)}px ${(y + dy).toFixed(1)}px`).join(", ");
  vars["--artemis-s-zen-bg-repeat"] = repeats.slice(0, images.length).join(", ");
  return vars;
}

/**
 * Calls onChange (debounced) whenever a mirrored value may have changed:
 * Artemis prefs (including the switch), Zen's transparent-browser pref, the OS
 * reduce-transparency setting, workspace switches and theme edits, and the
 * page's size or place in the window. Returns a stop() function.
 */
export function watchWindow(chromeWin, embedder, onChange) {
  let timer = 0;
  // After Sine's, the window bridge's and Zen's own updates have landed.
  const schedule = () => {
    chromeWin.clearTimeout(timer);
    timer = chromeWin.setTimeout(onChange, 50);
  };
  const prefObserver = { observe: schedule };
  Services.prefs.addObserver("artemis.", prefObserver);
  Services.prefs.addObserver(SEE_THROUGH_PREF, prefObserver);
  const reduced = chromeWin.matchMedia?.("(prefers-reduced-transparency: reduce)");
  reduced?.addEventListener("change", schedule);
  const mutations = new chromeWin.MutationObserver(schedule);
  mutations.observe(chromeWin.document.documentElement, { attributes: true });
  const bg = backgroundElement(chromeWin);
  if (bg) mutations.observe(bg, { attributes: true });
  const resize = embedder && chromeWin.ResizeObserver ? new chromeWin.ResizeObserver(schedule) : null;
  resize?.observe(embedder);
  chromeWin.addEventListener("resize", schedule);
  // When Artemis is switched on with a page open, the window's tokens can
  // arrive a little later; read them again shortly afterwards.
  const retries = [500, 2000].map(ms => chromeWin.setTimeout(onChange, ms));
  return function stop() {
    chromeWin.clearTimeout(timer);
    retries.forEach(t => chromeWin.clearTimeout(t));
    Services.prefs.removeObserver("artemis.", prefObserver);
    Services.prefs.removeObserver(SEE_THROUGH_PREF, prefObserver);
    reduced?.removeEventListener("change", schedule);
    mutations.disconnect();
    resize?.disconnect();
    chromeWin.removeEventListener("resize", schedule);
  };
}

/**
 * Keyboard Shortcuts runs in another process and would otherwise get these
 * values only after a message round trip, after its first paint (a visible
 * flash of the plain colour). The latest values are kept in shared data,
 * which its actor child reads synchronously when the page's document is
 * created; the live values follow over the actor as before. `embedder` is
 * the browser element the page opens in (the selected browser when the page
 * is opened from Settings or the address bar), so the copy lines up.
 */
export function storeKeyboardVars(data) {
  try {
    Services.ppmm.sharedData.set(KEYBOARD_VARS_KEY, data);
    Services.ppmm.sharedData.flush();
  } catch {}
}

/**
 * Keyboard Shortcuts runs in another process, whose page reserves a gutter for
 * its scrollbar. Firefox fills that gutter only with the page's background
 * colour (every background image and page layer stops at the scrolling area),
 * so a solid colour is all it can show. This returns the average colour of
 * the window background behind the page's right edge, so the gutter matches
 * the workspace there instead of showing Zen's dark base. The browser window
 * is drawn without other processes' content, and the Settings tab's browser is
 * transparent (settings-browsers.mjs), so what is drawn there is the window's
 * own background. Returns "" when it cannot be measured.
 */
export function sampleEdgeColor(chromeWin, embedder) {
  try {
    if (!embedder?.hasAttribute("artemis-settings-browser")) return "";
    const r = embedder.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) return "";
    const canvas = chromeWin.document.createElementNS("http://www.w3.org/1999/xhtml", "canvas");
    canvas.width = 6;
    canvas.height = Math.min(256, Math.round(r.height));
    const ctx = canvas.getContext("2d");
    ctx.scale(canvas.width / 6, canvas.height / r.height);
    ctx.drawWindow(chromeWin, r.right - 6, r.top, 6, r.height, "rgba(0,0,0,0)");
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const sum = [0, 0, 0];
    let n = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 250) continue;
      sum[0] += data[i];
      sum[1] += data[i + 1];
      sum[2] += data[i + 2];
      n++;
    }
    return n ? `rgb(${sum.map(v => Math.round(v / n)).join(" ")})` : "";
  } catch {
    return "";
  }
}

export function publishKeyboardVars(chromeWin, embedder, { edge = false } = {}) {
  try {
    const active = settingsEnabled();
    const vars = active ? readWindowVars(chromeWin, embedder) : {};
    // The edge colour is measured only for a Keyboard Shortcuts load (about
    // 10 ms); otherwise the last measured one is kept.
    const previous = Services.ppmm.sharedData.get(KEYBOARD_VARS_KEY)?.vars?.["--artemis-s-zen-edge"] ?? "";
    if (active) vars["--artemis-s-zen-edge"] = (edge && sampleEdgeColor(chromeWin, embedder)) || previous;
    storeKeyboardVars({ active, vars });
  } catch {}
}

/* ---- Card edges in other mods' settings dialogs ------------------------- */

const CONTENT = ".sineItemPreferenceDialogContent:not(.artemis-enhanced)";

/**
 * Sine renders a mod's settings as a flat list. A card runs from a separator
 * (or the first row) to the row before the next separator, text heading or
 * button. CSS cannot see which rows are visible (mods hide rows with inline
 * styles), so the visible first and last rows of every card are marked here.
 */
function markCards(doc) {
  const win = doc.defaultView;
  for (const content of doc.querySelectorAll(CONTENT)) {
    let card = [];
    const close = () => {
      card.forEach((el, i) => {
        const edges = [i === 0 && "start", i === card.length - 1 && "end"].filter(Boolean).join(" ");
        if (edges) el.setAttribute("artemis-card", edges);
        else el.removeAttribute("artemis-card");
      });
      card = [];
    };
    for (const el of content.children) {
      const visible = win.getComputedStyle(el).display !== "none";
      const isSeparator = el.localName === "vbox" && !!el.querySelector(":scope > hr");
      const isHeading = el.localName === "hbox" && !el.id &&
        el.children.length === 1 && el.firstElementChild.classList.contains("sineItemPreferenceLabel");
      const isRow = ["hbox", "vbox", "div"].includes(el.localName) && !isHeading;
      if (!visible) {
        el.removeAttribute("artemis-card");
        continue;
      }
      if (isSeparator) close();
      if (!isRow) {
        close();
        el.removeAttribute("artemis-card");
        continue;
      }
      card.push(el);
    }
    close();
  }
}

function clearCards(doc) {
  for (const el of doc.querySelectorAll("[artemis-card]")) el.removeAttribute("artemis-card");
}

/* ---- Page styling ------------------------------------------------------- */

export function attachPageStyle(window) {
  const doc = window.document;
  const root = doc.documentElement;
  const wu = window.windowUtils;
  const sheetURI = Services.io.newURI(SHEET);
  const controlsURI = Services.io.newURI(CONTROLS_SHEET);
  const chromeWin = window.browsingContext?.topChromeWindow ?? null;
  const embedder = window.browsingContext?.embedderElement ?? null;
  const mirrored = new Set();
  let active = false;
  let stopWatching = null;
  let cardObserver = null;
  let cardTimer = 0;

  const apply = () => {
    if (!active) return;
    try {
      for (const [name, value] of Object.entries(readWindowVars(chromeWin, embedder))) {
        if (value) {
          root.style.setProperty(name, value);
          mirrored.add(name);
        } else {
          root.style.removeProperty(name);
          mirrored.delete(name);
        }
      }
      root.toggleAttribute("artemis-see-through", Services.prefs.getBoolPref(SEE_THROUGH_PREF, false));
      if (embedder) publishKeyboardVars(chromeWin, embedder);
    } catch (err) {
      console.error("[Artemis] Settings page: could not read the window's values:", err);
    }
  };

  const scheduleCards = () => {
    window.clearTimeout(cardTimer);
    cardTimer = window.setTimeout(() => {
      try {
        markCards(doc);
      } catch (err) {
        console.error("[Artemis] Settings page: could not mark cards:", err);
      }
    }, 30);
  };

  function activate() {
    if (active) return;
    try {
      wu.loadSheet(sheetURI, wu.AUTHOR_SHEET);
    } catch (err) {
      console.error("[Artemis] Settings page styling unavailable:", err);
      return;
    }
    try {
      wu.loadSheet(controlsURI, wu.USER_SHEET);
    } catch (err) {
      // Controls inside components keep Firefox's look; the rest still applies.
      console.error("[Artemis] Settings page controls styling unavailable:", err);
    }
    active = true;
    root.setAttribute("artemis-settings-page", "");
    apply();
    if (chromeWin?.document) {
      try {
        stopWatching = watchWindow(chromeWin, embedder, apply);
      } catch (err) {
        console.error("[Artemis] Settings page: live updates unavailable:", err);
      }
    }
    // Rows appear (dialogs render lazily) and mods show or hide rows.
    cardObserver = new window.MutationObserver(scheduleCards);
    cardObserver.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "hidden", "class"] });
    scheduleCards();
  }

  function deactivate() {
    if (!active) return;
    active = false;
    stopWatching?.();
    stopWatching = null;
    cardObserver?.disconnect();
    cardObserver = null;
    window.clearTimeout(cardTimer);
    clearCards(doc);
    for (const name of [...mirrored]) root.style.removeProperty(name);
    mirrored.clear();
    root.removeAttribute("artemis-settings-page");
    root.removeAttribute("artemis-see-through");
    // windowUtils acts on whatever document the tab shows now. After a
    // navigation to another Settings page in the same tab (both are
    // parent-process pages) that is the new page, which has its own sheets;
    // this page's document is going away with its sheets, so leave them.
    let current = false;
    try {
      current = window.document === doc && window.windowGlobalChild?.isCurrentGlobal === true;
    } catch {}
    if (!current) return;
    for (const [uri, type] of [[controlsURI, wu.USER_SHEET], [sheetURI, wu.AUTHOR_SHEET]]) {
      try {
        wu.removeSheet(uri, type);
      } catch {}
    }
  }

  const switchObserver = { observe: () => (settingsEnabled() ? activate() : deactivate()) };
  Services.prefs.addObserver(SETTINGS_PREF, switchObserver);
  if (settingsEnabled()) activate();

  return {
    get active() { return active; },
    destroy() {
      Services.prefs.removeObserver(SETTINGS_PREF, switchObserver);
      deactivate();
    },
  };
}
