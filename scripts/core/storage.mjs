/**
 * Artemis data storage: automatic backups (v1.0); profiles arrive in v1.1.
 *
 * The only Artemis module allowed to write files, and only inside
 * <profile>/artemis/. Snapshots are sparse: user-set values only.
 */

import { getSettings, isValid, userSnapshot, clearAllUserValues, setUserValue, log } from "./schema.mjs";

export const FORMAT = "artemis-settings";
export const MAX_BACKUPS = 10;

const dataDir = () => PathUtils.join(PathUtils.profileDir, "artemis");
const backupDir = () => PathUtils.join(dataDir(), "backups");

function artemisVersion() {
  try {
    return ChromeUtils.importESModule("chrome://sine/content/Artemis/scripts/version.mjs").VERSION;
  } catch {
    return "unknown";
  }
}

/** Builds a snapshot of the current user-set values. */
export function makeSnapshot(schema) {
  return {
    format: FORMAT,
    schema,
    artemisVersion: artemisVersion(),
    createdAt: new Date().toISOString(),
    settings: userSnapshot(),
  };
}

/** Writes a backup of the current settings. Returns its path. Keeps the newest MAX_BACKUPS. */
export async function createBackup(reason, schema) {
  const safeReason = String(reason).replace(/[^a-z0-9-]/gi, "").slice(0, 32) || "manual";
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  await IOUtils.makeDirectory(backupDir(), { ignoreExisting: true, createAncestors: true });
  const path = PathUtils.join(backupDir(), `${stamp}-${safeReason}.json`);
  await IOUtils.writeJSON(path, { ...makeSnapshot(schema), reason: safeReason });
  await pruneBackups();
  log("backup written", path);
  return path;
}

/** Lists backups, newest first: [{ path, name, reason, createdAt, count }]. */
export async function listBackups() {
  let children = [];
  try {
    children = await IOUtils.getChildren(backupDir());
  } catch {
    return [];
  }
  const out = [];
  for (const path of children.filter(p => p.endsWith(".json"))) {
    try {
      const data = await IOUtils.readJSON(path);
      if (data.format !== FORMAT) continue;
      out.push({
        path,
        name: PathUtils.filename(path),
        reason: data.reason ?? "",
        createdAt: data.createdAt ?? "",
        count: Object.keys(data.settings ?? {}).length,
      });
    } catch {
      /* unreadable backups are skipped */
    }
  }
  return out.sort((a, b) => b.name.localeCompare(a.name));
}

async function pruneBackups() {
  const all = await listBackups();
  for (const old of all.slice(MAX_BACKUPS)) {
    try {
      await IOUtils.remove(old.path);
    } catch {
      /* ignore */
    }
  }
}

/**
 * Validates a snapshot's settings. Returns { valid: {name: value}, rejected: [name] }.
 * Unknown, internal or invalid entries are rejected, never applied.
 */
export function validateSettings(settings) {
  const valid = {};
  const rejected = [];
  for (const [name, value] of Object.entries(settings ?? {})) {
    if (getSettings().has(name) && isValid(name, value)) valid[name] = value;
    else rejected.push(name);
  }
  return { valid, rejected };
}

/** Replaces all user-set values with the snapshot's valid values, in one operation. */
export function applySettings(settings) {
  const { valid, rejected } = validateSettings(settings);
  clearAllUserValues();
  for (const [name, value] of Object.entries(valid)) setUserValue(name, value);
  return { applied: Object.keys(valid).length, rejected };
}

/** Restores a backup file (taking a backup of the current state first). */
export async function restoreBackup(path, schema) {
  const data = await IOUtils.readJSON(path);
  if (data.format !== FORMAT) throw new Error("Not an Artemis backup");
  await createBackup("before-restore", schema);
  return applySettings(data.settings);
}

/** Resets every Artemis setting to its default after taking a backup. */
export async function resetAll(schema) {
  const path = await createBackup("before-reset-all", schema);
  clearAllUserValues();
  return path;
}
