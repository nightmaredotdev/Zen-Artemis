const win = Services.wm.getMostRecentWindow("navigator:browser");
for (const e of [...win.document.querySelectorAll("[id^=artemis-probe-], #artemis-glass-probe")]) e.remove();
for (const n of Services.prefs.getChildList("artemis.")) if (Services.prefs.prefHasUserValue(n)) Services.prefs.clearUserPref(n);
return Services.prefs.getChildList("artemis.").filter(n => Services.prefs.prefHasUserValue(n));
