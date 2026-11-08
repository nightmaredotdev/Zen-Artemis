# Changelog

All notable changes to Artemis are documented here. Artemis uses
[semantic versioning](https://semver.org/). Release notes are also published on
[GitHub Releases](https://github.com/nightmaredotdev/Zen-Artemis/releases).

## [Unreleased]

### Fixed
- **Transparency had no effect when Windows "Transparency effects" were off.** The system
  setting silently overrode Artemis's own transparency and blur, making the compact
  sidebar and address bar fully opaque even with opacity set to 10%. The system setting
  now only changes Artemis's defaults; a transparency or blur you choose in Artemis takes
  precedence.
- **A custom opacity is now applied exactly.** Previously, large panels raised it for
  readability (10% became 50.5%); that boost now applies to the named steps only.
- **The compact sidebar was much darker than the workspace.** Artemis hid Zen's workspace
  gradient and painted a near-black surface. The glass is now tinted by the workspace's own
  gradient, so at full opacity it matches Zen exactly.
- **Settings sections collapsed the wrong section.** Clicking any section header in
  Artemis's settings toggled the last section (Motion). Each section now opens and closes
  on its own.

## [1.0.0] - 2026-11-08

First release.

### Added
- **Look:** glass surfaces with adjustable accent (Zen's or custom), surface transparency,
  glass blur, corner radius and spacing, each with named steps and validated custom values.
- **Window:** Artemis page frame and an optional edge-to-edge page (off, compact mode only,
  always).
- **Sidebar:** glass floating compact sidebar tinted with the workspace colour, and a hidden
  tab-list scrollbar.
- **Tabs:** Artemis tab styling with tab height, tab shape, active-tab highlight, tab
  separators and a folder indent guide; essentials tiles.
- **Address bar:** a quiet closed field, a glass results panel and a subtle page dim while
  it is open.
- **Toolbar:** Artemis button styling and the Artemis logo on the main menu button.
- **Workspaces:** minimal and dots switcher styles.
- **Menus and popups:** Artemis menus, context menus and panels, and a floating find bar.
- **Media:** Artemis media controls card.
- **Motion:** hover feedback and panel opening, each Artemis / Zen / Off, with an intensity
  setting that scales only Artemis animations.
- **Settings inside Sine:** collapsible sections, search, descriptions, per-setting reset,
  reset all, backup restore and "Take the tour".
- **Safety:** every area has a switch that restores Zen's native look for the whole area
  while keeping your choices; automatic backups before reset and restore; settings
  migration groundwork.
- **First-launch tour** with live controls; skippable and reopenable.
- MIT License, including the logo (provenance in CREDITS.md).

### Notes
- Tested on Windows with Zen 1.24.1b and Sine 2.3.4.1c, in every layout Zen offers
  (Single toolbar, Multiple toolbars, Collapsed), compact on/off, sidebar left/right,
  light and dark. Linux and macOS are untested.
- Zen does not offer horizontal tabs, so Artemis does not support them.
- Menus and panels use solid Artemis surfaces: they are separate system windows, so glass
  cannot blur the page behind them.
- Artemis follows Windows' transparency and animation settings.
- Performance was measured on one machine only (AMD Radeon RX 9060 XT, 144 Hz).

[Unreleased]: https://github.com/nightmaredotdev/Zen-Artemis/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/nightmaredotdev/Zen-Artemis/releases/tag/v1.0.0
