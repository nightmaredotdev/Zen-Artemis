# Decision log

This log records architectural decisions, owner approvals and significant trade-offs.
Newest entries are at the top. Each entry is short: the details live in
[`ARCHITECTURE.md`](ARCHITECTURE.md).

Status values: **Approved** (approved by the owner), **Proposed** (awaiting approval),
**Superseded**.

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
