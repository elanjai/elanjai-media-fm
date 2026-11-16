"""Fetch new-language stations from radio-browser.info and APPEND to the
catalog (F-2.2). Unlike make_seed.py (which rebuilds), this never touches
existing stations — it only adds, deduped by stream URL and slug.

Usage:  python scripts/expand_languages.py [--limit N] [--dry]
"""

import json, re, os, hashlib, sys, urllib.request

LANGUAGES = [
    "bengali", "marathi", "gujarati", "odia", "assamese", "bhojpuri",
    "konkani", "maithili", "rajasthani", "kashmiri", "sindhi", "nepali",
    "sanskrit", "tulu", "manipuri", "english",
]
KNOWN = [
    "tamil", "hindi", "malayalam", "telugu", "kannada", "punjabi", "urdu",
] + LANGUAGES

API = "https://de1.api.radio-browser.info/json/stations/search"
UA = {"User-Agent": "elanjai-media-fm-expansion/1.0"}
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
HLS_RE = re.compile(r"\.m3u8?($|\?)", re.I)


def fetch(lang: str, limit: int):
    url = (
        f"{API}?language={lang}&limit={limit}&order=votes&reverse=true"
        f"&hidebroken=true"
    )
    req = urllib.request.Request(url, headers=UA)
    return json.load(urllib.request.urlopen(req, timeout=30))


def slugify(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", name.lower().strip())
    return s.strip("-")[:60] or "station"


def main() -> None:
    dry = "--dry" in sys.argv
    limit = 30
    for i, a in enumerate(sys.argv):
        if a == "--limit" and i + 1 < len(sys.argv):
            limit = int(sys.argv[i + 1])

    stations = json.load(open(os.path.join(OUT_DIR, "stations.json"), encoding="utf-8"))
    have_urls = {
        st["url"].split("?")[0].rstrip("/").lower()
        for s in stations
        for st in s.get("streams", [])
    }
    taken = {s["slug"] for s in stations}
    new = []

    for lang in LANGUAGES:
        try:
            data = fetch(lang, limit)
        except Exception as e:
            print(f"{lang}: fetch failed: {e}")
            continue
        added = 0
        for st in data:
            name = re.sub(r"\s+", " ", (st.get("name") or "").strip())
            url = st.get("url_resolved") or st.get("url") or ""
            if not name or not url.startswith("http") or len(name) > 60:
                continue
            key = url.split("?")[0].rstrip("/").lower()
            if key in have_urls:
                continue
            languages = [
                l.strip().lower()
                for l in (st.get("language") or "").split(",")
                if l.strip()
            ]
            # primary language = the one we fetched for; keep other known
            # Indian languages as secondary so the station shows on both pages
            langs = [lang] + [
                l for l in languages[:3] if l in KNOWN and l != lang
            ]
            slug = slugify(name)
            if slug in taken:
                slug = f"{slug}-{hashlib.sha1(key.encode()).hexdigest()[:6]}"
            taken.add(slug)
            have_urls.add(key)
            rec = {
                "id": hashlib.sha1(key.encode()).hexdigest()[:8],
                "name": name,
                "slug": slug,
                "streams": [
                    {
                        "url": url,
                        "codec": st.get("codec") or "",
                        "bitrate": st.get("bitrate") or 0,
                        "hls": bool(HLS_RE.search(url)),
                    }
                ],
                "languages": langs,
                "categories": [],
                "homepage": st.get("homepage") or "",
                "favicon": st.get("favicon") or "",
                "country": st.get("country") or "India",
                "votes": st.get("votes") or 0,
                "tags": [
                    t.strip()
                    for t in (st.get("tags") or "").split(",")
                    if t.strip()
                ][:6],
                "is_active": True,
            }
            new.append(rec)
            added += 1
        print(f"{lang}: +{added}")

    print(f"total new: {len(new)}")
    if dry:
        for s in new[:20]:
            print(f"  + {s['name'][:40]:42} [{s['languages'][0]}] {s['streams'][0]['url'][:50]}")
        return
    stations.extend(new)
    with open(os.path.join(OUT_DIR, "stations.json"), "w", encoding="utf-8") as f:
        json.dump(stations, f, ensure_ascii=False, indent=1)
    print(f"wrote {len(stations)} stations")

    # refresh genres.json slugs for the languages that now have stations
    counts = {}
    for s in stations:
        if s.get("is_active"):
            for l in s.get("languages", []):
                counts[l] = counts.get(l, 0) + 1
    gpath = os.path.join(OUT_DIR, "genres.json")
    genres = json.load(open(gpath, encoding="utf-8"))
    have = {g["slug"] for g in genres}
    for lang, n in sorted(counts.items()):
        if lang not in have:
            genres.append({"slug": lang, "name": lang.title(), "count": n})
            have.add(lang)
    for g in genres:
        g["count"] = counts.get(g["slug"], 0)
    with open(gpath, "w", encoding="utf-8") as f:
        json.dump(genres, f, ensure_ascii=False, indent=1)
    print(f"genres: {len(genres)}")


if __name__ == "__main__":
    main()
