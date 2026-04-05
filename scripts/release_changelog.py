#!/usr/bin/env python3
"""Generate release notes from git commits and promote CHANGELOG.md [Unreleased] → version section."""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

CHORE_SKIP = re.compile(r"^chore:.*(version|changelog|bump)", re.IGNORECASE)
CONVENTIONAL = re.compile(r"^([a-z]+)(\([^)]+\))?\s*:\s*(.*)$")


def _git_log_subjects(repo: Path, since_tag: str | None) -> list[str]:
    if not since_tag or since_tag == "v0.0.0":
        rng = "HEAD"
    else:
        rng = f"{since_tag}..HEAD"
    r = subprocess.run(
        ["git", "-C", str(repo), "log", rng, "--pretty=format:%s", "--no-merges"],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=False,
    )
    if r.returncode != 0:
        return []
    lines = []
    for line in r.stdout.splitlines():
        line = line.strip()
        if not line or CHORE_SKIP.search(line):
            continue
        lines.append(line)
    return lines


def _format_description(description: str) -> str:
    d = description.strip()
    if not d:
        return ""
    d = d[0].upper() + d[1:] if len(d) > 1 else d.upper()
    if not re.search(r"[.!?]$", d):
        d += "."
    return d


def _categorize_message(msg: str) -> tuple[str, str]:
    m = CONVENTIONAL.match(msg.strip())
    if not m:
        return "other", _format_description(msg)
    ctype, _scope, rest = m.group(1), m.group(2), m.group(3)
    desc = _format_description(rest)
    if not desc:
        return "other", ""
    return ctype.lower(), desc


def generate_notes_from_commits(repo: Path, since_tag: str | None) -> str:
    buckets: dict[str, list[str]] = {
        "added": [],
        "changed": [],
        "fixed": [],
        "security": [],
        "deprecated": [],
        "removed": [],
    }
    for msg in _git_log_subjects(repo, since_tag):
        ctype, desc = _categorize_message(msg)
        if not desc:
            continue
        line = f"- {desc}"
        if ctype in ("feat", "feature"):
            buckets["added"].append(line)
        elif ctype in ("fix", "bugfix"):
            buckets["fixed"].append(line)
        elif ctype == "security":
            buckets["security"].append(line)
        elif ctype in ("deprecate", "deprecated"):
            buckets["deprecated"].append(line)
        elif ctype in ("remove", "removed"):
            buckets["removed"].append(line)
        elif ctype in (
            "change",
            "changed",
            "update",
            "updated",
            "refactor",
            "perf",
            "performance",
            "style",
        ):
            buckets["changed"].append(line)
        else:
            pass

    parts: list[str] = []
    if buckets["added"]:
        parts.append("### Added\n" + "\n".join(buckets["added"]))
    if buckets["changed"]:
        parts.append("### Changed\n" + "\n".join(buckets["changed"]))
    if buckets["fixed"]:
        parts.append("### Fixed\n" + "\n".join(buckets["fixed"]))
    if buckets["security"]:
        parts.append("### Security\n" + "\n".join(buckets["security"]))
    if buckets["deprecated"]:
        parts.append("### Deprecated\n" + "\n".join(buckets["deprecated"]))
    if buckets["removed"]:
        parts.append("### Removed\n" + "\n".join(buckets["removed"]))

    if not parts:
        return "\n### Changed\n- Various updates and improvements."
    return "\n" + "\n\n".join(parts)


def promote_changelog(
    content: str,
    version: str,
    date_str: str,
    commit_changes: str,
) -> str:
    """Insert a new ## [version] - date section after [Unreleased], matching release.sh awk behavior."""
    lines = content.splitlines(keepends=True)
    out: list[str] = []
    in_unreleased = False
    version_inserted = False
    unreleased_content = ""
    has_commit_changes = bool(commit_changes.strip())

    i = 0
    while i < len(lines):
        line = lines[i]
        if re.match(r"^## \[Unreleased\]", line):
            out.append(line)
            in_unreleased = True
            unreleased_content = ""
            i += 1
            continue

        if re.match(r"^## \[", line):
            if in_unreleased and not version_inserted:
                out.append("\n")
                out.append(f"## [{version}] - {date_str}\n")
                if has_commit_changes:
                    out.append(commit_changes)
                    if not commit_changes.endswith("\n"):
                        out.append("\n")
                elif unreleased_content.strip():
                    out.append("\n")
                    out.append(unreleased_content)
                version_inserted = True
            in_unreleased = False
            out.append(line)
            i += 1
            continue

        if in_unreleased:
            if not has_commit_changes:
                unreleased_content += line
            i += 1
            continue

        out.append(line)
        i += 1

    if in_unreleased and not version_inserted:
        out.append("\n")
        out.append(f"## [{version}] - {date_str}\n")
        if has_commit_changes:
            out.append(commit_changes)
            if not commit_changes.endswith("\n"):
                out.append("\n")
        elif unreleased_content.strip():
            out.append("\n")
            out.append(unreleased_content)

    return "".join(out)


def cmd_promote(args: argparse.Namespace) -> int:
    root: Path = args.root.resolve()
    changelog: Path = args.changelog.resolve()
    if not changelog.is_file():
        print(f"error: {changelog} not found", file=sys.stderr)
        return 1
    since = args.since_tag or None
    body = generate_notes_from_commits(root, since)
    text = changelog.read_text(encoding="utf-8")
    date_str = args.date or datetime.now(timezone.utc).strftime("%Y-%m-%d")
    new_text = promote_changelog(text, args.version, date_str, body)
    changelog.write_text(new_text, encoding="utf-8")
    return 0


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description=__doc__)
    sub = p.add_subparsers(dest="cmd", required=True)

    pr = sub.add_parser("promote", help="Move [Unreleased] notes into a new version section")
    pr.add_argument("--root", type=Path, default=Path.cwd(), help="Git repo root")
    pr.add_argument(
        "--changelog",
        type=Path,
        default=Path("CHANGELOG.md"),
        help="Path to CHANGELOG.md",
    )
    pr.add_argument("--version", required=True, help="Semver without leading v")
    pr.add_argument(
        "--since-tag",
        default="",
        help="Previous release tag (e.g. v1.0.0); empty or v0.0.0 means full history",
    )
    pr.add_argument(
        "--date",
        default="",
        help="Release date YYYY-MM-DD (default: today UTC)",
    )
    pr.set_defaults(func=cmd_promote)

    args = p.parse_args(argv)
    return int(args.func(args))


if __name__ == "__main__":
    sys.exit(main())
