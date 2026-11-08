// Regression check for glass transparency. Reproduces the owner's v1.0.0 setup
// (transparency = custom 10%) and measures the computed glass of the compact
// floating sidebar and the open address bar under each OS transparency state.
// ARGS.os: list of states to test: "effects-on" | "effects-off" | "follow-os"
// ARGS.prefs: Artemis prefs to set first (null clears). Restores everything.
const win = Services.wm.getMostRecentWindow("navigator:browser");
const doc = win.document;
const sleep = ms => new Promise(r => win.setTimeout(r, ms));
const setPref = (n, v) => v === null ? Services.prefs.clearUserPref(n) : typeof v === "boolean" ? Services.prefs.setBoolPref(n, v) : typeof v === "number" ? Services.prefs.setIntPref(n, v) : Services.prefs.setStringPref(n, v);
const prefs = ARGS.prefs ?? { "artemis.appearance.transparency": "custom", "artemis.appearance.transparency-custom": "10%" };
for (const [n, v] of Object.entries(prefs)) setPref(n, v);
const cm = win.gZenCompactModeManager;
const wasCompact = cm.preference;
if (!wasCompact) { cm.preference = true; await sleep(1500); }
const tb = doc.getElementById("navigator-toolbox");
tb.setAttribute("zen-has-hover", "true");
const alpha = c => { const m = c.match(/\/\s*([\d.]+)\)$/) || c.match(/rgba\([^)]*,\s*([\d.]+)\)$/); return m ? Number(m[1]) : 1; };
const measure = async () => {
  const sbEl = doc.getElementById("zen-toolbar-background");
  const sb = win.getComputedStyle(sbEl);
  // The sidebar glass is tinted by Zen's workspace gradient layer (::after),
  // whose opacity carries the glass opacity; the element itself is transparent.
  const sbLayer = win.getComputedStyle(sbEl, "::after");
  win.gURLBar.search("artemis"); await sleep(700);
  const ub = win.getComputedStyle(doc.querySelector("#urlbar > .urlbar-background"));
  const res = {
    reducedTransparencyMQ: win.matchMedia("(prefers-reduced-transparency: reduce)").matches,
    tokenOpacity: win.getComputedStyle(doc.documentElement).getPropertyValue("--artemis-glass-opacity").trim(),
    sidebarAlpha: Number((alpha(sb.backgroundColor) === 0 ? Number(sbLayer.opacity) : alpha(sb.backgroundColor)).toFixed(3)),
    sidebarElementBg: sb.backgroundColor, sidebarBlur: sb.backdropFilter,
    urlbarAlpha: alpha(ub.backgroundColor), urlbarBlur: ub.backdropFilter,
    explicitGlass: doc.documentElement.hasAttribute("artemis-explicit-glass"),
  };
  win.gURLBar.view.close(); win.gURLBar.blur(); await sleep(300);
  return res;
};
const out = {};
for (const state of ARGS.os ?? ["effects-on", "effects-off", "follow-os"]) {
  const v = state === "effects-on" ? 0 : state === "effects-off" ? 1 : null;
  setPref("ui.prefersReducedTransparency", v); await sleep(500);
  out[state] = await measure();
}
setPref("ui.prefersReducedTransparency", 0);
tb.removeAttribute("zen-has-hover");
if (!wasCompact) cm.preference = false;
if (!ARGS.keep) for (const n of Object.keys(prefs)) Services.prefs.clearUserPref(n);
return out;
