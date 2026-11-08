// Opens or closes test popups. ARGS: { open: "menu" | "appmenu" | "findbar" | null }
const win = Services.wm.getMostRecentWindow("navigator:browser");
const doc = win.document;
const sleep = ms => new Promise(r => win.setTimeout(r, ms));
const menu = doc.getElementById("toolbar-context-menu");
if (menu.state === "open") menu.hidePopup();
if (win.PanelUI.panel.state === "open") win.PanelUI.hide();
const fb = win.gBrowser.isFindBarInitialized() ? win.gBrowser.getCachedFindBar() : null;
if (fb && !fb.hidden && ARGS.open !== "findbar") fb.close(true);
await sleep(300);
const x = Math.round(win.mozInnerScreenX + 260), y = Math.round(win.mozInnerScreenY + 120);
if (ARGS.open === "menu") menu.openPopupAtScreen(x, y, true);
if (ARGS.open === "appmenu") win.PanelUI.show();
if (ARGS.open === "findbar") { const f = await win.gBrowser.getFindBar(); f.open(); f._findField.value = "license"; }
await sleep(700);
return { menu: menu.state, appmenu: win.PanelUI.panel.state };
