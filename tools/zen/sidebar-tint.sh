#!/usr/bin/env bash
# Regression check (v1.0.0 bug: compact sidebar much darker than Zen's).
# At full glass opacity the Artemis compact sidebar surface must show Zen's own
# workspace colour. Compares one pure-background pixel of the floating sidebar,
# Artemis vs. Zen (sidebar area switch off), for an explicit "solid" setting and
# for the OS reduce-transparency default, in dark and light. Max channel delta
# must be <= 2. usage: tools/zen/sidebar-tint.sh <out-dir>
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$1"; mkdir -p "$OUT"
Z="$HERE/zrun.sh"; C="$HERE/checks"
fail=0
sample() { # file x y -> "r g b"
  python3 -c "
import sys; sys.path.insert(0, '$HERE'); import png
w, h, rows = png.read('$1'); x, y = $2, $3
print(*rows[y][x*3:x*3+3])"
}
for scheme in 2 1; do
  for mode in solid os-default; do
    if [[ $mode == solid ]]; then
      P='"artemis.appearance.transparency":"solid"'; OS=0
    else
      P='"artemis.appearance.transparency":null'; OS=1
    fi
    "$Z" "$C/layout.js" - "{\"reducedTransparency\":$OS}" >/dev/null
    XY=$("$Z" "$C/sidebar-point.js" "$OUT/a-$scheme-$mode.png" "{\"scheme\":$scheme,\"prefs\":{${P},\"artemis.sidebar.style\":null}}" | tr -d '\n ')
    X=$(echo "$XY" | sed 's/.*"x":\([0-9]*\).*/\1/'); Y=$(echo "$XY" | sed 's/.*"y":\([0-9]*\).*/\1/')
    "$Z" "$C/sidebar-point.js" "$OUT/z-$scheme-$mode.png" "{\"prefs\":{\"artemis.sidebar.style\":false}}" >/dev/null
    A=$(sample "$OUT/a-$scheme-$mode.png" "$X" "$Y"); B=$(sample "$OUT/z-$scheme-$mode.png" "$X" "$Y")
    D=$(python3 -c "a='$A'.split(); b='$B'.split(); print(max(abs(int(i)-int(j)) for i,j in zip(a,b)))")
    s=$([[ $scheme == 2 ]] && echo dark || echo light)
    printf '%-6s %-11s artemis(%s) zen(%s) max delta %s %s\n' "$s" "$mode" "$A" "$B" "$D" "$([[ $D -le 2 ]] && echo OK || echo FAIL)"
    [[ $D -le 2 ]] || fail=1
  done
done
"$Z" "$C/layout.js" - '{"reducedTransparency":0,"scheme":2,"prefs":{"artemis.sidebar.style":null,"artemis.appearance.transparency":null}}' >/dev/null
exit $fail
