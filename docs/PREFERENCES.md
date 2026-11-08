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

The system "reduce transparency" setting makes glass surfaces opaque regardless of these
values.

## Motion

| Setting | Values | Default | What it does |
|---|---|---|---|
| `artemis.motion.intensity` | Gentle · Standard · Lively | Standard | Speed and travel of animations set to Artemis. It never turns animations on or off |

With the system "reduce motion" setting on, Artemis animations become short fades.
