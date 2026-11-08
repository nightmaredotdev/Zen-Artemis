// Measures chrome-window frame intervals while the compact sidebar is shown and
// hidden repeatedly. ARGS: { clip: "none" | "hover" | "always", cycles, scroll }
const win = Services.wm.getMostRecentWindow("navigator:browser");
const doc = win.document;
const tb = doc.getElementById("navigator-toolbox");
const sleep = ms => new Promise(r => win.setTimeout(r, ms));
const browsers = [...doc.querySelectorAll("#tabbrowser-tabpanels browser")];
const POLY = "polygon(0 0, 100% 0, 100% 100%, 0 100%)";
const setClip = on => browsers.forEach(b => (b.style.clipPath = on ? POLY : ""));
setClip(ARGS.clip === "always");
tb.removeAttribute("zen-has-hover");
await sleep(800);
const deltas = [];
let last = 0, running = true;
const tick = t => { if (last) deltas.push(t - last); last = t; if (running) win.requestAnimationFrame(tick); };
win.requestAnimationFrame(tick);
for (let i = 0; i < (ARGS.cycles ?? 8); i++) {
  if (ARGS.clip === "hover") setClip(true);
  tb.setAttribute("zen-has-hover", "true");
  await sleep(450);
  tb.removeAttribute("zen-has-hover");
  if (ARGS.clip === "hover") setClip(false);
  await sleep(450);
}
running = false;
setClip(false);
deltas.sort((a, b) => a - b);
const pct = p => deltas[Math.min(deltas.length - 1, Math.floor(p * deltas.length))].toFixed(1);
return { clip: ARGS.clip, frames: deltas.length, p50: pct(0.5), p95: pct(0.95), p99: pct(0.99), max: deltas.at(-1).toFixed(1), over25ms: deltas.filter(d => d > 25).length };
