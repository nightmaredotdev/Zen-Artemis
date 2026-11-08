// Status: ran successfully 2026-11-08 (needs a free desktop: opens a window).
// Multiple windows: opens a second browser window and checks Artemis instances,
// live setting sync across windows, native restoration (computed styles) in the
// second window, and clean closing. ARGS.mastersOff: JSON object of master prefs.
const first = Services.wm.getMostRecentWindow("navigator:browser");
const sleep = ms => new Promise(r => first.setTimeout(r, ms));
const setPrefs = obj => { for (const [k, v] of Object.entries(obj)) { if (v === null) Services.prefs.clearUserPref(k); else if (typeof v === "boolean") Services.prefs.setBoolPref(k, v); else Services.prefs.setStringPref(k, v); } };

const second = first.OpenBrowserWindow();
await new Promise(r => second.addEventListener("load", r, { once: true }));
await sleep(3000);
const out = {};
out.instances = { first: !!first.Artemis, second: !!second.Artemis, secondModules: second.Artemis?.modules?.length };
out.tourCards = [first, second].map(w => w.document.querySelectorAll("#artemis-tour").length);

// Live sync: one pref change reaches both windows.
const radius = w => w.getComputedStyle(w.gBrowser.selectedTab.querySelector(".tab-background")).borderTopLeftRadius;
setPrefs({ "artemis.tabs.shape": "pill" }); await sleep(400);
out.sync = { first: radius(first), second: radius(second) };
setPrefs({ "artemis.tabs.shape": null }); await sleep(400);
out.syncReset = { first: radius(first), second: radius(second) };

// Native restoration in the second window, by computed style of key elements.
const probe = w => {
  const q = s => w.document.querySelector(s);
  const pick = (el, props) => el ? props.map(p => w.getComputedStyle(el).getPropertyValue(p)).join(" | ") : "missing";
  return {
    tab: pick(w.gBrowser.selectedTab.querySelector(".tab-background"), ["background-color", "border-radius", "box-shadow"]),
    page: pick(q("#tabbrowser-tabpanels > .browserSidebarContainer.deck-selected"), ["border-radius", "box-shadow"]),
    urlbar: pick(q("#urlbar > .urlbar-background"), ["background-color", "border-radius", "box-shadow"]),
    toolbarButton: pick(q("#zen-sidebar-top-buttons .toolbarbutton-1"), ["--toolbarbutton-border-radius"]),
    essentials: pick(q("#zen-essentials .tabbrowser-tab .tab-background"), ["background-color", "border-radius", "box-shadow"]),
    workspaces: pick(q("#zen-workspaces-button toolbarbutton"), ["opacity", "filter", "background-color"]),
    menuIcon: pick(q("#PanelUI-menu-button .toolbarbutton-icon"), ["list-style-image", "mask-image"]),
  };
};
setPrefs(ARGS.mastersOff || {}); await sleep(600);
const off = probe(second);
const wu = second.windowUtils;
const sheets = [[Services.io.newURI("chrome://sine/content/chrome.css"), wu.USER_SHEET], [Services.io.newURI("chrome://sine/content/Artemis/parts.css"), wu.AUTHOR_SHEET]];
for (const [u, t] of sheets) { try { wu.removeSheet(u, t); } catch {} }
await sleep(600);
const zen = probe(second);
for (const [u, t] of sheets) wu.loadSheet(u, t);
const masters = Object.fromEntries(Object.keys(ARGS.mastersOff || {}).map(k => [k, null]));
setPrefs(masters); await sleep(400);
out.secondWindowNative = { identical: JSON.stringify(off) === JSON.stringify(zen), differences: Object.keys(off).filter(k => off[k] !== zen[k]).map(k => ({ k, off: off[k], zen: zen[k] })) };
out.secondWindowArtemisOn = probe(second).tab !== zen.tab;

second.close();
await sleep(1000);
out.afterClose = { windows: [...Services.wm.getEnumerator("navigator:browser")].length, firstInstance: !!first.Artemis };
return out;
