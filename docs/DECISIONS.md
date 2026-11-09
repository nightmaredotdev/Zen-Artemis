# Decision log

This log records architectural decisions, owner approvals and significant trade-offs.
Newest entries are at the top. Each entry is short: the details live in
[`ARCHITECTURE.md`](ARCHITECTURE.md).

Status values: **Approved** (approved by the owner), **Proposed** (awaiting approval),
**Superseded**.

---

## 2026-11-09: Genuinely translucent toolbar panels (owner decision)

The owner found toolbar panels (Downloads and others) matching the cards' colours but
fully opaque, even at 10%. Cause: the panel surface had a single painted layer, the
panel's content box, and its background colour was the window's opaque base under the
copied workspace gradient; the configured opacity only applied to the glass layer above
that opaque base (no Zen layer or pseudo-element involved). On Settings pages the same
design reads as transparent only because the copied gradient shows through the cards.

Decision: toolbar panels drop the copy and the base and keep only the glass layer, so
what is under them genuinely shows through (sharp: popup windows cannot blur). Shown on
screen at 10%: the cards' formula (45%), the same with a text halo, and a 70% floor.
**Owner chose the 70% floor**: panels follow the transparency setting but never go below
70%. This applies to toolbar panels (Firefox's arrow panels); menus and the other panels
(autocomplete drop-downs over web pages, the Ctrl+Tab switcher) keep the workspace
glass.

---

## 2026-11-09: Popup glass and Keyboard Shortcuts gutter (owner decisions)

The owner found toolbar panels (Downloads, Extensions) still solid and the Keyboard
Shortcuts scrollbar still on a dark strip. Findings (ARCHITECTURE §7.3):

- **Panels.** Panel windows composite alpha, but nothing behind them can be blurred
  (CSS blurs only within a window; Windows' acrylic backdrop is for menus only and needs
  Windows transparency effects, off on the owner's PC; changing it is out of bounds).
  Unblurred translucency made the text behind run through menu text. **Owner chose
  "workspace glass"**: like the Settings pages, menus and panels show a copy of the
  workspace background aligned to where they open, under exactly a card's glass layer.
  Not true see-through of what is behind; readable. A small window module and an
  author-origin rule under `artemis.popups.style`.
- **Keyboard Shortcuts gutter.** Its process reserves a scrollbar gutter that Firefox
  fills only with the page's background colour (images and every layer stop before it).
  A body scroller fixes the look but broke keyboard scrolling. **Owner chose "tinted
  solid gutter"**: the gutter takes the measured average workspace colour at the page's
  right edge.

---

## 2026-11-09: Settings consistency follow-up (owner review)

Owner findings after testing in real Zen, with causes and decisions (ARCHITECTURE §7.3):

- **Menus too dark** (toolbar popups such as Downloads and Extensions, context menus, the
  Extensions three-dot menu). In-page menus were 90% of the dark base; browser popups a
  solid dark surface with an 8% tint, while cards are 52% over the workspace. In-page
  menus now follow the card opacity (+10%, at least 60%, blurred); popups use a 14% tint
  that matches a card's on-screen tone, and translucent glass where Windows provides its
  acrylic menu backdrop (Zen's default; inactive with Windows transparency effects off).
- **Keyboard Shortcuts scrollbar**: no Settings page set one; every Settings page now has
  thin, hairline-tinted scrollbars.
- **Extensions search button**: a ghost button with no surface; now accent-tinted glass,
  like other primary controls.
- **Sine auto-update buttons black**: Sine shows "enabled" with an accent fill, black text
  and an inverted icon; Artemis replaced only the fill. Enabled is now accent-tinted glass
  with Sine's own light/dark icon.
- **About Zen notice**: Firefox's standard informational message bar, also used on other
  panes; intentional, so kept distinct but adapted: tinted glass in its own hue (the
  other notice types likewise).
- **Keyboard Shortcuts loading flash in a real browser**: the earlier test always opened
  Settings first. Opened directly, the tab showed the empty browser element (Zen's grey)
  while the page's own process started or switched. While a Settings page loads its
  browser is now transparent (the window's workspace background shows; a small window
  module and one chrome rule under the existing switch), and fresh values are published
  as the load starts. No browser preference is changed.

---

## 2026-11-09: Settings visual consistency pass

The owner found controls that still looked like Zen's or Firefox's: menus and buttons
(the extension three-dot menu, Sine's settings, Configure and Homepage buttons, Make
default, toolbar-icon menus), form controls (dropdowns and their lists, checkboxes, radio
buttons, the System/Light/Dark picker, Add search engine), a neon focus ring on the
Settings search, a grey selected navigation item, grey borders, and Zen's look flashing
before Artemis's on Keyboard Shortcuts and Extensions. Decisions, within the approved
scope and with no new settings (ARCHITECTURE §7.3):

- **One token set.** `styles/pages/settings-tokens.css` defines the Settings tokens once
  and maps Firefox's design tokens onto them, for all four page types. Zen's `!important`
  tokens are outranked by specificity. Tokens a component redefines on its own host
  (navigation, toggles, in-page menus) are set on that host.
- **Look.** Neutral controls: faint fill, hairline, one step per state. Selected and
  primary: accent-tinted glass, never solid (also the navigation, without its indicator
  bar). Marks: lifted accent. Focus: accent at 55%. Hairlines lean slightly toward the
  accent instead of neutral grey. In-page menus are frosted; OS popups solid with the
  same tint.
- **Controls inside shadow trees** (component checkboxes and radios, `panel-list`) are
  styled by a separate user sheet loaded into the same pages, since user sheets apply in
  shadow trees and page sheets do not; generic element types only. No `::part`, no
  Firefox class names, no new window actor.
- **Browser menus.** The existing `artemis.popups.style` gets the same tinted surface,
  item states and panel buttons, so toolbar menus and native `<select>` dropdowns match.
- **Loading.** Settings' page styling moved from Sine's script to the window actor (the
  same one as Extensions and Themes, renamed `ArtemisSettingsPage`), and both actors act
  when the root element is created, before the first paint. Keyboard Shortcuts reads the
  last published values synchronously from shared data. Settings (about 500 ms) and
  Keyboard Shortcuts (about 180 ms) no longer flash. **Limitation:** Extensions and Themes
  still shows Firefox's default canvas colour for about 30 ms before its root element
  exists; fixing that would need a browser colour preference, which Artemis does not
  write.
- **Bug found and fixed:** after a same-tab navigation between two parent-process
  Settings pages, the old page's teardown removed the new page's sheets (`windowUtils`
  acts on the tab's current document). Teardown now leaves them unless its document is
  still current; `tools/zen/checks/settings-navigation.js` covers it.

---

## 2026-11-09: Settings styling fixes after owner review

The owner found three problems: the background was not genuinely transparent, card
corners were inconsistent, and Extensions and Themes and Keyboard Shortcuts were not
styled correctly. Findings and decisions (ARCHITECTURE §7.3):

- **Background.** Zen sets the workspace gradient on `#zen-browser-background`, not on the
  window root; Artemis had read the root's default and painted a flat colour. The module
  now copies the gradient layers (or the single theme colour) and aligns them with the
  window, so the theme stays visible behind the cards. Genuine see-through remains tied to
  Zen's `browser.tabs.allow_transparent_browser`, which Artemis never writes. Cards are
  more transparent (medium 52%, floor 45%).
- **Keyboard Shortcuts.** No CSS mechanism exposes the workspace colours in its process
  (checked: `--zen-primary-color` is the system accent, `--zen-main-browser-background`
  the default, and Zen pushes no theme variables there). **Approved** by the owner: a
  small window actor limited to `about:keyboard` carries the same values in; it is
  registered only while Artemis runs.
- **Extensions and Themes** moved from Sine's per-mod include list to a window actor as
  well: an installed copy's Sine registry may never pick up a new include (the owner's
  real profile did not), which left the page unstyled.
- **Corners.** Cards in other mods' dialogs are now drawn from the rows that are actually
  visible (the module marks each card's first and last visible row), so hidden or
  conditional rows never cost a card its rounded corners; Sine's own groupboxes are no
  longer chained into one card; search results no longer join cards to hidden headings.
- **Teardown bug.** Disabling Artemis left the Settings page styled, because Sine keeps
  one unload callback per script and window; both parts now share one callback. The
  native-restoration test now takes its pure-Zen baseline with the switch on, which
  catches this.
- **Nebula** (installed in the test profile at the owner's request): Artemis's look holds;
  Nebula's user-level `!important` background for Zen's section bodies outranks page
  styles, a documented interaction.

---

## 2026-11-09: Settings experience styling (owner)

**Approved** by the owner, in four steps on 2026-11-09:

1. The next cycle refines the settings interface visually (no new features, presets or
   settings-system rewrite). Background for Artemis's dialog: **adaptive** (blurred, tinted
   page by default; see-through to the window only while the user has enabled Zen's
   `browser.tabs.allow_transparent_browser`, which Artemis never writes).
2. Scope widened from Artemis's dialog to the whole settings dialog (every mod), then to
   the whole `about:preferences` page, Zen's and Firefox's panes included. This reverses
   the earlier rule that Artemis styles only its own dialog (§7.2 safety rules still apply
   to the enhancer) and brings the settings-page part of the v1.2 internal-pages scope
   forward.
3. Scope widened to **every page reachable from Zen's Settings navigation**: Extensions
   and Themes (`about:addons`) and Keyboard Shortcuts (`about:keyboard`) included,
   wherever technically feasible, without affecting other pages or websites.
4. One independent switch, `artemis.settings.style` (Settings page styling, on by
   default): off restores every Settings page to native and changes no other preference.
   Implementation is script-based (the owner accepted that the settings pages stay native
   without Sine's script support), strictly scoped, with graceful fallback to native.

Investigation results that shaped the design (ARCHITECTURE §7.3):

- `about:preferences` and `about:addons` are chrome documents in the parent process: Sine
  runs mod scripts there, so one module (`scripts/settings/page.mjs`) and one author sheet
  cover both, with the window's tokens and workspace colours mirrored.
- `about:keyboard` runs in the privileged-about content process: Sine runs no mod scripts
  there, but its content user sheet reaches it and `-moz-pref()` follows the switch live
  (verified in the test profile). It gets scoped content CSS (`styles/pages/`), the first
  use of `content.css`, so it cannot follow workspace colours or custom glass values.
- Zen support opens a website and is not styled. Popup documents (Manage Exceptions and
  other subdialogs) and extensions' own options pages stay native.
- Firefox's panes are web components with shadow DOM. They are styled through their
  design tokens only (no `::part()`), so a renamed token simply leaves that element
  native.
- Other mods keep their own layout and get no Artemis controls; inside a card, per-row
  margins are replaced by Artemis's row spacing so each section reads as one card. For
  consistency Artemis's own rows keep Sine's layout too (an Artemis-only control
  reordering was dropped).

---

## 2026-11-08: v1.0.1 released as a bug-fix-only patch (owner)

**Approved** by the owner: v1.0.1 contains only the post-release fixes below. The owner
confirmed the fixes in their own testing. Improvements the owner noticed are kept out of
this release and will be evaluated separately. Released under the release workflow after the
full checklist, including a real-capture visual review run with the owner's confirmation
that the desktop was free (TESTING.md "v1.0.1 release run"). No settings were added,
renamed or migrated (schema stays 1). v1.0.0, its tag and its release are unchanged.

---

## 2026-11-08: Post-release fixes for v1.0.0 owner reports

Bug fixes within the approved scope:

- **Explicit glass choices beat the OS default.** The OS "reduce transparency" setting now
  changes only Artemis's *defaults*. While transparency or blur has a user value, the
  window bridge sets `[artemis-explicit-glass]` and `tokens.css` keeps the user's glass.
  This refines the earlier "respect OS settings" rule: the owner's report showed an
  explicit 10% opacity silently overridden by Windows' *Transparency effects: off*, and the
  owner asked that Artemis's own opacity not be confused with the Windows setting. Without
  JS, or without an explicit choice, the OS is still respected.
- **Custom opacity is exact.** The panel readability boost (M2) applies to named steps only.
- **Compact sidebar tint.** The glass now uses Zen's workspace gradient layers, scaled by
  the glass opacity and keeping Zen's crossfade, instead of hiding them behind a neutral
  dark surface (the M2 "theme tint" decision is superseded).
- **Settings accordion.** Each section header captures its own section (closure bug).
- **Custom-value fields.** The enhancer applies each conditional row's visibility itself, because Sine 2.3.4.1c wires conditions before the row is in the dialog and never applies the initial state. This works around a Sine bug inside Artemis's own dialog without modifying Sine.

**Noted for the owner (no action taken):** Sine installs the public release into
`sine-mods/Artemis`, which is this repository's folder (mod id = folder name). The owner's
real Zen therefore loads whatever is in the working tree, including unreleased `dev` work.
A Sine auto-update (`no-updates: false`) could overwrite tracked files with `main`'s
content. The repository's history is safe, but uncommitted work could be lost. Possible
mitigations (owner's choice): set `no-updates` for Artemis in the real profile while
developing, or develop from a separate clone and install there only through Sine.

---

## 2026-11-08: Release workflow clarified (owner)

**Approved** by the owner. Routine release steps need no extra manual testing or approval
when the automated and isolated-environment checks give enough confidence. If all
required checks pass, no significant issue is open and no architectural or out-of-scope
decision is needed, Claude may merge `dev` into `main`, tag the version and publish the
GitHub release on its own. Claude stops and asks only when a check fails or reveals a
significant issue, something needs the owner's manual testing or judgment, an
architectural or out-of-scope change is needed, or a destructive Git operation is being
considered. The existing boundaries are unchanged: no force-pushes or history rewrites, no
use of the real Zen profile, no Windows setting changes without permission.

Release checks run headless (`tools/zen/launch.sh -headless`) so they never open or focus
windows on the owner's desktop.

---

## 2026-11-08: Layout requirement and motion scope settled (owner)

**Approved** by the owner (resume instructions):

- **B1:** the layout requirement is every layout Zen offers. That means Single toolbar,
  Multiple toolbars and Collapsed, each with left and right sidebar and compact mode on and
  off, in light and dark, with multiple windows. Horizontal tabs are not supported because
  Zen does not offer them (A13). This is revisited if Zen ships them.
- **B3:** the four JavaScript-driven animation settings (compact sidebar, tab open/close,
  folders, workspaces) are not in v1.0 and are not reintroduced. v1.0 motion is
  `intensity`, `hover` and `popups`.

**Implementation note (M4):** under system reduced motion, Artemis animations step aside to
native behaviour instead of becoming a short fade. On Windows, Firefox also turns panel
animations off when "Animation effects" is off. ARCHITECTURE §10 is updated to match.

---

## 2026-11-08: MIT licence adopted

**Approved** by the owner. The logo was refined in SVG Vector Lab
(<https://svgvectorlab.com/>). Its Terms of Use (effective August 9, 2026,
<https://svgvectorlab.com/terms>) leave users their rights in their artwork and state that
local processing transfers no ownership. They put no restriction on exported files. The
owner checked them, and Claude re-read them on 2026-11-08. Exact quotations are in
`CREDITS.md`.

- `LICENSE`: standard MIT text, `Copyright (c) 2026 nightmare`. It covers the repository
  including the logo, to the extent of the rights held.
- No claim is made about copyright in the AI-generated portions of the logo.
- Intended policy: unrestricted reuse, modification, redistribution and commercial use.
- `theme.json` declares `"license": "MIT"`.
- Release blocker B2 is resolved.

**Commit identity.** From this commit on, commits use the GitHub noreply address
(`354072430+nightmaredotdev@users.noreply.github.com`) at the owner's request. Earlier
commits carry the owner's personal address. They are already published, and rewriting them
would need a force-push, which is not allowed, so they are left unchanged.

---

## 2026-11-08: M5 implementation decisions (within approved scope)

- **Schema stamping.** `artemis.internal.schema` is written on the first user change (not
  at startup), so fresh installs keep `prefs.js` free of Artemis lines while every set
  value still carries its schema.
- **Pref writes.** Validated writes go through `schema.mjs`. `migrations.mjs` may also
  write, because renames move raw values of old prefs. `check.py` enforces both.
- **Tour.** Four steps of real controls (look, sidebar and tabs, motion) between welcome
  and done. Options are generated from `preferences.json`. Choosing a default clears the
  user value instead of pinning it. "Custom" options stay in settings only. Escape skips.
  Closing the window mid-tour does not count as a skip.
- **Enhancer.** Sine's separators get ids (`artemis-section-*`) so sections are found
  without guessing. The enhancer waits until every declared row is rendered, moves Sine's
  own nodes into section wrappers, and undoes every move and addition on teardown.
  Confirmations use `Services.prompt`.
- **Backups.** Stored in `<profile>/artemis/backups/`, newest 10 kept; taken before reset
  all and restore (and later before import, profile overwrite and migration).

---

## 2026-11-08: M4 findings and proposals (approval needed)

**Horizontal tabs (release blocker B1).** Zen's official FAQ
(docs.zen-browser.app/faq): "Zen Browser will not support horizontal tabs in the near
future." Zen 1.24.1b's settings write only `zen.view.sidebar-expanded` and
`zen.view.use-single-toolbar` (Single toolbar / Multiple toolbars / Collapsed);
`zen.tabs.vertical` is read but never set, and setting it does not give a working
horizontal layout. **Proposal:** replace the requirement "vertical and horizontal tabs"
with "every layout Zen offers: Single toolbar, Multiple toolbars and Collapsed, each with
left and right sidebar and compact on/off". All of these are already in the test matrix.
Revisit if Zen ever ships horizontal tabs. Until the owner decides, this stays a release
blocker.

**JS-driven animations (release blocker B3).** `motion.sidebar`, `motion.tabs`,
`motion.folders` and `motion.workspaces` cannot meet the three-state rule cleanly (A11).
Options:
1. **(Recommended)** Drop these four from v1.0. Zen keeps its own animations, and its own
   hidden prefs remain available to users. v1.0 motion is then `intensity`, `hover` and
   `popups` (all three-state, implemented and tested). Artemis-only animations for
   Artemis's own surfaces (for example the floating find bar and address bar panel
   appearing, with `artemis`/`off` states) could be proposed separately.
2. Patch Zen's animation calls from a JS module (wrapping `gZenUIManager.motion.animate`
   for identified elements). This is fragile across Zen updates and touches private
   behaviour. Not recommended.
3. Have Artemis settings write Zen's own animation prefs. This duplicates Zen
   functionality and breaks the rule that Artemis writes only `artemis.*` prefs. Not
   recommended.

**Implemented within scope:** `motion.hover` and `motion.popups` (artemis / zen / off),
with `motion.intensity` scaling only the Artemis state. Small-control colour fades are
allowed in addition to transform/opacity (ARCHITECTURE 9.6).

---

## 2026-11-08: M2 implementation decisions (within approved scope)

- **`parts.css` (author origin).** Gecko ignores `::part()` in user sheets (F33), so
  shadow-tree rules live in `*.parts.css`, loaded per window by `artemis.uc.js` and removed
  on teardown. It uses the same pref gates. `check.py` forbids `::part()` in user-origin
  files.
- **Backdrop clip.** A polygon `clip-path` is applied to page `<browser>` elements only
  while the compact sidebar is shown or animating, so its glass can blur the page (F34).
  It is disabled when blur is `none` or the OS requests reduced transparency. Measured cost:
  no dropped frames and +0.4 points of GPU. It is never applied permanently, to keep
  OS-compositor video overlays and laptop power savings.
- **Panel opacity.** Large text panels (the floating sidebar) derive a higher opacity from
  the user's transparency step (72% → 84% at medium) so page text never competes with
  panel text. Small surfaces use the step directly.
- **Theme tint.** The floating sidebar's glass is tinted 16% with Zen's workspace colour.
  Zen's opaque theme pseudo-layers are hidden there because they would cover the glass.
- **Readable accent.** `--artemis-accent-ui` lifts Zen's accent toward the text colour for
  UI marks, because Zen's default accent is nearly black in dark mode.

---

## 2026-11-08: Revision 2 approved; scaffold and M1 verification

**Approved** by the owner (all eight revision-2 decisions), with these clarifications:

1. **Architecture approved.** Area styling switches are **master overrides**, not bundled
   presets. Turning an area off restores native Zen for the whole area. Individual feature
   values stay independent and are preserved while the area is off. The tour is
   skippable and reopenable.
2. **Settings enhancer approved.** It may enhance only Artemis's own Sine dialog, must fail
   safely if Sine changes, must keep the plain settings usable, and must never modify Sine
   or interfere with other mods.
3. **v1.0 scope approved:** 35 settings, backups, migration groundwork, onboarding.
   Profiles and export/import go to v1.1; internal pages, settings pages, Sine UI and PDF
   viewer go to v1.2.
4. **Git workflow approved:** `main` holds finished releases, `dev` is for development,
   `updatedAt` is maintained explicitly, and there are no force-pushes or history rewrites.
5. **Store `ai` = `yes`.**
6. **Licence:** MIT for the repository including the logo, provided the terms check finds
   no relevant restriction. The SVG was edited in **Vector Lab**.
7. **Testing:** the isolated test profile at `C:\Users\PlayrZ\ZenArtemisTest` is approved.
   The real profile must not be touched, and everything created must be documented.
8. **Defaults:** logo menu button on, subtle page dim on, minimal workspace switcher, tab
   separators off, edge-to-edge off.

**Implementation decisions (within the approved scope):**

- Master overrides are implemented as a `"master"` key in `preferences.json` (ignored by
  Sine). Feature gates test the feature's own pref and its master, and `check.py` enforces
  this.
- `popups.menus` was renamed `popups.style` (before any release) so area masters share
  one naming pattern.
- Defaults are seeded by reading `preferences.json` synchronously at import. M1 showed
  seeding about 0.5 s before first paint, so the generated-table fallback is not needed.
- `content.css` imports nothing until v1.2, so websites cannot be affected. The M1 test
  showed the content sheet reaches browser pages, but website behaviour was untested.
- `supportsUnload: true` was added after A6 passed.
- Glass surfaces must be elements inside the window tree, because backdrop blur does not
  apply to elements appended directly to the root (M1).
- Test tooling: a Node.js built-ins-only Marionette client in `tools/zen/`, run with the
  existing Windows Node.js. No dependencies were installed.

**Open:**

- **Licence:** no online SVG editor called "Vector Lab" could be found (the obvious domains
  are dead, parked or broken, and search found only similarly named tools). `LICENSE` is
  not added until its URL is known and its terms are checked. Anthropic's terms (reviewed
  version effective Oct 8, 2025) assign Anthropic's rights in outputs, "if any", to the
  user, and impose no output restriction as written.

**Noted for the owner:** the development machine has Windows *Transparency effects* and
*Animation effects* turned off. Following Zen, Artemis honours these system settings, so
Artemis shows opaque surfaces and reduced motion there. This is not a code issue and needs
no decision unless the owner wants different behaviour.

---

## 2026-11-08: Architecture revision 2

**Proposed**, then approved on 2026-11-08 (entry above):

| # | Decision | Reference |
|---|---|---|
| P1 | Settings model: tokens, area styles, features, three-state motion, validated custom values, internal prefs | ARCHITECTURE §6 |
| P2 | Storage: Artemis defaults seeded on the default branch each startup (pending A1/A2); user choices as user prefs; backups and profiles in `<profile>/artemis/` | §6.4, §8.3, §11.1 |
| P3 | Settings enhancer that decorates only Artemis's Sine dialog (search, sections, descriptions, resets) | §7.2 |
| P4 | v1.0 scope: 35 settings, tour, reset-all with backups, migration framework. Export/import and profiles in v1.1 | §14, §15 |
| P5 | Branches: `main` releases only (GitHub installs track `main`); development on `dev` | §15.1 |
| P6 | Store `ai` value: recommended `yes` | §18 |
| P7 | MIT for the whole repository including the logo, once the SVG editor's terms are checked | §17 |

**Approved** by the owner in the "Final Direction and Architecture Review" brief:

- Identity: project `Zen-Artemis`, display name Artemis, author nightmare, repository
  `nightmaredotdev/Zen-Artemis` (public). The local folder stays `Artemis`. The canonical
  logo is `assets/artemis.svg`.
- The seven core design principles (ARCHITECTURE §1).
- Visual direction: glass and transparency as the default identity; the accent inherited
  from Zen by default; curated Artemis defaults with native restoration for each feature.
- Animations: per-animation Artemis / Zen / Off; intensity never enables animations.
- Scope: eventually all browser-owned UI, never website content.
- Compatibility: Windows first, without unnecessary platform-specific code; latest Zen
  first; all four sidebar × compact combinations, left and right sidebar, vertical and
  horizontal tabs, multiple windows.
- Settings stay inside Sine. No separate settings app without approval.
- Profiles, import/export, backups and automatic switching are built progressively.
  Automatic switching is off by default.
- First-launch tour: skippable, with choices kept on skip, never shown automatically
  again, and reopenable.
- Not required unless approved: separate settings app, CSS editor, sounds, diagnostics UI,
  in-browser changelog, update checker, master toggle, About section, extra accessibility
  features, feedback links.
- Implementation philosophy: best technique per part; modular; no over-engineering.
- Releases: semver; changelog and notes on GitHub; Sine handles updates; validation before
  release; settings migrations; no silent resets.
- Licence preference: MIT, subject to checking asset terms. The `license` metadata stays
  unset until confirmed.
- Repository: no contribution process and no PR-review promise; the owner keeps control.
- Claude's autonomy: Claude may commit, push, tag and release, never force-pushing,
  rewriting history or publishing unfinished work. Architectural, settings-model,
  storage, feature-boundary and scope changes need approval.

**Trade-offs noted:**

- Mod id `Artemis` matches the folder and is free in the store, but it is a generic name.
- The settings enhancer depends on Sine's dialog markup. If that markup changes, Artemis
  falls back to Sine's plain list.
- Glass by default costs some GPU time. It is measured in M1 (A12), and the defaults are
  lowered if the cost is noticeable.
- Without Sine's unsafe-JS setting (GitHub installs), Artemis runs CSS-only: features start
  native, and there are no tour or backups.

---

## 2026-11-08: Architecture revision 1

**Superseded** by revision 2. This was the initial proposal: a quiet, solid visual
direction, CSS-first, an always-on base layer, 39 settings and phases 0–6.
