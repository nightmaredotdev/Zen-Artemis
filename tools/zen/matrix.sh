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
# Zen's three layouts, set exactly as Zen's own settings do (zen-settings.js):
#   single    = use-single-toolbar true,  sidebar-expanded true
#   multiple  = use-single-toolbar false, sidebar-expanded true
#   collapsed = use-single-toolbar false, sidebar-expanded false
declare -A LAYOUT=(
  [single]='"singleToolbar":true,"expanded":true'
  [multiple]='"singleToolbar":false,"expanded":true'
  [collapsed]='"singleToolbar":false,"expanded":false'
)
# name | layout json (without braces): 3 layouts x compact/full x left/right in
# dark, plus each layout in light (left; full and compact).
CELLS=()
for l in single multiple collapsed; do
  for c in full compact; do
    cj=false; [[ $c == compact ]] && cj=true
    for s in left right; do
      sj=false; [[ $s == right ]] && sj=true
      CELLS+=("$l-$c-$s-dark|${LAYOUT[$l]},\"compact\":$cj,\"rightSide\":$sj,\"scheme\":2")
    done
    CELLS+=("$l-$c-left-light|${LAYOUT[$l]},\"compact\":$cj,\"rightSide\":false,\"scheme\":1")
  done
done
for cell in "${CELLS[@]}"; do
  name="${cell%%|*}"; layout="${cell#*|}"
  [[ -n "$FILTER" && "$name" != *"$FILTER"* ]] && continue
  hover=false; [[ "$name" == *-compact-* ]] && hover=true
  "$Z" "$C/layout.js" - "{${layout},\"wait\":2500}" >/dev/null
  "$Z" "$C/layout.js" "$OUT/$name-artemis.png" "{\"prefs\":{${MASTERS_ON}},\"hover\":${hover}}" >/dev/null
  "$Z" "$C/layout.js" "$OUT/$name-off.png" "{\"prefs\":{${MASTERS_OFF}},\"hover\":${hover}}" >/dev/null
  "$Z" "$C/sheet.js" - '{"remove":true}' >/dev/null
  "$Z" "$C/layout.js" "$OUT/$name-zen.png" "{\"hover\":${hover}}" >/dev/null
  "$Z" "$C/sheet.js" - '{"remove":false}' >/dev/null
  "$Z" "$C/layout.js" - "{\"prefs\":{${MASTERS_ON}}}" >/dev/null
  printf '%-30s off-vs-zen: %s\n' "$name" "$(python3 "$PNG" diff "$OUT/$name-off.png" "$OUT/$name-zen.png")"
done
# Restore the default layout.
"$Z" "$C/layout.js" - '{"compact":false,"expanded":true,"scheme":2,"singleToolbar":true,"rightSide":false}' >/dev/null
# Horizontal tabs are not in the matrix: Zen does not offer them (ARCHITECTURE A13).
