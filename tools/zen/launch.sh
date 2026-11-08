#!/usr/bin/env bash
# Launches Zen with the isolated Artemis test profile and Marionette (WSL).
# Never use this with any other profile.
set -euo pipefail
PROFILE='C:\Users\PlayrZ\ZenArtemisTest'
ZEN="/mnt/c/Program Files/Zen Browser/zen.exe"
cd /mnt/c
MOZ_REMOTE_ALLOW_SYSTEM_ACCESS=1 WSLENV=MOZ_REMOTE_ALLOW_SYSTEM_ACCESS \
  exec "$ZEN" -no-remote -profile "$PROFILE" -marionette "$@"
