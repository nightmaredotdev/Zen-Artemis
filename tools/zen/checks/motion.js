// Verifies motion settings: computed transitions for hover targets, and the
// app menu's opacity/transform sampled shortly after opening, for each state
// and intensity. Restores defaults afterwards.
const win = Services.wm.getMostRecentWindow("navigator:browser");
const doc = win.document;
const sleep = ms => new Promise(r => win.setTimeout(r, ms));
const set = (n, v) => v === null ? Services.prefs.clearUserPref(n) : Services.prefs.setStringPref(n, v);
const tabBg = win.gBrowser.selectedTab.querySelector(".tab-background");
const hoverInfo = () => { const s = win.getComputedStyle(tabBg); return `${s.transitionProperty} | ${s.transitionDuration}`; };
const sampleMenu = async () => {
  const p = win.PanelUI.panel;
  win.PanelUI.show();
  await new Promise(r => win.requestAnimationFrame(() => win.requestAnimationFrame(r)));
  const s = win.getComputedStyle(p);
  const res = { opacityEarly: Number(s.opacity).toFixed(2), transformEarly: s.transform, duration: s.transitionDuration };
  await sleep(450); win.PanelUI.hide(); await sleep(400);
  return res;
};
const out = { hover: {}, popups: {} };
for (const v of ["artemis", "zen", "off"]) { set("artemis.motion.hover", v); await sleep(250); out.hover[v] = hoverInfo(); }
for (const v of ["artemis", "zen", "off"]) { set("artemis.motion.popups", v); await sleep(250); out.popups[v] = await sampleMenu(); }
set("artemis.motion.popups", null); set("artemis.motion.hover", null);
for (const i of ["gentle", "lively"]) { set("artemis.motion.intensity", i); await sleep(250); out.hover["artemis@" + i] = hoverInfo(); out.popups["artemis@" + i] = await sampleMenu(); }
set("artemis.motion.intensity", null);
Services.prefs.setIntPref("ui.prefersReducedMotion", 1); await sleep(300);
out.hover["artemis+reducedMotion"] = hoverInfo(); out.popups["artemis+reducedMotion"] = await sampleMenu();
Services.prefs.setIntPref("ui.prefersReducedMotion", 0);
out.panelAnimationsMQ = win.matchMedia("(-moz-panel-animations)").matches;
return out;
