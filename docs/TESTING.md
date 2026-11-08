# Testing

How Artemis is tested and what each test run found. The strategy is in
[ARCHITECTURE §16](ARCHITECTURE.md#16-testing-and-validation).

## Static checks

```sh
python3 tools/check.py            # every change
python3 tools/check.py --release  # also checks CHANGELOG matches theme.json
```

## Isolated test profile

All browser testing happens in a separate Zen profile. Tests never touch the owner's real
profile, its preferences, its Sine configuration or other installed mods.

### What was created (2026-11-08)

Everything is under `C:\Users\PlayrZ\ZenArtemisTest\`. Nothing else on the system was
created or changed.

| Path | What it is |
|---|---|
| `ZenArtemisTest\` | Profile folder. Zen filled it with its usual profile files on first launch |
| `ZenArtemisTest\user.js` | Test prefs (listed below) |
| `ZenArtemisTest\chrome\JS\`, `chrome\utils\` | A **copy** of Sine 2.3.4.1c taken from the real profile (read only, never modified there) |
| `ZenArtemisTest\chrome\sine-mods\mods.json` | Contains only an `Artemis` entry, with `no-updates: true` |
| `ZenArtemisTest\chrome\sine-mods\Artemis` | **Directory junction** to the repository, so edits are live. Deleting the junction does not delete the repository |

Sine generates its own files in `chrome\sine-mods\` (combined `chrome.css`/`content.css`).

`user.js` sets:

- `sine.allow-unsafe-js=true`: Artemis is not installed from the store.
- `sine.auto-updates=false`, `sine.engine.auto-update=false`: nothing is downloaded over
  the junction.
- `sine.enable-dev=true`: Sine's dev command palette.
- `zen.welcome-screen.seen=true`, `browser.aboutwelcome.enabled=false`,
  `browser.shell.checkDefaultBrowser=false`, `app.update.*=false`,
  `datareporting.policy.dataSubmissionEnabled=false`: no first-run screens, update or
  telemetry prompts.
- `marionette.port=2829`: avoids the default port.
- `devtools.chrome.enabled=true`: Browser Console access.
- `ui.prefersReducedMotion=0`, `ui.prefersReducedTransparency=0`: the host Windows has
  *Transparency effects* and *Animation effects* turned off. These prefs make the test
  profile show Artemis as designed. The reduced variants are tested separately.

To remove everything: close the test browser and delete `C:\Users\PlayrZ\ZenArtemisTest\`.
The repository is unaffected, because the junction only points to it.

### Launching

From WSL:

```sh
MOZ_REMOTE_ALLOW_SYSTEM_ACCESS=1 WSLENV=MOZ_REMOTE_ALLOW_SYSTEM_ACCESS \
  "/mnt/c/Program Files/Zen Browser/zen.exe" -no-remote \
  -profile 'C:\Users\PlayrZ\ZenArtemisTest' -marionette
```

- `-no-remote` keeps it separate from any running Zen.
- `-marionette` and `MOZ_REMOTE_ALLOW_SYSTEM_ACCESS=1` are needed only for scripted runs,
  and Marionette listens on localhost only. For manual testing, leave both out.

### Tooling overview

| Tool | Purpose |
|---|---|
| `tools/zen/launch.sh` | Start the test browser (test profile only) |
| `tools/zen/zrun.sh <check.js> [shot.png] [args-json]` | Run a chrome-context check script |
| `tools/zen/capture.sh <out.png>` | Real screen capture of the test window (includes backdrop blur) |
| `tools/zen/matrix.sh <dir>` | Layout matrix with native-restoration diffs |
| `tools/zen/features.sh <dir>` | Feature independence, master override and value preservation |
| `tools/zen/gpu-sample.sh [s]` | Average 3D GPU utilisation of the zen.exe processes |
| `tools/zen/png.py` | Crop, side-by-side and pixel diff of screenshots |
| `checks/setup-session.js` | Realistic tabs: essentials, pinned, folder, normal tabs |
| `checks/layout.js` | Set Zen layout / scheme / OS-effect emulation / prefs |
| `checks/os-settings.js` | Artemis response to OS transparency and motion settings |
| `checks/scrollbar.js`, `checks/frame-timing.js`, `checks/gpu-scenario.js` | Targeted measurements |

### Scripted checks (Marionette)

`tools/zen/` contains a minimal Marionette client that uses Node.js built-ins only. It runs
with the Windows Node.js, so it can reach the test browser on Windows localhost.

```sh
NODE="/mnt/c/Program Files/nodejs/node.exe"
"$NODE" "$(wslpath -w tools/zen/run.mjs)" "$(wslpath -w tools/zen/checks/m1-prefs-tokens.js)"
"$NODE" "$(wslpath -w tools/zen/run.mjs)" "$(wslpath -w tools/zen/checks/reset-test-profile.js)"
"$NODE" "$(wslpath -w tools/zen/quit.mjs)"
```

Marionette screenshots do **not** include `backdrop-filter` blur. Glass is checked with a
real screen capture of the test window instead (PowerShell `CopyFromScreen`, cropped to the
window), saved only to a scratch directory.

## Test matrix

See ARCHITECTURE §16.3. Results are logged per milestone below.

## Results

### M1 verification spike: 2026-11-08

Environment: Zen 1.24.1b, Sine 2.3.4.1c, Windows, AMD Radeon RX 9060 XT, WebRender. The
test profile's defaults were single toolbar, sidebar expanded, compact off, dark.

| # | Assumption | Result | Evidence |
|---|---|---|---|
| A1 | Default-branch change re-evaluates `-moz-pref()` live | **Pass** | `--artemis-radius` 10px → 14px → 10px without reload |
| A2 | Seeding finishes before first paint | **Pass** | Seeded 10 defaults at +272 ms after process start; first paint at +766 ms. Reading `preferences.json` synchronously at import makes the fallback table unnecessary |
| A3 | `-moz-pref()` in content user sheets | **Pass for browser pages** | Live in `about:preferences` (parent) and `about:robots` (content process). The content sheet did not apply to a `data:` page, so website behaviour is untested. `content.css` stays empty until v1.2, when rules are explicitly scoped to browser pages |
| A4 | Invalid custom values fall back | **Pass** | Through Sine's variable: `#ff0000` applied and `notacolor` → `#7c8aff`. Through a live variable: `#00ff00` applied and `bogus` → `#7c8aff`. Radius `potato` → `10px` |
| A5 | `backdrop-filter` works on chrome surfaces | **Pass, with a caveat** | Blurs correctly for elements inside `#navigator-toolbox` and `#browser` (confirmed by screen capture). An element appended directly to the root element was translucent but **not blurred**. Glass surfaces must live inside the normal window tree |
| A6 | `addUnloadListener` keyed correctly | **Pass** | `triggerUnloadListener("chrome://sine/content/Artemis/artemis.uc.js")` ran Artemis's teardown. Two full `rebuildMods()` runs each left exactly one new instance. `supportsUnload: true` added |
| A7 | `light-dark()` follows Zen's scheme | **Pass** | `zen.view.window.scheme` 0/2 → dark surface, 1 → light surface, with matching root `color-scheme` |
| A8 | Script runs in `about:preferences` | Deferred to M5 | Needed only by the settings enhancer |
| A9 | User-branch changes re-evaluate live | **Pass** | Radius `small` applied live; `clearUserPref` returned to the seeded default |
| A10 | Marionette usable for scripted runs | **Pass** | Requires `MOZ_REMOTE_ALLOW_SYSTEM_ACCESS=1` for chrome context |
| A11 | Native Zen animations per motion setting | Deferred to M4 | |
| A12 | Glass performance | Deferred to M2 | Needs real surfaces to measure |

Other observations:

- **Fresh install:** the test profile's `prefs.js` contains **no** `artemis.` lines after
  startup, the spike and shutdown. All Artemis prefs show as defaults.
- **Sine leaks one adopted stylesheet per settings edit.** `rebuildMods` pushes a new
  sheet without removing the old one. Later sheets win, so values stay correct. This is
  Sine's behaviour and is harmless for Artemis.
- `window.manager` is not set on browser windows loaded at startup. Sine's manager is
  reached through `chrome://userscripts/content/core/manager.sys.mjs` instead, in test
  scripts only. Artemis itself does not depend on it.
- **Host accessibility settings:** Windows *Transparency effects* and *Animation effects*
  are off on the development machine. Zen and Artemis honour them by default (`prefers-
  reduced-transparency` and `prefers-reduced-motion`), so glass is opaque and motion is
  reduced there unless the system setting, or Firefox's native `ui.prefersReduced*` prefs,
  say otherwise.

### M2 sidebar, tabs, window: 2026-11-08

Environment: as for M1. A realistic session (2 essentials, folder with tabs, pinned and
normal tabs, a colourful test page and an animated test page) is set up by
`checks/setup-session.js`.

| Check | Result |
|---|---|
| Native restoration (all area switches off vs. Artemis sheets removed), 8 layouts: compact/full × collapsed/expanded, light, right side, single toolbar | **0 differing pixels** in every layout. (A ninth "horizontal tabs" cell was later found to be invalid: Zen never actually switched to horizontal tabs. See M3b.) |
| Artemis vs. pure Zen (sanity: the test can fail) | 1.6–6.8% of pixels differ, as intended |
| Single-feature changes stay in their own region | Pass: tab features change only the sidebar; edge-to-edge changes the page frame |
| Master off: toggling each feature changes nothing | **0 pixels** for all 7 features |
| Feature values preserved across master off/on | Pass |
| Live updates | All checks above ran without reload or restart |
| Hide scrollbar (overflowing list, 30 extra tabs) | 12 px scrollbar → 0 px, live. Needed `parts.css` (F33) |
| Glass over the page (real screen capture) | Blurred and tinted. Page text is not readable through the panel (84% panel opacity) |
| OS effects on / off / follow the real OS (emulated with `ui.prefersReduced*`) | On: glass 72%/84%, blur 18 px, backdrop clip active. Off and follow-OS (host has both off): opaque, no backdrop filter, no clip, motion distance 0 |
| Frame timing while showing/hiding the compact sidebar, 3 clip strategies | 144 Hz, p99 6.9 ms, no frames over 25 ms in any strategy |
| GPU 3D utilisation, animated page, sidebar shown/hidden × clip on/off | 3.7–4.3%, clip adds at most +0.6 points |

Known screenshot noise: `about:robots`' animated favicon in the essentials occasionally
changes about 10 pixels near the top of the sidebar. Re-runs are clean.

Not yet covered: the OS settings were emulated through Firefox's native prefs, not by
toggling Windows itself (that would change the host system). Performance was measured on a
high-end GPU only.

### M3a address bar and toolbar: 2026-11-08

| Check | Result |
|---|---|
| Native restoration, 8 valid layouts (now including address bar and toolbar areas) | **0 differing pixels** in every layout |
| Native restoration with the address bar **open**, multiple and single toolbar | **0 differing pixels** |
| Open bar: glass panel over page text (real capture, dark and light) | Page text fully blurred; light mode picks up the workspace tint |
| `urlbar.dim-page` | Page pixel (28,27,34) → (20,19,25) in dark mode (−28%). Changes only the page area. Master off: 0 pixels |
| `toolbar.logo-menu-button` | Changes only the 14×14 icon area, in single- and multi-toolbar layouts. Master off: 0 pixels (apart from the known favicon noise) |
| Other features and master overrides | Unchanged from M2: pass |

Findings fixed during M3a:
- The menu button icon sits inside a badge stack, so the logo selector targets any
  descendant icon, and the icon needs an explicit size once its image is removed.
- Focusing the window closes the address bar popup. `capture.sh` now runs a setup step
  after focusing.

### M3b popups, find bar, workspaces, media: 2026-11-08

Additional test setup (`checks/setup-media-spaces.js`): three workspaces, and a tab playing
a generated 10 s tone that is muted after playback starts. Firefox only offers media
controls for media of 3 s or longer, and only for audible playback, so the tab is unmuted
briefly at start.

| Check | Result |
|---|---|
| Native restoration, 8 layouts (all 9 areas, media card visible) | **0 differing pixels** (apart from the known favicon noise) |
| Native restoration with a menu, the app menu and the find bar open (real captures for popups) | **0 differing pixels** for all three |
| `workspaces.switcher` | Zen / Minimal / Dots render distinctly. `zen` is part of the all-native check |
| `popups.findbar` | Floating glass card. The page height is unchanged when it opens (no reflow); the backdrop clip is only active while it is open. Master off: 0 pixels |
| Find bar width | `auto` and `max-content` collapse to 16 px (flexible children), so it uses an explicit `min(880px, 100% − 24px)` that fits every option |
| `media.controls` | Artemis tile replaces Zen's black card |
| Popup appearance | Differences from Zen are subtle on Windows, because menus get native window rounding. Popups use an opaque raised surface: glass cannot blur the page behind a separate OS window |

**Horizontal tabs: untested.** With `zen.tabs.vertical=false` (saved, after a full
restart), `#tabbrowser-tabs` reports `orient="horizontal"`, but Zen 1.24.1b still draws the
vertical sidebar in the test profile. Horizontal mode probably needs additional steps that
Zen's settings UI performs. Until that is understood, horizontal-tab compatibility is **not
verified**, and the matrix no longer contains a horizontal cell.

Also noted: Marionette force-quit skips the pref save, so `tools/zen/quit.mjs` now calls
`savePrefFile` first.

### M4 motion (partial): 2026-11-08

| Check | Result |
|---|---|
| `motion.hover` | Artemis: 120 ms fades of background, shadow, opacity and filter on tabs, folder rows, buttons, results and workspace icons. Zen: native (`all 0s` on tabs; Zen's own 0.1 s/0.2 s on workspace icons). Off: `none` |
| `motion.popups` (app menu sampled two frames after opening) | Artemis: opacity 0.36, rise −7.7 px, scale 0.98, 0.2 s. Zen: opacity 0.00, −34.7 px of Firefox's −70 px slide, 0.18 s. Off: opacity 1, no transform, 0 s |
| Intensity scales only the Artemis state | Gentle: 102 ms / −3.6 px. Standard: 120 ms / −7.7 px. Lively: 138 ms / −12.9 px |
| System reduced motion (emulated) | Artemis rules step aside. Hover is native; the panel appears without motion |
| `zen` state = no Artemis at all (computed transitions of tab, workspace icon and panel) | **Identical** |

Horizontal tabs (A13) investigated: Zen does not offer them (see DECISIONS.md M4 entry).
They remain release blocker B1.

Performance figures in this log are from the development machine only (AMD Radeon RX 9060
XT, 144 Hz). Mid-range hardware is **untested**.
