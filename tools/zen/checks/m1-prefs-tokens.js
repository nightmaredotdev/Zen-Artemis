const win = Services.wm.getMostRecentWindow("navigator:browser");
const doc = win.document;
const manager = ChromeUtils.importESModule("chrome://userscripts/content/core/manager.sys.mjs").default;
const sleep = ms => new Promise(r => win.setTimeout(r, ms));
const v = n => win.getComputedStyle(doc.documentElement).getPropertyValue(n).trim();
const out = {};
Services.prefs.setIntPref("ui.prefersReducedMotion", 0);
Services.prefs.setIntPref("ui.prefersReducedTransparency", 0);
await sleep(300);
out.base = { opacity: v("--artemis-glass-opacity"), blur: v("--artemis-glass-blur"), dur: v("--artemis-duration-factor") };

// A1: default-branch change applies live
const def = Services.prefs.getDefaultBranch("");
def.setStringPref("artemis.appearance.radius", "large"); await sleep(300);
out.A1_large = v("--artemis-radius");
def.setStringPref("artemis.appearance.radius", "medium"); await sleep(300);
out.A1_back = v("--artemis-radius");

// A9: user-branch change applies live, clear returns to default
Services.prefs.setStringPref("artemis.appearance.radius", "small"); await sleep(300);
out.A9_small = v("--artemis-radius");
Services.prefs.clearUserPref("artemis.appearance.radius"); await sleep(300);
out.A9_cleared = v("--artemis-radius");

// A4: invalid custom values fall back (Sine variable path and live path)
Services.prefs.setStringPref("artemis.appearance.accent", "custom");
Services.prefs.setStringPref("artemis.appearance.accent-color", "#ff0000");
await manager.rebuildMods(false, false); await sleep(400);
out.A4_validSine = v("--artemis-accent");
Services.prefs.setStringPref("artemis.appearance.accent-color", "notacolor");
await manager.rebuildMods(false, false); await sleep(400);
out.A4_invalidSine = v("--artemis-accent");
doc.documentElement.style.setProperty("--artemis-live-accent-color", "#00ff00"); await sleep(200);
out.A4_validLive = v("--artemis-accent");
doc.documentElement.style.setProperty("--artemis-live-accent-color", "bogus"); await sleep(200);
out.A4_invalidLive = v("--artemis-accent");
doc.documentElement.style.removeProperty("--artemis-live-accent-color");
Services.prefs.setStringPref("artemis.appearance.radius", "custom");
Services.prefs.setStringPref("artemis.appearance.radius-custom", "potato");
await manager.rebuildMods(false, false); await sleep(400);
out.A4_radiusInvalid = v("--artemis-radius");
for (const n of ["artemis.appearance.accent","artemis.appearance.accent-color","artemis.appearance.radius","artemis.appearance.radius-custom"]) Services.prefs.clearUserPref(n);
await manager.rebuildMods(false, false); await sleep(300);
out.A4_restored = { accent: v("--artemis-accent"), radius: v("--artemis-radius") };

// A7: light-dark follows Zen scheme (0 = auto? 1/2) - resolve through a probe element
const probe = doc.createElementNS("http://www.w3.org/1999/xhtml", "div");
probe.style.cssText = "position:fixed;width:0;height:0;color:var(--artemis-surface-base)";
doc.documentElement.appendChild(probe);
out.A7 = {};
const orig = Services.prefs.getIntPref("zen.view.window.scheme");
for (const s of [0, 1, 2]) { Services.prefs.setIntPref("zen.view.window.scheme", s); await sleep(500); out.A7["scheme" + s] = win.getComputedStyle(probe).color + " cs=" + win.getComputedStyle(doc.documentElement).colorScheme; }
Services.prefs.setIntPref("zen.view.window.scheme", orig);
probe.remove();

// Prefs state after the spike
out.userValues = Services.prefs.getChildList("artemis.").filter(n => Services.prefs.prefHasUserValue(n));
return out;
