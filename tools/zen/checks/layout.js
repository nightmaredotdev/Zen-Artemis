// Sets the Zen layout and Artemis/test prefs given in ARGS, then reports state.
// ARGS: { compact, expanded, singleToolbar, rightSide, vertical, scheme,
//         reducedMotion, reducedTransparency, prefs: { "artemis.x": value|null } }
const win = Services.wm.getMostRecentWindow("navigator:browser");
const doc = win.document;
const sleep = ms => new Promise(r => win.setTimeout(r, ms));
const setPref = (n, v) => {
  if (v === null) { Services.prefs.clearUserPref(n); return; }
  if (typeof v === "boolean") Services.prefs.setBoolPref(n, v);
  else if (typeof v === "number") Services.prefs.setIntPref(n, v);
  else Services.prefs.setStringPref(n, v);
};
const a = ARGS;
if ("singleToolbar" in a) setPref("zen.view.use-single-toolbar", a.singleToolbar);
if ("rightSide" in a) setPref("zen.tabs.vertical.right-side", a.rightSide);
if ("vertical" in a) setPref("zen.tabs.vertical", a.vertical);
if ("scheme" in a) setPref("zen.view.window.scheme", a.scheme);
if ("reducedMotion" in a) setPref("ui.prefersReducedMotion", a.reducedMotion);
if ("reducedTransparency" in a) setPref("ui.prefersReducedTransparency", a.reducedTransparency);
for (const [n, v] of Object.entries(a.prefs || {})) setPref(n, v);
if ("expanded" in a) setPref("zen.view.sidebar-expanded", a.expanded);
if ("compact" in a) {
  const cm = win.gZenCompactModeManager;
  if (cm && cm.preference !== a.compact) cm.preference = a.compact;
}
if (a.selectLabel) {
  const t = [...win.gBrowser.tabs].find(t => t.label.startsWith(a.selectLabel));
  if (t) win.gBrowser.selectedTab = t;
}
await sleep(a.wait ?? 900);
if (a.hover) {
  // Show the floating compact sidebar as if hovered.
  doc.getElementById("navigator-toolbox").setAttribute("zen-has-hover", "true");
  doc.getElementById("navigator-toolbox").setAttribute("zen-user-show", "");
  await sleep(600);
}
const root = doc.documentElement;
return {
  attrs: ["zen-compact-mode", "zen-sidebar-expanded", "zen-single-toolbar", "zen-right-side"].map(x => `${x}=${root.getAttribute(x)}`).join(" "),
  vertical: Services.prefs.getBoolPref("zen.tabs.vertical"),
  tabs: win.gBrowser.tabs.length,
  selected: win.gBrowser.selectedTab.label,
  labels: ARGS.listTabs ? [...win.gBrowser.tabs].map(t => (t.hasAttribute('zen-essential') ? 'E:' : t.pinned ? 'P:' : '') + t.label) : undefined,
};
