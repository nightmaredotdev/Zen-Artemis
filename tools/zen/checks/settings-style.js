// Settings page styling (artemis.settings.style): live on/off, cleanup, other
// prefs untouched, see-through marking, forced colours, workspace mirroring,
// controls inside Firefox components (user sheet) and shared tokens.
// Test profile only; restores every pref it touches.
const win = Services.wm.getMostRecentWindow("navigator:browser");
const gb = win.gBrowser;
const sleep = ms => new Promise(r => win.setTimeout(r, ms));
const PREF = "artemis.settings.style";
let tab = [...gb.tabs].find(t => t.linkedBrowser.currentURI?.spec.startsWith("about:preferences"));
if (!tab) { tab = gb.addTrustedTab("about:preferences"); await sleep(3000); }
gb.selectedTab = tab; await sleep(400);
const cw = tab.linkedBrowser.contentWindow, doc = cw.document, root = doc.documentElement;
const failures = [];
const expect = (cond, msg) => { if (!cond) failures.push(msg); };

const userPrefs = () => Object.fromEntries(Services.prefs.getChildList("")
  .filter(n => n.startsWith("artemis.") && !n.startsWith("artemis.internal.") && n !== PREF && Services.prefs.prefHasUserValue(n))
  .map(n => [n, Services.prefs.getPrefType(n) === 128 ? Services.prefs.getBoolPref(n) : Services.prefs.getPrefType(n) === 64 ? Services.prefs.getIntPref(n) : Services.prefs.getStringPref(n)]));
// A checkbox inside a Firefox component (shadow tree): restyled only while on.
const shadowCheckbox = () => {
  for (const host of doc.querySelectorAll("moz-checkbox")) {
    const input = host.shadowRoot?.querySelector("input[type=checkbox]");
    if (input) return input;
  }
  return null;
};
const nav = doc.querySelector("moz-page-nav");
const state = () => ({
  checkbox: (() => { const i = shadowCheckbox(); return i ? cw.getComputedStyle(i).appearance : "none found"; })(),
  focusColor: cw.getComputedStyle(root).getPropertyValue("--focus-outline-color").trim().slice(0, 30),
  navSelected: nav ? cw.getComputedStyle(nav).getPropertyValue("--page-nav-button-background-color-selected").trim().slice(0, 30) : "no nav",
  attr: root.hasAttribute("artemis-settings-page"),
  vars: [...root.style].filter(p => p.startsWith("--artemis-s-")).length,
  rootBg: cw.getComputedStyle(root).backgroundColor,
  card: cw.getComputedStyle(doc.querySelector("moz-card") ?? root).getPropertyValue("--card-background-color").trim().slice(0, 40),
});

const before = userPrefs();
const on = state();
expect(on.attr && on.vars >= 6, `on: expected attribute and mirrored vars, got ${JSON.stringify(on)}`);
expect(on.checkbox === "none", `on: component checkbox not restyled (${on.checkbox})`);
expect(on.focusColor.startsWith("color-mix(in srgb, color-mix("), `on: focus token not Artemis's (${on.focusColor})`);
expect(on.navSelected.startsWith("color-mix(in srgb, color-mix("), `on: navigation selection not Artemis's (${on.navSelected})`);

Services.prefs.setBoolPref(PREF, false); await sleep(400);
const off = state();
expect(!off.attr && off.vars === 0, `off: page still marked or vars left: ${JSON.stringify(off)}`);
expect(off.rootBg !== on.rootBg || off.card !== on.card, "off: computed styling did not change");
expect(!root.hasAttribute("artemis-see-through"), "off: see-through attribute left");
expect(off.checkbox === "auto", `off: component checkbox still restyled (${off.checkbox})`);
expect(off.focusColor !== on.focusColor && off.navSelected !== on.navSelected, `off: tokens left (${off.focusColor} / ${off.navSelected})`);
expect(JSON.stringify(userPrefs()) === JSON.stringify(before), "toggling changed other Artemis prefs");

Services.prefs.clearUserPref(PREF); await sleep(400);
const back = state();
expect(back.attr && back.vars === on.vars && back.rootBg === on.rootBg && back.checkbox === "none", `re-enabled: not restored: ${JSON.stringify(back)}`);

// See-through: marked only while Zen's transparent-browser pref is on.
const tbHad = Services.prefs.prefHasUserValue("browser.tabs.allow_transparent_browser");
const tbVal = Services.prefs.getBoolPref("browser.tabs.allow_transparent_browser", false);
Services.prefs.setBoolPref("browser.tabs.allow_transparent_browser", true); await sleep(200);
const seeOn = root.hasAttribute("artemis-see-through");
const seeBg = cw.getComputedStyle(root).backgroundColor;
Services.prefs.setBoolPref("browser.tabs.allow_transparent_browser", false); await sleep(200);
const seeOff = root.hasAttribute("artemis-see-through");
tbHad ? Services.prefs.setBoolPref("browser.tabs.allow_transparent_browser", tbVal) : Services.prefs.clearUserPref("browser.tabs.allow_transparent_browser");
expect(seeOn && seeBg === "rgba(0, 0, 0, 0)" && !seeOff, `see-through: on=${seeOn} bg=${seeBg} off=${seeOff}`);

// Forced colours (Windows high contrast is emulated by forcing document colours).
Services.prefs.setIntPref("browser.display.document_color_use", 2); await sleep(600);
const forced = { mq: cw.matchMedia("(forced-colors: active)").matches, card: cw.getComputedStyle(doc.querySelector("moz-card") ?? root).getPropertyValue("--card-background-color").trim().slice(0, 40), checkbox: state().checkbox };
Services.prefs.clearUserPref("browser.display.document_color_use"); await sleep(400);
expect(!forced.mq || (!forced.card.includes("color-mix") && forced.checkbox === "auto"), `forced colours: Artemis styling still applied (${JSON.stringify(forced)})`);

// Live mirroring: a glass setting change reaches the page.
Services.prefs.setStringPref("artemis.appearance.radius", "large"); await sleep(400);
const radius = root.style.getPropertyValue("--artemis-s-radius");
Services.prefs.clearUserPref("artemis.appearance.radius"); await sleep(400);
expect(radius === "14px", `mirroring: radius large gave ${radius}`);

return { on, off, back, forced, radius, failures };
