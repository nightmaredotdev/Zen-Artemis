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
