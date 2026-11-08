const win = Services.wm.getMostRecentWindow("navigator:browser");
const sleep = ms => new Promise(r => win.setTimeout(r, ms));
const out = {};
const results = {};
for (const url of ["about:robots", "data:text/html,<p>hi</p>", "about:preferences"]) {
const tab = win.gBrowser.addTrustedTab(url); win.gBrowser.selectedTab = tab;
await sleep(2000);
const read = async () => {
  const actorless = await new Promise(resolve => {
    const mm = tab.linkedBrowser.messageManager;
    const id = "artemis-probe-" + Math.random();
    mm.addMessageListener(id, function l(msg) { mm.removeMessageListener(id, l); resolve(msg.data); });
    mm.loadFrameScript("data:,(" + encodeURIComponent(`function(){ const cs = content.getComputedStyle(content.document.documentElement); sendAsyncMessage("${id}", { radius: cs.getPropertyValue("--artemis-radius"), dur: cs.getPropertyValue("--artemis-duration-factor"), url: content.location.href }); }`) + ")()", false);
  });
  return actorless;
};
out.initial = await read();
Services.prefs.setStringPref("artemis.appearance.radius", "large"); await sleep(600);
out.afterUserPref = await read();
Services.prefs.clearUserPref("artemis.appearance.radius"); await sleep(600);
out.afterClear = await read();
win.gBrowser.removeTab(tab);
results[url] = JSON.parse(JSON.stringify(out));
}
results.sheet = (await IOUtils.readUTF8(PathUtils.join(PathUtils.profileDir, "chrome", "sine-mods", "content.css"))).slice(0, 400);
return results;
