#!/usr/bin/env python3
"""Prints the JSON body that turns every Artemis area off (or back to default).

Area masters are the checkboxes other settings name as "master", plus top-level
features with no master that restyle an area on their own (*.style, *.frame,
*.controls, *.switcher -> "zen"). usage: masters.py on|off
"""
import json
import sys
from pathlib import Path

prefs = json.loads((Path(__file__).resolve().parents[2] / "preferences.json").read_text())
props = {e["property"]: e for e in prefs if e.get("property")}
masters = {e["master"] for e in props.values() if e.get("master")}
for name, e in props.items():
    if e.get("master"):
        continue
    if name.endswith((".style", ".frame", ".controls")) and e["type"] == "checkbox":
        masters.add(name)
    if name.endswith(".switcher"):
        masters.add(name)
    # Three-state animations: "zen" restores the native animation.
    if name.startswith("artemis.motion.") and e["type"] == "dropdown" and "zen" in [o["value"] for o in e["options"]]:
        masters.add(name)
off = sys.argv[1] == "off"
out = {}
for m in sorted(masters):
    out[m] = (False if props[m]["type"] == "checkbox" else "zen") if off else None
print(json.dumps(out)[1:-1])
