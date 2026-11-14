"""Rebrand + normalize station logos in place → 512×512 rounded tiles.

Two passes per logo (public/logos/<genre>/<slug>.png):
  - real broadcaster art  → trim dead margins, smart tile background,
                            consistent padding, hi-quality upscale
  - generated/junk art    → premium design-system tile (gradient,
                            monogram, station name, EQ bars)
Every tile gets the bare Elanjai mark (halo-stroked) as a corner badge.

Originals are backed up to data/.logo-originals/<genre>/ on first run;
later runs always render FROM the backup so the script is idempotent.

Usage:  python scripts/brand_logos.py [genre ...]        (default: tamil)
"""

import json, os, re, hashlib
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageStat

ROOT = os.path.join(os.path.dirname(__file__), "..")
LOGO_DIR = os.path.join(ROOT, "public", "logos")
BACKUP = os.path.join(ROOT, "data", ".logo-originals")
GENSET = os.path.join(ROOT, "data", ".generated-logos.json")
BADGE_SRC = os.path.join(ROOT, "public", "elanjai-logo.png")
STATIONS = os.path.join(ROOT, "data", "stations.json")

SIZE = 512                    # output tile edge
RADIUS = int(SIZE * 0.24)     # baked corner radius (app uses rounded-[28%])
MARK_FIT = 0.90               # station mark fills this fraction of tile
BADGE_D = int(SIZE * 0.24)    # corner badge box edge
BADGE_M = int(SIZE * 0.04)    # corner badge margin

ACCENT = (0xFD, 0xE0, 0x47)
LIGHT_TILE = (0xF6, 0xF8, 0xF6)
DARK_TILE = ((0x0E, 0x4D, 0x38), (0x08, 0x2A, 0x1F))

# deep, on-brand gradient duos for regenerated tiles
GRADS = [
    ((0x0F, 0x51, 0x38), (0x08, 0x2E, 0x22)),
    ((0x0F, 0x6E, 0x63), (0x0A, 0x44, 0x3E)),
    ((0x1E, 0x3A, 0x8A), (0x11, 0x24, 0x55)),
    ((0x4C, 0x1D, 0x95), (0x2E, 0x10, 0x5E)),
    ((0x7C, 0x2D, 0x12), (0x45, 0x16, 0x08)),
    ((0x9D, 0x17, 0x4D), (0x5A, 0x0C, 0x2C)),
    ((0x14, 0x53, 0x2D), (0x0A, 0x2E, 0x18)),
    ((0x1D, 0x4E, 0xD8), (0x10, 0x2A, 0x6B)),
]
# gradient pairs produced by the old gen_tile() — detects stale tiles
OLD_GEN_PAIRS = [
    ((0x0F, 0x51, 0x38), (0x0B, 0x3D, 0x2E)), ((0x1E, 0x4B, 0x8F), (0x16, 0x34, 0x5C)),
    ((0xA3, 0x48, 0x0E), (0x7C, 0x2D, 0x12)), ((0x6D, 0x28, 0xD9), (0x4C, 0x1D, 0x95)),
    ((0x0F, 0x76, 0x6E), (0x11, 0x5E, 0x59)),
]
# fetched junk that must be regenerated (e.g. WiX site-builder icons)
REGEN_SLUGS = {"jn-fm-tamil", "jn-fm-tamil-classic"}

FONT_CANDIDATES = [
    r"C:\Windows\Fonts\segoeuib.ttf",
    r"C:\Windows\Fonts\arialbd.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
]
FONT = next((p for p in FONT_CANDIDATES if os.path.exists(p)), None)


def font(px):
    return ImageFont.truetype(FONT, px) if FONT else ImageFont.load_default()


def rounded_mask(size=SIZE, radius=RADIUS):
    m = Image.new("L", (size, size), 0)
    ImageDraw.Draw(m).rounded_rectangle(
        [0, 0, size - 1, size - 1], radius=radius, fill=255)
    return m


TILE_MASK = rounded_mask()


def vgrad(size, c1, c2):
    """Smooth diagonal gradient via small lerped image upscaled bicubically."""
    g = Image.new("RGB", (64, 64))
    px = g.load()
    for y in range(64):
        for x in range(64):
            t = (x + y) / 126.0
            px[x, y] = tuple(int(c1[k] + (c2[k] - c1[k]) * t) for k in range(3))
    return g.resize((size, size), Image.BICUBIC)


# ---------------------------------------------------------------- badge

def load_badge():
    """Elanjai mark → white→transparent, cropped, drawn bare with a thin
    white halo stroke so it stays legible on dark tiles (no background)."""
    src = Image.open(BADGE_SRC).convert("RGBA")
    px = src.load()
    for y in range(src.height):
        for x in range(src.width):
            r, g, b, a = px[x, y]
            if r > 236 and g > 236 and b > 236:
                px[x, y] = (r, g, b, 0)
    bbox = src.split()[-1].getbbox()
    mark = src.crop(bbox) if bbox else src

    d = BADGE_D * 4  # supersample → crisp downscale
    mh = int(d * 0.92)
    mw = int(mark.width * mh / mark.height)
    if mw > d * 0.92:
        mw = int(d * 0.92)
        mh = int(mark.height * mw / mark.width)
    m = mark.resize((mw, mh), Image.LANCZOS)

    # soft white halo: dilate mark alpha → white fill underneath
    halo_a = (m.split()[-1]
              .filter(ImageFilter.MaxFilter(d // 14 | 1))
              .filter(ImageFilter.GaussianBlur(d / 40)))
    halo = Image.new("RGBA", (mw, mh), (255, 255, 255, 0))
    halo.putalpha(halo_a.point(lambda v: int(v * 0.92)))

    badge = Image.new("RGBA", (d, d), (0, 0, 0, 0))
    badge.alpha_composite(halo, ((d - mw) // 2, (d - mh) // 2))
    badge.alpha_composite(m, ((d - mw) // 2, (d - mh) // 2))
    return badge.resize((BADGE_D, BADGE_D), Image.LANCZOS)


def apply_badge(tile, badge):
    tile.alpha_composite(
        badge, (SIZE - BADGE_D - BADGE_M, SIZE - BADGE_D - BADGE_M))
    return tile


# ------------------------------------------------------------- analysis

def alpha_trim(im):
    a = im.split()[-1].point(lambda v: 255 if v > 12 else 0)
    bbox = a.getbbox()
    return im.crop(bbox) if bbox else im


def corner_color(im):
    rgb, a = im.convert("RGB"), im.split()[-1]
    w, h = im.size
    pts = [(1, 1), (w - 2, 1), (1, h - 2), (w - 2, h - 2)]
    cols = [rgb.getpixel(p) for p in pts]
    al = [a.getpixel(p) for p in pts]
    med = tuple(sorted(c[i] for c in cols)[2] for i in range(3))
    return med, min(al)


def opaque_fill(im):
    a = im.split()[-1]
    hist = a.histogram()
    return sum(hist[200:]) / (im.width * im.height)


def median_opaque(im):
    """Median color of opaque pixels — a dense mark's dominant color."""
    small = im.resize((64, 64), Image.LANCZOS)
    rgb, a = small.convert("RGB"), small.split()[-1]
    px = [rgb.getpixel((x, y)) for y in range(64) for x in range(64)
          if a.getpixel((x, y)) > 200]
    if not px:
        return None
    return tuple(sorted(c[i] for c in px)[len(px) // 2] for i in range(3))


def border_mode(im):
    """Dominant opaque border color (quantized mode) — the frame color
    a mark actually ships on."""
    from collections import Counter
    small = im.resize((96, 96), Image.LANCZOS)
    rgb, a = small.convert("RGB"), small.split()[-1]
    w = h = 96
    px = []
    for x in range(w):
        for y in (0, 1, h - 2, h - 1):
            if a.getpixel((x, y)) > 200:
                px.append(rgb.getpixel((x, y)))
    for y in range(h):
        for x in (0, 1, w - 2, w - 1):
            if a.getpixel((x, y)) > 200:
                px.append(rgb.getpixel((x, y)))
    if not px:
        return None
    return Counter((r // 8 * 8, g // 8 * 8, b // 8 * 8)
                   for r, g, b in px).most_common(1)[0][0]


def peel(im, corner):
    """Remove uniform opaque border bands that match the corner color —
    dead margins go, gradient cards keep their shading (band color drifts
    away from the corner → stop)."""
    ow, oh = im.size
    px_ = py_ = 0
    for _ in range(500):
        w, h = im.size
        if min(w, h) < 24:
            break
        rgb, a = im.convert("RGB"), im.split()[-1]
        did = False
        for side, box, axis in (
                ("top", (0, 0, w, 1), "y"), ("bot", (0, h - 1, w, h), "y"),
                ("lft", (0, 0, 1, h), "x"), ("rgt", (w - 1, 0, w, h), "x")):
            if (axis == "x" and px_ > 0.45 * ow) or \
               (axis == "y" and py_ > 0.45 * oh):
                continue
            st = ImageStat.Stat(rgb.crop(box))
            sa = ImageStat.Stat(a.crop(box))
            if (max(st.stddev) < 9 and sa.mean[0] > 250
                    and all(abs(st.mean[i] - corner[i]) < 14 for i in range(3))):
                if side == "top":
                    im = im.crop((0, 1, w, h))
                elif side == "bot":
                    im = im.crop((0, 0, w, h - 1))
                elif side == "lft":
                    im = im.crop((1, 0, w, h))
                else:
                    im = im.crop((0, 0, w - 1, h))
                if axis == "y":
                    py_ += 1
                else:
                    px_ += 1
                did = True
                break
        if not did:
            break
    return im


def ink_luminance(im):
    a = im.split()[-1].point(lambda v: 255 if v > 200 else 0)
    st = ImageStat.Stat(im.convert("RGB"), mask=a)
    r, g, b = st.mean[:3]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def is_old_generated(im):
    """Old gen_tile: 256px full-bleed vertical gradient c1(top)→c2(bottom)."""
    if im.size != (256, 256):
        return False
    rgb = im.convert("RGB")
    w, h = rgb.size
    top, bot = rgb.getpixel((w // 2, 3)), rgb.getpixel((w // 2, h - 4))
    def close(a, b, tol):
        return all(abs(a[i] - b[i]) <= tol for i in range(3))
    return any(close(top, c1, 10) and close(bot, c2, 34)
               for c1, c2 in OLD_GEN_PAIRS)


# -------------------------------------------------------------- render

def enhance(im):
    """Real broadcaster art → consistent padded tile on a smart background."""
    im = alpha_trim(im)
    corner, ca = corner_color(im)

    if ca > 250:
        # opaque card/poster logo — peel the outer margin, then keep
        # peeling each level's own dominant border color (nested cards).
        # When a peel stalls the mark IS a card → sit it on that color.
        mark = peel(im, corner)
        bg = corner
        for _ in range(3):
            c = border_mode(mark)
            if c is None:
                break
            m2 = peel(mark, c)
            bg = c
            if m2.size == mark.size:
                break
            mark = m2
        base = Image.new("RGBA", (SIZE, SIZE), (*bg, 255))
    else:
        mark = im
        if opaque_fill(im) > 0.80:
            # dense mark = a card with transparent margins → its own color
            base = Image.new("RGBA", (SIZE, SIZE),
                             (*(border_mode(mark) or median_opaque(mark)
                                or (20, 20, 20)), 255))
        elif ink_luminance(im) < 150:
            base = Image.new("RGBA", (SIZE, SIZE), (*LIGHT_TILE, 255))
        else:
            base = vgrad(SIZE, *DARK_TILE).convert("RGBA")

    box = int(SIZE * MARK_FIT)
    scale = min(box / mark.width, box / mark.height)
    m = mark.resize((max(1, round(mark.width * scale)),
                     max(1, round(mark.height * scale))), Image.LANCZOS)
    if scale > 1.5:  # heavy upscale → gentle sharpen to recover edge snap
        m = m.filter(ImageFilter.UnsharpMask(radius=2, percent=70, threshold=2))
    base.alpha_composite(m, ((SIZE - m.width) // 2, (SIZE - m.height) // 2))

    out = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    out.paste(base, (0, 0), TILE_MASK)
    return out


TOKENS = sorted(
    "american radio tamil malayalam melody melodies hits gold classic vibes "
    "online live news music lanka chennai madurai covai german swiss canada "
    "toronto paris malaysia usa fm hd abc city beat beats love isai ragam "
    "oli vaanoli amuthu murasam suryan sooriyan thendral mellisai magizhchi "
    "kalai chillax clubhouse evergreen instrumental paramankurichi tamizen "
    "jn stream".split(),
    key=len, reverse=True)

ACRONYMS = {"fm", "am", "hd", "hd2", "hd3", "abc", "usa", "uk", "jn",
            "gtr", "ctr", "mtr", "slbc", "air", "ait", "trt", "rbc", "rj",
            "vj", "dj", "tv"}


def slug_words(s):
    """'fmgoldtamil' → ['fm','gold','tamil']; hyphenated slugs split first."""
    s = s.lower()
    if "-" in s or " " in s:
        return [w for w in re.split(r"[\s\-]+", s) if w]
    out, buf, i = [], "", 0
    while i < len(s):
        tok = next((t for t in TOKENS if s.startswith(t, i)), None)
        if tok:
            if buf:
                out.append(buf)
                buf = ""
            out.append(tok)
            i += len(tok)
        else:
            buf += s[i]
            i += 1
    if buf:
        out.append(buf)
    return out or [s]


def title_word(w):
    lw = w.lower().strip("\"'().,")
    if lw in ACRONYMS:
        return lw.upper()
    if not w.isalpha():
        return w
    if w.isupper() and len(w) > 3:
        return w.capitalize()
    if w[0].islower():
        return w[0].upper() + w[1:]
    return w


def pretty_label(name, slug):
    """Readable label — real names get casing fixed, sluggy names rebuilt."""
    words = [w for w in re.split(r"[\s\-]+", name) if w]
    if len(words) > 1:
        return " ".join(title_word(w) for w in words)
    return " ".join(title_word(w) for w in slug_words(slug))


def gen_tile(name, slug):
    """Design-system tile: slug-keyed gradient, monogram, name, EQ bars."""
    h = int(hashlib.md5(slug.encode()).hexdigest(), 16)
    c1, c2 = GRADS[h % len(GRADS)]
    base = vgrad(SIZE, c1, c2).convert("RGBA")
    dr = ImageDraw.Draw(base)

    dr.ellipse([SIZE * .68, -SIZE * .22, SIZE * 1.22, SIZE * .32],
               fill=(*ACCENT, 24))
    dr.ellipse([SIZE * .80, -SIZE * .10, SIZE * 1.08, SIZE * .18],
               outline=(255, 255, 255, 30), width=6)

    label = pretty_label(name, slug)
    words = label.split()
    first = words[0] if words else "FM"
    mono = first.upper() if len(first) <= 3 or first.isupper() else \
        ("".join(w[0] for w in words[:2]).upper() if len(words) > 1
         else first[:2].upper())
    dr.text((SIZE * .09, SIZE * .14), mono, font=font(170), fill=ACCENT)

    # shrink to fit; still too wide → drop trailing words, add ellipsis
    f = font(46)
    for px in (46, 42, 38, 34, 30, 26, 22):
        f = font(px)
        if dr.textlength(label, font=f) <= SIZE * 0.84:
            break
    shown = label
    while " " in shown and dr.textlength(shown + "…", font=f) > SIZE * 0.84:
        shown = shown.rsplit(" ", 1)[0]
    if shown != label:
        shown = shown.rstrip(" .,") + "…"
    dr.text((SIZE * .10, SIZE * .50), shown, font=f,
            fill=(255, 255, 255, 235))

    # EQ bars bottom-left (echoes the app's EqBars player indicator)
    bx, by = SIZE * .10, SIZE * .80
    for i, bh in enumerate((36, 60, 78, 50, 28)):
        x = bx + i * 30
        dr.rounded_rectangle([x, by - bh, x + 16, by], radius=7, fill=ACCENT)
    dr.text((SIZE * .10, SIZE * .85), "T A M I L   R A D I O",
            font=font(24), fill=(255, 255, 255, 150))

    out = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    out.paste(base, (0, 0), TILE_MASK)
    return out


# ---------------------------------------------------------------- main

def main():
    import sys
    genres = sys.argv[1:] or ["tamil"]
    stations = {s["slug"]: s for s in
                json.load(open(STATIONS, encoding="utf-8"))}
    genset = set()
    if os.path.exists(GENSET):
        genset = set(json.load(open(GENSET, encoding="utf-8")))
    badge = load_badge()
    stats = {"enhanced": 0, "regenerated": 0}

    for genre in genres:
        d = os.path.join(LOGO_DIR, genre)
        bak = os.path.join(BACKUP, genre)
        os.makedirs(bak, exist_ok=True)
        for f in sorted(os.listdir(d)):
            if not f.endswith(".png"):
                continue
            slug = f[:-4]
            orig = os.path.join(bak, f)
            dst = os.path.join(d, f)
            if not os.path.exists(orig):          # first run → backup
                cur = Image.open(dst)
                a = cur.split()[-1] if cur.mode == "RGBA" else None
                if (cur.size == (SIZE, SIZE) and a
                        and a.getpixel((2, 2)) < 30):
                    continue  # already branded, no backup → skip (no double badge)
                cur.save(orig)
            im = Image.open(orig).convert("RGBA")  # always render from backup

            st = stations.get(slug)
            name = st["name"] if st else slug.replace("-", " ").title()
            regenerate = (slug in genset or slug in REGEN_SLUGS
                          or is_old_generated(im))
            tile = gen_tile(name, slug) if regenerate else enhance(im)
            apply_badge(tile, badge).save(dst, "PNG", optimize=True)
            if regenerate:
                genset.add(slug)
                stats["regenerated"] += 1
            else:
                stats["enhanced"] += 1
        print(f"{genre}: {stats}")

    with open(GENSET, "w", encoding="utf-8") as fp:
        json.dump(sorted(genset), fp, indent=1)


if __name__ == "__main__":
    main()
