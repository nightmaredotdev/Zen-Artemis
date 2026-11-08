#!/usr/bin/env bash
# Feature independence and master-override checks in the current layout.
#  1. Each feature toggled alone: reports the changed region (must be limited
#     to the feature's own element).
#  2. With the area master off, toggling each feature must change nothing.
#  3. Feature values survive the master being turned off and on.
# usage: tools/zen/features.sh <out-dir>
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$1"; mkdir -p "$OUT"
Z="$HERE/zrun.sh"; L="$HERE/checks/layout.js"; PNG="$HERE/png.py"
shot() { "$Z" "$L" "$OUT/$1.png" "$2" >/dev/null; }
d() { python3 "$PNG" diff "$OUT/$1.png" "$OUT/$2.png"; }
# feature | master | value A | value B
FEATURES=(
  "artemis.window.edge-to-edge|artemis.window.frame|\"off\"|\"always\""
  "artemis.sidebar.hide-scrollbar|artemis.sidebar.style|true|false"
  "artemis.tabs.height|artemis.tabs.style|\"regular\"|\"tall\""
  "artemis.tabs.shape|artemis.tabs.style|\"rounded\"|\"pill\""
  "artemis.tabs.active-highlight|artemis.tabs.style|true|false"
  "artemis.tabs.separators|artemis.tabs.style|false|true"
  "artemis.folders.indent-guide|artemis.tabs.style|true|false"
  "artemis.toolbar.logo-menu-button|artemis.toolbar.style|true|false"
)
echo "== 1. single-feature changes (master on)"
for f in "${FEATURES[@]}"; do
  IFS='|' read -r pref master a b <<<"$f"
  shot A "{\"prefs\":{\"$pref\":$a}}"; shot B "{\"prefs\":{\"$pref\":$b}}"
  printf '%-34s %s\n' "$pref" "$(d A B)"
  "$Z" "$L" - "{\"prefs\":{\"$pref\":null}}" >/dev/null
done
echo "== 2. master off: feature toggles must change nothing"
for f in "${FEATURES[@]}"; do
  IFS='|' read -r pref master a b <<<"$f"
  shot A "{\"prefs\":{\"$master\":false,\"$pref\":$a}}"; shot B "{\"prefs\":{\"$pref\":$b}}"
  printf '%-34s %s\n' "$pref" "$(d A B)"
  "$Z" "$L" - "{\"prefs\":{\"$master\":null,\"$pref\":null}}" >/dev/null
done
echo "== 3. values preserved across master off/on"
"$Z" "$HERE/checks/master-preserve.js"
