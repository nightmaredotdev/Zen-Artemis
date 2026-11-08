# Release checklist

Everything here must be resolved before `1.0.0` is merged to `main`. Items move to
"Resolved" with a date and reference, never silently.

## Release blockers

| # | Item | Status | Reference |
|---|---|---|---|
| B1 | **Horizontal tabs.** The owner requires horizontal-tab support. Zen's official FAQ says horizontal tabs "will not be supported in the near future". Zen 1.24.1b's settings offer only Single toolbar, Multiple toolbars and Collapsed. `zen.tabs.vertical` is read but never set by any Zen code, and setting it does not produce a working horizontal layout. | **Open: needs owner decision** (proposal in DECISIONS.md, 2026-11-08 M4 entry). Not simulated, not claimed | TESTING.md M3b and M4; ARCHITECTURE A13 |
| B2 | **Licence.** `LICENSE` (MIT) stays unadded until Vector Lab's terms are verified. The editor could not be identified online. | Open: needs the editor's URL from the owner | ARCHITECTURE 17.3 |
| B3 | **Motion settings for JS-driven Zen animations** (compact sidebar, tab open/close, folders, workspace switch). These cannot be three-state without patching Zen internals or writing Zen's prefs. | **Open: needs owner decision** (proposal in DECISIONS.md) | ARCHITECTURE 10, A11 |
| B4 | M5 runtime (settings enhancer, resets, backups, migration, tour) implemented and tested | Implemented and tested on `dev` (2026-11-08); re-run on the release commit | TESTING.md M5 |
| B5 | Full layout matrix, native restoration, feature independence and OS-setting checks pass on the release commit | Pending (passing on `dev` at M4) | TESTING.md |
| B6 | Fresh-install check (`prefs.js` has no `artemis.` lines) and without-JS check | Passing on `dev` (2026-11-08); re-run on the release commit | TESTING.md M1, M5 |
| B7 | README: tested Zen/Sine versions, platforms ("tested on Windows"), performance statement limited to measured hardware | Pending | — |
| B8 | `theme.json` version and `updatedAt`, CHANGELOG entry, `check.py --release` | Pending | ARCHITECTURE 15.1 |

## Known limitations to state in the release notes

- Popups use opaque Artemis surfaces: they are separate Windows windows, so glass cannot
  blur the page behind them. The owner accepted this on 2026-11-08.
- Performance measured only on the development machine (AMD Radeon RX 9060 XT, 144 Hz).
  Mid-range hardware is untested.
- Linux and macOS are untested.
