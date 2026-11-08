/**
 * Artemis background entry point.
 *
 * Imported once per session by Sine (early, during startup) and shared by
 * every Artemis window script and the settings page. Seeds Artemis's curated
 * defaults on the default branch (nothing is written to prefs.js), runs
 * settings migrations, and coordinates the first-launch tour.
 */

import { seedDefaults, getInternal, setInternal, log } from "./core/schema.mjs";
import { migrate, stampOnFirstChange, CURRENT_SCHEMA } from "./core/migrations.mjs";
import * as storage from "./core/storage.mjs";

const TOUR_PREF = "artemis.internal.onboarding";
export const TOUR_TOPIC = "artemis:open-tour";

const state = {
  seededAt: null,
  result: null,
  migration: null,
  migrationPromise: null,
  tourClaimed: false,
  stampObserver: null,
};

/** Seeds defaults once per session; later calls are no-ops. */
export function ensureSeeded(source = "unknown") {
  if (state.seededAt !== null) return state.result;
  try {
    state.result = seedDefaults();
  } catch (err) {
    console.error("[Artemis] Seeding defaults failed:", err);
    state.result = { seeded: 0, skipped: [], error: String(err) };
  }
  state.seededAt = Date.now();
  log(`seeded ${state.result.seeded} defaults (via ${source})`, state.result.skipped);
  return state.result;
}

/** Runs migrations once per session. Resolves to { from, to, unresolved }. */
export function ensureMigrated() {
  if (!state.migrationPromise) {
    state.migrationPromise = migrate()
      .catch(err => {
        console.error("[Artemis] Migration failed:", err);
        return { from: 0, to: 0, unresolved: [{ name: "*", reason: String(err) }] };
      })
      .then(result => {
        state.migration = result;
        return result;
      });
    if (!state.stampObserver) state.stampObserver = stampOnFirstChange();
  }
  return state.migrationPromise;
}

/** Diagnostic snapshot used by tests. */
export function getState() {
  return { seededAt: state.seededAt, result: state.result, migration: state.migration, tourClaimed: state.tourClaimed };
}

// ---- First-launch tour ------------------------------------------------------

/** Returns "completed" | "skipped" | "" (never finished or skipped). */
export function tourState() {
  return getInternal(TOUR_PREF, "");
}

/** True for exactly one caller per session when the tour should auto-open. */
export function claimAutoTour() {
  if (state.tourClaimed || tourState() !== "") return false;
  state.tourClaimed = true;
  return true;
}

/** Records how the tour ended. Choices made inside the tour are already saved. */
export function finishTour(how) {
  setInternal(TOUR_PREF, how === "completed" ? "completed" : "skipped");
}

/** Asks the most recent browser window to open the tour (from the settings page). */
export function requestTour() {
  Services.obs.notifyObservers(null, TOUR_TOPIC);
}

// ---- Settings maintenance (used by the settings enhancer) -----------------

export const backups = {
  list: () => storage.listBackups(),
  restore: path => storage.restoreBackup(path, CURRENT_SCHEMA),
  create: reason => storage.createBackup(reason, CURRENT_SCHEMA),
};

export function resetAllSettings() {
  return storage.resetAll(CURRENT_SCHEMA);
}

ensureSeeded("background");
ensureMigrated();
