/**
 * Settings schema migrations.
 *
 * artemis.internal.schema records the schema the user's values match. It is
 * written only once the user has changed a setting, so fresh installs keep
 * prefs.js free of Artemis entries.
 *
 * To rename or restructure a released setting, add a step here and a fixture
 * in tools/fixtures/migrations/. Never reuse a released pref with a new meaning.
 */

import { getInternal, setInternal, getSettings, log } from "./schema.mjs";
import { createBackup } from "./storage.mjs";

export const CURRENT_SCHEMA = 1;
const SCHEMA_PREF = "artemis.internal.schema";

/**
 * Ordered steps. Each: { to: <schema>, run(ctx) } where ctx offers
 *   rename(oldName, newName)     move a user value to a new pref
 *   mapValue(name, { old: new }) translate dropdown values
 *   unresolved(name, reason)     report a value that cannot be migrated
 */
export const MIGRATIONS = [];

function hasAnyUserValue() {
  return [...getSettings().keys()].some(n => Services.prefs.prefHasUserValue(n));
}

/** Runs pending migrations. Returns { from, to, unresolved: [{name, reason}] }. */
export async function migrate() {
  const from = getInternal(SCHEMA_PREF, 0);
  const result = { from, to: from, unresolved: [] };
  if (from === 0) {
    // Values exist but were never stamped: they were made under the current schema.
    if (hasAnyUserValue()) setInternal(SCHEMA_PREF, CURRENT_SCHEMA);
    result.to = hasAnyUserValue() ? CURRENT_SCHEMA : 0;
    return result;
  }
  if (from >= CURRENT_SCHEMA) return result;

  await createBackup(`before-migration-${from}`, from);
  const ctx = makeContext(result.unresolved);
  for (const step of MIGRATIONS.filter(m => m.to > from && m.to <= CURRENT_SCHEMA).sort((a, b) => a.to - b.to)) {
    try {
      step.run(ctx);
    } catch (err) {
      console.error(`[Artemis] Migration to schema ${step.to} failed:`, err);
      ctx.unresolved("*", `migration ${step.to} failed`);
    }
  }
  setInternal(SCHEMA_PREF, CURRENT_SCHEMA);
  result.to = CURRENT_SCHEMA;
  log("migrated", result);
  return result;
}

/** Shared by migrate() and the fixture tests. Operates on real prefs. */
export function makeContext(unresolvedList) {
  const read = name => {
    const type = Services.prefs.getPrefType(name);
    if (!Services.prefs.prefHasUserValue(name)) return undefined;
    if (type === Ci.nsIPrefBranch.PREF_BOOL) return Services.prefs.getBoolPref(name);
    if (type === Ci.nsIPrefBranch.PREF_INT) return Services.prefs.getIntPref(name);
    return Services.prefs.getStringPref(name);
  };
  const write = (name, value) => {
    if (typeof value === "boolean") Services.prefs.setBoolPref(name, value);
    else Services.prefs.setStringPref(name, String(value));
  };
  return {
    rename(oldName, newName) {
      const value = read(oldName);
      if (value === undefined) return;
      write(newName, value);
      Services.prefs.clearUserPref(oldName);
    },
    mapValue(name, map) {
      const value = read(name);
      if (value === undefined) return;
      if (Object.hasOwn(map, value)) write(name, map[value]);
      else unresolvedList.push({ name, reason: `unknown value "${value}"` });
    },
    unresolved(name, reason) {
      unresolvedList.push({ name, reason });
    },
  };
}

/** Stamps the schema the first time the user changes any setting. */
export function stampOnFirstChange() {
  const observer = {
    observe(_subject, _topic, name) {
      if (!getSettings().has(name) || !Services.prefs.prefHasUserValue(name)) return;
      if (getInternal(SCHEMA_PREF, 0) === 0) setInternal(SCHEMA_PREF, CURRENT_SCHEMA);
    },
  };
  Services.prefs.addObserver("artemis.", observer);
  return observer;
}
