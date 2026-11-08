// Exercises per-setting reset (by clicking the row's reset button), reset all
// and restore (through the same core functions the footer buttons call).
const win = Services.wm.getMostRecentWindow("navigator:browser");
const sleep = ms => new Promise(r => win.setTimeout(r, ms));
const core = ChromeUtils.importESModule("chrome://sine/content/Artemis/scripts/artemis.sys.mjs");
const users = () => Services.prefs.getChildList("artemis.").filter(n => Services.prefs.prefHasUserValue(n) && !n.startsWith("artemis.internal.")).sort();
const tab = [...win.gBrowser.tabs].find(t => t.linkedBrowser.currentURI?.spec.startsWith("about:preferences"));
const doc = tab.linkedBrowser.contentWindow.document;
const out = { before: users() };
// 1. Reset one setting by clicking its button.
doc.querySelector("#artemis-tabs-shape .artemis-reset")?.click(); await sleep(300);
out.afterRowReset = users();
out.rowWidgetLabel = doc.querySelector("#artemis-tabs-shape menulist")?.getAttribute("label");
// 2. Reset all (backup first).
const backupPath = await core.resetAllSettings(); await sleep(300);
out.afterResetAll = users();
out.backupWritten = await IOUtils.exists(backupPath);
const list = await core.backups.list();
out.backups = list.map(b => `${b.reason} (${b.count})`);
// 3. Restore the backup taken before the reset.
const target = list.find(b => b.reason === "before-reset-all");
const res = await core.backups.restore(target.path); await sleep(300);
out.restoreResult = res;
out.afterRestore = users();
out.backupsAfterRestore = (await core.backups.list()).map(b => b.reason);
out.internalUntouched = { schema: Services.prefs.getIntPref("artemis.internal.schema", 0), onboarding: Services.prefs.getStringPref("artemis.internal.onboarding", "") };
return out;
