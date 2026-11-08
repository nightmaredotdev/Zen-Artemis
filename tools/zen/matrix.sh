#!/usr/bin/env bash
# Layout matrix for the isolated test profile.
# For each cell: Artemis default screenshot, all-areas-off screenshot and a
# pure-Zen screenshot (Artemis sheet removed); reports the off-vs-Zen diff,
# which must be 0 for native restoration.
# usage: tools/zen/matrix.sh <out-dir> [cell-filter]
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$1"; FILTER="${2:-}"
mkdir -p "$OUT"
Z="$HERE/zrun.sh"; C="$HERE/checks"; PNG="$HERE/png.py"
# Every area switch / standalone feature. Keep in sync with preferences.json
# (check.py has no runtime knowledge; tools/zen/masters.py prints the list).
MASTERS_OFF=$(python3 "$HERE/masters.py" off)
MASTERS_ON=$(python3 "$HERE/masters.py" on)
# name | layout json (without braces)
CELLS=(
  "compact-collapsed-dark|\"compact\":true,\"expanded\":false,\"scheme\":2,\"singleToolbar\":false"
  "compact-expanded-dark|\"compact\":true,\"expanded\":true,\"scheme\":2,\"singleToolbar\":false"
  "full-collapsed-dark|\"compact\":false,\"expanded\":false,\"scheme\":2,\"singleToolbar\":false"
  "full-expanded-dark|\"compact\":false,\"expanded\":true,\"scheme\":2,\"singleToolbar\":false"
  "compact-collapsed-light|\"compact\":true,\"expanded\":false,\"scheme\":1,\"singleToolbar\":false"
  "full-expanded-light|\"compact\":false,\"expanded\":true,\"scheme\":1,\"singleToolbar\":false"
  "full-expanded-right|\"compact\":false,\"expanded\":true,\"scheme\":2,\"singleToolbar\":false,\"rightSide\":true"
  "full-expanded-single|\"compact\":false,\"expanded\":true,\"scheme\":2,\"singleToolbar\":true"
)
for cell in "${CELLS[@]}"; do
  name="${cell%%|*}"; layout="${cell#*|}"
  [[ -n "$FILTER" && "$name" != *"$FILTER"* ]] && continue
  hover=false; [[ "$name" == compact-* ]] && hover=true
  "$Z" "$C/layout.js" - "{${layout},\"wait\":1500}" >/dev/null
  "$Z" "$C/layout.js" "$OUT/$name-artemis.png" "{\"prefs\":{${MASTERS_ON}},\"hover\":${hover}}" >/dev/null
  "$Z" "$C/layout.js" "$OUT/$name-off.png" "{\"prefs\":{${MASTERS_OFF}},\"hover\":${hover}}" >/dev/null
  "$Z" "$C/sheet.js" - '{"remove":true}' >/dev/null
  "$Z" "$C/layout.js" "$OUT/$name-zen.png" "{\"hover\":${hover}}" >/dev/null
  "$Z" "$C/sheet.js" - '{"remove":false}' >/dev/null
  "$Z" "$C/layout.js" - "{\"prefs\":{${MASTERS_ON}}}" >/dev/null
  printf '%-26s off-vs-zen: %s\n' "$name" "$(python3 "$PNG" diff "$OUT/$name-off.png" "$OUT/$name-zen.png")"
done
# Restore the default layout.
"$Z" "$C/layout.js" - '{"compact":false,"expanded":true,"scheme":2,"singleToolbar":true,"rightSide":false}' >/dev/null
# Horizontal tabs are not in the matrix: zen.tabs.vertical=false did not switch
# Zen 1.24.1b's layout in the test profile, even after a restart (see TESTING.md).
