# Zen-Artemis

A minimalist, customizable theme for **Zen Browser**. Designed to bring a clean, cohesive aesthetic to the browser while keeping the interface elegant, functional, and distraction-free.

> **Status:** in development. Artemis is not released yet and cannot be installed.
> The first release will be announced on the
> [Releases](https://github.com/nightmaredotdev/Zen-Artemis/releases) page.

## What Artemis is

- **One cohesive look:** glass surfaces, refined layering, smooth motion, and
  consistent spacing and corner radii across the browser.
- **Feature-level settings:** each setting controls one recognizable thing, such as tab
  shape, the active-tab highlight, or a single animation. Settings stay independent of
  each other.
- **Always reversible:** every Artemis feature has a setting that restores Zen's native
  appearance or behaviour.
- **Settings live in Sine:** open Artemis's settings from Sine's mod list. Changes apply
  immediately.

## Compatibility

- Built for the latest Zen Browser release, through [Sine](https://github.com/CosmoCreeper/Sine).
- Tested on **Windows** with Zen 1.24.1b and Sine 2.3.4.1c. Linux and macOS are kept in
  mind but are not tested yet.
- Tested with every layout Zen offers (Single toolbar, Multiple toolbars and Collapsed),
  with compact mode on or off, the sidebar on the left or right, in light and dark.
  Zen does not offer horizontal tabs, so Artemis does not support them.
- Performance has been measured on one machine only (AMD Radeon RX 9060 XT, 144 Hz
  display): no dropped frames, and the glass sidebar over an animated page added about
  0.7 percentage points of GPU use. Other hardware has not been tested.
- Artemis follows Windows' transparency and animation settings: with those effects off,
  surfaces are solid and motion is reduced.

The Zen and Sine versions each release was tested with are listed in its release notes.

## Installation

Not available yet. Once released, Artemis can be installed from Sine's marketplace.

Installing from GitHub instead requires Sine's *Allow unsafe JS* setting, because Artemis
uses a small script for defaults, settings and backups. Without it the theme still works,
but every feature starts in Zen's native state until you switch it on.

## Repository

This is the official Artemis repository, maintained by nightmare. External contributions
and pull requests are not reviewed. You are welcome to fork Artemis and modify it under its
licence.

- [Architecture](docs/ARCHITECTURE.md)
- [Settings reference](docs/PREFERENCES.md)
- [Credits](CREDITS.md)
- [Changelog](CHANGELOG.md)

## Licence

Artemis, including its logo, is released under the [MIT License](LICENSE): you may use,
modify, fork, redistribute and sell it. The logo's provenance is recorded in
[CREDITS.md](CREDITS.md).
