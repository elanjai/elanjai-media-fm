"""Generate responsive logo variants (F-3.7): for every public/logos/**/*.png,
emit <name>-44.webp/-96.webp/-200.webp and matching .avif files beside it.
Idempotent — skips files already up to date. Run after fetch_logos.py.
"""
import os
from PIL import Image

ROOT = os.path.join(os.path.dirname(__file__), "..", "public", "logos")
SIZES = (44, 96, 200)
made = skipped = 0

for dirpath, _dirs, files in os.walk(ROOT):
    for f in files:
        if not f.endswith(".png") or any(f.endswith(f"-{s}.png") for s in SIZES):
            continue
        src = os.path.join(dirpath, f)
        base = src[:-4]
        img = Image.open(src).convert("RGBA")
        for s in SIZES:
            if s <= img.width:
                v = img.resize((s, s), Image.LANCZOS)
            else:
                v = img
            for ext, fmt in (("webp", "WEBP"), ("avif", "AVIF")):
                out = f"{base}-{s}.{ext}"
                if os.path.exists(out) and os.path.getmtime(out) >= os.path.getmtime(src):
                    skipped += 1
                    continue
                v.save(out, fmt, quality=80)
                made += 1
print(f"variants: {made} written, {skipped} already fresh")
