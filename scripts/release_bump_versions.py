#!/usr/bin/env python3
"""Bump semver in package.json manifests and sync README **Package version:** from root package.json."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

DEFAULT_MANIFESTS = ("package.json", "server/package.json")
README_VERSION_PATTERN = re.compile(r"(\*\*Package version:\*\* `)[^`]+(`)")


def _read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def bump_manifests(root: Path, version: str) -> list[Path]:
    updated: list[Path] = []
    for rel in DEFAULT_MANIFESTS:
        path = root / rel
        if not path.is_file():
            continue
        data = _read_json(path)
        data["version"] = version
        _write_json(path, data)
        updated.append(path)
    return updated


def sync_readme_from_package_json(root: Path) -> bool:
    """Set README **Package version:** from root package.json if that line exists."""
    readme = root / "README.md"
    pkg = root / "package.json"
    if not readme.is_file() or not pkg.is_file():
        return False
    version = _read_json(pkg).get("version")
    if not isinstance(version, str) or not version:
        return False
    text = readme.read_text(encoding="utf-8")
    if not README_VERSION_PATTERN.search(text):
        return False
    new_text = README_VERSION_PATTERN.sub(
        lambda m: f"{m.group(1)}{version}{m.group(2)}", text, count=1
    )
    if new_text == text:
        return False
    readme.write_text(new_text, encoding="utf-8")
    return True


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument(
        "version",
        help="Semver without leading v (e.g. 1.2.3 or 1.2.3-beta.1)",
    )
    p.add_argument(
        "--root",
        type=Path,
        default=Path.cwd(),
        help="Repository root (default: current directory)",
    )
    args = p.parse_args(argv)
    root = args.root.resolve()
    bump_manifests(root, args.version)
    sync_readme_from_package_json(root)
    return 0


if __name__ == "__main__":
    sys.exit(main())
