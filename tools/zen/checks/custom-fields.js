// Regression check (v1.0.0 bug): custom-value fields must be visible only while
// their dropdown is set to Custom. Reloads Sine's settings page for a fresh
// render, then checks (1) the initial state, (2) switching each dropdown
// through the real menulist "command" path, (3) that entered custom values
// survive switching away and back, and (4) that settings stay independent.
// Restores every touched pref afterwards.
const win = Services.wm.getMostRecentWindow("navigator:browser");
const gb = win.gBrowser;
const sleep = ms => new Promise(r => win.setTimeout(r, ms));
const PAIRS = [
  ["artemis.appearance.accent", "artemis.appearance.accent-color", "#123456", "zen"],
  ["artemis.appearance.transparency", "artemis.appearance.transparency-custom", "33%", "medium"],
  ["artemis.appearance.blur", "artemis.appearance.blur-custom", "7px", "light"],
  ["artemis.appearance.radius", "artemis.appearance.radius-custom", "5px", "small"],
];
const touched = PAIRS.flat().filter(n => typeof n === "string" && n.startsWith("artemis."));
const saved = Object.fromEntries(touched.map(n => [n, Services.prefs.prefHasUserValue(n) ? Services.prefs.getStringPref(n) : null]));
const restore = () => { for (const [n, v] of Object.entries(saved)) v === null ? Services.prefs.clearUserPref(n) : Services.prefs.setStringPref(n, v); };

// Optional starting state, applied before the page renders (e.g. one dropdown on Custom).
for (const [n, v] of Object.entries(ARGS.start || {})) Services.prefs.setStringPref(n, v);

let tab = [...gb.tabs].find(t => t.linkedBrowser.currentURI?.spec.startsWith("about:preferences"));
if (tab) gb.removeTab(tab, { animate: false });
tab = gb.addTrustedTab("about:preferences#sineMods");
gb.selectedTab = tab;
await sleep(3500);
const doc = tab.linkedBrowser.contentWindow.document;
const cw = tab.linkedBrowser.contentWindow;
const row = id => doc.getElementById(id.replaceAll(".", "-"));
const visible = id => { const r = row(id); return !!r && cw.getComputedStyle(r).display !== "none"; };
const getStr = n => Services.prefs.getStringPref(n, "");
const choose = async (dropdown, value) => {
  const list = row(dropdown).querySelector("menulist");
  list.value = value;
  list.dispatchEvent(new cw.Event("command"));
  await sleep(250);
};
const failures = [];
const expect = (cond, msg) => { if (!cond) failures.push(msg); };

// (1) Initial state.
const initial = {};
for (const [dd, field] of PAIRS) {
  initial[field] = visible(field);
  expect(visible(field) === (getStr(dd) === "custom"), `initial: ${field} visible=${visible(field)} while ${dd}=${getStr(dd)}`);
}

// (2)-(4) Switching, persistence and independence.
for (const [dd, field, customValue, otherValue] of PAIRS) {
  const othersBefore = PAIRS.filter(p => p[0] !== dd).map(p => visible(p[1]));
  await choose(dd, "custom");
  expect(visible(field), `${dd}=custom should show ${field}`);
  const input = row(field).querySelector("input");
  input.value = customValue;
  input.dispatchEvent(new cw.Event("change"));
  await sleep(250);
  expect(getStr(field) === customValue, `${field} should store ${customValue}, got ${getStr(field)}`);
  await choose(dd, otherValue);
  expect(!visible(field), `${dd}=${otherValue} should hide ${field}`);
  expect(getStr(field) === customValue, `${field} lost its value after switching away (got ${getStr(field)})`);
  await choose(dd, "custom");
  expect(visible(field), `${dd}=custom (again) should show ${field}`);
  expect(input.value === customValue && getStr(field) === customValue, `${field} not restored after switching back (input ${input.value}, pref ${getStr(field)})`);
  await choose(dd, otherValue);
  const othersAfter = PAIRS.filter(p => p[0] !== dd).map(p => visible(p[1]));
  expect(JSON.stringify(othersBefore) === JSON.stringify(othersAfter), `switching ${dd} changed other custom fields`);
}

restore();
await sleep(200);
return { initial, failures };
