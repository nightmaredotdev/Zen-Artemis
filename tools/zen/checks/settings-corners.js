// Card corners on the Settings page (about:preferences): every visible card
// must have rounded top corners on its first visible element and rounded
// bottom corners on its last, with nothing rounded in between.
// Covers Sine mod dialogs (flat rows, conditional rows, headings), Artemis's
// dialog (sections), Zen panes (heading + groupbox) and Firefox cards.
// ARGS: { dialogs: true } also opens every mod's settings dialog in turn.
const win = Services.wm.getMostRecentWindow("navigator:browser");
const sleep = ms => new Promise(r => win.setTimeout(r, ms));
const tab = [...win.gBrowser.tabs].find(t => t.linkedBrowser.currentURI?.spec.startsWith("about:preferences"));
const cw = tab.linkedBrowser.contentWindow, doc = cw.document;
const cs = el => cw.getComputedStyle(el);
const visible = el => cs(el).display !== "none" && el.getBoundingClientRect().height > 0;
const r = (el, corner) => parseFloat(cs(el)[corner]) || 0;
const top = el => r(el, "borderTopLeftRadius") > 0 && r(el, "borderTopRightRadius") > 0;
const bottom = el => r(el, "borderBottomLeftRadius") > 0 && r(el, "borderBottomRightRadius") > 0;
const problems = [];
let cards = 0;
const check = (label, items) => {
  if (!items.length) return;
  cards++;
  const first = items[0], last = items[items.length - 1];
  if (!top(first)) problems.push(`${label}: first element ${first.id || first.localName} not rounded on top`);
  if (!bottom(last)) problems.push(`${label}: last element ${last.id || last.localName} not rounded at the bottom`);
  for (const el of items.slice(1, -1)) if (top(el) || bottom(el)) problems.push(`${label}: middle element ${el.id || el.localName} rounded`);
};
// Sine mod dialogs (other mods): cards are runs of visible rows between separators / headings / buttons.
const sineCards = (content, label) => {
  let run = [];
  const flush = () => { check(label, run); run = []; };
  for (const el of content.children) {
    if (!visible(el)) continue;
    const sep = el.localName === "vbox" && el.querySelector(":scope > hr");
    const heading = el.localName === "hbox" && !el.id && el.children.length === 1 && el.firstElementChild.classList.contains("sineItemPreferenceLabel");
    const row = ["hbox", "vbox", "div"].includes(el.localName) && !heading;
    if (sep) flush();
    if (!row) { flush(); continue; }
    run.push(el);
  }
  flush();
};
const dialogs = [...doc.querySelectorAll("dialog.sineItemPreferenceDialog")];
const report = {};
for (const dlg of dialogs) {
  const content = dlg.querySelector(".sineItemPreferenceDialogContent");
  if (!content || !content.children.length) continue;
  const title = dlg.querySelector(".sineItemTitle, h3")?.textContent.trim() || "dialog";
  if (ARGS.dialogs && !dlg.open) { dlg.showModal(); await sleep(400); }
  const before = problems.length;
  if (content.classList.contains("artemis-enhanced")) {
    for (const s of content.querySelectorAll(".artemis-section:not(.artemis-filtered)")) check(`${title} section`, [s]);
  } else sineCards(content, title);
  report[title] = problems.length - before;
  if (ARGS.dialogs) { dlg.close(); await sleep(150); }
}
// Zen panes and Firefox cards on the currently shown pane.
for (const g of doc.querySelectorAll("groupbox")) {
  if (!visible(g)) continue;
  const prev = g.previousElementSibling;
  const joined = prev && prev.localName === "hbox" && prev.classList.contains("subcategory") && visible(prev);
  check(`groupbox ${g.id}`, joined ? [prev, g] : [g]);
}
for (const c of doc.querySelectorAll("moz-card")) if (visible(c)) check(`moz-card ${c.id || c.closest("setting-group")?.id || ""}`, [c]);
return { cards, problems, perDialog: report };
