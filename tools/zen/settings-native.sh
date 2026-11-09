#!/usr/bin/env bash
# Native restoration of the Settings experience (artemis.settings.style).
# Settings pages: with the switch OFF each page must be pixel-identical to the
# same page with Artemis disabled through Sine (pure Zen); with it ON it must
# differ (styling present). Unrelated pages (other about: pages, a website)
# must be identical in all three states. The page area is cropped with a 16px
# inset so Artemis's window-frame styling (not part of this switch) is excluded.
# Saves every shot for visual review. usage: tools/zen/settings-native.sh <out-dir>
set -uo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$1"; mkdir -p "$OUT"
Z="$HERE/zrun.sh"; C="$HERE/checks"; PNG="$HERE/png.py"
SETTINGS=(paneGeneral paneSineMods paneZenLooks paneZenTabManagement paneSync paneHome paneSearch
  panePrivacy panePasswordsAutofill paneAppearance paneDownloads paneTabsBrowsing paneAccessibility
  paneLanguages panePermissionsData paneAbout
  "about:addons#addons://list/extension" "about:addons#addons://list/plugin" about:keyboard)
UNRELATED=(about:about about:support "data:text/html")
name() { echo "$1" | tr -c 'A-Za-z0-9\n' '_'; }
setpref() { "$Z" "$C/layout.js" - "{\"prefs\":{\"artemis.settings.style\":$1}}" >/dev/null; }
fail=0
shot() { # mode target
  local n j rect x y w h
  n=$(name "$2")
  j=$("$Z" "$C/settings-pane.js" "$OUT/full-$1-$n.png" "{\"target\":\"$2\"}" | tr -d '\n ')
  echo "$j" | grep -q '"shown":"' || { echo "FAIL $2 ($1): page not shown: $j"; fail=1; }
  rect=$(echo "$j" | sed -n 's/.*"rect":\[\([0-9]*\),\([0-9]*\),\([0-9]*\),\([0-9]*\)\].*/\1 \2 \3 \4/p')
  read -r x y w h <<<"$rect"
  python3 "$PNG" crop "$OUT/full-$1-$n.png" "$OUT/$1-$n.png" $((x + 16)) $((y + 16)) $((w - 32)) $((h - 32))
}
toggle() { # true|false, verified
  local want=$1 out
  for _ in 1 2 3; do
    out=$("$Z" "$C/toggle-mod.js" - "{\"enabled\":$want}" | tr -d '\n ')
    if [[ "$out" == *"\"enabledInMods\":$want"* && "$out" == *"\"windowInstance\":$want"* ]]; then return 0; fi
    sleep 3
  done
  echo "FAIL: could not set Artemis enabled=$want ($out)"; fail=1; return 1
}
ALL=("${SETTINGS[@]}" "${UNRELATED[@]}")
# The first-launch tour card floats over the page; dismiss it so shots compare pages only.
"$Z" "$C/tour-drive.js" - '{"actions":["skip"]}' >/dev/null
setpref null;  for t in "${ALL[@]}"; do shot on "$t"; done
setpref false; for t in "${ALL[@]}"; do shot off "$t"; done
toggle false && { for t in "${ALL[@]}"; do shot zen "$t"; done; }
toggle true
setpref null
same() { [[ "$(python3 "$PNG" diff "$1" "$2")" == *"differing pixels: 0/"* ]]; }
for t in "${SETTINGS[@]}"; do
  n=$(name "$t")
  r=$(python3 "$PNG" diff "$OUT/off-$n.png" "$OUT/zen-$n.png")
  same "$OUT/on-$n.png" "$OUT/zen-$n.png" && on="NOT STYLED" || on="styled"
  printf '%-40s off-vs-zen: %s  on: %s\n' "$t" "$r" "$on"
  [[ "$r" == *"differing pixels: 0/"* && "$on" == styled ]] || fail=1
done
for t in "${UNRELATED[@]}"; do
  n=$(name "$t")
  if same "$OUT/on-$n.png" "$OUT/zen-$n.png" && same "$OUT/off-$n.png" "$OUT/zen-$n.png"; then
    printf '%-40s unrelated: identical in all states\n' "$t"
  else
    printf '%-40s unrelated: CHANGED\n' "$t"; fail=1
  fi
done
# Sanity: distinct pages must give distinct images (guards against a page switch failing silently).
same "$OUT/zen-$(name paneGeneral).png" "$OUT/zen-$(name paneSearch).png" && { echo "FAIL sanity: General and Search panes identical"; fail=1; }
same "$OUT/zen-$(name about:keyboard).png" "$OUT/zen-$(name paneGeneral).png" && { echo "FAIL sanity: keyboard and General identical"; fail=1; }
exit $fail
