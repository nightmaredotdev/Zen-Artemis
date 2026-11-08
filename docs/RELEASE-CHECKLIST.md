# Release checklist

Everything here must be resolved before `1.0.0` is merged to `main`. Items move to
"Resolved" with a date and reference, never silently.

## Release blockers

| # | Item | Status | Reference |
|---|---|---|---|
| B1 | **Horizontal tabs.** The owner requires horizontal-tab support. Zen's official FAQ says horizontal tabs "will not be supported in the near future". Zen 1.24.1b's settings offer only Single toolbar, Multiple toolbars and Collapsed. `zen.tabs.vertical` is read but never set by any Zen code, and setting it does not produce a working horizontal layout. | **Resolved 2026-11-08 (owner):** the requirement is now every layout Zen offers (Single toolbar, Multiple toolbars, Collapsed × left/right × compact on/off). Horizontal tabs are not supported because Zen does not offer them. Revisit if Zen ships them | TESTING.md M3b, M4; ARCHITECTURE 9.5, A13; DECISIONS.md |
| B2 | **Licence.** Add MIT `LICENSE` once the logo's editor terms are checked. | **Resolved 2026-11-08**: SVG Vector Lab terms checked (<https://svgvectorlab.com/terms>); `LICENSE` added; `theme.json` `license: "MIT"` | ARCHITECTURE 17.2–17.3; CREDITS.md; DECISIONS.md |
| B3 | **Motion settings for JS-driven Zen animations** (compact sidebar, tab open/close, folders, workspace switch). These cannot be three-state without patching Zen internals or writing Zen's prefs. | **Resolved 2026-11-08 (owner):** the four settings are not in v1.0. Zen's own animations stay native. v1.0 motion is intensity, hover and popups | ARCHITECTURE 10, A11; DECISIONS.md |
| B4 | M5 runtime (settings enhancer, resets, backups, migration, tour) implemented and tested | **Done**: re-run on release candidate `917c38f` (2026-11-08) | TESTING.md "v1.0.0 release run" |
| B5 | Full layout matrix, native restoration, feature independence and OS-setting checks pass on the release commit | **Done**: all pass on release candidate `917c38f` (headless) and in the desktop session (part 2) | TESTING.md "v1.0.0 release run" |
| B6 | Fresh-install check (`prefs.js` has no `artemis.` lines) and without-JS check | **Done**: both pass on release candidate `917c38f` | TESTING.md "v1.0.0 release run" |
| B7 | README: tested Zen/Sine versions, platforms ("tested on Windows"), performance statement limited to measured hardware | Done on `dev` (2026-11-08) | README.md |
| B8 | `theme.json` version and `updatedAt`, CHANGELOG entry, `check.py --release` | **Done** in `917c38f` | ARCHITECTURE 15.1 |
| B9 | **Publication prerequisites.** (a) The repository is not publicly visible: the anonymous GitHub API returns "Not Found". A private repo cannot be installed from Sine, and contradicts the agreed public repository. (b) No API credential for `nightmaredotdev` is available to create the GitHub Release: Windows `gh` is logged in as `jlblarod`, which cannot see the repo. SSH pushes work as `nightmaredotdev`. | **Resolved 2026-11-08 (owner):** repository made public (verified anonymously), and GitHub CLI authenticated and active as `nightmaredotdev` (admin) | — |

## v1.0.1 (bug-fix release, 2026-11-08)

| # | Item | Status | Reference |
|---|---|---|---|
| P1 | Scope: only the five post-release fixes; no features, visual improvements or refactors | **Done**: `dev` since `v1.0.0` contains only `09fd83c`, `151aed3` and the release commit | DECISIONS.md |
| P2 | Each fix has a regression check that fails on 1.0.0 and passes now | **Done** | TESTING.md "Post-release fixes", "Custom-value field visibility" |
| P3 | Full matrix, native restoration, independence, OS settings, motion, runtime, multiple windows, Sine disable/enable, fresh install, without JS | **Done**: all pass | TESTING.md "v1.0.1 release run" |
| P4 | Existing preferences preserved (no schema change, restart, reset/restore) | **Done** | TESTING.md "v1.0.1 release run" |
| P5 | Real-capture visual review of the glass and a performance sample (owner's desktop free) | **Done**: pass; performance in line with 1.0.0 | TESTING.md "v1.0.1 release run" |
| P6 | `theme.json` version and `updatedAt`, `scripts/version.mjs`, CHANGELOG entry, `check.py --release` | **Done** in the release commit | CHANGELOG.md |

## Known limitations to state in the release notes

- Popups use opaque Artemis surfaces: they are separate Windows windows, so glass cannot
  blur the page behind them. The owner accepted this on 2026-11-08.
- Performance measured only on the development machine (AMD Radeon RX 9060 XT, 144 Hz).
  Mid-range hardware is untested.
- Linux and macOS are untested.
