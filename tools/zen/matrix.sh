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
MASTERS_OFF='"artemis.window.frame":false,"artemis.sidebar.style":false,"artemis.tabs.style":false,"artemis.essentials.style":false'
MASTERS_ON='"artemis.window.frame":null,"artemis.sidebar.style":null,"artemis.tabs.style":null,"artemis.essentials.style":null'
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
  "horizontal-dark|\"compact\":false,\"expanded\":true,\"scheme\":2,\"singleToolbar\":false,\"vertical\":false"
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
"$Z" "$C/layout.js" - '{"compact":false,"expanded":true,"scheme":2,"singleToolbar":true,"rightSide":false,"vertical":true}' >/dev/null
