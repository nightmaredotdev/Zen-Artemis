// Opens Sine's mod page in about:preferences, opens Artemis's settings dialog
// and reports the enhancer state. ARGS: { search, close, master }
const win = Services.wm.getMostRecentWindow("navigator:browser");
const gb = win.gBrowser;
const sleep = ms => new Promise(r => win.setTimeout(r, ms));
let tab = [...gb.tabs].find(t => t.linkedBrowser.currentURI?.spec.startsWith("about:preferences"));
if (!tab) { tab = gb.addTrustedTab("about:preferences#sineMods"); await sleep(2500); }
gb.selectedTab = tab; await sleep(600);
const cw = tab.linkedBrowser.contentWindow;
const doc = cw.document;
if (!doc.location.hash.includes("sine")) { cw.gotoPref?.("paneSineMods"); await sleep(1500); }
const content = [...doc.querySelectorAll("dialog.sineItemPreferenceDialog .sineItemPreferenceDialogContent")].find(c => c.querySelector('[id^="artemis-"]'));
const dialog = content?.closest("dialog");
if (ARGS.close) { dialog?.close(); return { closed: true }; }
if (dialog && !dialog.open) dialog.showModal();
await sleep(500);
if (ARGS.master) { for (const [k, v] of Object.entries(ARGS.master)) v === null ? Services.prefs.clearUserPref(k) : Services.prefs.setBoolPref(k, v); await sleep(300); }
const search = content?.querySelector(".artemis-search");
if (search && "search" in ARGS) { search.value = ARGS.search; search.dispatchEvent(new cw.Event("input")); await sleep(200); }
const visibleRows = content ? [...content.querySelectorAll(".artemis-section-body > [id^='artemis-']")].filter(r => !r.classList.contains("artemis-filtered")).map(r => r.id) : [];
return {
  scriptLoaded: !!cw.ArtemisSettings,
  enhanced: cw.ArtemisSettings?.enhanced ?? false,
  sections: content ? [...content.querySelectorAll(".artemis-section-header")].map(h => h.textContent) : [],
  descriptions: content?.querySelectorAll(".artemis-desc").length ?? 0,
  resetVisible: content ? [...content.querySelectorAll(".artemis-reset:not([hidden])")].map(b => b.parentElement.id) : [],
  inactive: content ? [...content.querySelectorAll(".artemis-inactive")].map(r => r.id) : [],
  inactiveNote: content?.querySelector(".artemis-inactive .artemis-inactive-note")?.textContent,
  visibleRows: "search" in ARGS ? visibleRows : visibleRows.length,
  backups: content ? [...content.querySelectorAll(".artemis-select option")].map(o => o.textContent) : [],
  otherModsTouched: [...doc.querySelectorAll(".sineItemPreferenceDialogContent.artemis-enhanced")].length,
};
