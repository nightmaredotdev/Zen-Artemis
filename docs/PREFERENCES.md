# Artemis settings

Every setting in `preferences.json`, described for users. All names start with `artemis.`.

"Default" is Artemis's curated default. A setting with no value at all (for example when
Sine's unsafe-JS option is off on a GitHub install) behaves like native Zen.

## Appearance

These settings shape everything Artemis styles. They never turn a feature on or off.

| Setting | Values | Default | What it does |
|---|---|---|---|
| `artemis.appearance.accent` | Zen accent · Custom | Zen accent | Where Artemis's accent color comes from |
| `artemis.appearance.accent-color` | any CSS color | `#7c8aff` | The custom accent. Shown only when the accent is Custom. Invalid colors fall back to the default |
| `artemis.appearance.transparency` | Solid · Low · Medium · High · Custom | Medium | How much shows through Artemis's glass surfaces. Solid makes them opaque |
| `artemis.appearance.transparency-custom` | percentage | `72%` | Custom surface opacity; lower is more transparent |
| `artemis.appearance.blur` | None · Light · Medium · Strong · Custom | Medium | Blur strength behind glass surfaces |
| `artemis.appearance.blur-custom` | `0px`–`64px` | `18px` | Custom blur radius |
| `artemis.appearance.radius` | Zen default · Small · Medium · Large · Custom | Medium | Corner radius for every rounded Artemis element |
| `artemis.appearance.radius-custom` | `0px`–`32px` | `10px` | Custom corner radius |
| `artemis.appearance.spacing` | Tight · Balanced · Relaxed | Balanced | Padding and gaps inside Artemis-styled elements |

If the system's "reduce transparency" setting is on (on Windows: *Transparency effects*
off), Artemis's **default** glass becomes opaque and unblurred. Once you choose a
transparency or blur in Artemis yourself, your choice is used instead of the system
setting. A custom opacity is applied exactly as typed. The named steps keep large text
panels, such as the floating sidebar, a little more opaque for readability.

## Area switches

Each browser area has one switch for Artemis's styling of that area. Turning it off
restores Zen's native look for the whole area, including every option listed under it.
Those options keep their values and apply again when the area is turned back on.

## Window

| Setting | Values | Default | What it does |
|---|---|---|---|
| `artemis.window.frame` | on · off | on | Artemis page frame: consistent corner radius, a hairline edge and soft depth around the page. Area switch for the window options |
| `artemis.window.edge-to-edge` | Off · Only in compact mode · Always | Off | Removes the gap and rounding around the page |

## Sidebar

| Setting | Values | Default | What it does |
|---|---|---|---|
| `artemis.sidebar.style` | on · off | on | Artemis sidebar: the floating compact sidebar becomes a glass panel, and sidebar buttons get Artemis hover and radius. Area switch for the sidebar options |
| `artemis.sidebar.hide-scrollbar` | on · off | on | Hides the tab list scrollbar. Scrolling still works |

## Tabs

| Setting | Values | Default | What it does |
|---|---|---|---|
| `artemis.tabs.style` | on · off | on | Artemis tab surfaces, hover, multi-select and close button, and folder rows. Area switch for the tab and folder options |
| `artemis.tabs.height` | Zen default · Compact · Regular · Tall | Regular | Tab height in the tab list (30, 36 or 42 px) |
| `artemis.tabs.shape` | Zen default · Rounded · Square · Pill | Rounded | Corner shape of tabs and folder rows. Rounded follows the corner radius setting |
| `artemis.tabs.active-highlight` | on · off | on | A subtle accent tint and outline on the selected tab |
| `artemis.tabs.separators` | on · off | off | Thin lines between tabs, hidden next to the selected or hovered tab |
| `artemis.folders.indent-guide` | on · off | on | A thin line beside the tabs of an open folder (expanded sidebar only) |

## Essentials

| Setting | Values | Default | What it does |
|---|---|---|---|
| `artemis.essentials.style` | on · off | on | Artemis tiles for essential tabs. Zen's own "favicon background" option is respected |

## Address bar

| Setting | Values | Default | What it does |
|---|---|---|---|
| `artemis.urlbar.style` | on · off | on | Artemis address bar: a quiet field when closed, and a glass panel with Artemis result rows when open. Area switch for the address bar options |
| `artemis.urlbar.dim-page` | on · off | on | Subtly dims the page while the floating address bar is open |

## Toolbar

| Setting | Values | Default | What it does |
|---|---|---|---|
| `artemis.toolbar.style` | on · off | on | Artemis radius and hover for toolbar and sidebar buttons. Area switch for the toolbar options |
| `artemis.toolbar.logo-menu-button` | on · off | on | Shows the Artemis logo on the main menu button, in the toolbar's text colour |

## Workspaces

| Setting | Values | Default | What it does |
|---|---|---|---|
| `artemis.workspaces.switcher` | Zen default · Minimal · Dots | Minimal | Minimal: monochrome icons, the active space highlighted with the accent. Dots: one dot per space (the active one longer), icons appear on hover |

## Menus and popups

| Setting | Values | Default | What it does |
|---|---|---|---|
| `artemis.popups.style` | on · off | on | Artemis menus, context menus and panels: raised surface, hairline edge, Artemis radius and hover. Area switch for the popup options |
| `artemis.popups.findbar` | on · off | on | Shows the find bar as a floating glass card at the bottom right of the page |

## Media

| Setting | Values | Default | What it does |
|---|---|---|---|
| `artemis.media.controls` | on · off | on | Artemis styling of the media controls card in the sidebar |

## Motion

| Setting | Values | Default | What it does |
|---|---|---|---|
| `artemis.motion.intensity` | Gentle · Standard · Lively | Standard | Speed and travel of animations set to Artemis. It never turns animations on or off |
| `artemis.motion.hover` | Artemis · Zen default · Off | Artemis | Hover feedback on tabs, folder rows, toolbar buttons, address bar results and workspace icons. Artemis: smooth colour fades. Off: changes are instant |
| `artemis.motion.popups` | Artemis · Zen default · Off | Artemis | How panels such as the main menu open. Artemis: a short rise and fade. Off: panels appear instantly. Plain context menus have no native animation on Windows |

With the system "reduce motion" setting on, Artemis animations become short fades.
