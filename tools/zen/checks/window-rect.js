// Focuses the test window and returns its content rect in screen pixels, plus
// the test browser's main process id (used by capture.sh to positively
// identify the foreground window) and its profile path.
const win = Services.wm.getMostRecentWindow("navigator:browser");
win.focus();
await new Promise(r => win.setTimeout(r, 700));
const s = win.devicePixelRatio;
return {
  x: Math.round(win.mozInnerScreenX * s),
  y: Math.round(win.mozInnerScreenY * s),
  w: Math.round(win.innerWidth * s),
  h: Math.round(win.innerHeight * s),
  pid: Services.appinfo.processID,
  profile: PathUtils.profileDir,
};
