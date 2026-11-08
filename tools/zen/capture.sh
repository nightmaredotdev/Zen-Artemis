#!/usr/bin/env bash
# usage: tools/zen/capture.sh <out.png> [setup-check.js] [args-json]
# The optional setup check runs after the window is focused (e.g. opening the
# address bar, which focusing would otherwise close).
# Real screen capture of the test browser window only (includes backdrop blur,
# which Marionette screenshots omit). Brings the window to the front first.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$(wslpath -w "$(realpath -m "$1")")"
RECT=$("$HERE/zrun.sh" "$HERE/checks/window-rect.js" | tr -d '\n ')
X=$(echo "$RECT" | sed 's/.*"x":\([0-9-]*\).*/\1/'); Y=$(echo "$RECT" | sed 's/.*"y":\([0-9-]*\).*/\1/')
W=$(echo "$RECT" | sed 's/.*"w":\([0-9]*\).*/\1/'); H=$(echo "$RECT" | sed 's/.*"h":\([0-9]*\).*/\1/')
if [[ -n "${2:-}" ]]; then "$HERE/zrun.sh" "$2" - "${3:-{\}}" >/dev/null; sleep 0.4; fi
cd /mnt/c
powershell.exe -NoProfile -Command "Add-Type -AssemblyName System.Drawing; \$b = New-Object System.Drawing.Bitmap $W, $H; \$g = [System.Drawing.Graphics]::FromImage(\$b); \$g.CopyFromScreen($X, $Y, 0, 0, \$b.Size); \$b.Save('$OUT')" >/dev/null
echo "captured ${W}x${H}"
