#!/usr/bin/env python3
"""Artemis static checks. Python standard library only.

Usage: python3 tools/check.py [--release] [-v]

Exit code 0 when there are no errors. Warnings never fail the run.
--release adds release-only checks (CHANGELOG matches theme.json version).
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PREFIX = "artemis."
NAME_RE = re.compile(r"^artemis\.[a-z]+(\.[a-z0-9]+(-[a-z0-9]+)*)+$")
INTERNAL_PREFIX = "artemis.internal."
SEMVER_RE = re.compile(r"^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$")
NODE_CANDIDATES = ["node", "/mnt/c/Program Files/nodejs/node.exe"]

errors: list[str] = []
warnings: list[str] = []
info: list[str] = []


def err(msg: str) -> None:
    errors.append(msg)


def warn(msg: str) -> None:
    warnings.append(msg)


def rel(p: Path) -> str:
    return p.relative_to(ROOT).as_posix()


def strip_css_comments(text: str) -> str:
    return re.sub(r"/\*.*?\*/", "", text, flags=re.S)


def strip_js_comments(text: str) -> str:
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    return re.sub(r"(^|[^:\\])//[^\n]*", r"\1", text)


def ignored(p: Path) -> bool:
    parts = p.relative_to(ROOT).parts
    return bool(parts) and parts[0] in {"references", ".git", "tools"}


def files(pattern: str) -> list[Path]:
    return sorted(p for p in ROOT.rglob(pattern) if p.is_file() and not ignored(p))


# --------------------------------------------------------------------------- 1
def check_preferences() -> dict[str, dict]:
    path = ROOT / "preferences.json"
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:  # noqa: BLE001
        err(f"preferences.json: invalid JSON ({e})")
        return {}
    if not isinstance(data, list):
        err("preferences.json: top level must be an array")
        return {}

    prefs: dict[str, dict] = {}
    for i, entry in enumerate(data):
        where = f"preferences.json[{i}]"
        t = entry.get("type")
        if t == "separator":
            if not entry.get("label"):
                err(f"{where}: separator needs a label (section name)")
            continue
        if t not in {"checkbox", "dropdown", "string"}:
            err(f"{where}: unsupported type {t!r}")
            continue
        name = entry.get("property", "")
        where = f"preferences.json {name or f'[{i}]'}"
        if not NAME_RE.match(name):
            err(f"{where}: name must match artemis.<area>.<feature>")
        if name.startswith(INTERNAL_PREFIX):
            err(f"{where}: internal prefs must not be declared")
        if name in prefs:
            err(f"{where}: declared twice")
        for key in ("label", "description"):
            if not entry.get(key):
                err(f"{where}: missing {key}")
        if "defaultValue" not in entry:
            err(f"{where}: missing defaultValue")
        dv = entry.get("defaultValue")
        if t == "checkbox" and not isinstance(dv, bool):
            err(f"{where}: checkbox default must be true/false")
        if t == "dropdown":
            opts = [o.get("value") for o in entry.get("options", [])]
            if not opts:
                err(f"{where}: dropdown has no options")
            if any(not isinstance(o, str) for o in opts):
                err(f"{where}: dropdown option values must be strings")
            if len(set(opts)) != len(opts):
                err(f"{where}: duplicate dropdown values")
            if dv not in opts:
                err(f"{where}: default {dv!r} is not an option")
            if entry.get("placeholder") is not False:
                err(f'{where}: dropdowns must set "placeholder": false')
        if t == "string":
            pattern = entry.get("pattern")
            if not pattern:
                err(f"{where}: string prefs need a validation pattern")
            elif not isinstance(dv, str) or not dv:
                err(f"{where}: string default must be non-empty")
            else:
                try:
                    if not re.match(pattern, dv):
                        err(f"{where}: default {dv!r} fails its own pattern")
                except re.error as e:
                    err(f"{where}: invalid pattern ({e})")
            if re.search(r"[;{}<>\\]", dv or ""):
                err(f"{where}: default contains forbidden characters")
        prefs[name] = entry

    for name, entry in prefs.items():
        for cond_pref in collect_condition_props(entry.get("conditions", [])):
            if cond_pref not in prefs:
                err(f"preferences.json {name}: condition refers to undeclared {cond_pref}")
        master = entry.get("master")
        if master is not None:
            if master not in prefs:
                err(f"preferences.json {name}: master {master} is not declared")
            elif prefs[master].get("type") != "checkbox":
                err(f"preferences.json {name}: master {master} must be a checkbox")
            elif prefs[master].get("master"):
                err(f"preferences.json {name}: master {master} cannot itself have a master")
    return prefs


def collect_condition_props(conds) -> list[str]:
    out: list[str] = []
    for c in conds if isinstance(conds, list) else [conds]:
        if not isinstance(c, dict):
            continue
        inner = c.get("if") or c.get("not")
        if isinstance(inner, dict) and "property" in inner:
            out.append(inner["property"])
        if "conditions" in c:
            out.extend(collect_condition_props(c["conditions"]))
    return out


# --------------------------------------------------------------------------- 2
MOZ_PREF_RE = re.compile(r"-moz-pref\(\s*[\"'](artemis\.[^\"']+)[\"']")
JS_PREF_RE = re.compile(r"[\"'`](artemis\.[a-z0-9.-]+)[\"'`]")
CSS_VAR_RE = re.compile(r"--(artemis-(?:appearance|live)-[a-z0-9-]+)")


def check_usage(prefs: dict[str, dict]) -> None:
    used: dict[str, set[str]] = {}
    for p in files("*.css"):
        text = strip_css_comments(p.read_text(encoding="utf-8"))
        for m in MOZ_PREF_RE.finditer(text):
            used.setdefault(m.group(1), set()).add(rel(p))
    for p in files("*.js") + files("*.mjs"):
        text = strip_js_comments(p.read_text(encoding="utf-8"))
        for m in JS_PREF_RE.finditer(text):
            name = m.group(1)
            if name.endswith("."):
                continue
            used.setdefault(name, set()).add(rel(p))

    for name, where in sorted(used.items()):
        if name.startswith(INTERNAL_PREFIX):
            continue
        if name not in prefs:
            err(f"{', '.join(sorted(where))}: reads undeclared pref {name}")

    # String prefs are consumed through Sine's CSS variable, not -moz-pref.
    css_vars: set[str] = set()
    for p in files("*.css"):
        css_vars.update(CSS_VAR_RE.findall(strip_css_comments(p.read_text(encoding="utf-8"))))
    for name, entry in prefs.items():
        if entry.get("type") == "string":
            var = "artemis-" + name[len(PREFIX):].replace(".", "-")
            if var not in css_vars:
                err(f"preferences.json {name}: string pref is never read via --{var}")
        elif name not in used:
            err(f"preferences.json {name}: declared but never read")

    doc = ROOT / "docs" / "PREFERENCES.md"
    doc_text = doc.read_text(encoding="utf-8") if doc.exists() else ""
    for name in prefs:
        if f"`{name}`" not in doc_text:
            err(f"docs/PREFERENCES.md: {name} is not documented")


# --------------------------------------------------------------------------- 3
IMPORT_RE = re.compile(r"@import\s+(?:url\(\s*)?[\"']([^\"']+)[\"']")


def check_imports() -> None:
    imported: set[Path] = set()

    def walk(css: Path, seen: set[Path]) -> None:
        if css in seen:
            err(f"{rel(css)}: import cycle")
            return
        seen = seen | {css}
        text = strip_css_comments(css.read_text(encoding="utf-8"))
        for target in IMPORT_RE.findall(text):
            if re.match(r"^[a-z]+:", target):
                err(f"{rel(css)}: absolute import {target!r} (use relative paths)")
                continue
            resolved = (css.parent / target).resolve()
            if not exact_case_exists(resolved):
                err(f"{rel(css)}: import {target!r} does not exist (case-sensitive)")
                continue
            imported.add(resolved)
            walk(resolved, seen)

    for entry in ("chrome.css", "content.css", "parts.css"):
        p = ROOT / entry
        if not p.exists():
            err(f"{entry}: missing")
            continue
        body = strip_css_comments(p.read_text(encoding="utf-8"))
        if re.sub(IMPORT_RE.pattern + r"[^;]*;", "", body).strip():
            err(f"{entry}: entry files may only contain @import lines")
        walk(p.resolve(), set())

    for css in files("*.css"):
        if css.name in {"chrome.css", "content.css", "parts.css"} and css.parent == ROOT:
            continue
        if css.resolve() not in imported:
            err(f"{rel(css)}: not imported by any entry file")
    parts = ROOT / "parts.css"
    uc = ROOT / "artemis.uc.js"
    if parts.exists() and uc.exists() and "parts.css" not in uc.read_text(encoding="utf-8"):
        err("parts.css: not loaded by artemis.uc.js")
    for css in files("*.parts.css"):
        if css.resolve() not in imported or not any(
                t.endswith(css.name) for t in IMPORT_RE.findall(parts.read_text(encoding="utf-8"))):
            err(f"{rel(css)}: .parts.css files must be imported from parts.css only")
    for css in files("*.css"):
        if css.name.endswith(".parts.css"):
            continue
        if "::part(" in strip_css_comments(css.read_text(encoding="utf-8")):
            err(f"{rel(css)}: ::part() is ignored in user sheets; move it to a .parts.css file")
    for p in files("*"):
        if p.suffix in {".css", ".js", ".mjs", ".json", ".svg"} and p.name != p.name.lower():
            err(f"{rel(p)}: filenames must be lowercase")


def exact_case_exists(path: Path) -> bool:
    if not path.exists():
        return False
    try:
        parts = path.relative_to(ROOT).parts
    except ValueError:
        return False
    cur = ROOT
    for part in parts:
        if part not in {c.name for c in cur.iterdir()}:
            return False
        cur = cur / part
    return True


# --------------------------------------------------------------------------- 4
GATE_RE = re.compile(r"^@media\s+([^{]+)\{", re.M)


def check_gating(prefs: dict[str, dict]) -> None:
    features = ROOT / "styles" / "features"
    if not features.exists():
        return
    for css in sorted(features.rglob("*.css")):
        text = strip_css_comments(css.read_text(encoding="utf-8"))
        area = css.parent.name
        stem = css.name.removesuffix(".parts.css").removesuffix(".css")
        own = f"artemis.{area}.{stem}"
        # Files may declare their pref explicitly: /* @pref artemis.x.y */
        decl = re.search(r"@pref\s+(artemis\.[a-z0-9.-]+)", css.read_text(encoding="utf-8"))
        if decl:
            own = decl.group(1)
        if own not in prefs:
            err(f"{rel(css)}: feature pref {own} is not declared")
            continue
        master = prefs[own].get("master")
        allowed = {own} | ({master} if master else set())
        top = top_level_blocks(text)
        if not top:
            err(f"{rel(css)}: no top-level gate")
        for header in top:
            if not header.startswith("@media"):
                err(f"{rel(css)}: rule outside the feature gate: {header[:60]!r}")
                continue
            names = set(MOZ_PREF_RE.findall(header))
            if own not in names:
                err(f"{rel(css)}: gate does not test {own}")
            if master and master not in names:
                err(f"{rel(css)}: gate does not test its area master {master}")
            extra = names - allowed
            if extra:
                err(f"{rel(css)}: gate tests other features' prefs {sorted(extra)}")
        inner_names = set(MOZ_PREF_RE.findall(text)) - allowed
        if inner_names:
            err(f"{rel(css)}: reads other features' prefs {sorted(inner_names)}")


def top_level_blocks(text: str) -> list[str]:
    """Return the header of each top-level block (text before its '{')."""
    headers: list[str] = []
    depth = 0
    start = 0
    for i, ch in enumerate(text):
        if ch == "{":
            if depth == 0:
                headers.append(text[start:i].strip().split(";")[-1].strip())
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                start = i + 1
        elif ch == ";" and depth == 0:
            start = i + 1
    return [h for h in headers if h]


# --------------------------------------------------------------------------- 5
FORBIDDEN_CSS = [
    (re.compile(r":nth-(child|of-type)\("), "nth-child/nth-of-type selectors"),
    (re.compile(r"\[style"), "matching inline style attributes"),
    (re.compile(r"-moz-bool-pref"), "legacy -moz-bool-pref"),
    (re.compile(r":root:has\(|#main-window:has\("), ":has() on the root element"),
    (re.compile(r"@layer"), "@layer (see ARCHITECTURE §9.3)"),
]
ANIMATED_PROP_RE = re.compile(r"transition(-property)?\s*:\s*([^;]+);")
OK_ANIMATED = {"transform", "opacity", "none", "all 0s", "translate", "scale", "rotate"}


def check_css_hygiene() -> None:
    for css in files("*.css"):
        text = strip_css_comments(css.read_text(encoding="utf-8"))
        if text.count("{") != text.count("}"):
            err(f"{rel(css)}: unbalanced braces")
        for rx, label in FORBIDDEN_CSS:
            if rx.search(text):
                err(f"{rel(css)}: forbidden {label}")
        in_motion = "motion" in css.relative_to(ROOT).parts
        if not in_motion and re.search(r"@keyframes|\banimation\s*:|\btransition\s*:", text):
            warn(f"{rel(css)}: animation outside styles/features/motion/")
        for m in ANIMATED_PROP_RE.finditer(text):
            for part in m.group(2).split(","):
                prop = part.strip().split(" ")[0]
                if prop and not prop.startswith("var(") and prop not in OK_ANIMATED:
                    warn(f"{rel(css)}: transition on {prop!r} (prefer transform/opacity)")
        count = text.count("!important")
        if count:
            info.append(f"{rel(css)}: {count} !important")


# --------------------------------------------------------------------------- 6
FORBIDDEN_JS = [
    (re.compile(r"\bfetch\s*\(|XMLHttpRequest|WebSocket\("), "network APIs", None),
    (re.compile(r"\b[A-Z][A-Za-z]+\.prototype\.[A-Za-z_$]+\s*="), "prototype assignment", None),
    (re.compile(r"IOUtils\.(write|remove|move|copy|makeDirectory|setPermissions)"),
     "IOUtils writes", "scripts/core/storage.mjs"),
    (re.compile(r"Services\.prefs\.(set(Bool|Int|Char|String)Pref|clearUserPref)"),
     "user-branch pref writes", "scripts/core/schema.mjs"),
]


def find_node() -> str | None:
    for cand in NODE_CANDIDATES:
        found = shutil.which(cand) or (cand if Path(cand).exists() else None)
        if found:
            return found
    return None


def check_js() -> None:
    js_files = files("*.js") + files("*.mjs")
    for p in js_files:
        text = strip_js_comments(p.read_text(encoding="utf-8"))
        for rx, label, allowed_in in FORBIDDEN_JS:
            if rx.search(text) and rel(p) != allowed_in:
                err(f"{rel(p)}: forbidden {label}")
    node = find_node()
    if not node:
        warn("Node.js not found: JS syntax check skipped")
        return
    for p in js_files:
        target = str(p)
        if node.endswith(".exe"):
            target = to_windows_path(p)
        args = [node, "--check", target]
        if p.suffix == ".mjs":
            args = [node, "--input-type=module", "--check"]
        try:
            if p.suffix == ".mjs":
                res = subprocess.run(args, input=p.read_text(encoding="utf-8"),
                                     capture_output=True, text=True, timeout=60)
            else:
                res = subprocess.run(args, capture_output=True, text=True, timeout=60)
        except Exception as e:  # noqa: BLE001
            warn(f"{rel(p)}: syntax check could not run ({e})")
            continue
        if res.returncode != 0:
            lines = (res.stderr or res.stdout).strip().splitlines()
            detail = [ln.strip() for ln in lines if "Error" in ln or ln.strip().startswith("^")]
            location = next((ln.strip() for ln in lines if re.search(r":\d+$", ln.strip())), "")
            err(f"{rel(p)}: syntax error {location} {' | '.join(detail[:2])}".rstrip())


def to_windows_path(p: Path) -> str:
    s = str(p)
    m = re.match(r"^/mnt/([a-z])/(.*)$", s)
    return f"{m.group(1).upper()}:\\{m.group(2).replace('/', chr(92))}" if m else s


# --------------------------------------------------------------------------- 7
def check_assets() -> None:
    credits = ROOT / "CREDITS.md"
    credits_text = credits.read_text(encoding="utf-8") if credits.exists() else ""
    if not credits.exists():
        err("CREDITS.md: missing")
    assets = ROOT / "assets"
    if assets.exists():
        for a in sorted(assets.rglob("*")):
            if a.is_file() and rel(a) not in credits_text:
                err(f"CREDITS.md: {rel(a)} is not listed")
    ref_re = re.compile(r"(?:url\(\s*[\"']?|[\"'])((?:\.\./)*assets/[^\"')]+)")
    for p in files("*.css") + files("*.js") + files("*.mjs"):
        for target in ref_re.findall(p.read_text(encoding="utf-8")):
            if not (p.parent / target).resolve().exists() and not (ROOT / target).exists():
                err(f"{rel(p)}: missing asset {target}")


# --------------------------------------------------------------------------- 8
def check_migrations() -> None:
    fixtures = ROOT / "tools" / "fixtures" / "migrations"
    if not fixtures.exists():
        return
    for f in sorted(fixtures.glob("*.json")):
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
        except Exception as e:  # noqa: BLE001
            err(f"{rel(f)}: invalid JSON ({e})")
            continue
        if not {"from_schema", "input", "expected"} <= data.keys():
            err(f"{rel(f)}: fixture needs from_schema, input and expected")


# --------------------------------------------------------------------------- 9
def check_manifest(release: bool) -> None:
    path = ROOT / "theme.json"
    try:
        theme = json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:  # noqa: BLE001
        err(f"theme.json: invalid ({e})")
        return
    for key in ("id", "name", "description", "author", "version", "homepage",
                "style", "preferences", "updatedAt", "fork"):
        if key not in theme:
            err(f"theme.json: missing {key}")
    if theme.get("id") != "Artemis":
        err("theme.json: id must be 'Artemis' (matches the install folder)")
    if not SEMVER_RE.match(str(theme.get("version", ""))):
        err("theme.json: version must be semver")
    try:
        datetime.fromisoformat(str(theme.get("updatedAt", "")).replace("Z", "+00:00"))
    except ValueError:
        err("theme.json: updatedAt must be an ISO date/time")
    if "license" in theme and not (ROOT / "LICENSE").exists():
        err("theme.json: license set but LICENSE file missing")
    for kind, file in (theme.get("style") or {}).items():
        if file and not (ROOT / file).exists():
            err(f"theme.json: style.{kind} file {file} missing")
    for script in (theme.get("scripts") or {}):
        if not (ROOT / script).exists():
            err(f"theme.json: script {script} missing")
    if release:
        changelog = (ROOT / "CHANGELOG.md").read_text(encoding="utf-8")
        if f"## [{theme.get('version')}]" not in changelog:
            err("CHANGELOG.md: no entry for theme.json version")


def main() -> int:
    release = "--release" in sys.argv
    prefs = check_preferences()
    check_usage(prefs)
    check_imports()
    check_gating(prefs)
    check_css_hygiene()
    check_js()
    check_assets()
    check_migrations()
    check_manifest(release)

    if "-v" in sys.argv or "--verbose" in sys.argv:
        for i in info:
            print(f"info:    {i}")
    for w in warnings:
        print(f"warning: {w}")
    for e in errors:
        print(f"error:   {e}")
    print(f"\n{len(errors)} error(s), {len(warnings)} warning(s)")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
