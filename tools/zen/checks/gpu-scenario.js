// Prepares a steady-state GPU scenario: an animated page under the compact
// sidebar. ARGS: { clip: bool, hover: bool }
const win = Services.wm.getMostRecentWindow("navigator:browser");
const gb = win.gBrowser, doc = win.document;
const html = `<!doctype html><title>Artemis motion page</title><style>
body{margin:0;height:100vh;overflow:hidden;background:linear-gradient(120deg,#ff5f6d,#24c6dc,#514a9d)}
i{position:absolute;width:260px;height:260px;border-radius:50%;background:#fff8;animation:m 3s linear infinite}
@keyframes m{from{transform:translate(0,0)}50%{transform:translate(70vw,50vh)}to{transform:translate(0,0)}}
</style>${"<i></i>".repeat(6)}`;
let tab = [...gb.tabs].find(t => t.label === "Artemis motion page");
if (!tab) { tab = gb.addTrustedTab("data:text/html;charset=utf-8," + encodeURIComponent(html)); await new Promise(r => win.setTimeout(r, 1500)); }
gb.selectedTab = tab;
const POLY = "polygon(0 0, 100% 0, 100% 100%, 0 100%)";
for (const b of doc.querySelectorAll("#tabbrowser-tabpanels browser")) b.style.clipPath = ARGS.clip ? POLY : "";
const tb = doc.getElementById("navigator-toolbox");
if (ARGS.hover) tb.setAttribute("zen-has-hover", "true"); else tb.removeAttribute("zen-has-hover");
await new Promise(r => win.setTimeout(r, 1500));
return { clip: !!ARGS.clip, hover: !!ARGS.hover };
