#!/usr/bin/env bash
# Samples total 3D GPU-engine utilisation of all zen.exe processes (Windows
# performance counters). usage: tools/zen/gpu-sample.sh [seconds]
set -euo pipefail
cd /mnt/c
powershell.exe -NoProfile -Command "
\$pids = (Get-Process zen -ErrorAction SilentlyContinue).Id
\$samples = @()
for (\$i = 0; \$i -lt ${1:-6}; \$i++) {
  \$c = (Get-Counter '\GPU Engine(*engtype_3D)\Utilization Percentage').CounterSamples
  \$sum = 0
  foreach (\$s in \$c) { foreach (\$p in \$pids) { if (\$s.InstanceName -like \"pid_\$(\$p)_*\") { \$sum += \$s.CookedValue } } }
  \$samples += \$sum
}
'{0:N1}' -f ((\$samples | Measure-Object -Average).Average)
" | tr -d '\r'
