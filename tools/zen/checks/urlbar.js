// Opens or closes the address bar with a query. ARGS: { open: bool, text, inspect: bool }
const win = Services.wm.getMostRecentWindow("navigator:browser");
const doc = win.document, ub = win.gURLBar;
const sleep = ms => new Promise(r => win.setTimeout(r, ms));
win.focus();
if (ARGS.open) { ub.search(ARGS.text ?? "mozilla"); await sleep(900); }
else { ub.view.close(); ub.blur(); win.gBrowser.selectedBrowser.focus(); await sleep(500); }
const out = { open: ub.view.isOpen, attrs: ["breakout-extend", "zen-floating-urlbar", "open"].filter(a => doc.getElementById("urlbar").hasAttribute(a)) };
if (ARGS.inspect) {
  const cs = (el, p) => el ? Object.fromEntries(p.map(k => [k, win.getComputedStyle(el).getPropertyValue(k)])) : null;
  const P = ["background-color", "border-radius", "box-shadow", "outline", "backdrop-filter", "border"];
  const bgEl = doc.getElementById("urlbar").querySelector(".urlbar-background");
  out.textbox = cs(doc.getElementById("urlbar"), ["position", "width", "height", "top", "left", "z-index"]);
  out.background = cs(bgEl, P);
  const row = doc.querySelector(".urlbarView-row[selected]") || doc.querySelector(".urlbarView-row");
  out.row = cs(row, ["background-color", "border-radius", "padding", "min-height"]);
  out.rowSelected = !!doc.querySelector(".urlbarView-row[selected]");
  const r = doc.getElementById("urlbar").getBoundingClientRect(); out.rect = [r.x, r.y, r.width, r.height].map(Math.round);
}
return out;
