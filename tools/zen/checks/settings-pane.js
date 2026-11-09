// Shows one Settings-experience page and returns its page area in device
// pixels for cropping. ARGS: { target } where target is
//   "paneXxx"                    an about:preferences pane (via gotoPref)
//   "about:addons#<view>"        an about:addons view, e.g. addons://list/plugin
//   any other URL                opened as is (about:keyboard, websites, ...)
// Closes open dialogs, blurs focus and scrolls to the top. Reports what is
// actually shown, so callers can verify the switch to the page happened.
const win = Services.wm.getMostRecentWindow("navigator:browser");
const gb = win.gBrowser;
const sleep = ms => new Promise(r => win.setTimeout(r, ms));
const target = ARGS.target;
const isPane = target.startsWith("pane");
const [url, view] = isPane ? ["about:preferences", null] : target.split("#addons://").map((s, i) => (i ? "addons://" + s : s));
let tab = [...gb.tabs].find(t => t.linkedBrowser.currentURI?.spec.startsWith(url));
if (!tab) { tab = gb.addTrustedTab(url); await sleep(3000); }
gb.selectedTab = tab; await sleep(400);
const cw = tab.linkedBrowser.contentWindow; // null for remote pages (about:keyboard, websites)
let shown = tab.linkedBrowser.currentURI.spec;
if (cw) {
  const doc = cw.document;
  for (const d of doc.querySelectorAll("dialog[open]")) d.close();
  if (isPane) cw.gotoPref(target);
  if (view) cw.gViewController?.loadView(view);
  await sleep(1200);
  doc.activeElement?.blur?.();
  for (const el of [doc.scrollingElement, doc.documentElement, doc.querySelector(".main-content"), doc.getElementById("content")]) if (el) el.scrollTop = ARGS.scroll || 0;
  if (ARGS.search !== undefined) {
    const box = doc.getElementById("searchInput") ?? doc.querySelector("search-addons moz-input-search");
    if (box) { box.value = ARGS.search; box.dispatchEvent(new cw.Event("input", { bubbles: true })); box.dispatchEvent(new cw.Event("command", { bubbles: true })); await sleep(1200); }
  }
  shown = isPane ? doc.location.hash : view ? (cw.gViewController?.currentViewId ?? view) : doc.location.href;
} else {
  await sleep(800);
}
await sleep(500);
const r = tab.linkedBrowser.getBoundingClientRect(), k = win.devicePixelRatio;
return { target, shown, rect: [Math.ceil(r.left * k), Math.ceil(r.top * k), Math.floor(r.width * k) - 2, Math.floor(r.height * k) - 2] };
