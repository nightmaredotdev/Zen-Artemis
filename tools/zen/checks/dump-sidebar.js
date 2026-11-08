// Dumps the sidebar DOM skeleton (tag#id.class) to a limited depth.
const win = Services.wm.getMostRecentWindow("navigator:browser");
const out = [];
const SKIP = new Set(["menubar","menupopup","panel","script","toolbarpaletteitem","hbox#zen-tabs-wrapper-dummy"]);
const walk = (el, depth) => {
  if (SKIP.has(el.localName)) return;
  if (depth > 9 || out.length > 320) return;
  const cls = [...el.classList].slice(0, 4).join(".");
  const attrs = ["selected","pinned","zen-essential","collapsed","zen-glance-tab","visuallyselected","split-view"].filter(a => el.hasAttribute?.(a)).join(",");
  out.push("  ".repeat(depth) + el.localName + (el.id ? "#" + el.id : "") + (cls ? "." + cls : "") + (attrs ? " [" + attrs + "]" : ""));
  for (const c of el.children) if (!["image","label","stack"].includes(c.localName) || depth < 3) walk(c, depth + 1);
};
walk(win.document.getElementById("navigator-toolbox"), 0);
return out.join("\n");
