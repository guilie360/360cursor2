#!/usr/bin/env python3
"""Upload landing scroll WebP frames to Bunny Storage (zone boxies).

Env:
  BUNNY_STORAGE_ACCESS_KEY  (required) — Storage Zone Password
  BUNNY_STORAGE_ZONE        (default: boxies)
  BUNNY_STORAGE_HOST        (default: storage.bunnycdn.com)
  LANDING_SCROLL_SRC        (default: landing/assets/scroll)
"""
from __future__ import annotations

import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = Path(os.environ.get("LANDING_SCROLL_SRC", ROOT / "landing" / "assets" / "scroll"))
ZONE = os.environ.get("BUNNY_STORAGE_ZONE", "boxies").strip()
KEY = (os.environ.get("BUNNY_STORAGE_ACCESS_KEY") or "").strip()
HOST = os.environ.get("BUNNY_STORAGE_HOST", "storage.bunnycdn.com").strip()
REMOTE_PREFIX = "landing/scroll"


def put(local: Path, remote_path: str) -> None:
    url = f"https://{HOST}/{ZONE}/{remote_path}"
    data = local.read_bytes()
    req = urllib.request.Request(
        url,
        data=data,
        method="PUT",
        headers={
            "AccessKey": KEY,
            "Content-Type": "application/octet-stream",
            "Content-Length": str(len(data)),
        },
    )
    with urllib.request.urlopen(req, timeout=120) as res:
        if res.status not in (200, 201):
            raise RuntimeError(f"{res.status} {remote_path}")


def main() -> int:
    if not KEY:
        print("Set BUNNY_STORAGE_ACCESS_KEY", file=sys.stderr)
        return 1
    if not SRC.is_dir():
        print(f"Missing source: {SRC}", file=sys.stderr)
        return 1

    files = sorted(SRC.rglob("*.webp"))
    if not files:
        print(f"No webp under {SRC}", file=sys.stderr)
        return 1

    print(f"Uploading {len(files)} files → {ZONE}/{REMOTE_PREFIX}/ …")
    ok = 0
    for i, path in enumerate(files, 1):
        rel = path.relative_to(SRC).as_posix()
        remote = f"{REMOTE_PREFIX}/{rel}"
        try:
            put(path, remote)
            ok += 1
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", "ignore")
            print(f"FAIL {remote}: {e.code} {body[:200]}", file=sys.stderr)
            return 1
        if i % 25 == 0 or i == len(files):
            print(f"  {i}/{len(files)}")
    print(f"Done: {ok} files. CDN: https://boxies.b-cdn.net/{REMOTE_PREFIX}/")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
