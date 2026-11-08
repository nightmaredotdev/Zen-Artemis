#!/usr/bin/env bash
# usage: tools/zen/zrun.sh <check.js> [screenshot.png|-] [args-json]
# Runs a check script in the isolated test browser via the Windows Node.js.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
NODE="/mnt/c/Program Files/nodejs/node.exe"
SCRIPT="$(wslpath -w "$(realpath "$1")")"
SHOT=()
if [[ "${2:-}" && "${2:-}" != "-" ]]; then SHOT=("$(wslpath -w "$(realpath -m "$2")")"); fi
export ARTEMIS_ARGS="${3:-{\}}"
export WSLENV="ARTEMIS_ARGS${WSLENV:+:$WSLENV}"
cd /mnt/c
timeout 120 "$NODE" "$(wslpath -w "$HERE/run.mjs")" "$SCRIPT" "${SHOT[@]}"
