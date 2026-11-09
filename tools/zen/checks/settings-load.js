// Loading transition of a Settings page: samples the composited window (an
// 8x8 patch near the page's right edge, mid-height) every frame while the page
// opens, and reports each colour change with what the page was doing then.
// Use a themed workspace so Zen's colour and Artemis's background differ.
// ARGS: { url, from?, mode? } — mode "current" loads url in a tab already
// showing `from` (navigation between Settings pages); default opens a new tab.
// Each change: "ms:r:g:b:page/readyState/styled:marked" (marked: the tab's
// browser shows the window background until the page paints). Test profile only.
const win = Services.wm.getMostRecentWindow("navigator:browser");
const gb = win.gBrowser;
const sleep = ms => new Promise(r => win.setTimeout(r, ms));
let tab;
if (ARGS.from) { tab = gb.addTrustedTab(ARGS.from); gb.selectedTab = tab; await sleep(2500); }
const t0 = win.performance.now();
if (ARGS.mode === "current" && tab) {
  tab.linkedBrowser.loadURI(Services.io.newURI(ARGS.url), { triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal() });
} else {
  if (tab) gb.removeTab(tab);
  tab = gb.addTrustedTab(ARGS.url); gb.selectedTab = tab;
}
const wg = win.browsingContext.currentWindowGlobal;
const sample = async () => {
  const r = tab.linkedBrowser.getBoundingClientRect();
  const bmp = await wg.drawSnapshot(new win.DOMRect(r.right - 30, r.top + r.height / 2, 8, 8), 1, "magenta");
  const c = new win.OffscreenCanvas(bmp.width, bmp.height);
  const ctx = c.getContext("2d"); ctx.drawImage(bmp, 0, 0);
  const d = ctx.getImageData(0, 0, bmp.width, bmp.height).data;
  const sum = [0, 0, 0];
  for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) sum[k] += d[i + k];
  return sum.map(v => Math.round(v / (d.length / 4)));
};
const changes = [];
let last = "", frames = 0;
while (win.performance.now() - t0 < (ARGS.ms ?? 1500)) {
  const t = Math.round(win.performance.now() - t0);
  let entry;
  try {
    const doc = tab.linkedBrowser.contentWindow?.document; // null for remote pages
    const page = doc ? `${(doc.location?.href ?? "-").slice(6, 14)}/${doc.readyState}/${!doc.documentElement ? "no-root" : doc.documentElement.hasAttribute("artemis-settings-page") ? "styled" : "-"}` : "remote";
    const marked = tab.linkedBrowser.hasAttribute("artemis-settings-browser") ? "marked" : "unmarked";
    entry = [...(await sample()), page, marked].join(":");
  } catch (e) {
    entry = "unavailable";
  }
  frames++;
  if (entry !== last) { changes.push(`${t}:${entry}`); last = entry; }
  await new Promise(r => win.requestAnimationFrame(r));
}
gb.removeTab(tab);
return { url: ARGS.url, from: ARGS.from ?? null, frames, changes };
