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
| `tools/zen/capture.sh <out.png>` | Real screen capture of the test window (includes backdrop blur). **Focuses the test window**, so it refuses to run unless `ARTEMIS_ALLOW_FOCUS=1` is set, and it aborts without capturing if the foreground window is not `zen.exe`. Use only when the owner's desktop is free |
| `tools/zen/matrix.sh <dir>` | Layout matrix with native-restoration diffs |
| `tools/zen/features.sh <dir>` | Feature independence, master override and value preservation |
| `tools/zen/gpu-sample.sh [s]` | Average 3D GPU utilisation of the zen.exe processes |
| `tools/zen/png.py` | Crop, side-by-side and pixel diff of screenshots |
| `checks/setup-session.js` | Realistic tabs: essentials, pinned, folder, normal tabs |
| `checks/layout.js` | Set Zen layout / scheme / OS-effect emulation / prefs |
| `checks/os-settings.js` | Artemis response to OS transparency and motion settings |
| `checks/scrollbar.js`, `checks/frame-timing.js`, `checks/gpu-scenario.js` | Targeted measurements |
| `checks/transparency.js` | Regression (v1.0.0): glass opacity/blur of the compact sidebar and open address bar under OS effects on/off/follow-OS, for an explicit custom opacity (default ARGS) or defaults (`{"prefs":{}}`) |
| `checks/custom-fields.js` | Regression (v1.0.0): custom-value fields visible only while their dropdown is Custom, from a fresh render (initial state, optional `{"start":{...}}`), switching via the real menulist, value persistence and independence across all four settings |
| `checks/accordion.js` | Regression (v1.0.0): each settings section header toggles only its own section (every header clicked twice) |
| `sidebar-tint.sh <dir>` | Regression (v1.0.0): at full glass opacity the compact sidebar background pixel equals Zen's own, explicit solid and OS default, dark and light |
| `checks/toggle-mod.js` | Disable or enable Artemis through Sine's own toggle and report what remains |
| `prompt-ui.mjs <resetAll\|restore> <accept\|dismiss>` | Clicks Reset all / Restore and answers the real confirmation dialog through WebDriver alert commands (opens a dialog: free desktop only). Supersedes `checks/prompt.js`, which Marionette's default prompt handling defeats |
| `checks/multiwindow.js` | Second window: instances, live sync, native restoration, closing (opens a window: free desktop only). Ran successfully on 2026-11-08 |

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

### M5 runtime: 2026-11-08

| Check | Result |
|---|---|
| A8: enhancer script runs in `about:preferences` | **Pass**. It enhances only Artemis's dialog (exactly one `.artemis-enhanced`) |
| Enhanced dialog | 11 collapsible sections, 31 descriptions, search (e.g. "tab" matches labels and descriptions across sections), reset buttons only on user-set rows |
| Area master off in settings | Its features show "Turn on “Artemis tabs” to use this." Values unchanged |
| Row reset (click) | Clears one value; Sine's widget refreshes (Pill → Rounded) |
| Reset all | Backup written first (`<profile>/artemis/backups/…-before-reset-all.json`), then all user values cleared; internal prefs untouched |
| Restore | Takes a "before-restore" backup, then applies the backup's 3 values |
| Tampered backup validation | Only valid declared values are applied. Unknown keys, internal prefs, wrong types, out-of-range values, a CSS-injection string and a non-Artemis pref are rejected |
| Bridge (live custom values) | A custom accent set directly in prefs applies live (`#00b894`); an invalid value is removed and the token falls back safely |
| Migration helpers (`rename`, `mapValue`) on throwaway prefs | Rename moves the value; mapping translates; unknown values are kept and reported, not reset |
| Schema stamping | Not written on a fresh install; written on the first user change (`artemis.internal.schema = 1`) |
| Tour | Auto-opens once on first launch (one window). Skip keeps choices made so far (state `skipped`). "Take the tour" reopens it; Done records `completed`. Never auto-opens again after a restart |
| Re-entrancy (full Sine rebuild) | One instance per window, no duplicate tour, one enhanced dialog (1 toolbar, 1 footer, 11 sections) |
| Persistence | User values and backups survive restart |
| Without JS (`sine.allow-unsafe-js` off) | No script runs, nothing seeded, no tour. Window with Artemis CSS loaded is **pixel-identical** to pure Zen |
| Regression: native restoration, 8 layouts | **0 differing pixels** (known favicon noise aside) |

Not tested by clicking: the Reset-all and Restore buttons' confirmation prompts are modal,
and the test driver cannot dismiss them. The same code paths were exercised through the
functions the buttons call. (Later tested through the real dialogs: see "Final integration,
part 2".)

### Final integration, part 1: 2026-11-08

Run without focusing the test window or opening new ones, because the owner was using the
computer. (One real screen capture in this session captured another application instead of
the test window. It was deleted immediately, and `capture.sh` now refuses to run without
explicit permission, then checks the foreground window before capturing.)

| Check | Result |
|---|---|
| **Revised layout matrix**: Single toolbar, Multiple toolbars, Collapsed (set exactly as Zen's settings do) × compact on/off × left/right in dark, plus each layout × compact on/off in light: 18 cells | **0 differing pixels** in all 18 (all areas off vs. Artemis removed) |
| Matrix sanity | Cells are genuinely different layouts (17–44% of pixels differ between layouts/sides/modes); Artemis-on differs from Zen in every cell checked (3–18%) |
| Disable Artemis via Sine's own toggle | Combined sheet no longer imports Artemis; no window instance, live variables, tour or enhancer additions; `parts.css` removed. Window **pixel-identical** to pure Zen |
| Re-enable via Sine's toggle | Restored live without restart (instance, live variables, enhancer, scrollbar rule) |
| Feature independence and master overrides | Unchanged: each feature affects only its region; with masters off, every feature toggle changes 0 pixels; values preserved |
| OS transparency and animation (emulated) | Effects on: glass 72% (panel 84.6%), blur 18 px, backdrop clip. Effects off and follow-OS (host has both off): opaque, no blur, no clip, motion distance 0. `os-settings.js` now switches to compact mode itself (an earlier run from non-compact mode measured a non-glass panel) |
| Motion states, intensity, reduced motion, `zen` = native | Unchanged from M4 |

**Pending at the time (need a free desktop; all completed in part 2 below):**
- Reset-all and Restore confirmation prompts answered through the real dialog.
- Multiple windows (`checks/multiwindow.js`).
- Settings and backups surviving a restart (re-run on the final commit; passed at M5).
- Real-capture visual review of glass in light mode, plus a fresh performance run on an idle
  GPU.
- The `capture.sh` foreground-window guard itself.

### Final integration, part 2: 2026-11-08 (owner's desktop free)

Run in one session with the owner's confirmation that the computer was free. Only the
isolated `ZenArtemisTest` profile was used. No other application was interacted with or
captured. Windows settings and the real Zen profile were untouched.

| Check | Result |
|---|---|
| **Capture safeguard** | Tightened before testing: `capture.sh` now requires the foreground window to belong to the test browser's **exact process id** (reported by the browser itself), and the browser to report the `ZenArtemisTest` profile. Abort path, with the expected pid deliberately wrong: aborted, "nothing captured", **no file written**. Without `ARTEMIS_ALLOW_FOCUS=1`: refused, no file. Normal path: foreground pid verified, and only the test window was captured (image checked) |
| **Reset all through the real dialog** | Dialog text correct. Cancel: nothing changed. OK: `before-reset-all` backup written first, then both user values cleared |
| **Restore through the real dialog** | Dialog text correct. Cancel: nothing changed. OK: `before-restore` backup written first, then both values restored |
| How the dialogs were answered | Marionette treats them as WebDriver user prompts. A first attempt was auto-dismissed by Marionette's default prompt handling, so it does not count. The valid run (`tools/zen/prompt-ui.mjs`) used one session with `unhandledPromptBehavior: "ignore"` and answered with WebDriver's alert commands |
| **Multiple windows** | Second window has its own instance (2 modules); no tour in either window; a setting change reaches both windows live (999px pill in both, then back); the second window's computed styles with all areas off are **identical** to pure Zen; closing it leaves the first window's instance intact |
| **Persistence across restart** (runtime code at `7182749`) | User value and all backups survived; value applied live after restart; 31 defaults re-seeded; migration 1 → 1 with nothing unresolved; tour did not reopen. Restoring the oldest backup after the restart applied 3 values, with a new backup taken first |
| **Light-mode glass** (guarded real captures) | Floating compact sidebar and open address bar: page text behind both is fully blurred, panels are readable, workspace tint visible. No issues found |
| **Performance, GPU idle** (system-wide 3D 0.5% before the run) | Zen idle on a static page: 0.2%. Animated page: native 3.2% / 3.3% (sidebar hidden / shown); Artemis 3.2% / **4.0%** (the glass sidebar costs about +0.7 points). Frame timing while showing and hiding the compact sidebar 8 times at 144 Hz: native p99 6.9 ms, max 6.9 ms; Artemis p99 6.9 ms, max 9.0 ms; no frame over 25 ms in either |

All measurements are from the development machine only (AMD Radeon RX 9060 XT, 144 Hz).
Mid-range hardware remains **untested**.

### v1.0.0 release run: 2026-11-08 (release candidate `917c38f`)

All checks ran **headless** (`tools/zen/launch.sh -headless`) in the isolated test profile,
so nothing opened on the owner's desktop. Headless rendering is 1152×864 without GPU
compositing. Native-restoration and independence comparisons are made within the same
mode, so they remain valid. Glass appearance and GPU cost were verified separately with
real captures and measurements ("Final integration, part 2").

| Check | Result |
|---|---|
| `check.py --release` | 0 errors, 0 warnings |
| Fresh install (all Artemis prefs wiped, then started) | 31 defaults seeded, tour auto-opened, no user values; `prefs.js` has **no** Artemis lines after start and quit |
| Without JS | No instance, nothing seeded, no tour; window **pixel-identical** to pure Zen |
| Layout matrix (18 cells) | **0 differing pixels** in all 18 |
| Feature independence / master overrides / value preservation | Pass (only the known `about:robots` favicon flicker, 10 px) |
| OS transparency and animation (emulated) | Effects on: glass 72%, blur 18 px, clip. Effects off / follow OS: opaque, no blur, no clip, no motion distance |
| Motion | Hover 120 ms (102/138 ms at gentle/lively), Zen native, off; popups Artemis/Zen/off as before; reduced motion steps aside |
| Settings enhancer | Enhanced (11 sections, 31 descriptions), only Artemis's dialog |
| Runtime edge cases | Validation, live bridge, migration helpers, re-entrancy: pass |
| Reset all / Restore through the real dialogs | Cancel: no change. OK: backup first, then cleared / restored |
| Multiple windows | Instances, live sync, native restoration in second window, clean close: pass |
| Disable / re-enable via Sine | Disabled: identical to pure Zen; re-enabled live |
| Restart persistence | Value and backups survive; restore after restart works; tour does not reopen |

### Post-release fixes for owner-reported v1.0.0 issues: 2026-11-08

Reproduced with the owner's real settings (read-only from the real profile:
`transparency = custom`, `transparency-custom = 10%`; Windows *Transparency effects* off),
in the isolated test profile, headless.

| Issue | Reproduction on v1.0.0 | Root cause | After the fix |
|---|---|---|---|
| Opacity 10% has no effect; sidebar and address bar opaque | Follow-OS / effects-off: token forced to 100%, alpha 1, no blur (`transparency.js`) | `tokens.css` forced 100% opacity and no blur under `prefers-reduced-transparency`, overriding explicit Artemis choices | Explicit choice: alpha **0.10** and blur 18 px on both surfaces in all three OS states. Defaults still follow the OS (opaque when effects are off, 84.6% when on). Also works in a second window, and clears in both windows |
| Custom 10% shown as 50.5% (effects on) | Panel boost applied to custom values | Readability boost not limited to the named steps | Custom value exact (0.10) |
| Compact sidebar much darker than expected | Background pixel vs Zen: dark (26,26,30) vs (23,23,26), light (225,222,239) vs (240,240,244), even with the neutral default theme (`sidebar-tint.sh` fails on v1.0.0 CSS) | Zen's workspace-gradient layers were hidden and replaced by a near-black neutral surface | Glass tinted by Zen's own gradient layers at the glass opacity. At full opacity, **identical** to Zen (delta 0) in dark and light, explicit solid and OS default |
| Accordion toggles the last section | `accordion.js` on v1.0.0 code: **20 of 22** clicks toggled *Motion* | Click handlers closed over a loop variable reassigned per section | 22/22 clicks toggle only the clicked section, with correct `aria-expanded` |

Regression run on the fixed code (headless): 18-cell native-restoration matrix 0 pixels
(one cell showed the known favicon flicker and was clean on re-run); feature independence
and master overrides pass; values preserved; OS-setting defaults unchanged; motion
unchanged; runtime edge cases pass; multiple windows pass; disabling Artemis via Sine is
pixel-identical to pure Zen and also removes `[artemis-explicit-glass]`; re-enabling
works live.

Not yet verified: a real-capture visual review of the fixed glass (blurred, workspace-tinted
sidebar and address bar). Marionette screenshots do not show blur, and real captures need
the owner's desktop to be free. (Done and passed: see "v1.0.1 release run".)

### Custom-value field visibility: 2026-11-08

| Check | Result |
|---|---|
| Reproduction (fresh render of Sine's settings page) | All four custom fields (accent colour, transparency, blur, radius) visible while their dropdowns were Zen accent / Medium / Medium / Medium |
| Root cause | Sine calls `setupPrefObserver` for a mod row before appending the row to the dialog. Its initial hide and visibility check use `document.querySelector`, find nothing, and do nothing. Later changes work because the row is in the document by then |
| Fix | The settings enhancer evaluates each Artemis row's `conditions` like Sine once the rows exist, and on every Artemis pref change. Sine is not modified |
| `custom-fields.js`, all defaults | Initial: all four hidden. Each dropdown: Custom shows its field, another option hides it, the entered value survives switching away and back (input and pref), other fields unaffected. **0 failures** (4 initial-state failures before the fix) |
| `custom-fields.js`, transparency and radius pre-set to Custom | Initial: exactly those two visible. Switching, persistence and independence: **0 failures** |
| Search interplay | Searching "opacity" does not reveal the hidden custom transparency field |
| After a full Sine rebuild | Still correct (0 failures) |
| Accordion, settings page, runtime re-entrancy | Pass |
| Browser-window regressions | Not re-run: the change affects only Artemis's settings dialog in `about:preferences` |

### v1.0.1 release run: 2026-11-08 (release candidate `151aed3` plus version metadata)

Zen 1.24.1b, Sine 2.3.4.1c, Windows. Automated checks ran **headless** in the isolated
test profile. The visual review and performance sample ran afterwards in a visible test
window, with the owner's confirmation that the desktop was free. Every capture verified the
test browser's process id in the foreground first, and no other application was captured.

| Check | Result |
|---|---|
| `check.py --release`, `git diff --check` | 0 errors, 0 warnings |
| Fix 1: explicit opacity/blur beat Windows transparency (`transparency.js`) | Custom 10%: alpha 0.10 and blur 18 px on the compact sidebar and the open address bar with OS effects on, off and follow-OS. Defaults: 84.6% with effects on; opaque, no blur with effects off |
| Fix 2: custom opacity exact | 10% gives alpha 0.10 (no readability boost) |
| Fix 3: compact sidebar keeps workspace colours (`sidebar-tint.sh`) | Delta 0 against Zen in dark and light, for explicit solid and OS default |
| Fix 4: accordion (`accordion.js`) | 22/22 clicks toggle only the clicked section |
| Fix 5: custom-value fields (`custom-fields.js`) | 0 failures from defaults, from transparency and radius preset to Custom, and after a full Sine rebuild |
| Layout matrix (18 cells), native restoration | **0 differing pixels** in all 18 |
| Feature independence, master overrides, value preservation | Pass (master off: every feature toggle 0 px; values identical after master off/on) |
| OS transparency and animation defaults | Unchanged from 1.0.0 (effects on: 72%, blur, clip; off/follow-OS: opaque, no blur, no clip, no motion distance) |
| Motion | Unchanged from 1.0.0 (hover 120/102/138 ms, Zen, off; popups Artemis/Zen/off; reduced motion steps aside) |
| Runtime edge cases, runtime state, settings page | Pass (validation, live bridge, migration, re-entrancy; 11 sections, 31 descriptions, only Artemis's dialog enhanced) |
| Multiple windows | Instances, live sync, native restoration in the second window, clean close: pass |
| Sine disable / re-enable and full rebuild | Disabled: no instance, no sheet import, no live variables, no enhanced dialog. Re-enabled and rebuilt live |
| Fresh install | 31 defaults seeded, tour auto-opened, no user values; `prefs.js` has **no** Artemis lines after start and quit |
| Existing preferences (a 1.0.0-style configuration: custom 10% opacity, custom accent, pill tabs, sidebar area off, hover motion off) | Survive restart unchanged; migration 1 → 1 with nothing unresolved; Reset all (real dialog) clears them, and Restore brings back exactly the same 7 values |
| Without JS (`sine.allow-unsafe-js` off via the test `user.js`, restored afterwards) | No instance, no Artemis prefs defined, no tour; window **pixel-identical** to pure Zen |
| **Visual review (real captures)**, backdrop page under the floating compact sidebar and the open address bar | Custom 10%, dark and light: clearly see-through, blurred, tinted by the workspace. Defaults, dark and light: frosted and readable. Owner's setup (OS effects off, custom 10%): see-through and blurred. OS effects off, defaults: opaque in Zen's own colour |
| Performance (visible window, 144 Hz, owner's own Zen also running) | GPU 3D, animated page: native 3.9% / 3.7%, Artemis 4.0% / 4.4% (sidebar hidden / shown); frame timing over 8 show/hide cycles: p99 6.9 ms, max 6.9 ms, no frame over 25 ms, native and Artemis alike. In line with 1.0.0 |

Test-procedure note: `checks/runtime-state.js` imports Artemis's core module, which seeds
the defaults. In a without-JS run, take screenshots and check prefs **before** running it,
or Artemis's CSS switches on and the comparison with pure Zen is invalid.
