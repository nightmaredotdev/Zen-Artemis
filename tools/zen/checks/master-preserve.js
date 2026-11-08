// Sets non-default feature values, turns each area master off and on, and
// confirms the feature values are untouched. Cleans up afterwards.
const set = { "artemis.tabs.shape": "pill", "artemis.tabs.separators": true, "artemis.tabs.height": "tall", "artemis.window.edge-to-edge": "compact", "artemis.sidebar.hide-scrollbar": false };
const masters = ["artemis.tabs.style", "artemis.window.frame", "artemis.sidebar.style"];
const get = n => Services.prefs.getPrefType(n) === 128 ? Services.prefs.getBoolPref(n) : Services.prefs.getStringPref(n);
for (const [n, v] of Object.entries(set)) typeof v === "boolean" ? Services.prefs.setBoolPref(n, v) : Services.prefs.setStringPref(n, v);
for (const m of masters) Services.prefs.setBoolPref(m, false);
const whileOff = Object.fromEntries(Object.keys(set).map(n => [n, get(n)]));
for (const m of masters) Services.prefs.clearUserPref(m);
const afterOn = Object.fromEntries(Object.keys(set).map(n => [n, get(n)]));
const ok = Object.entries(set).every(([n, v]) => whileOff[n] === v && afterOn[n] === v);
for (const n of Object.keys(set)) Services.prefs.clearUserPref(n);
return { ok, whileOff, afterOn };
