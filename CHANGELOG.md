# Changelog

All notable changes to Artemis are documented here. Artemis uses
[semantic versioning](https://semver.org/). Release notes are also published on
[GitHub Releases](https://github.com/nightmaredotdev/Zen-Artemis/releases).

## [Unreleased]

### Added
- **Glass Settings pages.** Every page in Zen's Settings experience now uses Artemis's
  look: a transparent background that shows your workspace theme, separate translucent
  glass cards with subtle borders, and consistent spacing. This covers Settings (Zen's and
  Firefox's panes, navigation and search), Sine's mod page and every mod's settings window,
  Extensions and Themes, and Keyboard Shortcuts. Cards follow your transparency, blur,
  radius and spacing settings and keep rounded corners whatever rows a mod shows or hides.
  With Zen's `browser.tabs.allow_transparent_browser` enabled, the pages are genuinely
  see-through to the window.
- **Settings page styling** switch (Settings page section, on by default). Off restores
  all of these pages to Zen's own look and changes no other setting.

- **Matching controls everywhere in Settings.** Buttons, dropdowns and their lists,
  checkboxes, radio buttons, switches, the System/Light/Dark picker and the three-dot
  menus share one restrained glass look on every Settings page, with consistent hover,
  pressed, selected, disabled and focus states, in light and dark mode and in your
  workspace's colour. This includes Sine's settings, Configure and Homepage buttons and
  every mod's settings window.

### Changed
- Artemis's own settings window uses the same cards as every other mod's, with a fixed
  width and a list that scrolls below its title bar.
- The selected page in the Settings navigation is tinted with your workspace colour
  instead of grey; focus rings are softer; borders are subtler and follow your workspace
  colour.
- Menus, context menus and toolbar panels (Menus and popups) use the same tinted surface
  and item states as the Settings pages, including drop-down lists of pages.
- Settings and Keyboard Shortcuts open directly in Artemis's look, without showing Zen's
  look first.

### Notes
- Other mods keep their own settings layout and get no Artemis controls; inside a card,
  their row spacing follows Artemis's.
- Pop-up windows such as Manage Exceptions, extensions' own options pages and websites
  are not restyled. Windows high-contrast mode turns the styling off.
- These pages need Sine's script support; without it only Keyboard Shortcuts is styled
  (with the named transparency steps and Zen's plain window colour).
- Extensions and Themes can still show Firefox's plain dark colour for a moment (about
  two frames) while it loads, before the page exists to be styled.
- With another theme that styles these pages (such as Nebula) enabled at the same time,
  that theme's own rules can take precedence in places.

## [1.0.1] - 2026-11-08

Bug-fix release. No new features or settings; existing settings are kept as they are.

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
- **Custom-value fields showed even when their dropdown wasn't set to Custom.** They are
  now hidden on opening unless the dropdown is already on Custom, appear and disappear
  immediately when you switch, and keep the value you entered.

### Notes
- Tested on Windows with Zen 1.24.1b and Sine 2.3.4.1c, like 1.0.0.
- With Windows "Transparency effects" off, Artemis's default transparency and blur still
  follow Windows (opaque). Choose a transparency or blur in Artemis to override it.

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

[Unreleased]: https://github.com/nightmaredotdev/Zen-Artemis/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/nightmaredotdev/Zen-Artemis/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/nightmaredotdev/Zen-Artemis/releases/tag/v1.0.0
