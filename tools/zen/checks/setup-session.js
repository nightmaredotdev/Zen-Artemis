// Populates the test window with a realistic tab layout: essentials, pinned
// tabs, a folder and several normal tabs. Idempotent-ish: skips if marked.
const win = Services.wm.getMostRecentWindow("navigator:browser");
const gb = win.gBrowser;
const sleep = ms => new Promise(r => win.setTimeout(r, ms));
if (win.document.documentElement.hasAttribute("artemis-test-session") || gb.tabs.length >= 8) return { skipped: true, tabs: gb.tabs.length };
const urls = ["about:robots", "about:mozilla", "about:license", "about:logo", "about:credits", "about:buildconfig", "about:rights", "about:support", "about:about"];
const tabs = urls.map(u => gb.addTrustedTab(u, { skipAnimation: true }));
await sleep(1500);
try { win.gZenPinnedTabManager.addToEssentials(tabs[0]); win.gZenPinnedTabManager.addToEssentials(tabs[1]); } catch (e) { console.warn(e); }
try { gb.pinTab(tabs[2]); gb.pinTab(tabs[3]); } catch (e) { console.warn(e); }
await sleep(500);
let folder = null;
try { folder = win.gZenFolders.createFolder([tabs[4], tabs[5]], { label: "Reading" }); } catch (e) { console.warn(e); }
await sleep(500);
gb.selectedTab = tabs[6];
win.document.documentElement.setAttribute("artemis-test-session", "true");
return { tabs: gb.tabs.length, folder: !!folder, selected: gb.selectedTab.label };
