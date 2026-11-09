// Navigation between Settings pages in one tab (Settings, Extensions and
// Themes, Keyboard Shortcuts, back again): every page must end up styled with
// Artemis's sheets present. Settings and Extensions are parent-process pages
// sharing one window, so a page's teardown must never remove the next page's
// sheets. Test profile only; uses its own tab.
const win = Services.wm.getMostRecentWindow("navigator:browser");
const gb = win.gBrowser;
const sleep = ms => new Promise(r => win.setTimeout(r, ms));
const route = ARGS.route ?? ["about:preferences", "about:addons", "about:preferences", "about:keyboard", "about:addons", "about:preferences"];
const tab = gb.addTrustedTab("about:blank");
gb.selectedTab = tab;
await sleep(500);
const failures = [];
const steps = [];
for (const url of route) {
  tab.linkedBrowser.loadURI(Services.io.newURI(url), { triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal() });
  await sleep(1800);
  const cw = tab.linkedBrowser.contentWindow; // null for about:keyboard (remote)
  if (!cw) { steps.push(`${url}: remote`); continue; }
  const doc = cw.document, root = doc.documentElement;
  const controls = InspectorUtils.getAllStyleSheets(doc, false, true).some(s => /settings-controls\.css$/.test(s.href ?? ""));
  const pageSheet = cw.getComputedStyle(root).backgroundImage !== "none" || cw.getComputedStyle(root).getPropertyValue("--s-card").trim() !== "";
  const marked = root.hasAttribute("artemis-settings-page");
  steps.push(`${url}: marked=${marked} pageSheet=${pageSheet} controls=${controls}`);
  if (!(marked && pageSheet && controls)) failures.push(`${url}: not fully styled after navigation (marked=${marked} pageSheet=${pageSheet} controls=${controls})`);
}
gb.removeTab(tab);
return { steps, failures };
