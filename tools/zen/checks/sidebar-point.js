// Shows the compact floating sidebar and returns a screenshot coordinate that
// lies on pure sidebar background (inside the panel's padding, mid-height), so
// tools/zen/sidebar-tint.sh can compare its colour with Zen's own.
// ARGS: { scheme, prefs }
const win = Services.wm.getMostRecentWindow("navigator:browser");
const doc = win.document;
const sleep = ms => new Promise(r => win.setTimeout(r, ms));
for (const [n, v] of Object.entries(ARGS.prefs || {})) v === null ? Services.prefs.clearUserPref(n) : typeof v === "boolean" ? Services.prefs.setBoolPref(n, v) : Services.prefs.setStringPref(n, v);
if ("scheme" in ARGS) Services.prefs.setIntPref("zen.view.window.scheme", ARGS.scheme);
const cm = win.gZenCompactModeManager;
if (!cm.preference) { cm.preference = true; await sleep(1500); }
const tb = doc.getElementById("navigator-toolbox");
tb.setAttribute("zen-has-hover", "true");
await sleep(900);
const r = doc.getElementById("zen-toolbar-background").getBoundingClientRect();
const s = win.devicePixelRatio;
return { x: Math.round((r.right - 3) * s), y: Math.round((r.top + r.height * 0.55) * s) };
