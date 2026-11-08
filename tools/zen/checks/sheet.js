// Removes or restores all Artemis styling in the test window (Sine's combined
// user sheet and Artemis's author-origin parts.css), so a screenshot can show
// pure Zen. ARGS: { remove: bool }
const win = Services.wm.getMostRecentWindow("navigator:browser");
const wu = win.windowUtils;
const sheets = [
  [Services.io.newURI("chrome://sine/content/chrome.css"), wu.USER_SHEET],
  [Services.io.newURI("chrome://sine/content/Artemis/parts.css"), wu.AUTHOR_SHEET],
];
for (const [uri, type] of sheets) {
  try { wu.removeSheet(uri, type); } catch (e) {}
  if (!ARGS.remove) wu.loadSheet(uri, type);
}
await new Promise(r => win.setTimeout(r, 700));
return { removed: !!ARGS.remove };
