// Status: written 2026-11-08, NOT YET RUN (needs a free desktop: opens a dialog).
// Drives the settings enhancer's confirmation prompts through the real UI.
// ARGS.action:
//   "click"  - clicks a footer button (ARGS.which: "resetAll" | "restore") asynchronously,
//              so the modal confirmation can open without blocking this script
//   "answer" - finds the open confirmation dialog, reports its text and presses
//              ARGS.answer: "accept" | "cancel"
const win = Services.wm.getMostRecentWindow("navigator:browser");
const sleep = ms => new Promise(r => win.setTimeout(r, ms));
const prefsTab = [...win.gBrowser.tabs].find(t => t.linkedBrowser.currentURI?.spec.startsWith("about:preferences"));
if (!prefsTab) return { error: "no about:preferences tab" };
const cw = prefsTab.linkedBrowser.contentWindow;

if (ARGS.action === "click") {
  const footer = cw.document.querySelector(".artemis-enhanced .artemis-footer");
  const buttons = footer ? [...footer.querySelectorAll("button")] : [];
  const label = ARGS.which === "restore" ? "Restore backup" : "Reset all";
  const button = buttons.find(b => b.textContent === label);
  if (!button) return { error: `button "${label}" not found`, buttons: buttons.map(b => b.textContent) };
  if (button.disabled) return { error: `button "${label}" is disabled` };
  cw.setTimeout(() => button.click(), 0);
  return { clicked: label };
}

if (ARGS.action === "answer") {
  // The prompt may be a separate window or a sub-dialog inside a browser window.
  const findDialog = () => {
    const tops = [...Services.wm.getEnumerator(null)];
    for (const top of tops) {
      const contexts = top.browsingContext?.getAllBrowsingContextsInSubtree?.() ?? [];
      for (const bc of contexts) {
        let doc;
        try { doc = bc.window?.document; } catch { continue; }
        if (doc?.documentURI?.includes("commonDialog")) return doc;
      }
    }
    return null;
  };
  let doc = null;
  for (let i = 0; i < 30 && !doc; i++) { doc = findDialog(); if (!doc) await sleep(200); }
  if (!doc) return { error: "no confirmation dialog found" };
  const dialog = doc.querySelector("dialog");
  const info = {
    title: doc.getElementById("infoTitle")?.textContent || doc.title,
    text: doc.getElementById("infoBody")?.textContent,
    location: doc.defaultView.browsingContext.top.embedderElement ? "sub-dialog" : "window",
  };
  const btn = dialog.getButton(ARGS.answer === "accept" ? "accept" : "cancel");
  btn.click();
  await sleep(800);
  info.closed = !findDialog();
  info.pressed = ARGS.answer;
  return info;
}

return { error: "unknown action" };
