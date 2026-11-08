const win = Services.wm.getMostRecentWindow("navigator:browser");
const doc = win.document;
doc.getElementById("artemis-glass-probe")?.remove();
for (const id of ["artemis-probe-a","artemis-probe-b","artemis-probe-c"]) doc.getElementById(id)?.remove();
const mk = (id, parent, top, extra = "") => {
  const el = doc.createElementNS("http://www.w3.org/1999/xhtml", "div");
  el.id = id; el.textContent = id;
  el.style.cssText = `position:fixed;z-index:1000;top:${top}px;left:4px;width:300px;height:44px;padding:6px;box-sizing:border-box;font:600 12px system-ui;color:white;background:rgb(30 30 36 / 0.35);backdrop-filter:blur(12px);border:1px solid rgb(255 255 255 / .2);pointer-events:none;${extra}`;
  parent.appendChild(el); return el;
};
mk("artemis-probe-a", doc.getElementById("navigator-toolbox"), 40);
mk("artemis-probe-b", doc.getElementById("browser"), 90);
mk("artemis-probe-c", doc.getElementById("navigator-toolbox"), 135, "isolation:isolate;transform:translateZ(0)");
win.focus();
await new Promise(r => win.setTimeout(r, 800));
return [...doc.querySelectorAll("[id^=artemis-probe-]")].map(e => e.id + " parent=" + e.parentNode.id + " bf=" + win.getComputedStyle(e).backdropFilter);
