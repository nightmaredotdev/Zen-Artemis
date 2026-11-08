// Opens (once) and selects a colourful test page so glass surfaces have
// something to blur. Local data: URL, no network.
const win = Services.wm.getMostRecentWindow("navigator:browser");
const gb = win.gBrowser;
const html = `<!doctype html><title>Artemis backdrop</title><style>
body{margin:0;height:100vh;font:700 28px system-ui;color:#fff;
background:linear-gradient(120deg,#ff5f6d,#ffc371 30%,#24c6dc 60%,#514a9d);}
p{margin:0;padding:18px 24px;line-height:1.6}
.s{position:fixed;inset:0;background:repeating-linear-gradient(90deg,rgb(0 0 0/.25) 0 4px,transparent 4px 28px)}
</style><div class=s></div>${"<p>The quick brown fox jumps over the lazy dog 0123456789</p>".repeat(14)}`;
let tab = [...gb.tabs].find(t => t.label === "Artemis backdrop");
if (!tab) {
  tab = gb.addTrustedTab("data:text/html;charset=utf-8," + encodeURIComponent(html));
  await new Promise(r => win.setTimeout(r, 1500));
}
gb.selectedTab = tab;
await new Promise(r => win.setTimeout(r, 500));
return { selected: gb.selectedTab.label };
