#!/usr/bin/env bash
# usage: ARTEMIS_ALLOW_FOCUS=1 tools/zen/capture.sh <out.png> [setup-check.js] [args-json]
# Real screen capture of the test browser window only (includes backdrop blur,
# which Marionette screenshots omit). It brings the test window to the front, so
# it must only be run when the owner's desktop is free. Safeguards:
#   - refuses to run unless ARTEMIS_ALLOW_FOCUS=1 is set;
#   - refuses unless the test browser reports the isolated test profile;
#   - immediately before capturing, checks that the foreground window belongs to
#     the test browser's exact process id, and aborts WITHOUT capturing otherwise.
# ARTEMIS_GUARD_TEST_PID overrides the expected pid (guard self-test only: the
# capture must then abort).
# The optional setup check runs after the window is focused (e.g. opening the
# address bar, which focusing would otherwise close).
set -euo pipefail
if [[ "${ARTEMIS_ALLOW_FOCUS:-}" != "1" ]]; then
  echo "capture.sh: refusing to run: it focuses the test window. Set ARTEMIS_ALLOW_FOCUS=1 only when the desktop is free." >&2
  exit 3
fi
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="$(wslpath -w "$(realpath -m "$1")")"
RECT=$("$HERE/zrun.sh" "$HERE/checks/window-rect.js" | tr -d '\n ')
field() { echo "$RECT" | sed -n "s/.*\"$1\":\"\{0,1\}\([^,\"}]*\).*/\1/p"; }
X=$(field x); Y=$(field y); W=$(field w); H=$(field h); PID=$(field pid); PROFILE=$(field profile)
if [[ "$PROFILE" != *ZenArtemisTest* ]]; then
  echo "capture.sh: aborted, not the isolated test profile ($PROFILE)" >&2; exit 4
fi
EXPECT="${ARTEMIS_GUARD_TEST_PID:-$PID}"
if [[ -n "${2:-}" ]]; then "$HERE/zrun.sh" "$2" - "${3:-{\}}" >/dev/null; sleep 0.4; fi
cd /mnt/c
powershell.exe -NoProfile -Command "
Add-Type -AssemblyName System.Drawing
Add-Type -Namespace W -Name U -MemberDefinition '[DllImport(\"user32.dll\")] public static extern System.IntPtr GetForegroundWindow(); [DllImport(\"user32.dll\")] public static extern uint GetWindowThreadProcessId(System.IntPtr h, out uint p);'
\$p = 0; [void][W.U]::GetWindowThreadProcessId([W.U]::GetForegroundWindow(), [ref]\$p)
if (\$p -ne $EXPECT) { Write-Output \"ABORT foreground-pid=\$p expected=$EXPECT\"; exit 4 }
\$b = New-Object System.Drawing.Bitmap $W, $H
\$g = [System.Drawing.Graphics]::FromImage(\$b)
\$g.CopyFromScreen($X, $Y, 0, 0, \$b.Size)
\$b.Save('$OUT')
Write-Output 'OK'
" | tr -d '\r' | {
  read -r status || true
  if [[ "$status" != "OK" ]]; then echo "capture.sh: aborted, nothing captured ($status)" >&2; exit 4; fi
  echo "captured ${W}x${H} (foreground pid $PID verified)"
}
