#!/usr/bin/env python3
from __future__ import annotations
import os, sys, time, urllib.error, urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

SRC = Path(os.environ.get("LANDING_SCROLL_SRC", str(Path.home() / "Desktop" / "prueba-scroll-360preventa-2" / "prueba-scroll-360preventa-2")))
ZONE = os.environ.get("BUNNY_STORAGE_ZONE", "boxies").strip()
KEY = (os.environ.get("BUNNY_STORAGE_ACCESS_KEY") or "").strip()
HOST = os.environ.get("BUNNY_STORAGE_HOST", "storage.bunnycdn.com").strip()
REMOTE_PREFIX = "landing/scroll"
WORKERS = int(os.environ.get("BUNNY_UPLOAD_WORKERS", "12"))

def put(local: Path, remote_path: str) -> str:
    url = f"https://{HOST}/{ZONE}/{remote_path}"
    data = local.read_bytes()
    req = urllib.request.Request(url, data=data, method="PUT", headers={"AccessKey": KEY, "Content-Type": "image/webp", "Content-Length": str(len(data))})
    with urllib.request.urlopen(req, timeout=120) as res:
        if res.status not in (200, 201):
            raise RuntimeError(f"{res.status} {remote_path}")
    return remote_path

def main() -> int:
    if not KEY:
        print("Set BUNNY_STORAGE_ACCESS_KEY", file=sys.stderr); return 1
    files = []
    for name in ("frames-cel", "frames-pc"):
        folder = SRC / name
        if not folder.is_dir():
            print(f"Missing {folder}", file=sys.stderr); return 1
        files.extend(sorted(folder.glob("*.webp")))
    print(f"Uploading {len(files)} files -> {ZONE}/{REMOTE_PREFIX}/")
    ok = 0; t0 = time.time()
    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        futs = {pool.submit(put, path, f"{REMOTE_PREFIX}/{path.parent.name}/{path.name}"): path for path in files}
        for i, fut in enumerate(as_completed(futs), 1):
            path = futs[fut]
            try:
                fut.result(); ok += 1
            except urllib.error.HTTPError as e:
                print(f"FAIL {path.name}: {e.code} {e.read()[:120]}", file=sys.stderr); return 1
            except Exception as e:
                print(f"FAIL {path}: {e}", file=sys.stderr); return 1
            if i % 50 == 0 or i == len(files):
                print(f"  {i}/{len(files)} ({time.time()-t0:.0f}s)")
    print(f"Done: {ok} in {time.time()-t0:.0f}s")
    print(f"CDN https://boxies.b-cdn.net/{REMOTE_PREFIX}/")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
