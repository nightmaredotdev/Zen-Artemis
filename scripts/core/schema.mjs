/**
 * Artemis settings schema.
 *
 * Reads preferences.json (the single source of truth for user settings) and
 * provides validation and default seeding. Every part of Artemis that reads
 * or writes settings goes through this module.
 */

export const BASE_URL = "chrome://sine/content/Artemis/";
export const PREFIX = "artemis.";

/**
 * Internal prefs: Artemis state that is never shown in Sine's settings.
 * Not seeded, never exported, never touched by reset.
 */
export const INTERNAL_PREFS = Object.freeze({
  "artemis.internal.schema": "int",
  "artemis.internal.onboarding": "string",
  "artemis.internal.debug": "bool",
});

let cache = null;

/** Synchronously reads a chrome:// text file that maps to a local file. */
function readChromeText(url) {
  const registry = Cc["@mozilla.org/chrome/chrome-registry;1"].getService(Ci.nsIChromeRegistry);
  const fileURI = registry.convertChromeURL(Services.io.newURI(url));
  const file = fileURI.QueryInterface(Ci.nsIFileURL).file;
  const stream = Cc["@mozilla.org/network/file-input-stream;1"].createInstance(
    Ci.nsIFileInputStream
  );
  stream.init(file, 0x01, 0, 0);
  try {
    const { NetUtil } = ChromeUtils.importESModule("resource://gre/modules/NetUtil.sys.mjs");
    return NetUtil.readInputStreamToString(stream, stream.available(), { charset: "UTF-8" });
  } finally {
    stream.close();
  }
}

/**
 * Returns the parsed settings, keyed by pref name.
 * Each entry: { name, type, defaultValue, options?, pattern?, master? }.
 */
export function getSettings() {
  if (cache) return cache;
  const raw = JSON.parse(readChromeText(`${BASE_URL}preferences.json`));
  const settings = new Map();
  for (const entry of raw) {
    if (!entry.property || !entry.property.startsWith(PREFIX)) continue;
    if (!["checkbox", "dropdown", "string"].includes(entry.type)) continue;
    settings.set(entry.property, {
      name: entry.property,
      type: entry.type,
      defaultValue: entry.defaultValue,
      options: entry.options?.map((o) => o.value),
      pattern: entry.pattern ? new RegExp(entry.pattern) : null,
      master: entry.master ?? null,
    });
  }
  cache = settings;
  return settings;
}

/** True if `value` is acceptable for the declared setting `name`. */
export function isValid(name, value) {
  const setting = getSettings().get(name);
  if (!setting) return false;
  switch (setting.type) {
    case "checkbox":
      return typeof value === "boolean";
    case "dropdown":
      return typeof value === "string" && setting.options.includes(value);
    case "string":
      return (
        typeof value === "string" &&
        value.length > 0 &&
        value.length <= 80 &&
        !/[;{}<>\\]/.test(value) &&
        (!setting.pattern || setting.pattern.test(value))
      );
    default:
      return false;
  }
}

const TYPE_FOR = {
  checkbox: Ci.nsIPrefBranch.PREF_BOOL,
  dropdown: Ci.nsIPrefBranch.PREF_STRING,
  string: Ci.nsIPrefBranch.PREF_STRING,
};

/**
 * Writes every declared default to the default branch (memory only).
 * Never touches user values or non-Artemis prefs. Idempotent.
 * Returns { seeded, skipped }.
 */
export function seedDefaults() {
  const branch = Services.prefs.getDefaultBranch("");
  let seeded = 0;
  const skipped = [];
  for (const setting of getSettings().values()) {
    if (!setting.name.startsWith(PREFIX)) continue;
    if (!isValid(setting.name, setting.defaultValue)) {
      skipped.push(setting.name);
      continue;
    }
    const existing = Services.prefs.getPrefType(setting.name);
    if (existing !== Ci.nsIPrefBranch.PREF_INVALID && existing !== TYPE_FOR[setting.type]) {
      skipped.push(setting.name);
      continue;
    }
    try {
      if (setting.type === "checkbox") {
        branch.setBoolPref(setting.name, setting.defaultValue);
      } else {
        branch.setStringPref(setting.name, setting.defaultValue);
      }
      seeded++;
    } catch (err) {
      skipped.push(setting.name);
    }
  }
  return { seeded, skipped };
}

/** Reads a declared setting's current effective value (user, else default). */
export function getValue(name) {
  const setting = getSettings().get(name);
  if (!setting) return undefined;
  if (Services.prefs.getPrefType(name) === Ci.nsIPrefBranch.PREF_INVALID) return undefined;
  return setting.type === "checkbox"
    ? Services.prefs.getBoolPref(name)
    : Services.prefs.getStringPref(name);
}

export function debugEnabled() {
  return Services.prefs.getBoolPref("artemis.internal.debug", false);
}

export function log(...args) {
  if (debugEnabled()) console.log("[Artemis]", ...args);
}
