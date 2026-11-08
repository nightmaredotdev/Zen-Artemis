/**
 * Artemis background entry point.
 *
 * Imported once per session by Sine (early, during startup) and shared by
 * every Artemis window script. Seeds the default branch with Artemis's
 * curated defaults so that features render correctly on a fresh install
 * without writing anything to prefs.js.
 */

import { seedDefaults, log } from "./core/schema.mjs";

const state = {
  seededAt: null,
  result: null,
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

/** Diagnostic snapshot used by the verification spike. */
export function getState() {
  return { ...state };
}

ensureSeeded("background");
