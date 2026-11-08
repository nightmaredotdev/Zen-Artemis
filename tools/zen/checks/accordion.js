// Regression check (v1.0.0 bug): clicking a section header in Artemis's
// settings dialog must collapse/expand that section only. Clicks every header
// twice and records which sections changed state after each click.
const win = Services.wm.getMostRecentWindow("navigator:browser");
const gb = win.gBrowser;
const sleep = ms => new Promise(r => win.setTimeout(r, ms));
let tab = [...gb.tabs].find(t => t.linkedBrowser.currentURI?.spec.startsWith("about:preferences"));
if (!tab) { tab = gb.addTrustedTab("about:preferences#sineMods"); await sleep(2500); }
gb.selectedTab = tab; await sleep(500);
const doc = tab.linkedBrowser.contentWindow.document;
const content = [...doc.querySelectorAll(".sineItemPreferenceDialogContent")].find(c => c.classList.contains("artemis-enhanced"));
if (!content) return { error: "enhanced Artemis dialog not found" };
const sections = [...content.querySelectorAll(".artemis-section")];
const names = sections.map(s => s.querySelector(".artemis-section-header").textContent);
const state = () => sections.map(s => s.classList.contains("artemis-collapsed"));
// Start from all expanded.
for (const s of sections) if (s.classList.contains("artemis-collapsed")) s.querySelector(".artemis-section-header").click();
await sleep(100);
const failures = [];
for (let i = 0; i < sections.length; i++) {
  for (const expectCollapsed of [true, false]) {
    const before = state();
    sections[i].querySelector(".artemis-section-header").click();
    await sleep(50);
    const after = state();
    const changed = after.map((v, j) => v !== before[j] ? names[j] : null).filter(Boolean);
    const ok = changed.length === 1 && changed[0] === names[i] && after[i] === expectCollapsed
      && sections[i].querySelector(".artemis-section-header").getAttribute("aria-expanded") === String(!expectCollapsed);
    if (!ok) failures.push({ clicked: names[i], expectCollapsed, changed });
  }
}
return { sections: names.length, clicksTested: names.length * 2, failures };
