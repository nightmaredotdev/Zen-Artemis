# Decision log

This log records architectural decisions, owner approvals and significant trade-offs.
Newest entries are at the top. Each entry is short: the details live in
[`ARCHITECTURE.md`](ARCHITECTURE.md).

Status values: **Approved** (approved by the owner), **Proposed** (awaiting approval),
**Superseded**.

---

## 2026-11-08: Architecture revision 2

**Proposed**, awaiting owner approval:

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
