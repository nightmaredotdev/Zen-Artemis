// Overflows the tab list and reports the scrollbar width of the actual
// scroller, with artemis.sidebar.hide-scrollbar off and on. Removes the
// extra tabs afterwards.
const win = Services.wm.getMostRecentWindow("navigator:browser");
const gb = win.gBrowser;
const sleep = ms => new Promise(r => win.setTimeout(r, ms));
const extra = [];
for (let i = 0; i < 30; i++) extra.push(gb.addTrustedTab("about:blank", { skipAnimation: true }));
await sleep(1500);
const box = [...win.document.querySelectorAll(".workspace-arrowscrollbox")].find(b => b.hasAttribute("overflowing"));
const sb = box?.shadowRoot?.querySelector("scrollbox");
const measure = () => sb ? ({ overflowing: box.hasAttribute("overflowing"), scrollbarWidth: win.getComputedStyle(sb).scrollbarWidth, scrollbarPx: sb.getBoundingClientRect().width - sb.clientWidth - parseFloat(win.getComputedStyle(sb).paddingLeft) - parseFloat(win.getComputedStyle(sb).paddingRight) }) : "no overflowing scrollbox";
Services.prefs.setBoolPref("artemis.sidebar.hide-scrollbar", false); await sleep(500);
const off = measure();
Services.prefs.clearUserPref("artemis.sidebar.hide-scrollbar"); await sleep(500);
const on = measure();
for (const t of extra) gb.removeTab(t, { animate: false });
return { off, on };
