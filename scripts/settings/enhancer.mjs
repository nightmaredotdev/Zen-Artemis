/**
 * Settings enhancer: decorates ONLY Artemis's own Sine settings dialog with
 * collapsible sections, search, descriptions, per-setting reset, reset all,
 * backup restore and "Take the tour". It never changes Sine's rows, handlers
 * or pref writes, never touches other mods' dialogs, and does nothing if
 * Sine's markup is not what it expects (the plain list keeps working).
 */

import { t } from "../strings.mjs";
import { getRawEntries, getSettings, getValue, isUserSet, clearUserValue } from "../core/schema.mjs";

const XHTML = "http://www.w3.org/1999/xhtml";
const SHEET = "chrome://sine/content/Artemis/styles/runtime/settings.css";
const collapsedSections = new Set(); // session memory, shared across reloads

export function attachEnhancer(window, core) {
  const doc = window.document;
  const wu = window.windowUtils;
  const sheetURI = Services.io.newURI(SHEET);
  let current = null;

  const entries = getRawEntries().filter(e => e.type);
  const entryById = new Map(entries.map(e => [e.id || (e.property || "").replaceAll(".", "-"), e]));
  const expectedIds = [...entryById.keys()].filter(Boolean);

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

  /** Finds Artemis's dialog content once every row has been rendered by Sine. */
  const findReady = () => {
    for (const content of doc.querySelectorAll("dialog.sineItemPreferenceDialog .sineItemPreferenceDialogContent")) {
      if (!content.querySelector('[id^="artemis-"]')) continue;
      const rendered = new Set([...content.children].map(c => c.id));
      return expectedIds.every(id => rendered.has(id)) ? content : null;
    }
    return null;
  };

  const masterLabel = name => entries.find(e => e.property === name)?.label ?? name;

  // Conditional rows (e.g. custom-value fields). Sine wires their visibility
  // before appending the row to the dialog, so its initial hide/check finds no
  // element and every conditional row starts visible (v1.0.0 bug). Artemis
  // applies the same evaluation as Sine (same "if"/"not", nested groups and
  // default operators) once the rows exist, and again on every pref change.
  const readPref = (name, sample) => {
    if (typeof sample === "boolean") return Services.prefs.getBoolPref(name, false);
    if (typeof sample === "number") return Services.prefs.getIntPref(name, 0);
    return Services.prefs.getStringPref(name, "");
  };
  const evaluate = (conditions, operator) => {
    const list = Array.isArray(conditions) ? conditions : [conditions];
    if (!list.length) return true;
    const results = list.map(cond => {
      if (cond.if || cond.not) {
        const c = cond.if || cond.not;
        const equal = readPref(c.property, c.value) === c.value;
        return cond.not ? !equal : equal;
      }
      if (cond.conditions) return evaluate(cond.conditions, cond.operator || "AND");
      return false;
    });
    return operator === "OR" ? results.some(Boolean) : results.every(Boolean);
  };
  const applyConditionalVisibility = row => {
    const entry = entryById.get(row.id);
    if (!entry?.conditions) return;
    row.style.display = evaluate(entry.conditions, entry.operator || "OR") ? "flex" : "none";
  };

  function enhance(content) {
    const added = [];      // nodes to remove on cleanup
    const moves = [];      // [node, originalParent, originalNextSibling] to undo
    const rows = [];       // { row, entry, labelBox, reset, note }
    const sections = [];   // { wrapper, body, separator, id }

    const move = (node, parent, before = null) => {
      moves.push([node, node.parentNode, node.nextSibling]);
      parent.insertBefore(node, before);
    };

    try {
      wu.loadSheet(sheetURI, wu.AUTHOR_SHEET);
    } catch {}

    content.classList.add("artemis-enhanced");

    // Toolbar: search.
    const search = el("input", { type: "search", class: "artemis-search", placeholder: t("settings.search.placeholder") });
    const empty = el("div", { class: "artemis-empty", text: t("settings.search.empty"), hidden: "true" });
    const toolbar = el("div", { class: "artemis-toolbar" }, [search]);
    content.prepend(toolbar);
    added.push(toolbar);

    // Migration notice (once per session, only if something could not be carried over).
    const unresolved = core.getState().migration?.unresolved ?? [];
    if (unresolved.length) {
      const notice = el("div", { class: "artemis-notice", text: t("settings.migrationNotice", { names: unresolved.map(u => u.name).join(", ") }) });
      toolbar.after(notice);
      added.push(notice);
    }

    // Sections and rows.
    const children = [...content.children].filter(c => entryById.has(c.id));
    let section = null;
    for (const node of children) {
      const entry = entryById.get(node.id);
      if (entry.type === "separator") {
        const header = el("button", { class: "artemis-section-header", type: "button", "aria-expanded": "true" }, [
          el("span", { class: "artemis-chevron" }),
          el("span", { text: entry.label }),
        ]);
        const body = el("div", { class: "artemis-section-body" });
        const wrapper = el("div", { class: "artemis-section" }, [header, body]);
        content.insertBefore(wrapper, node);
        added.push(wrapper);
        move(node, wrapper, header); // keep Sine's separator, hidden by CSS
        section = { wrapper, body, header, separator: node, id: node.id };
        sections.push(section);
        // Capture this section's id: `section` is reassigned on every loop
        // iteration, so referring to it at click time would always target the
        // last section (v1.0.0 bug).
        const sectionId = node.id;
        header.addEventListener("click", () => setCollapsed(sectionId, !collapsedSections.has(sectionId)));
        continue;
      }
      if (section) move(node, section.body);
      const label = node.querySelector(":scope > .sineItemPreferenceLabel");
      let labelBox = null;
      if (label) {
        labelBox = el("div", { class: "artemis-labelbox" });
        node.insertBefore(labelBox, label);
        added.push(labelBox);
        move(label, labelBox);
        if (entry.description) {
          const desc = el("div", { class: "artemis-desc", text: entry.description });
          labelBox.append(desc);
        }
        const note = el("div", { class: "artemis-inactive-note", hidden: "true" });
        labelBox.append(note);
      }
      const reset = el("button", { class: "artemis-reset", type: "button", title: t("settings.reset"), "aria-label": t("settings.reset"), hidden: "true" });
      reset.addEventListener("click", e => {
        e.stopPropagation();
        e.preventDefault();
        clearUserValue(entry.property);
      });
      node.insertBefore(reset, labelBox ? labelBox.nextSibling : node.firstChild);
      added.push(reset);
      rows.push({ row: node, entry, labelBox, reset, note: labelBox?.querySelector(".artemis-inactive-note") });
    }

    // Footer actions.
    const restoreSelect = el("select", { class: "artemis-select", disabled: "true" });
    const restoreBtn = el("button", { class: "artemis-button", type: "button", text: t("settings.restore"), disabled: "true" });
    const footer = el("div", { class: "artemis-footer" }, [
      el("button", { class: "artemis-button", type: "button", text: t("settings.tour"), onclick: () => core.requestTour() }),
      el("div", { class: "artemis-footer-spacer" }),
      restoreSelect,
      restoreBtn,
      el("button", { class: "artemis-button artemis-danger", type: "button", text: t("settings.resetAll"), onclick: onResetAll }),
    ]);
    content.append(empty, footer);
    added.push(empty, footer);

    async function loadBackups() {
      const list = await core.backups.list();
      restoreSelect.replaceChildren();
      if (!list.length) {
        restoreSelect.append(el("option", { text: t("settings.restore.none") }));
        restoreSelect.setAttribute("disabled", "true");
        restoreBtn.setAttribute("disabled", "true");
        return;
      }
      for (const b of list) {
        const when = b.createdAt ? new Date(b.createdAt).toLocaleString() : b.name;
        const reason = t(`backup.reason.${b.reason}`);
        restoreSelect.append(el("option", { value: b.path, text: `${when} · ${reason.startsWith("backup.") ? b.reason : reason}` }));
      }
      restoreSelect.removeAttribute("disabled");
      restoreBtn.removeAttribute("disabled");
    }
    restoreBtn.addEventListener("click", async () => {
      const path = restoreSelect.value;
      if (!path || !Services.prompt.confirm(window, t("settings.restore.confirmTitle"), t("settings.restore.confirmText"))) return;
      await core.backups.restore(path);
      await loadBackups();
    });
    async function onResetAll() {
      if (!Services.prompt.confirm(window, t("settings.resetAll.confirmTitle"), t("settings.resetAll.confirmText"))) return;
      await core.resetAllSettings();
      await loadBackups();
    }

    // Live state: reset buttons, inactive notes and Sine row widgets.
    const refreshRow = r => {
      const name = r.entry.property;
      r.reset.toggleAttribute("hidden", !isUserSet(name));
      const master = r.entry.master;
      const inactive = master && getValue(master) === false;
      r.row.classList.toggle("artemis-inactive", !!inactive);
      if (r.note) {
        r.note.toggleAttribute("hidden", !inactive);
        r.note.textContent = inactive ? t("settings.inactive", { area: masterLabel(master) }) : "";
      }
      // Keep Sine's widget in sync with changes made elsewhere (reset, restore, about:config).
      const value = getValue(name);
      if (r.entry.type === "checkbox") {
        const box = r.row.querySelector("checkbox");
        if (value) r.row.setAttribute("checked", "true");
        else r.row.removeAttribute("checked");
        if (box) box.checked = !!value;
      } else if (r.entry.type === "dropdown") {
        const list = r.row.querySelector("menulist");
        if (list && list.getAttribute("value") !== value) {
          list.setAttribute("value", value);
          const item = [...list.querySelectorAll("menuitem")].find(m => m.getAttribute("value") === value);
          if (item) list.setAttribute("label", item.getAttribute("label"));
        }
      } else if (r.entry.type === "string") {
        const input = r.row.querySelector("input");
        if (input && input.value !== value && doc.activeElement !== input) input.value = value ?? "";
      }
    };
    const refreshAll = () => {
      rows.forEach(refreshRow);
      rows.forEach(r => applyConditionalVisibility(r.row));
    };
    const observer = { observe: () => refreshAll() };
    Services.prefs.addObserver("artemis.", observer);
    refreshAll();

    // Collapsing.
    function setCollapsed(id, collapsed) {
      if (collapsed) collapsedSections.add(id);
      else collapsedSections.delete(id);
      const s = sections.find(x => x.id === id);
      s?.wrapper.classList.toggle("artemis-collapsed", collapsed);
      s?.header.setAttribute("aria-expanded", String(!collapsed));
    }
    sections.forEach(s => setCollapsed(s.id, collapsedSections.has(s.id)));

    // Search: matches label, description and pref name; opens matching sections.
    search.addEventListener("input", () => {
      const q = search.value.trim().toLowerCase();
      let any = false;
      for (const r of rows) {
        const hay = `${r.entry.label} ${r.entry.description ?? ""} ${r.entry.property}`.toLowerCase();
        const match = !q || hay.includes(q);
        r.row.classList.toggle("artemis-filtered", !match);
        any ||= match;
      }
      for (const s of sections) {
        const visible = [...s.body.children].some(c => !c.classList.contains("artemis-filtered"));
        s.wrapper.classList.toggle("artemis-filtered", !!q && !visible);
        if (q) s.wrapper.classList.toggle("artemis-collapsed", false);
        else s.wrapper.classList.toggle("artemis-collapsed", collapsedSections.has(s.id));
      }
      empty.toggleAttribute("hidden", any);
    });

    loadBackups();

    return function cleanup() {
      Services.prefs.removeObserver("artemis.", observer);
      for (const r of rows) r.row.classList.remove("artemis-inactive", "artemis-filtered");
      for (const [node, parent, next] of moves.reverse()) {
        try {
          parent.insertBefore(node, next && next.parentNode === parent ? next : null);
        } catch {}
      }
      added.forEach(n => n.remove());
      content.classList.remove("artemis-enhanced");
      try {
        wu.removeSheet(sheetURI, wu.AUTHOR_SHEET);
      } catch {}
    };
  }

  const tryEnhance = () => {
    if (current) return;
    const content = findReady();
    if (!content) return;
    try {
      current = { content, cleanup: enhance(content) };
    } catch (err) {
      console.error("[Artemis] Settings enhancement failed; Sine's plain list remains:", err);
      current = { content, cleanup: () => {} };
    }
  };

  const mo = new window.MutationObserver(() => tryEnhance());
  mo.observe(doc.documentElement, { childList: true, subtree: true });
  tryEnhance();

  return {
    get enhanced() { return !!current; },
    destroy() {
      mo.disconnect();
      try {
        current?.cleanup();
      } catch {}
      current = null;
    },
  };
}
