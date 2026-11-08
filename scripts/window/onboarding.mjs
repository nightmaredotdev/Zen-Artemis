/**
 * First-launch tour: a small floating card with real controls. Choices are
 * saved as they are made, so skipping keeps them. Ends as "completed" or
 * "skipped"; never reappears on its own after that; reopenable from settings.
 */

import { t } from "../strings.mjs";
import { getRawEntries, getValue, getSettings, setUserValue, clearUserValue } from "../core/schema.mjs";

const XHTML = "http://www.w3.org/1999/xhtml";
const SHEET = "chrome://sine/content/Artemis/styles/runtime/tour.css";

const STEPS = [
  { id: "welcome", prefs: [] },
  { id: "look", prefs: ["artemis.appearance.transparency", "artemis.appearance.blur", "artemis.appearance.radius"] },
  { id: "tabs", prefs: ["artemis.tabs.shape", "artemis.tabs.height", "artemis.workspaces.switcher"] },
  { id: "motion", prefs: ["artemis.motion.intensity"] },
  { id: "done", prefs: [] },
];

// Options left out of the tour (still available in settings).
const HIDDEN_OPTIONS = new Set(["custom"]);

export function createTour(window, core) {
  const doc = window.document;
  const sheetURI = Services.io.newURI(SHEET);
  let card = null;
  let step = 0;
  let sheetLoaded = false;

  const el = (tag, props = {}, children = []) => {
    const node = doc.createElementNS(XHTML, tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === "text") node.textContent = v;
      else if (k.startsWith("on")) node.addEventListener(k.slice(2), v);
      else node.setAttribute(k, v);
    }
    children.forEach(c => c && node.append(c));
    return node;
  };

  const choose = (name, value) => {
    const setting = getSettings().get(name);
    if (value === setting.defaultValue) clearUserValue(name);
    else setUserValue(name, value);
    render();
  };

  const control = name => {
    const entry = getRawEntries().find(e => e.property === name);
    if (!entry) return null;
    const current = getValue(name);
    const group = el("div", { class: "artemis-tour-options", role: "radiogroup", "aria-label": entry.label });
    for (const opt of entry.options.filter(o => !HIDDEN_OPTIONS.has(o.value) || o.value === current)) {
      group.append(el("button", {
        class: "artemis-tour-option",
        role: "radio",
        "aria-checked": String(opt.value === current),
        text: opt.label,
        onclick: () => choose(name, opt.value),
      }));
    }
    return el("div", { class: "artemis-tour-row" }, [el("div", { class: "artemis-tour-label", text: entry.label }), group]);
  };

  const end = how => {
    core.finishTour(how);
    close();
  };

  const render = () => {
    if (!card) return;
    const s = STEPS[step];
    const last = step === STEPS.length - 1;
    card.replaceChildren(
      el("div", { class: "artemis-tour-head" }, [
        s.id === "welcome" ? el("div", { class: "artemis-tour-logo" }) : null,
        el("div", { class: "artemis-tour-title", text: t(`tour.${s.id}.title`) }),
        el("div", { class: "artemis-tour-count", text: t("tour.step", { n: step + 1, total: STEPS.length }) }),
      ]),
      el("div", { class: "artemis-tour-text", text: t(`tour.${s.id}.text`) }),
      ...s.prefs.map(control),
      el("div", { class: "artemis-tour-actions" }, [
        !last ? el("button", { class: "artemis-tour-link", text: t("tour.skip"), onclick: () => end("skipped") }) : null,
        el("div", { class: "artemis-tour-spacer" }),
        step > 0 ? el("button", { class: "artemis-tour-button", text: t("tour.back"), onclick: () => { step--; render(); } }) : null,
        el("button", {
          class: "artemis-tour-button artemis-tour-primary",
          text: last ? t("tour.finish") : t("tour.next"),
          onclick: () => (last ? end("completed") : (step++, render())),
        }),
      ]),
    );
    card.querySelector(".artemis-tour-primary")?.focus();
  };

  const onKey = e => {
    if (card && e.key === "Escape") end("skipped");
  };

  const open = () => {
    if (card) return;
    if (!sheetLoaded) {
      window.windowUtils.loadSheet(sheetURI, window.windowUtils.AUTHOR_SHEET);
      sheetLoaded = true;
    }
    step = 0;
    card = el("div", { id: "artemis-tour", role: "dialog", "aria-label": t("tour.welcome.title") });
    (doc.getElementById("browser") || doc.documentElement).append(card);
    window.addEventListener("keydown", onKey, true);
    render();
  };

  function close() {
    window.removeEventListener("keydown", onKey, true);
    card?.remove();
    card = null;
  }

  return {
    open,
    close,
    get isOpen() { return !!card; },
    destroy() {
      close();
      if (sheetLoaded) {
        try { window.windowUtils.removeSheet(sheetURI, window.windowUtils.AUTHOR_SHEET); } catch {}
      }
    },
  };
}

/** Module for artemis.uc.js: auto-opens once on first launch; opens on request. */
export function createOnboardingModule(core) {
  let tour = null;
  let timer = null;
  const observer = {
    observe: () => {
      const win = tour?.window;
      if (win && Services.wm.getMostRecentWindow("navigator:browser") === win) tour.open();
    },
  };
  return {
    init(window) {
      tour = createTour(window, core);
      tour.window = window;
      Services.obs.addObserver(observer, core.TOUR_TOPIC);
      const start = () => {
        if (core.claimAutoTour()) tour.open();
      };
      // Wait until the window has finished starting up.
      timer = window.setTimeout(start, 1500);
    },
    destroy(window) {
      window.clearTimeout(timer);
      Services.obs.removeObserver(observer, core.TOUR_TOPIC);
      tour?.destroy();
      tour = null;
    },
    get tour() { return tour; },
  };
}
