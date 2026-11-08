// Test-profile only: ensures 3 workspaces exist and a tab plays a quiet
// generated tone (so Zen shows its media controls). Allows autoplay in the
// test profile. ARGS: { media: bool, spaces: bool }
const win = Services.wm.getMostRecentWindow("navigator:browser");
const gb = win.gBrowser, ws = win.gZenWorkspaces;
const sleep = ms => new Promise(r => win.setTimeout(r, ms));
const out = {};
if (ARGS.spaces !== false) {
  const have = ws.getWorkspaces ? (await ws.getWorkspaces()) : ws._workspaceCache?.workspaces || [];
  const list = Array.isArray(have) ? have : have.workspaces || [];
  const names = ["Work", "Reading"];
  for (const n of names) if (!list.some(w => w.name === n)) await ws.createAndSaveWorkspace(n, undefined, true);
  await sleep(800);
  out.spaces = (await ws.getWorkspaces?.())?.map?.(w => w.name) ?? "unknown";
}
if (ARGS.media !== false) {
  Services.prefs.setIntPref("media.autoplay.default", 0);
  const html = `<!doctype html><title>Artemis media test 10s</title><body style="background:#222;color:#ddd;font:20px system-ui">
<p>Quiet test tone</p><audio id=a loop autoplay></audio><script>
const r=22050,n=r*10,b=new ArrayBuffer(44+n*2),v=new DataView(b);
const w=(o,s)=>{for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i))};
w(0,"RIFF");v.setUint32(4,36+n*2,true);w(8,"WAVEfmt ");v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);
v.setUint32(24,r,true);v.setUint32(28,r*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);w(36,"data");v.setUint32(40,n*2,true);
for(let i=0;i<n;i++)v.setInt16(44+i*2,Math.sin(i*2*Math.PI*440/r)*300,true);
const a=document.getElementById("a");a.src=URL.createObjectURL(new Blob([b],{type:"audio/wav"}));a.volume=0.05;a.play();
<\/script>`;
  let tab = [...gb.tabs].find(t => t.label === "Artemis media test 10s");
  if (!tab) { tab = gb.addTrustedTab("data:text/html;charset=utf-8," + encodeURIComponent(html)); await sleep(2500); }
  if (tab.muted) tab.toggleMuteAudio(); // media control activates only for audible playback
  gb.selectedTab = tab;
  tab.linkedBrowser.reload();
  await sleep(1500);
  const back = [...gb.tabs].find(t => t.label === "Licenses");
  if (back) gb.selectedTab = back;
  await sleep(1500);
  if (!tab.muted) tab.toggleMuteAudio(); // silent on the host, card still shows
  await sleep(800);
  out.soundplaying = tab.hasAttribute("soundplaying");
  const mc = win.document.getElementById("zen-media-controls-toolbar");
  out.mediaControlsVisible = mc && !mc.hidden && mc.getBoundingClientRect().height > 0;
}
return out;
