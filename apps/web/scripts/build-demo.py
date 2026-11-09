#!/usr/bin/env python3
"""Build a static, relocatable copy of the guest app for demo hosting.

Runs a static export (STATIC_EXPORT=1), flattens the pilot pages into one
folder, makes every asset path relative and renames `_next` to `assets`, so the
site works from any sub-path (Claude artifact links, any static host).

Usage: python3 scripts/build-demo.py <output-dir>
"""

import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

WEB = Path(__file__).resolve().parent.parent
PAGES = {"m/samarkand-danang.html": "samarkand.html", "m/zabey-danang.html": "zabey.html", "crew.html": "crew.html"}


def main(out: Path) -> None:
    subprocess.run(["pnpm", "build"], cwd=WEB, check=True, env={**os.environ, "STATIC_EXPORT": "1"})
    export = WEB / "out"
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)
    shutil.copytree(export / "_next", out / "assets")
    for folder in ("dishes",):
        if (export / folder).exists():
            shutil.copytree(export / folder, out / folder)
    for src, dst in PAGES.items():
        shutil.copy(export / src, out / dst)

    build_dirs = [p.name for p in (out / "assets" / "static").iterdir() if p.is_dir() and p.name not in ("chunks", "media")]
    for name in build_dirs:
        (out / "assets" / "static" / name).rename(out / "assets" / "static" / "build")

    for path in out.rglob("*"):
        if path.suffix not in (".html", ".js", ".css"):
            continue
        text = path.read_text(encoding="utf-8")
        original = text
        for name in build_dirs:
            text = text.replace(name, "build")
        if path.suffix == ".html":
            text = re.sub(r'(["\'(])/_next/', r"\1./assets/", text)
            text = re.sub(r'(["\'(])/(dishes)/', r"\1./\2/", text)
        elif path.suffix == ".css":
            text = text.replace("url(/_next/", "url(../../../assets/")
        else:
            text = re.sub(r'(["\'`])/(dishes)/', r"\1./\2/", text)
            text = text.replace('"/_next/"', '"./assets/"')
        # The artifact host rejects raw U+FFFD; the escape is equivalent in JS.
        text = text.replace("�", "\\ufffd")
        if text != original:
            path.write_text(text, encoding="utf-8")
    print(f"demo site written to {out}")


if __name__ == "__main__":
    main(Path(sys.argv[1]).resolve())
