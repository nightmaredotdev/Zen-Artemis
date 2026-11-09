# Artemis: Architecture

Status: **revision 2, approved by the owner on 2026-11-08** (with the clarifications in
[`DECISIONS.md`](DECISIONS.md)). The M0 scaffold exists on `dev`. The M1 verification
results are in [`TESTING.md`](TESTING.md).
Last reviewed: 2026-11-08, against Zen 1.24.1b (Windows) and Sine 2.3.4.1c.
Decisions and approvals are recorded in [`DECISIONS.md`](DECISIONS.md).

| | |
|---|---|
| Project / repository | `Zen-Artemis`, `nightmaredotdev/Zen-Artemis` (public) |
| Display name | Artemis |
| Author | nightmare |
| Mod `id` | `Artemis` (§4) |

Artemis is an independent theme and customization project for Zen Browser. It gives Zen a
distinctive, refined and minimal look, and it lets users control individual features.
It is one theme with one identity. It is not a set of presets, and it does not reproduce
another mod.

Contents: 1 Principles · 2 Visual direction · 3 Verified facts and assumptions ·
4 Identity and distribution · 5 System overview · 6 Preferences model · 7 Settings
experience · 8 JavaScript runtime · 9 CSS architecture · 10 Motion · 11 Profiles, backups,
import/export and migration · 12 First-launch tour · 13 Scope map · 14 Settings inventory ·
15 Releases and roadmap · 16 Testing and validation · 17 Licensing and provenance ·
18 Store metadata · 19 Repository policy · 20 Directory structure and scaffold plan ·
21 What changed from revision 1 · 22 Decisions needed

---

## 1. Principles

The owner set these, and they are not negotiable:

1. **Feature-level customization.** A setting controls one recognizable feature. It never
   controls a bundle of unrelated features or a whole visual preset.
2. **Independent behaviour.** Turning one feature on or off never changes another feature.
3. **Native restoration.** Every custom feature has a state that restores Zen's own
   appearance or behaviour.
4. **No hidden dependencies.** Features work on their own wherever that is technically
   possible.
5. **Graceful degradation.** An unsupported combination degrades. It never breaks other
   features.
6. **Meaningful customization.** Settings exist where they add real value. Arbitrary
   settings are not added.
7. **Cohesive identity.** Artemis has one consistent look.

Engineering rules that follow from these:

- **Presentation never changes behaviour.** Global design tokens never switch a feature on
  or off. Animation intensity never turns an animation on.
- **Unset means native.** A pref with no value (no default seeded and no user value) always
  gives Zen's native result for that feature, never a half-applied state (§6.4). Artemis's
  curated defaults are layered on top of that baseline.
- **Shared code is shared once.** For example, one module validates settings for seeding,
  import, reset and migration.
- **No speculative architecture.** Each subsystem is built in the release that needs it.
  Later releases are anticipated by keeping data formats versioned, not by building
  frameworks early.
- **Best product, not CSS-only or JS-only.** Each part uses whichever technique gives the
  best balance of quality, reliability, maintainability, performance, compatibility and
  complexity.
- **Performance budget.** A cost nobody can notice is acceptable for a real visual gain.
  Noticeable lag, stutter or sustained resource use is not.

---

## 2. Visual direction

- **Identity:** transparency and glass surfaces, refined layering and depth, smooth and
  deliberate motion, and consistent spacing, proportions and corner radii across the whole
  browser. It is distinctive but restrained, and never edgy, dark-fantasy, decorative or
  noisy. The name does not set the style.
- **Light and dark:** Artemis follows Zen's current scheme automatically (`light-dark()`,
  A7).
- **Accent:** Zen's accent is inherited by default. A custom accent is an optional override.
- **Glass by default:** floating surfaces and the Artemis-styled sidebar, toolbar and URL
  bar use translucent, blurred surfaces. Transparency and blur strength are global tokens,
  and setting transparency to `solid` makes every Artemis surface opaque.
- **Curated defaults:** Artemis's own styling is on by default. Each area has an
  independent switch back to Zen's native styling.
- **Detailed control where it helps:** colours (accent), transparency, blur, corner radius
  and spacing each offer named steps plus an optional validated custom value (§6.3).

---

## 3. Verified facts and assumptions

### 3.1 Verified

Sources: the installed Sine source (`chrome/JS`, 2.3.4.1c), Zen 1.24.1b's `omni.ja`
(extracted read-only to a scratch directory), the four reference mods, the public
`sineorg/store` and `sineorg/docs` repositories, and Anthropic's consumer terms.

| # | Fact | Evidence |
|---|---|---|
| F1 | Sine never applies preference defaults at install. | `core/manager.sys.mjs`: `// TODO: Apply default preferences.` |
| F2 | A checkbox default of `true` is written as a **user** value when its settings row renders, but only if the pref does not exist yet. | `core/preferences.sys.mjs` `applyCheckbox` |
| F3 | String and dropdown rows also write their default as a **user** value on first render if the pref does not exist (or if `force` is set). | `applyString`, `applyDropdown`, `buildPrefContext` |
| F4 | "Exists" means `getPrefType(name) > 0`. A value on the **default branch** counts as existing, so Sine then displays it and writes nothing. | `buildPrefContext` |
| F5 | String prefs become `:root { --<name with dots as dashes>: <value>; }` in an adopted stylesheet, in **chrome documents only**, and only for prefs that exist. The value is inserted raw, and empty strings produce empty values. | `services/stylesheets.sys.mjs` `#rebuildDOM` |
| F6 | Dropdown and string edits in Sine's settings call `rebuildMods(false, false)`. That refreshes the generated variables and attributes only: no CSS reload and no script re-run. Checkbox edits only set the pref. Changes made outside the settings (in `about:config` or by script) do not refresh string variables. | `applyString`, `applyDropdown`, `manager.rebuildMods` |
| F7 | Dropdown values are also mirrored as attributes on `<div id="theme-<mod name>">` in each chrome document. | `#rebuildDOM` |
| F8 | All mods' chrome CSS is combined into one **user sheet** loaded into every `chrome://` window (main window, PiP, Library, dialogs). | `stylesheets.sys.mjs` |
| F9 | Content CSS is a user sheet in every content window, loaded by an actor on `DOMWindowCreated`. | `services/usercontent.sys.mjs` |
| F10 | A `.uc.js` file is run with `loadSubScript` in each window whose `location.href` matches the script's `include` patterns, on `load`. A `.sys.mjs` is imported **once**, early, from `Sine.init()`. Ordering uses `loadOrder` (default 10). | `manager.sys.mjs` `observe`, `rebuildMods`; `utils.sys.mjs` `getScripts` |
| F11 | Mod JS runs only if `sine.allow-unsafe-js` is on **or** the mod came from the store. | `utils.sys.mjs` `getScripts` |
| F12 | `window.addUnloadListener(cb)` registers cleanup keyed by the calling script's URL. It runs on disable or uninstall, on window close, and before a re-run. | `manager.sys.mjs` |
| F13 | Toggling **any** mod with scripts re-runs every enabled script in every window, including parent-process tab documents such as an open `about:preferences`. Scripts must be re-entrant. | `rebuildMods`, `utils.getProcesses` |
| F14 | `supportsUnload: true` suppresses the "restart required" toast when the mod is disabled. | `toggleTheme` |
| F15 | A mod's folder is `sine-mods/<id>`, served at `chrome://sine/content/<id>/`. Without an `id`, Sine generates a UUID. | `utils/chrome.manifest`, `createThemeJSON` |
| F16 | Sine has no "install from local folder". Mods are entries in `sine-mods/mods.json`. | `cmdPalette.mjs`, manager |
| F17 | Store submission is a GitHub issue that contains only the repository URL. The repository must contain a `theme.json` with "an id, name, description, and other properties". | `sineorg/store` `ISSUE_TEMPLATE/add-theme.yml` |
| F18 | No store entry uses the id or name "Artemis" (72 entries, checked 2026-11-08). | `marketplace.json` |
| F19 | Zen exposes layout state as root attributes: `zen-compact-mode`, `zen-sidebar-expanded` (removed when collapsed), `zen-single-toolbar`, `zen-right-side`, `zen-floating-urlbar`, `zen-window-buttons-reversed`, `zen-private-window`. Hover state is `zen-has-hover` on the toolbox. | Zen `zen-components/*.mjs`, `zen-styles/*.css` |
| F20 | Zen's chrome CSS uses `@media -moz-pref("name")`, including string and number comparisons. | `zen-styles/*.css` |
| F21 | Zen's CSS depends on prefs that exist **only on the default branch**, so `-moz-pref()` evaluates default-branch values. | `defaults/preferences/firefox.js`, profile `prefs.js` |
| F22 | Relevant Zen defaults include `zen.view.sidebar-expanded=true`, `zen.view.compact.hide-tabbar=true`, `zen.theme.content-element-separation=8`, `zen.theme.border-radius=-1`. | `firefox.js` |
| F23 | Zen tokens to build on include `--zen-primary-color`, `--zen-border-radius`, `--zen-native-inner-radius`, `--zen-element-separation`, `--zen-colors-border`, `--zen-toolbar-element-bg(-hover)`, `--zen-selected-bg`, `--zen-squircle-value`, `--tab-border-radius` and `--tab-min-height`. | `zen-styles/*.css` |
| F24 | No reference mod uses `addUnloadListener`. They guard against re-runs with per-window flags or by destroying the previous instance. | reference sources |
| F25 | Python 3.14 (WSL) and Windows Node.js 24 are available, so the planned checks need nothing new installed. | shell |
| F26 | Sine's settings UI renders only `separator`, `checkbox`, `dropdown` and `string`. It has no descriptions, collapsible groups, search, per-setting reset or buttons, and each row's tooltip is the raw pref name. Supported keys are `label`, `property`, `defaultValue`, `options`, `conditions`/`operator`, `disabledOn`, `restart`, `placeholder`, `force`, `value`, `border`, `margin`, `size`, `id`. **Unknown keys are ignored.** | `core/preferences.sys.mjs` |
| F27 | Dropdowns get an extra placeholder item (empty value) unless `"placeholder": false`. | `applyDropdown` |
| F28 | Mod settings open in a shared `<dialog class="sineItemPreferenceDialog">` inside `about:preferences`. Each row's element id is the pref name with dots replaced by dashes (e.g. `artemis-tabs-shape`). Sine's own settings code reaches that page through the same per-window loader that runs mod scripts. | `core/settings.mjs`, `services/module_loader.mjs` |
| F29 | **GitHub installs track the `main` branch.** Sine fetches `theme.json` from `raw.githubusercontent.com/<repo>/main/`. It updates when `theme.json` `updatedAt` is newer than the installed copy. If `updatedAt` is missing, it falls back to the repository's GitHub `updated_at`, which changes on **every push**. A missing `version` falls back to the latest GitHub release tag. Store installs follow `marketplace.json`, which records a commit. | `utils.rawURL`, `processModUpdate`, `createThemeJSON`; store workflows |
| F30 | Zen's tab orientation is the pref `zen.tabs.vertical` (default `true`), read with `-moz-pref()`. There is no root attribute for it. The right-side sidebar is `zen.tabs.vertical.right-side` plus the `zen-right-side` attribute. | `firefox.js`, `vertical-tabs.css`, `ZenCompactMode.mjs` |
| F31 | The store's `ai` field is **not documented** in the store repo, its issue form, its website, the old Sine wiki or `sineorg/docs`. Values in use: `yes` (12 entries), `partial` (4), `no` (4), absent (52). The only code that reads it is the maintainers' `scripts/slop-detector.sh`, which labels them "No AI", "Partial AI", "Doomed AI slop" (`yes`) and "Do not specify". `license` is also undocumented and set by 1 of 72 entries. Both are copied from the author's `theme.json` unchanged. | `sineorg/store` |
| F32 | The version of Anthropic's Consumer Terms reviewed (effective Oct 8, 2025, served as the EEA/Switzerland version) says: "we assign to you all our right, title, and interest (if any) in Outputs." The same version restricts using the Services "for any commercial or business purposes" and does not say how that applies to Outputs. | anthropic.com/legal/consumer-terms |
| F33 | **Gecko ignores `::part()` rules in user-origin (and agent) sheets.** Only author sheets apply them. Sine loads mod CSS as a user sheet, so Artemis rules that style inside shadow trees (e.g. the tab list's scroller) live in `parts.css`. `artemis.uc.js` loads it per window with `windowUtils.loadSheet(…, AUTHOR_SHEET)` and removes it on teardown. Without JS, those rules simply do not apply. | M2 test: the same rule from user / author / agent sheets |
| F34 | **Chrome `backdrop-filter` does not blur page content by default.** With WebRender's native compositor, the page `<browser>` can be composited by the OS, outside the tree backdrop-filter samples. A non-trivial `clip-path` on the `<browser>` keeps it sampleable (`inset(0)` is optimised away; a polygon works). Artemis applies it only while a glass surface floats over the page. Measured on the test machine (RX 9060 XT, 144 Hz): no dropped frames, GPU 3D utilisation +0.4 points with an animated page. | M2 screen captures, `frame-timing.js`, `gpu-sample.sh` |

### 3.2 Assumptions to verify

Each is tested in the verification spike (milestone M1, §15) before code depends on it.
Every item has a fallback.

**M1 results (2026-11-08):** A1, A2, A4, A6, A7, A9 and A10 **pass**. A3 passes for browser
pages. A5 passes for elements inside the window tree (`#navigator-toolbox`, `#browser`) but
not for elements appended directly to the root. A8, A11 and A12 are deferred to M5, M4 and
M2. Details are in [`TESTING.md`](TESTING.md).

| # | Assumption | Depends on it | Fallback if false |
|---|---|---|---|
| A1 | Changing a **default-branch** value at runtime re-evaluates `-moz-pref()` live. | Seeding (§8.3) | Seed before the stylesheet loads (synchronous defaults table) |
| A2 | Background seeding finishes before the first window paints. | No native-then-Artemis flash on startup | Generated synchronous defaults table, kept in sync by `check.py` |
| A3 | `-moz-pref()`, including string comparison, works in content user sheets. | Internal pages (v1.2) | JS bridge sets attributes on parent-process internal pages; content-process pages use their defaults |
| A4 | A registered `@property` with a syntax (`<color>`, `<length>`, `<percentage>`) falls back to `initial-value` when the value is invalid, including through `var()` chains. | Custom value validation (§6.3) | Validate in JS before writing; CSS uses the step value |
| A5 | `backdrop-filter` renders correctly on the sidebar, toolbar, URL bar, menus and panels on Zen 1.24.1b / Windows. | Glass identity | Translucent tint without blur, where blur fails |
| A6 | `addUnloadListener` is keyed correctly for Artemis's scripts. | Clean disable and re-run | Re-entry guard (destroy the previous instance), the proven reference pattern |
| A7 | `light-dark()` follows Zen's scheme on chrome documents. | All colour tokens | Branch on Zen's scheme attribute/pref |
| A8 | A `.uc.js` whose `include` matches `about:preferences` runs in the page that hosts Sine's settings dialog. **Result (M5): pass.** | Settings enhancer (§7) | Sine's plain settings list only; document the limitation |
| A9 | **User-branch** pref changes re-evaluate `-moz-pref()` live (Zen's live settings suggest yes). | Live settings | JS bridge mirrors prefs to root attributes |
| A10 | Zen supports Marionette (`-marionette`) for scripted test runs (chrome-context screenshots, setting prefs). | Automated layout-matrix runs (§16.3) | Manual matrix only |
| A11 | Zen animates each area natively that Artemis offers a `zen` motion state for. **Result (M4):** hover feedback (CSS transitions) and panels (Firefox's `[animate]` transition on arrow panels and `.animatable-menupopup`) are CSS-driven and support all three states. The compact sidebar, tab open/close, folders and workspace switching are **JavaScript-driven** (Zen's `motion` library / Web Animations). CSS cannot replace or disable them, folder timing is a private field, and Zen exposes only its own hidden prefs (`zen.view.compact.animate-sidebar`, `zen.workspaces.switch-animation-duration`). | Three-state motion settings (§10) | Release blocker B3: owner decision on those four settings |
| A12 | Glass on the sidebar plus open popups adds no noticeable frame-time cost on mid-range hardware. | Glass defaults | Lower default blur; limit blur to floating surfaces |
| A13 | Horizontal tabs can be enabled for testing. **Result (M4): Zen does not offer horizontal tabs.** Its FAQ says they "will not be supported in the near future". Its layout settings write only `zen.view.sidebar-expanded` and `zen.view.use-single-toolbar` (Single / Multiple / Collapsed). `zen.tabs.vertical` is never set by Zen code, and setting it does not produce a working horizontal layout. | Horizontal-tab compatibility | **Resolved (owner, 2026-11-08):** the requirement became "every layout Zen offers" (§9.5). Not simulated in CSS |

---

## 4. Identity and distribution

- **Mod `id` = `Artemis`.** Sine installs into `sine-mods/<id>` (F15). The id therefore
  matches the existing local folder (which is not renamed), internal URLs are identical in
  development and after install, and the id is free in the store (F18). The risk is that a
  generic name could clash with a future mod.
- **Pref namespace** `artemis.*`. **CSS namespace** `--artemis-*`, plus `artemis-*`
  attributes set by JS.
- **Logo:** `assets/artemis.svg` is canonical and never modified unless requested. The copy
  at `sine-mods/artemis.svg` is ignored.
- **Platforms:** developed and tested on Windows. Nothing Windows-specific is used unless
  necessary, and Linux and macOS are kept working where practical. Public text says only
  "tested on Windows" until other platforms are actually tested. Sine's per-pref
  `disabledOn` exists if a setting is ever genuinely platform-specific.
- **Zen versions:** the latest stable Zen is the target. Older versions are supported where
  that is easy, never at the cost of features, design quality or maintainability.
  `README.md` states the tested Zen and Sine versions for each release.

---

## 5. System overview

```
                      preferences.json  (single source of truth for every user setting)
                              │
       ┌──────────────────────┼─────────────────────────────┐
       ▼                      ▼                             ▼
  Sine settings UI      scripts/artemis.sys.mjs        tools/check.py
  (always works)        once per session:              (static validation)
       │                 seed defaults · migrate ·
       │                 validate · storage
       ▼                      │
  artemis-settings.uc.js ◄────┤ shared singleton
  (about:preferences):        │
  enhances Sine's dialog      ▼
  with search, sections,  artemis.uc.js (each browser window):
  descriptions, resets    pref→CSS bridge · onboarding · feature modules
                              │
                              ▼
  chrome.css / content.css → styles/core (tokens only, no visible effect)
                           → styles/features/<area>/<feature>.css (one gate per file)
```

- **CSS** renders all visual features. Each feature is gated by its own pref, so it works
  with or without JS.
- **JS** provides what CSS and Sine cannot: correct defaults (seeding), live custom values,
  the richer settings experience, backups and migration, the tour, and (later) behavioural
  enhancements and profiles.
- **Without JS** (a GitHub install with Sine's unsafe-JS setting off, F11), Artemis
  degrades to the following. The CSS works, settings are Sine's plain list, nothing is
  seeded so every feature starts native until switched on, and there is no tour or backup.
  `README.md` says so. Store installs always run JS (F11).

---

## 6. Preferences model

### 6.1 Kinds of setting

| Kind | Purpose | Shown in Sine? | Examples |
|---|---|---|---|
| **Design token** | One design dimension applied consistently to Artemis-styled elements. Never switches anything on or off. | Yes, under *Appearance* / *Motion* | accent, radius, transparency, blur, spacing, motion intensity |
| **Area style** | Artemis's styling of one browser area, on by default; off restores Zen's styling. | Yes | `tabs.style`, `urlbar.style` |
| **Feature** | One recognizable change, independent of area style. | Yes | `tabs.separators`, `sidebar.hide-scrollbar` |
| **Motion** | One animation, as `artemis` / `zen` / `off`. | Yes, under *Motion* | `motion.popups` |
| **Custom value** | Free input used only when its token is set to `custom`. | Yes, revealed by `conditions` | `appearance.radius-custom` |
| **Internal** | State kept by Artemis itself. | No | `artemis.internal.schema` |

Implementation details (z-indices, per-layout offsets, pseudo-element fixes) are never
settings.

**Area styles are master overrides, not presets** (owner clarification, 2026-11-08).
Turning an area style off restores Zen's native look for the **whole area**: its features
stop applying as well. Their own values are **preserved** and apply again when the area is
turned back on. Turning an area on never changes any feature's value.

- A feature declares its area master in `preferences.json` with the Artemis-only key
  `"master": "artemis.<area>.style"`. Sine ignores this key (F26).
- A feature's CSS gate tests its own pref **and** its master:
  `@media -moz-pref("artemis.tabs.style") and -moz-pref("artemis.tabs.separators")`. This is
  the only cross-pref test allowed, and `check.py` enforces it.
- Features stay visible in the settings while their area is off. The settings enhancer
  shows them as inactive, with a note naming the area switch. Nothing is hidden or reset.
- Within an area, features stay independent of each other.

### 6.2 Naming and types

- `artemis.<area>.<feature>`, lowercase, words joined with `-`. Areas: `appearance,
  window, sidebar, tabs, essentials, folders, urlbar, toolbar, workspaces, popups, media,
  motion`, and later `downloads, dialogs, pages, pdf, behavior`.
- **Checkboxes describe the change Artemis makes**: on means Artemis does it. No `disable-*`
  names and no double negatives.
- **Dropdowns use string values**, read by CSS as `-moz-pref("artemis.x", "value")`. The
  native option, where one exists, is called `zen`. Every dropdown sets
  `"placeholder": false` (F27).
- **String prefs** exist only as custom values (§6.3). Each has a non-empty valid default,
  because empty strings become empty CSS values (F5).
- Artemis adds keys to `preferences.json` entries, which Sine ignores (F26):
  `description` (one short sentence shown by the settings enhancer) and, for string prefs,
  `pattern` (a validation regex used before any programmatic write).
- Every declared pref is read by CSS or JS, and every `artemis.*` pref read anywhere is
  declared or internal. `check.py` enforces both.

### 6.3 Custom values

A token offers named steps plus `custom`. Choosing `custom` reveals one string field
through Sine `conditions`.

```
artemis.appearance.radius         zen | small | medium | large | custom
artemis.appearance.radius-custom  "10px"   (shown only when radius = custom)
```

- **CSS validation:** the string is reached through a registered `@property` with the right
  syntax and a safe `initial-value`, so an invalid entry falls back instead of breaking
  layout (A4).
- **JS validation:** every programmatic write (import, profile, migration, reset) checks the
  `pattern` first. This matters because Sine inserts string values into a stylesheet raw
  (F5). Characters such as `;{}` are never accepted.
- **Live updates:** Sine refreshes string variables only for edits made in its settings UI
  (F6). The window bridge (§8.4) also mirrors custom values to `--artemis-live-*` variables
  whenever the pref changes from any source. Tokens read the bridge variable first and
  Sine's variable second, so custom values work without JS and update live with it.
- **Scope:** Sine's variables exist only in chrome documents (F5). Content-process pages
  use the nearest named step. This is documented as a deliberate degradation.

### 6.4 Unset, default and user values

| State | Where it lives | Result |
|---|---|---|
| Unset | nowhere | **Native Zen** for that feature (all CSS gates evaluate false) |
| Artemis default | **default branch**, seeded in memory at each startup (§8.3) | Curated Artemis behaviour. Nothing is written to `prefs.js` |
| User choice | user branch (`prefs.js`) | Always wins over the default |

- Resetting one setting clears its user value, so the setting returns to Artemis's default.
  It never clears to native unless native is the default.
- Choosing the native option explicitly (`zen`, or unchecking) stores a user value. That
  choice survives later changes to Artemis's defaults.
- Uninstalling leaves only the user values the user set. No default-branch data persists.

### 6.5 Dependencies

The only declared dependencies are custom-value fields, hidden unless their token is
`custom`. They use Sine `conditions`, so the dependency is visible. Apart from area
masters (§6.1), features never read another feature's pref. Motion settings do not depend
on intensity (§10).

---

## 7. Settings experience

### 7.1 Baseline: Sine's dialog

`preferences.json` is complete and works by itself: separators for sections, labels, and
conditions for custom fields. This is the experience without JS, and the fallback if the
enhancer cannot recognize Sine's markup.

Section order follows the hybrid structure the owner asked for: **Appearance** (tokens) →
browser areas (**Window, Sidebar, Tabs, Essentials & folders, Address bar, Toolbar,
Workspaces, Menus & popups, Media**) → **Motion**.

### 7.2 Enhancement inside Sine (approval required: new JS surface)

Sine offers no search, collapsible sections, descriptions or resets (F26). Artemis
therefore adds a small **settings enhancer**, `artemis-settings.uc.js` with
`include: about:preferences*`, which decorates **only Artemis's own** Sine settings
dialog. It does not replace that dialog and does not open a separate interface.

| Requirement | Enhancement |
|---|---|
| Collapsible sections | Rows between separators are wrapped in collapsible groups. Open state is remembered for the session |
| Search | A filter field at the top matches labels and descriptions, and opens matching sections |
| Descriptions | The `description` from `preferences.json`, shown under the label as muted text. No forced tooltips |
| Per-setting reset | A small reset control shown only on rows with a user value (`clearUserPref`) |
| Reset all | A footer action that clears every non-internal `artemis.*` user value after confirmation. A backup is taken first |
| Restore | A footer action that lists recent backups (§11.2) and restores one after confirmation |
| Take the tour | A footer action that opens the first-launch tour (§12) in the most recent browser window |
| Live application | Already true for checkboxes and dropdowns (A9) and for strings (F6 + bridge) |
| Conditional rows | Sine wires a row's `conditions` before the row is in the dialog, so its initial hide/check never runs and every conditional row starts visible (Sine 2.3.4.1c). The enhancer applies the same evaluation as Sine once the rows exist and on every Artemis pref change, so custom-value fields are shown only while their dropdown is on Custom. Without the enhancer (no JS), Sine's behaviour is unchanged |

Safety rules:

- The enhancer activates only when the open dialog contains Artemis rows (ids starting
  `artemis-`, F28). It never touches other mods' dialogs or Sine's own settings.
- It changes no Sine behaviour: rows, event handlers and pref writes stay Sine's. It only
  wraps and annotates.
- If the expected markup is missing, it does nothing, and the plain list remains fully
  functional (principle 5).
- It is re-entrant (F13) and removes its additions on unload.

Styling of the rest of Sine's interface and of every other Settings page is §7.3. It must
never break Sine or other mods.

### 7.3 Settings experience styling (approved 2026-11-09)

Artemis's glass look covers every page that belongs to Zen's Settings experience and is
reachable from its navigation, controlled by one switch, `artemis.settings.style`
(**Settings page styling**, on by default). Off restores every one of these pages to Zen's
native appearance and changes no other preference. The visual language is the same
everywhere: a transparent page background, separate workspace-tinted glass cards with
hairline borders, consistent spacing, and a restrained accent. Artemis-specific controls
stay inside Artemis's own dialog (§7.2); other mods keep their own settings layout.

**Transparent background.** A page inside a tab cannot show the window behind it unless
Zen's `browser.tabs.allow_transparent_browser` is on (the `<browser>` then has the
`transparent` attribute and Zen paints only a light veil). Artemis never writes that
pref. So:

- *Pref on:* the page root is transparent: genuine see-through to the window, through
  Zen's own veil.
- *Pref off (default):* the page shows a copy of the window's workspace background. Zen
  paints it as gradient layers (64 vertical strips plus a base gradient, or one colour for
  a single-colour theme) on `#zen-browser-background::after` over the window's base colour,
  sized in pixels across the whole window. The module copies those layers and shifts each
  by the page's offset inside the window, so the page lines up with what Zen paints around
  it and reads as transparent. It follows workspace switches, theme edits, window resizes
  and layout changes. (Zen's root `--zen-main-browser-background` is only a default; the
  real gradient lives on that element.)

Cards let the theme through: their opacity is `100% − (100% − glass opacity) × 1.7`
(medium 72% → 52%, solid stays opaque), never below 45% for readability.

**One design system for every control.** `styles/pages/settings-tokens.css` defines the
Settings tokens once, for all pages: Artemis's values (`--s-*`: surfaces, hairlines
leaning toward the accent, control, hover, pressed, selected and focus states, menus) and
the Firefox design tokens mapped onto them (`--button-*` including primary, ghost,
selected and menu variants, `--border-color*`, `--focus-outline-color`,
`--color-accent-primary*`, `--input-*`, `--panel-*`, `--card-*`, `--box-*`). Those tokens
inherit into Firefox components' shadow trees, so one set restyles buttons, selects,
segmented controls, the System/Light/Dark picker, toggles' surroundings, menus and inputs
on every page. Zen defines several of them `!important` on `:root`; Artemis's win by
specificity. Where a component redefines a token on its own host (page navigation,
toggles, in-page menus), the token is set on that host. Visual rules:

- Neutral controls: a faint fill and a hairline; hover and pressed darken or lighten one
  step; disabled is 45% opacity.
- Selected and primary: accent-tinted glass (accent 16%, hairline at 40%), never a solid
  fill. The selected page in the navigation uses it too, with no indicator bar.
- Checked marks (checkboxes, radios, toggles): the accent lifted toward the text colour,
  with the mark in the page colour.
- Focus: a 2px ring of the accent at 55% (instead of Firefox's full-strength accent).
- Menus: in the cards' tone. In-page lists (`panel-list`: dropdown lists, three-dot
  menus) are frosted glass a little more opaque than the cards (card opacity + 10%, at
  least 60%) so they stay readable over text. OS popups (XUL menulist popups and the
  browser's own menus and toolbar panels under `artemis.popups.style`) cannot blur the
  page. Measured: a panel window composites alpha (the browser shows through), but
  nothing behind it can be blurred: CSS `backdrop-filter` only blurs content of the
  same window, and Windows draws a blurred (acrylic) backdrop only for menus and only
  with its transparency effects on. Unblurred, the text behind runs through the menu
  text. **Toolbar panels** (Firefox's arrow panels: Downloads, Extensions, the app menu,
  overflow, site and Zen panels, previews) are genuinely translucent: their surface (`::part(content)`,
  `styles/features/popups/style.parts.css`, author origin) is only a glass layer in the
  cards' tint, following Artemis's transparency setting with a **70% readability floor**
  (`--artemis-panel-glass`: default 72%, low 86%, high and custom below 70%: 70%; solid
  and reduced transparency opaque; owner's choice after comparing the cards' 45% floor,
  a text halo and the floor on screen). The window and anything under a panel show
  through, sharp. **Menus** (context menus, menulist lists) and the **other panels**
  (autocomplete drop-downs, which open over web pages, and the Ctrl+Tab switcher)
  instead show a copy of the
  window's workspace background aligned to where they open, under exactly a card's
  glass layer (`scripts/window/popup-glass.mjs` copies the layers with `readWindowVars`
  relative to the popup's content box on `popuppositioned`/`popupshown`). An earlier
  version gave panels that copy too; it sat on the window's opaque base colour, so
  panels looked like glass but stayed opaque at any transparency setting. Without a
  themed workspace or JS, menus keep the solid surface tinted 14% toward the workspace
  colour. Where Windows draws its acrylic menu backdrop, menus use translucent glass
  over it. `<select>` drop-down lists are left alone (websites can colour them).
- Notices (`moz-message-bar`: information, success, warning, error) are tinted glass in
  their own hue rather than a solid block, so they stay distinct.
- Scrollbars on every Settings page and inner list: thin, tinted like the hairlines.
  Keyboard Shortcuts runs in its own process, whose page reserves a 6 px gutter for
  the scrollbar (Settings and Extensions draw theirs over the content). Firefox fills
  that gutter only with the page's background colour; every image and page layer,
  fixed ones included, stops before it. Making the body the scroller would show the
  gradient there but breaks Page Down, Space and arrow-key scrolling (tested). So the
  gutter gets one solid colour: the average of the window background behind the page's
  right edge, measured when Keyboard Shortcuts loads (`sampleEdgeColor`: the browser
  window drawn without other processes' content, about 10 ms), instead of Zen's dark
  base. A faint line remains where the gradient differs from that average (owner's
  choice, 2026-11-09).

Controls inside components' shadow trees that expose no token or `::part` (the checkbox
and radio inputs of `moz-checkbox`/`moz-radio`, `panel-list`, `panel-item`, `moz-toggle`
hosts) are styled by `styles/runtime/settings-controls.css`, a **user sheet** loaded into
the same pages: document-level user sheets apply inside shadow trees, author sheets do
not. It uses generic element types only (`input[type=checkbox]`, `panel-list`), never
Firefox class names. Zen's and Sine's XUL controls (buttons, `menulist` and its popup,
`checkbox`/`radio`) are in light DOM and styled by the page sheet.

**Loading transitions.** Sine runs mod scripts only after a page has painted, and an actor
message arrives after the first paint too; either way the page first showed Zen's look
(measured: Settings about 500 ms, Keyboard Shortcuts about 180 ms, Extensions about 80 ms).
Both actors now act on `DOMDocElementInserted`, when the page's root element is created and
before anything is painted: the page actor attaches the styling there, and the keyboard
child applies values the Settings pages last published in shared data
(`Services.ppmm.sharedData`, read synchronously; the live values for its own window follow
over the actor). Measured after (`tools/zen/checks/settings-load.js`): Settings and
Keyboard Shortcuts go straight from the empty tab to Artemis's look; navigating between
Settings pages in one tab shows no intermediate look, except one case. **Limitation:**
Extensions and Themes waits for its own stylesheets before its first layout, and until
its root element exists Firefox paints the empty document in its default canvas colour
(`#1c1b22` in dark mode, also the colour of Zen's native Extensions page) for about
30 ms (2 frames at 60 Hz). No page sheet or actor can style a document with no element;
changing that colour needs a browser colour preference, which Artemis does not write.
Forcing an earlier layout would show the page without its own CSS, which is worse. The
grey of a brand-new empty tab before any page loads is Zen's and is not part of Settings.

Before a page paints at all, its tab shows the empty `<browser>` element, which Zen
paints flat grey. Keyboard Shortcuts runs in its own process, so that grey showed while
the process started (about 400 ms) or switched (about 200 ms), which is what read as
"Zen's colours first" in a real browser (the earlier measurement had always opened
Settings first). `scripts/settings/settings-browsers.mjs` (per window) marks a tab's
browser `[artemis-settings-browser]` from the moment a Settings page load starts, and
`styles/features/settings/style.css` (chrome, gated on the switch and forced colours)
makes it transparent, so the window's own workspace background shows until the page
paints the same background. The module also publishes fresh Keyboard Shortcuts values
as such a load starts (the values published at startup could predate the workspace
gradient). Measured in a visible window: cold start straight into Keyboard Shortcuts,
and every navigation between Settings, Extensions and Keyboard Shortcuts, show only the
workspace background; a brand-new tab shows Zen's blank-tab grey for about 40 ms before
any load starts, as for every page.

| Page | Document | Technique | Notes |
|---|---|---|---|
| Settings (`about:preferences`): Zen panes, Firefox panes, navigation, search | Shared, parent process | Window actor `ArtemisSettingsPage` (child only) attaches the styling when the root element is created: `scripts/settings/page.mjs` loads `styles/runtime/settings-page.css` (author; imports the shared tokens) and `styles/runtime/settings-controls.css` (user) and mirrors the window's tokens and background. Sine's `artemis-settings.uc.js` still attaches Artemis's own dialog enhancer (§7.2) | Zen panes: `hbox.subcategory` + `groupbox` become one card. Firefox panes: design tokens |
| Sine's mod page and every mod's settings dialog, Sine's own settings, store readmes | Same document | Same sheet; the module marks each card's visible first and last row (`[artemis-card~="start"/"end"]`) | Each separator starts a card, text rows are headings between cards, per-row margins inside a card are replaced by Artemis's row spacing; order, controls, sizes and behaviour stay the mod's |
| Extensions and Themes (`about:addons`) | Separate document, parent process | The same `ArtemisSettingsPage` actor and page styling | Does not depend on Sine's per-mod include list (an installed copy may never refresh it). Extensions' own options pages stay native |
| Keyboard Shortcuts (`about:keyboard`) | Separate document in the privileged-about content process; Sine runs no mod scripts there, and Zen exposes no workspace colours there | Window actor `ArtemisKeyboard`: the child applies the last published values when the root element is created, then the parent sends the live values for its window; values become `--artemis-s-*`. `content.css` imports `styles/pages/settings-keyboard.css`, scoped with `@-moz-document url-prefix("about:keyboard")` and gated with `-moz-pref("artemis.settings.style")`; it imports the shared tokens, which apply only on `:root[artemis-settings-page]` | Without JS, named transparency and radius steps and Zen's plain window colour |
| Zen support | A website | Not styled | Website content is never restyled |
| Popup documents (Manage Exceptions and other subdialogs) | Own documents | Not styled | Kept native (owner, 2026-11-09); verified pixel-identical with the switch on and off |

Files: `scripts/settings/page.mjs` (mirroring, watching, card marking, page styling,
publishing values for Keyboard Shortcuts), `scripts/settings/settings-actors.mjs`
(registers both actors while at least one Artemis window runs; `artemis.uc.js`
retains/releases it, so disabling Artemis unregisters them and clears the shared values),
`page-child.mjs`, `keyboard-parent.mjs`, `keyboard-child.mjs`, `settings-browsers.mjs`
(per window: browser marking while a Settings page loads); `styles/features/settings/style.css`
(chrome: the marked browser is transparent);
`styles/pages/settings-tokens.css` (shared tokens), `styles/runtime/settings-page.css`
(author: pages, cards, light-DOM controls), `styles/runtime/settings-controls.css` (user:
shadow-tree controls), `styles/pages/settings-keyboard.css`.

Rules:

- **Strict scoping.** The page and controls sheets are only loaded into
  `about:preferences`, `about:settings` and `about:addons` (top-level documents only, so
  subdialogs stay native); the actors match only those and `about:keyboard*`. The CSS for
  `about:keyboard` sits in Sine's content sheet, which applies to every web page, so all of
  its rules are inside `@-moz-document`. The one exception is the shared token file it
  imports: custom properties and `accent-color` only, on `:root[artemis-settings-page]`, an
  attribute only Artemis's actors set, on Settings pages.
- **Graceful fallback.** Styling uses stable hooks first: Firefox design tokens, then
  generic element types for controls inside shadow trees (user sheet), then Zen's and
  Sine's class names. Never `::part()` and never Firefox's internal class names. If an
  update renames a token or element, that element keeps Firefox's or Zen's look and
  nothing breaks. Every JS step is guarded, and a failure leaves Zen's page untouched.
- **Clean teardown.** Turning the switch off, disabling Artemis (actors unregistered) or
  unloading a page removes everything Artemis added. `windowUtils` acts on whatever
  document a tab shows now, so a page's teardown leaves the sheets alone once its document
  is no longer the tab's current one: after a navigation to another Settings page in the
  same tab, they belong to the new page. Sine keeps one unload callback per script and
  window, so `artemis-settings.uc.js` tears down the enhancer in a single callback.
- **High contrast.** Everything is inside `@media not (forced-colors: active)`.
- **Live.** The module and the keyboard actor observe the switch, Artemis's glass prefs,
  Zen's transparent-browser pref, the OS reduce-transparency setting, the workspace
  background element, the window root and the page's size and place in the window.
- **Without JS** only `about:keyboard` is styled (named steps); the other pages stay native.
- **Reduced motion.** Control transitions (background colour only) run only with
  `prefers-reduced-motion: no-preference`.
- **Other themes.** Another theme's own user-origin `!important` rules for these pages
  outrank any page stylesheet. With Nebula enabled, for example, Nebula's darker
  background for Zen's section bodies wins, so a card's heading band is slightly lighter
  than its body; everything else keeps Artemis's look.

Fragile dependencies, re-checked after every Zen or Sine update (`tools/zen/settings-native.sh`,
`tools/zen/checks/settings-style.js`, `tools/zen/checks/settings-corners.js`,
`tools/zen/checks/settings-navigation.js`, `tools/zen/checks/settings-load.js`):

| Dependency | Used for | If it changes |
|---|---|---|
| Firefox design tokens (`--button-*`, `--border-color*`, `--focus-outline-color`, `--color-accent-primary*`, `--input-*`, `--panel-*`, `--card-*`, `--box-*`; host tokens of `moz-page-nav`, `moz-toggle`, `panel-list`, `panel-item`) | Every Firefox control on Firefox panes, `about:addons` and `about:keyboard` | Those elements fall back to Firefox's look |
| User sheets apply inside shadow trees; `input[type=checkbox/radio]` inside `moz-checkbox`/`moz-radio` | Checkbox and radio marks | Firefox's marks |
| XUL: `.checkbox-check`, `.radio-check`, `menulist` > `menupopup`, `[_moz-menuactive]` | Zen's and Sine's checkboxes, radios and dropdown lists | Zen's look |
| JSWindowActor `DOMDocElementInserted` event; `Services.ppmm.sharedData` | Styling before the first paint | Styling arrives at `DOMContentLoaded` / after the actor message (a brief flash) |
| Tabs progress listener (`STATE_START`, `onLocationChange`); the `<browser>` element's background | Workspace background while a Settings page's process starts | Zen's grey while loading |
| Popups: `::part(content)` of `panel`/`menupopup`, `popuppositioned`/`popupshown`, `#ContentSelectDropdown` | Workspace glass in menus and panels | The solid tinted surface |
| `CanvasRenderingContext2D.drawWindow` (chrome) | Keyboard Shortcuts gutter colour | Zen's dark base in the gutter |
| Sine: `.auto-update-toggle[enabled]` (accent fill, inverted icon), `search-addons > moz-button`, `moz-message-bar` base colour tokens | Auto-update state, Extensions search button, notices | Sine's or Firefox's look |
| Zen: `gZenThemePicker.browserBackgroundElement` / `#zen-browser-background::after` (background layers), the window root's background colour, `--zen-primary-color` | Page background and tint | The background falls back to Zen's plain window colour |
| Zen markup: `hbox.subcategory` + `groupbox`, `.visually-hidden` (search), `#search-container` | Zen pane cards, search results, sticky search | Zen panes fall back to native |
| Sine markup: `dialog.sineItemPreferenceDialog`, `.sineItemPreferenceDialogTopBar/Content`, `.separator-label`, `.sineItemPreferenceLabel`, `.sineItem`, `.sineInstallationItem`, `#sineInstall*Group`; one unload callback per script | Dialog and mod-page cards, teardown | Sine's own look; Artemis's enhancer already has the same dependency (§7.2) |
| `about:addons` markup (`addon-card .card`, `addon-page-header`, `input.shortcut-input`) | Extension cards, header, shortcut fields | Firefox's look |
| `about:keyboard` markup (`customkeys-sidebar`, `moz-card`, `input.shortcut-input`) | Sidebar panel, cards, shortcut fields | Firefox's look |

### 7.4 Not built

A separate settings window, a CSS editor, an About section, feedback links (Sine already
links to the repository), a changelog viewer, an update checker, diagnostics, sound effects,
and a master on/off switch (Sine already has one).

---

## 8. JavaScript runtime

### 8.1 Files

| File | Loaded | Responsibility |
|---|---|---|
| `scripts/artemis.sys.mjs` | Once per session (F10) | Entry point. Seeds defaults, runs migrations and exposes the shared API to windows |
| `scripts/core/schema.mjs` | Imported | Reads `preferences.json`; validates a setting/value pair; lists declared, default and internal prefs. Used by every other part |
| `scripts/core/storage.mjs` | Imported | Artemis data directory, backups (v1.0), profiles (v1.1) |
| `scripts/core/migrations.mjs` | Imported | Ordered schema migrations (§11.4) |
| `artemis.uc.js` | Each `browser.xhtml` window | Bootstrap: re-entry guard, unload listener, window bridge, module registry |
| `scripts/window/bridge.mjs` | Imported | Mirrors custom values to `--artemis-live-*` on the window root |
| `scripts/window/onboarding.mjs` | Imported | First-launch tour (§12) |
| `artemis-settings.uc.js` | `about:preferences`, `about:settings` | Bootstrap for the settings enhancer (the page styling is attached by a window actor, §7.3) |
| `scripts/settings/page.mjs` | Imported | Settings page styling (§7.3): loads `styles/runtime/settings-page.css` and `settings-controls.css`, mirrors the window's tokens and workspace background, marks card edges, publishes values for Keyboard Shortcuts |
| `scripts/settings/page-child.mjs` | Window actor child | Attaches the page styling to `about:preferences`, `about:settings` and `about:addons` before their first paint |
| `scripts/window/popup-glass.mjs` | Imported by `artemis.uc.js` (per window) | Copies the workspace background into menus and non-toolbar panels as they open (`artemis.popups.style`); toolbar (arrow) panels are genuinely translucent instead |
| `scripts/settings/settings-browsers.mjs` | Imported by `artemis.uc.js` (per window) | Marks a tab's browser while it loads or shows a Settings page (transparent until the page paints) and publishes fresh Keyboard Shortcuts values as such a load starts |
| `scripts/settings/settings-actors.mjs` | Imported by `artemis.uc.js` | Registers the Settings page (`about:preferences`, `about:settings`, `about:addons`) and `about:keyboard` window actors (§7.3) while Artemis runs |
| `scripts/settings/enhancer.mjs` | Imported | Settings enhancer for Artemis's own dialog (§7.2) |
| `scripts/strings.mjs` | Imported | All user-visible strings that are not in `preferences.json`, in one English table keyed by id, ready for later localization |

Modules imported with `ChromeUtils.importESModule` are shared singletons, so every window
and the settings page see the same state.

### 8.2 Window lifecycle

1. If a previous Artemis instance exists on the window, destroy it (F13, F24).
2. Create the instance. Start the bridge and every registered module whose gate is active.
3. Register teardown with `window.addUnloadListener` (F12, A6). Teardown removes listeners,
   observers, DOM and timers, and deletes the instance.

Module contract, used for the tour and for later behavioural features:

```js
export default {
  pref: "artemis.<area>.<feature>",   // gate; omitted for always-available modules
  init(window) {},                    // add listeners/DOM; must be idempotent
  destroy(window) {},                 // remove exactly what init added
};
```

The registry observes gate prefs and calls `init`/`destroy` live. A module uses only
public Zen/Firefox APIs, events and attributes. If one ever has to wrap a Zen method, it
checks the method exists, keeps the original, restores it in `destroy`, and fails safe if
the method's shape has changed.

### 8.3 Default seeding

**Problem (F1–F3):** without seeding, a default-on feature is off on a fresh install. Then,
the first time the settings open, Sine writes every default into `prefs.js` as a user value.
After that, changing an Artemis default would no longer reach existing users.

**Design:** at each startup, `artemis.sys.mjs` writes each declared default to the
**default branch**.

- `-moz-pref()` reads default-branch values (F21). Sine treats them as existing, so it
  writes nothing (F4).
- User values always win, so seeding can never overwrite a choice.
- The values are in memory only. Nothing is written to disk, and nothing is left after
  uninstall.
- Only declared `artemis.*` names are seeded. A pref whose existing type differs is skipped.
  No other pref is ever touched.
- `artemis.uc.js` repeats the same idempotent seed if the background module did not run
  (for example, when the mod is enabled mid-session).

A1 and A2 passed in M1. `schema.mjs` reads `preferences.json` **synchronously** at import,
through the chrome registry and a file stream, and seeding finished about 0.5 s before first
paint. The generated defaults table fallback is therefore not needed.

### 8.4 Window bridge

The bridge observes the `artemis.*` custom-value prefs and writes their validated values to
`--artemis-live-<name>` on each browser window's root. It does nothing else. It keeps custom
values live when they change from any source: `about:config`, reset, import or profile
switch (F6). If A9 fails, it also mirrors gate prefs to root attributes.

### 8.5 Rules

- `IOUtils` writes are allowed **only** in `scripts/core/storage.mjs`, and only inside the
  Artemis data directory (§11.1).
- User-branch pref writes are allowed only through `schema.mjs` helpers that validate first:
  reset, restore, migrate, import, profiles, and tour controls. Non-`artemis.*` prefs are
  never written.
- No network requests. No assignments to built-in prototypes. Every timer and observer is
  cleaned up in `destroy`.
- `check.py` enforces these where they can be found by searching the code.
- `supportsUnload: true` goes into `theme.json` after A6 is verified.

---

## 9. CSS architecture

### 9.1 Layers

1. **`styles/core/tokens.css` and `motion.css`:** custom properties only. They have no
   visible effect alone, so turning features off truly restores native styling. The
   revision-1 "always-on `base.css`" is dropped (§21).
2. **`styles/features/<area>/<feature>.css`:** one file per setting, with exactly **one
   top-level gate** on its own pref, combined with its area master if it has one. Dropdowns get one block per non-native value.
3. **`styles/pages/`**: internal pages, gated the same way, loaded from `content.css`,
   and always scoped to their browser-owned URL with `@-moz-document`, so websites are
   never affected. The first page is Keyboard Shortcuts (§7.3); other internal pages
   follow in v1.2.

Entry files (`chrome.css`, `content.css`) contain only ordered `@import` lines:
tokens → motion → features by area.

### 9.2 Tokens and glass

- **Colour:** `--artemis-accent` (Zen accent, or the custom accent validated through
  `@property`), plus surface, raised-surface, hover, selected, hairline and muted-text
  tokens, all built with `light-dark()` on Zen's tokens (F23).
- **Glass:** `--artemis-glass-alpha` comes from `appearance.transparency` and
  `--artemis-glass-blur` from `appearance.blur`. Surfaces combine a translucent tint with
  `backdrop-filter: blur()` (A5) and a hairline border for definition. `solid` / `none`
  give opaque, unblurred surfaces. Glass surfaces must be elements inside the normal window
  tree. Backdrop blur does not apply to elements appended directly to the root (M1).
- **System settings:** the OS "reduce transparency" setting makes Artemis's *default*
  glass opaque and unblurred, following Zen's own behaviour. An explicit Artemis choice of
  transparency or blur takes precedence. The window bridge sets `[artemis-explicit-glass]`
  on the root while any of those prefs has a user value, because CSS cannot tell a user
  value from a default. Without JS the OS is always respected (fixed after v1.0.0, where the
  OS setting silently overrode an explicit 10% opacity). "Reduce motion" makes Artemis
  animations step aside (§10). The owner's development machine has both system settings
  on (see TESTING.md).
- **Panel opacity:** the named transparency steps give large text panels a readability
  boost (`--artemis-glass-panel-opacity`, e.g. 72% → 84.6%). A custom opacity is applied
  exactly on every surface.
- **Compact sidebar tint:** the floating sidebar's glass is tinted by Zen's own workspace
  gradient layers (`.zen-toolbar-background::before/::after`), scaled by the glass opacity
  and keeping Zen's crossfade (`--zen-background-opacity`). At 100% opacity the surface is
  exactly Zen's. (v1.0.0 hid those layers and painted a near-black neutral surface, which
  looked much darker than the workspace.)
- **Shape:** `--artemis-radius` plus derived inner and outer radii, following Zen's
  squircle setting when it is enabled.
- **Spacing:** a 4px-based scale multiplied by the `appearance.spacing` step.
- **Motion:** durations and easings scaled by `motion.intensity` (§10).

Features only **read** tokens and never redefine them, and tokens never test feature prefs.

### 9.3 Specificity

Sine loads Artemis as a **user** sheet. Zen's CSS is an **author** sheet, so overriding a
property Zen sets needs `!important` on that declaration. That is the only place it is used.
There is no `@layer`. `check.py` reports the `!important` count per file.

### 9.4 Selectors

- Use Zen's root attributes (F19), its prefs via `-moz-pref()` (F20, F30) and stable IDs.
- Not allowed: `nth-child` to identify specific elements, matching inline `style` strings,
  `-moz-bool-pref`, and `:has()` on `:root`/`#main-window`. A scoped `:has()` is fine.
- Main-window rules use main-window IDs, so they cannot leak into other chrome windows (F8).
  The PiP window and dialogs are scoped with `@-moz-document`.
- Filenames are lowercase, and every import must match its file's exact case (`check.py`).

### 9.5 Layout support

Required (revised 2026-11-08, owner decision): every layout Zen offers — **Single toolbar,
Multiple toolbars and Collapsed** — each with the sidebar on the left and right
(`zen-right-side`) and compact mode on and off, in light and dark, and with multiple
windows (prefs are global, so every window updates together). Horizontal tabs are not
offered by Zen (A13) and are not supported; this is revisited if Zen ships them. Features
adapt through Zen's own state, never through Artemis layout settings. A feature that cannot
apply in some layout does nothing there; for example, `folders.indent-guide` does nothing
in a collapsed sidebar.

Primary configuration: Zen 1.24.1b, Windows, compact on, sidebar collapsed, multiple
toolbars, dark.

### 9.6 Performance

- Large surfaces animate only `transform` and `opacity`. Small controls (tabs, buttons,
  rows, workspace icons) may also fade `background-color`, `box-shadow`, `color` and
  `filter` for hover feedback. No animated size or margin.
- Blur is limited to bounded surfaces. There is no full-page blur: `urlbar.dim-page` dims
  the page instead.
- Glass costs are measured in M1 (A12). Defaults are lowered if the cost is noticeable.

---

## 10. Motion

Each animation is one setting with up to three states:

| State | Meaning |
|---|---|
| `artemis` | Artemis's animation (default where it adds to the experience) |
| `zen` | Zen's native animation for that element, untouched |
| `off` | No animation. Where Zen animates the element, Artemis suppresses Zen's transition too |

- Where Zen has no native animation for an element, the setting offers only `artemis` and
  `off` (A11). This is stated in its description.
- **`motion.intensity`** (`gentle | standard | lively`) scales duration and travel distance
  of animations in the `artemis` state only. It has no "off" value, it never changes an
  animation's state, and it never affects `zen` or `off`.
- **System reduced motion:** Artemis animations step aside and the native behaviour applies.
  On Windows that means no panel animation, because Firefox follows the system "Animation
  effects" setting. States are never changed. (Revision 1 planned a short fade instead;
  following the OS was chosen at M4, and Firefox makes the same choice.)
- **v1.0 motion settings:** `intensity`, `hover`, `popups`. The compact sidebar, tab
  open/close, folder and workspace animations are JavaScript-driven in Zen, so they stay
  native and are not Artemis settings (owner decision, 2026-11-08; A11).
- Each animation lives in its own feature file and its own gate. Intensity is a token read
  through motion variables.

---

## 11. Profiles, backups, import/export and migration

These are built progressively. v1.0 contains only what reset-all and migration need, but
the formats are versioned from the start so later features need no rework.

### 11.1 Data directory and snapshot format

- Directory: `<Zen profile>/artemis/` (created on first write). It sits outside the mod
  folder because Sine may replace the mod folder during updates. Uninstalling the mod
  leaves it in place, which is documented, and it is small.
- **Snapshot**, the one format used for backups, export and profiles:

```json
{
  "format": "artemis-settings",
  "schema": 1,
  "artemisVersion": "1.0.0",
  "createdAt": "2026-11-08T12:00:00Z",
  "settings": { "artemis.tabs.shape": "pill", "artemis.motion.popups": "off" }
}
```

  `settings` is **sparse**: it holds user values only, never defaults, so a snapshot keeps
  following future changes to Artemis defaults for every setting the user never touched.
  Internal prefs are excluded.

### 11.2 Backups (v1.0)

- Taken automatically before reset-all, restore, migration, and later before import and
  profile overwrite or delete.
- Kept as `backups/<timestamp>-<reason>.json`. The 10 newest are kept and older ones are
  deleted.
- Restored from the settings enhancer after confirmation. Restoring takes its own backup
  first.

### 11.3 Export / import (v1.1)

- Export writes a snapshot through the standard file picker.
- Import validates the format and schema, migrates old schemas, checks every key is
  declared and not internal, checks types, checks dropdown values are allowed, and checks
  string `pattern`s. It shows what will change and what was rejected, takes a backup, then
  applies the result in a single operation.

### 11.4 Settings migration (v1.0 framework)

- `artemis.internal.schema` (int, user value) records the settings schema the user's
  values match.
- At startup, `migrations.mjs` runs each ordered step above that number, for example
  renaming a pref while keeping its user value, or mapping old dropdown values. A backup is
  taken first.
- A user value that cannot be migrated is kept untouched, and the user sees a one-time
  notice in the settings enhancer naming the affected settings. Unrelated prefs are never
  reset.
- Rules: a released pref is never reused with a different meaning, and every rename or
  value change ships with a migration step plus a `check.py` fixture test.

### 11.5 Profiles (v1.1 and later)

- **Model:** a profile is a named sparse snapshot. **Default** is built in. It is the empty
  snapshot (pure Artemis defaults), and it cannot be deleted or renamed.
- **Storage:** `profiles.json` in the data directory. The active profile id is in
  `artemis.internal.profile` (user value), so it survives restarts.
- **Switching:** clear every non-internal `artemis.*` user value, apply the target
  snapshot's validated values, then set the active id. Prefs are global, so every window
  updates at once.
- **Editing:** while a user profile is active, changes are written back to it. While
  Default is active, the first change shows a choice to save the changes as a new profile.
  The exact interaction is designed with the profile UI.
- **Operations:** create, save, duplicate, rename, delete (with confirmation, and never for
  Default). Each overwrite or delete takes a backup.
- **Automatic switching** (later than v1.1): triggers such as system light/dark,
  workspace or time of day. Off by default, and manual switching is always available.

---

## 12. First-launch tour (v1.0)

- **Trigger:** the first browser window after install, when `artemis.internal.onboarding`
  has no value and JS is active. Only one window shows it (claimed through the shared
  module).
- **Content:** a small floating Artemis-styled card with four short steps, each combining
  explanation with real controls that write the actual prefs live:
  1. Welcome: the logo, one line, *Start* / *Skip*.
  2. Look: transparency, corner radius, accent (Zen or custom).
  3. Sidebar and tabs: tab shape, tab height, workspace switcher.
  4. Motion and finish: intensity, plus where to find all settings.
- **Skip:** available at every step. Choices made so far are kept, because they were
  already written. State becomes `skipped`.
- **Finish:** state becomes `completed`. In both cases the tour never reappears on its own.
  Closing the window mid-tour is not a skip, so the tour shows again next launch.
- **Reopen:** *Take the tour* in the settings enhancer.
- Existing users updating to the first version with a tour see it once.

---

## 13. Scope map

The goal is all browser-owned UI. Website content is never restyled.

| Area | Release | Technique | Notes |
|---|---|---|---|
| Window frame, sidebar, tabs, essentials, folders | v1.0 | chrome CSS | Core |
| Address bar and results | v1.0 | chrome CSS | |
| Toolbar and navigation | v1.0 | chrome CSS | |
| Menus, context menus, app menu, extensions/downloads panels | v1.0 | chrome CSS | Panels share one popup treatment |
| Find bar | v1.0 | chrome CSS | |
| Workspaces switcher and creation | v1.0 | chrome CSS | |
| Sidebar media controls | v1.0 | chrome CSS | |
| Settings enhancer, tour | v1.0 | JS | |
| Download notifications and animations | v1.1 | chrome CSS | |
| Tab-modal and window dialogs | v1.1 | chrome CSS, `@-moz-document` | |
| Remaining v1.1 features (§14.3) | v1.1 | CSS | |
| Profiles, export/import | v1.1 | JS | |
| Settings experience: `about:preferences` (Zen and Firefox panes), Sine and every mod's settings, `about:addons`, `about:keyboard` | Next release (approved 2026-11-09) | JS author sheet and window actors; `about:keyboard` scoped content CSS (§7.3) | One switch, `artemis.settings.style` |
| Zen welcome/onboarding screens | v1.2 | chrome/content CSS | Verify where they render |
| Internal pages: new tab, error pages, `about:` pages | v1.2 | content CSS (A3) | |
| Reader mode, PDF viewer | v1.2 | content CSS | Own implementation, not Natsumi's |
| PiP window, Library window | v1.2 | chrome CSS | |
| Behavioural enhancements (§14.4) | v1.3+ | JS modules | Each needs approval |
| Automatic profile switching | v1.3+ | JS | Off by default |

---

## 14. Settings inventory

### 14.1 v1.0 foundation (tokens and area styles)

| Pref | Type | Values | Default |
|---|---|---|---|
| `appearance.accent` | dropdown | `zen` · `custom` | `zen` |
| `appearance.accent-color` | string `<color>` | | `#7c8aff` |
| `appearance.transparency` | dropdown | `solid` · `low` · `medium` · `high` · `custom` | `medium` |
| `appearance.transparency-custom` | string `<percentage>` (opacity) | | `72%` |
| `appearance.blur` | dropdown | `none` · `light` · `medium` · `strong` · `custom` | `medium` |
| `appearance.blur-custom` | string `<length>` | | `18px` |
| `appearance.radius` | dropdown | `zen` · `small` · `medium` · `large` · `custom` | `medium` |
| `appearance.radius-custom` | string `<length>` | | `10px` |
| `appearance.spacing` | dropdown | `tight` · `balanced` · `relaxed` | `balanced` |
| `window.frame` | checkbox: Artemis window frame and page edge | | on |
| `sidebar.style` | checkbox: Artemis sidebar surface, including the floating compact sidebar | | on |
| `tabs.style` | checkbox: Artemis tab surfaces, hover, multi-select, close button | | on |
| `essentials.style` | checkbox: Artemis essentials tiles | | on |
| `urlbar.style` | checkbox: Artemis address bar and results popup | | on |
| `toolbar.style` | checkbox: Artemis toolbar and navigation buttons | | on |
| `popups.style` | checkbox: Artemis menus, context menus and panels | | on |
| `popups.findbar` | checkbox: floating Artemis find bar | | on |
| `workspaces.switcher` | dropdown | `zen` · `minimal` · `dots` | `minimal` |
| `media.controls` | checkbox: Artemis media controls card | | on |

All names start with `artemis.`. Custom-value fields are shown only for `custom`.
`popups.menus` was renamed `popups.style` before any release, so every area master follows
the same `<area>.style` pattern (`window.frame` excepted). The rename needs no migration.

**Area masters** (§6.1):

| Master | Features it overrides |
|---|---|
| `window.frame` | `window.edge-to-edge` |
| `sidebar.style` | `sidebar.hide-scrollbar` |
| `tabs.style` | `tabs.height`, `tabs.shape`, `tabs.active-highlight`, `tabs.separators`, `folders.indent-guide` |
| `urlbar.style` | `urlbar.dim-page` |
| `toolbar.style` | `toolbar.logo-menu-button` |
| `popups.style` | `popups.findbar` |
| (none) | `essentials.style`, `media.controls`, `workspaces.switcher` (each is its own switch); appearance tokens; motion |

### 14.2 v1.0 optional features and motion

| Pref | Type | Values | Default |
|---|---|---|---|
| `window.edge-to-edge` | dropdown | `off` · `compact` (only in compact mode) · `always` | `off` |
| `sidebar.hide-scrollbar` | checkbox | | on |
| `tabs.height` | dropdown | `zen` · `compact` · `regular` · `tall` | `regular` |
| `tabs.shape` | dropdown | `zen` · `rounded` (follows radius) · `square` · `pill` | `rounded` |
| `tabs.active-highlight` | checkbox: accent tint and hairline on the selected tab | | on |
| `tabs.separators` | checkbox | | off |
| `folders.indent-guide` | checkbox | | on |
| `urlbar.dim-page` | checkbox: dim the page behind the open address bar | | on |
| `toolbar.logo-menu-button` | checkbox: Artemis logo as the app-menu button | | on |
| `motion.intensity` | dropdown | `gentle` · `standard` · `lively` | `standard` |
| `motion.hover` | motion | `artemis` · `zen` · `off` | `artemis` |
| `motion.popups` | motion | `artemis` · `zen` · `off` | `artemis` |
**v1.0 total: 31 user settings** (19 foundation + 9 optional + 3 motion), plus internal
prefs `artemis.internal.schema`, `artemis.internal.onboarding` and `artemis.internal.debug`.
`motion.sidebar`, `motion.tabs`, `motion.folders` and `motion.workspaces` were dropped from
v1.0 (owner decision, 2026-11-08), because those animations are JavaScript-driven in Zen
(A11).

Not duplicated, because Zen already does it: sidebar auto-hide (compact mode), the gap
around the page (`zen.theme.content-element-separation`), fading of unloaded tabs, the
essentials favicon tint, the loading indicator, the URL bar container label, and hiding
window buttons.

### 14.3 v1.1 candidates (secondary CSS features)

`window.hide-page-shadow`, `window.quiet-controls`, `tabs.audio-indicator`,
`tabs.container-indicator` (`zen`/`subtle`/`hidden`), `tabs.desaturate-unloaded`,
`essentials.idle-grayscale`, `folders.background`, `urlbar.quiet-icons`,
`toolbar.status-panel` (`zen`/`floating`/`hidden`), `toolbar.bookmarks-autohide`,
`workspaces.hide-name`, `popups.hide-menu-separators`, `downloads.style`, `dialogs.style`,
`motion.tab-switch`, `motion.page-loading` (default off), `motion.downloads`.

### 14.4 Later candidates (each needs approval)

**Behaviour (JS modules, v1.3+).** Each has a `zen` state and is independent:

- refined compact-mode reveal (delay, edge trigger, keep open while dragging), only if it
  is more granular than Zen's own setting;
- toolbar visibility rules;
- extra keyboard shortcuts, e.g. hold Ctrl to show tab numbers;
- workspace automation;
- scrolling inside tall tab groups;
- media artwork background;
- PDF colour inversion;
- a favicon-tinted active highlight;
- a more detailed accent (separate selection and focus colours), only if it proves useful.

**Excluded** (unchanged from revision 1, with reasons): another platform's window buttons,
full-page blur, custom fonts, AI features, network-dependent features, Ctrl+Z tab reopen
(it hijacks Undo), behavioural replacements of whole Zen features (split essentials, custom
PiP controls), and remote-page features.

---

## 15. Releases and roadmap

### 15.1 Release channel and branches

Sine installs and updates **GitHub installs from `main`** (F29), and a fresh install always
takes `main`'s current contents. Therefore:

- **`main` is always releasable.** It only ever contains finished, tested features.
- Development happens on **`dev`**, with short-lived `feat/*` branches merged into `dev`.
  Unfinished features never reach `main`, so public users cannot access them.
- `theme.json` always has an explicit `updatedAt`. It changes only in a release commit, so
  an ordinary push to `main` (for example, docs) does not make Sine offer an update (F29).
- **Release:** run `check.py` and the manual matrix, bump `version` and `updatedAt`, update
  `CHANGELOG.md`, merge `dev` → `main` (fast-forward or merge commit, never force), tag
  `vX.Y.Z`, and publish a GitHub Release with notes.
- Semantic versioning: `0.x` during development (not submitted to the store), and `1.0.0`
  as the first public release. Store submission (an issue on `sineorg/store`) is outside
  this repository, so it is confirmed with the owner first.
- Before `1.0.0` there is no `theme.json` on `main`, so nobody can install a work in
  progress.

### 15.2 v1.0 milestones (on `dev`)

| Milestone | Content | Exit criteria |
|---|---|---|
| **M0 Scaffold** | §20.2 | `check.py` passes; installing in the test profile shows no visible change |
| **M1 Verification spike** | A1–A12 in the test profile | Results in `docs/TESTING.md`; seeding approach confirmed or switched to the fallback |
| **M2 Identity and sidebar/tabs** | Tokens, glass, `window.frame`, `sidebar.*`, `tabs.*`, `essentials.style`, `folders.indent-guide`, `window.edge-to-edge` | Four-layout matrix in light and dark; both area-style states for each feature |
| **M3 Remaining core areas** | URL bar, toolbar and logo button, menus/popups, find bar, workspaces switcher, media controls | Same as M2, plus right side and multiple windows (horizontal tabs dropped: A13) |
| **M4 Motion** | Intensity and the six motion settings | Three states each; reduced motion; no layout animation; frame-time check |
| **M5 Runtime** | Seeding, bridge, settings enhancer, reset/reset-all, backups and restore, migration framework (schema 1), tour | §16.4 runtime procedures pass |
| **M6 Release hardening** | Full matrix, performance pass, README, screenshots, CREDITS, CHANGELOG (LICENSE added 2026-11-08) | → **v1.0.0** |

### 15.3 After v1.0

- **v1.1:** secondary features (§14.3), downloads and dialogs, export/import, basic profiles.
- **Next release:** the Settings experience (§7.3), brought forward from v1.2 (owner, 2026-11-09).
- **v1.2:** other internal pages, reader mode/PDF, PiP and Library.
- **v1.3+:** behavioural modules and automatic profile switching, each approved separately.

---

## 16. Testing and validation

Nothing here touches the owner's real Zen profile, its preferences, its Sine configuration
or other mods.

### 16.1 Static checks: `python3 tools/check.py`

1. **Preferences schema:** valid JSON; `artemis.` prefix and naming pattern; allowed types;
   defaults match their types; dropdown defaults are among the options and
   `placeholder: false` is set; string prefs have a valid default and a `pattern`;
   conditions refer to declared prefs; every setting has a `description`.
2. **Declared ↔ used:** every declared pref is read in CSS/JS; every read is declared or
   internal; every pref is documented in `docs/PREFERENCES.md`.
3. **Imports:** each resolves with exact case; no feature file is left unimported;
   filenames are lowercase.
4. **Gating:** each feature file has one top-level gate on its own pref plus its declared
   area master, and reads no other feature's pref.
5. **CSS hygiene:** forbidden selectors (§9.4); animations outside motion files; animated
   non-transform/opacity properties (warning); `!important` count per file; balanced braces.
6. **JS rules:** `IOUtils` writes outside `storage.mjs`; non-validated pref writes; network
   APIs; prototype assignments; syntax check with `node.exe --check` (skipped with a notice
   if Node is absent).
7. **Assets and provenance:** every referenced asset exists; every file in `assets/` is
   listed in `CREDITS.md`.
8. **Migrations:** fixture snapshots for each old schema migrate to the expected result.
9. **Manifest:** `theme.json` fields are present; `version` is semver; `updatedAt` is ISO;
   `version` matches the newest `CHANGELOG.md` entry on release.

### 16.2 Test profile

A separate Zen profile outside the repository, for example `C:\Users\PlayrZ\ZenArtemisTest\`,
launched with `zen.exe -no-remote -profile <path>`. It gets its own copy of Sine's
`chrome/utils` and `chrome/JS`, a `mods.json` containing only Artemis, and a directory
junction `sine-mods/Artemis` → the repository. Test prefs:
`toolkit.legacyUserProfileCustomizations.stylesheets=true`, `sine.allow-unsafe-js=true`,
`sine.auto-updates=false`, `sine.enable-dev=true`. Creating it is outside the repository,
and the owner approved it (2026-11-08). Exactly what was created is documented in
[`TESTING.md`](TESTING.md).

### 16.3 Matrix

| Dimension | Values |
|---|---|
| Zen layout | Single toolbar · Multiple toolbars · Collapsed (all three required) |
| Compact mode | on · off |
| Side | left · right |
| Scheme | dark · light |
| Windows | one · several (settings sync) |
| Motion | each state; intensity steps; system reduced motion |
| Area style | Artemis · native (for every feature in that area) |

A10 holds. `tools/zen/` (a Node.js built-ins-only Marionette client, run with the Windows
Node.js) drives the test profile: it sets prefs for each matrix cell and runs check
scripts. Marionette screenshots omit backdrop blur, so glass is checked with a real screen
capture of the test window. That makes the 3 layouts × compact on/off × left/right matrix
(12 cells, plus light-scheme cells) repeatable after every change. Without it, the matrix is
run by hand. Either way, results and the Zen/Sine versions are logged in
`docs/TESTING.md`.

### 16.4 Procedures

- **Fresh install:** no settings opened; default features visible; no `artemis.` lines in
  `prefs.js`.
- **Settings neutrality:** opening and closing Artemis's settings writes nothing (F4).
- **Independence:** each setting changes only its own element, in both area-style states.
- **Interactions:** all features of an area together and in pairs; cross-area pairs on
  shared elements.
- **Native restoration:** each feature's native state matches Zen with Artemis disabled
  for that element (screenshot comparison where Marionette is available).
- **Persistence:** values survive a restart; untouched settings keep following defaults.
- **Live:** every change applies without a restart, in every open window.
- **Runtime:** reset one setting, reset all, then restore; migration from fixture prefs;
  tour skip and finish, then reopen; enhancer inactive in other mods' dialogs; enhancer
  falls back cleanly when its markers are missing.
- **Lifecycle:** disable and re-enable Artemis, toggle another JS mod (F13), "Refresh mods",
  open and close windows. Afterwards there is one instance per window, no leftover
  observers, and no console errors.
- **Without JS:** unsafe-JS off. The CSS works, all features start native, and nothing
  breaks.

---

## 17. Licensing and provenance

### 17.1 References

| Source | Licence | Policy |
|---|---|---|
| Nebula, Neo Zen (≥1.2.3) | GPL-3.0 | Ideas only. No code |
| Arc 2.0 | No licence file | Ideas only (inspiration) |
| Zia | MIT (except `tidy-downloads/`) | Ideas preferred. Adapted code would keep its notice |
| Natsumi PDF CSS | MIT | Not used. Artemis writes its own |
| Apple SF fonts/symbols (in Arc) | Not redistributable | Excluded |
| Sine | MPL-2.0 | Not bundled |

### 17.2 Artemis licence

**Recommendation: MIT for the whole repository, including the logo.** It matches the
owner's goals: use, modification, forking, redistribution and commercial use. It applies
under these conditions:

1. All code is original, with no GPL or Arc code copied or closely paraphrased.
2. No third-party asset is included unless it is MIT-compatible and listed in `CREDITS.md`.
3. Logo terms are checked (§17.3).

**Adopted 2026-11-08** (owner approval, after the logo terms were checked, §17.3):
`LICENSE` contains the standard MIT text (`Copyright (c) 2026 nightmare`), and the
`theme.json` `license` field is `"MIT"`. The licence covers the repository including the
logo, to the extent of the rights held.

### 17.3 Logo provenance (facts, not legal conclusions)

- Concept and rough sketch: made by the owner in Paint.
- SVG markup: generated by Claude through the claude.ai chat interface from the owner's
  description. No third-party artwork was given as a reference.
- Refinement: edited by hand by the owner in the **SVG Vector Lab** online editor
  (<https://svgvectorlab.com/>).
- Terms checked: the version of Anthropic's Consumer Terms reviewed assigns to the user
  whatever rights Anthropic has in outputs, "if any" (F32). The same version also contains
  a clause restricting commercial use of the Services. Whether that clause affects outputs
  is not stated, and which version applies depends on the owner's account and region.
- Not claimed: whether AI-generated elements are protected by copyright, which differs by
  jurisdiction. The licence is granted to the extent the owner holds rights. `CREDITS.md`
  records the provenance above factually.
- Editor terms checked (2026-11-08, by the owner and re-read by Claude): SVG Vector Lab
  Terms of Use, effective August 9, 2026, <https://svgvectorlab.com/terms>. Users retain
  their rights in content used with the editor, and local processing does not transfer
  ownership to SVG Vector Lab. The terms grant the service no licence to user content and
  set no attribution, redistribution or commercial-use conditions on exported files. Exact
  quotations are in `CREDITS.md`.
- Result: no relevant restriction was found, so the MIT licence was adopted (§17.2).

### 17.4 `CREDITS.md` (created at M0)

- Inspiration only, no code: Arc 2.0, Nebula, Neo Zen, Zia, with the feature ideas each
  inspired.
- Platform: Zen Browser and Sine.
- Logo provenance as in §17.3.
- Third-party assets: none.

---

## 18. Store metadata

- **`ai`:** undocumented (F31). By convention it describes how much AI was used to create
  the mod. The values in use are `yes`, `partial` and `no`, and the maintainers' only tool
  reads `yes` as "Doomed AI slop". There is no official definition, but `partial`
  reasonably means "a person wrote substantial parts, with AI assistance". Under the agreed
  way of working, Claude writes most of the implementation and the owner directs, designs,
  reviews and tests. Read plainly, that is closer to **`yes`** than `partial`. **Decided: `yes`** (owner,
  2026-11-08). It is set in `theme.json`.
- **`license`:** `"MIT"` (set 2026-11-08, §17.2).
- **Other fields:** `id`, `name`, `description`, `author`, `version`, `homepage`, `readme`,
  `image`, `style`, `preferences`, `scripts`, `tags`, `fork: ["zen"]`, `createdAt`,
  `updatedAt` (always explicit, F29), and `supportsUnload: true` (A6 passed).

```json
{
  "id": "Artemis",
  "name": "Artemis",
  "description": "A refined, glassy theme for Zen Browser with independently configurable features.",
  "author": "nightmare",
  "version": "0.1.0",
  "homepage": "https://github.com/nightmaredotdev/Zen-Artemis",
  "readme": "https://raw.githubusercontent.com/nightmaredotdev/Zen-Artemis/main/README.md",
  "style": { "chrome": "chrome.css", "content": "content.css" },
  "preferences": "preferences.json",
  "scripts": {
    "scripts/artemis.sys.mjs": {},
    "artemis.uc.js": { "include": ["chrome://browser/content/browser.xhtml"] },
    "artemis-settings.uc.js": { "include": ["about:preferences*"] }
  },
  "tags": ["chrome", "content", "minimal", "glass"],
  "fork": ["zen"],
  "createdAt": "<first release date>",
  "updatedAt": "<release timestamp>"
}
```

---

## 19. Repository policy

- The repository is public, and the official repository stays under the owner's control.
- There is no contribution process and no promise to review pull requests. Forks are
  welcome under the licence. `README.md` says this plainly and neutrally.
- English only for now. Strings live in `preferences.json` and `scripts/strings.mjs`.
- Changelog: `CHANGELOG.md` plus GitHub Release notes for each tag.
- Claude's working rules, as set by the owner:
  - Claude commits, pushes, tags and releases autonomously.
  - Never force-push or rewrite published history.
  - Never publish unfinished or untested work.
  - Validate before every release.
  - Architectural, settings-model, storage, feature-boundary and scope changes need
    approval.
  - Approvals are recorded in `docs/DECISIONS.md`.
- Technical-debt reviews happen only when there is a concrete reason.

---

## 20. Directory structure and scaffold plan

### 20.1 Target structure (v1.0)

```
Artemis/
├─ theme.json                 Manifest (§18)
├─ preferences.json           Every user setting; Sine's UI and Artemis's schema source
├─ chrome.css / content.css   Ordered @import lists only (user origin, via Sine)
├─ parts.css                  Ordered @import list of *.parts.css (author origin, loaded by artemis.uc.js; F33)
├─ artemis.uc.js              Browser-window bootstrap (§8.2)
├─ artemis-settings.uc.js     Settings enhancer entry (§7.2)
├─ scripts/
│  ├─ artemis.sys.mjs         Background entry: seed, migrate, shared API
│  ├─ strings.mjs             English UI strings
│  ├─ core/                   schema.mjs · storage.mjs · migrations.mjs
│  ├─ window/                 bridge.mjs · onboarding.mjs
│  └─ settings/               enhancer.mjs
├─ styles/
│  ├─ core/                   tokens.css · motion.css
│  └─ features/<area>/        <feature>.css, one per setting
├─ assets/                    artemis.svg (canonical) and tour/UI assets if needed
├─ tools/                     check.py · fixtures/ · (matrix.py if A10 holds)
├─ docs/                      ARCHITECTURE · DECISIONS · PREFERENCES · TESTING
├─ README.md · CHANGELOG.md · CREDITS.md
└─ LICENSE                    MIT (§17.2)
```

Files are split only when a file outgrows one clear responsibility. Folders with nothing
in them are not created.

### 20.2 M0 scaffold (on `dev`, after approval)

| Path | Content at M0 |
|---|---|
| `theme.json` | Per §18, with no `ai`, `license` or `supportsUnload` |
| `preferences.json` | The *Appearance* tokens only (all of them read by `tokens.css`); other settings arrive with their features |
| `chrome.css`, `content.css` | Import lists for tokens and motion |
| `styles/core/tokens.css`, `motion.css` | Tokens and `@property` registrations; no visible rules |
| `artemis.uc.js` | Re-entry guard, unload listener, empty module registry |
| `scripts/artemis.sys.mjs`, `scripts/core/schema.mjs` | Seeding behind a debug log, used in M1 to test A1/A2 |
| `tools/check.py` | Checks 1–9 (those with no inputs yet pass trivially) |
| `docs/PREFERENCES.md`, `docs/TESTING.md` | Templates plus the test-profile setup |
| `README.md` | The existing remote README, expanded with status, install, compatibility and repository policy |
| `CREDITS.md`, `CHANGELOG.md` | Per §17.4; `Unreleased` section |
| `.gitignore` | Existing, plus `__pycache__/` |

Not created at M0: feature files, the enhancer, storage, onboarding, `LICENSE`.

---

## 21. What changed from revision 1

| Revision 1 | Revision 2 | Why |
|---|---|---|
| Quiet, solid surfaces; glass for floating UI only | Glass is the default identity; `transparency: solid` restores opaque surfaces | Owner direction (§2) |
| Always-on `base.css` identity layer | Removed. Core is tokens only; all visible styling sits behind area-style switches | Native restoration (principle 3) |
| `appearance.surfaces` token (`zen`/`neutral`) | Replaced by area-style switches plus transparency and blur tokens | Tokens must not switch styling on or off |
| `motion.intensity` with `off`; motion checkboxes hidden unless intensity ≠ off | Per-animation `artemis`/`zen`/`off`; intensity scales only, with no off | Intensity must not enable or disable animations |
| No free-text or pixel values | Named steps plus validated custom values for accent, transparency, blur and radius | Detailed control (§2), with validation for safety |
| CSS first; JS only when unavoidable | Best technique per part | Owner direction (§12 of the brief) |
| JS limited to seeding; `IOUtils` writes forbidden | JS also does the settings enhancer, bridge, backups, migration and tour; writes confined to `storage.mjs` | New requirements (§7, §11, §12) |
| Welcome tour, custom settings UI and behaviour excluded | Tour required; enhancement inside Sine's dialog; behaviour as later approved modules | Owner direction |
| Content scope: internal pages and PDF | Every browser-owned surface, phased (§13) | Owner direction |
| Horizontal tabs and multiple windows not mentioned | Both required (F30) | Owner direction |
| Phases 0–6 | Versioned releases with M0–M6 inside v1.0 | Release planning |
| Development on the default branch implied | `main` always releasable, work on `dev` | F29: GitHub installs track `main` |
| 39 settings | 35 in v1.0; secondary features moved to v1.1 | Polished, reasonably sized first release |
| `ai` = maintainer's call | Researched (F31); recommendation `yes` | Owner asked for verification |
| MIT pending logo origin | Provenance recorded; Anthropic terms checked; SVG editor still to name | Owner supplied provenance |

Contradictions in the brief itself, and how they are resolved:

- **"Custom styling enabled by default" vs "unset = native".** These are compatible. Native
  is the unset baseline, and Artemis's defaults are seeded over it (§6.4).
- **"Integrated into Sine" vs search, sections and reset.** Sine cannot do these (F26), so
  Artemis enhances Sine's own dialog instead of building a separate interface (§7.2).
- **"Every animation has three states" vs animations Zen doesn't have.** Those offer
  `artemis`/`off` only, and the description says so (§10).

---

## 22. Decisions

All eight revision-2 decisions were approved on 2026-11-08 (see `DECISIONS.md`). The licence
was approved and added on 2026-11-08 (§17). Open owner decisions and other release blockers
are tracked in [`RELEASE-CHECKLIST.md`](RELEASE-CHECKLIST.md).
