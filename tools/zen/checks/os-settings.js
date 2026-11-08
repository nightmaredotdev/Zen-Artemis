// Verifies Artemis's response to OS transparency/motion settings, emulated
// through Firefox's native ui.prefersReduced* prefs (0 = effects on,
// 1 = reduced, cleared = follow the real OS).
const win = Services.wm.getMostRecentWindow("navigator:browser");
const doc = win.document;
const sleep = ms => new Promise(r => win.setTimeout(r, ms));
// The glass panel being measured is the compact floating sidebar, so the check
// switches to compact mode itself and restores the previous mode afterwards.
const cm = win.gZenCompactModeManager;
const wasCompact = cm.preference;
if (!wasCompact) { cm.preference = true; await sleep(1500); }
doc.getElementById("navigator-toolbox").setAttribute("zen-has-hover", "true");
const bg = doc.getElementById("zen-toolbar-background");
const read = () => {
  const r = win.getComputedStyle(doc.documentElement), b = win.getComputedStyle(bg);
  return {
    mqTransparency: win.matchMedia("(prefers-reduced-transparency: reduce)").matches,
    mqMotion: win.matchMedia("(prefers-reduced-motion: reduce)").matches,
    glassOpacity: r.getPropertyValue("--artemis-glass-opacity").trim(),
    panelBg: b.backgroundColor, panelBlur: b.backdropFilter,
    browserClip: win.getComputedStyle(win.gBrowser.selectedBrowser).clipPath,
    durationFactor: r.getPropertyValue("--artemis-duration-factor").trim(),
    distanceFactor: r.getPropertyValue("--artemis-distance-factor").trim(),
  };
};
const out = {};
for (const [name, v] of [["effects-on", 0], ["effects-off", 1], ["follow-os", null]]) {
  for (const p of ["ui.prefersReducedTransparency", "ui.prefersReducedMotion"]) {
    if (v === null) Services.prefs.clearUserPref(p); else Services.prefs.setIntPref(p, v);
  }
  await sleep(700);
  out[name] = read();
}
// Leave the test profile in its designed state.
Services.prefs.setIntPref("ui.prefersReducedTransparency", 0);
Services.prefs.setIntPref("ui.prefersReducedMotion", 0);
if (!wasCompact) cm.preference = false;
return out;
