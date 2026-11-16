"""Migrate data/stations.json from schema v1 to schema v2 (F-2.1).

v1 → v2:
  stream_url/codec/bitrate  →  streams: [{url, codec, bitrate, hls}]
  genre/language            →  languages: [slug, ...]
  tags + name heuristics    →  categories: [slug, ...]
  name/homepage heuristics  →  network, city, state, frequency_mhz
  new fields                →  name_native?, aliases?, description?,
                               last_checked_at, health_score?

`languages` keeps our genre *slugs* ("tamil") rather than ISO codes so
genre URLs and stored preferences stay stable. Idempotent: records that
already have `streams` are skipped. Runs before every seed/expansion so
all writers can stay v1-agnostic if needed.

Usage:  python scripts/migrate_schema_v2.py
"""

import json, os, re
from datetime import datetime, timezone

PATH = os.path.join(os.path.dirname(__file__), "..", "data", "stations.json")

HLS_RE = re.compile(r"\.m3u8?($|\?)", re.I)
FREQ_RE = re.compile(r"\b(8[7-9]|9[0-9]|10[0-8])\.\d\b")

# tag / keyword → category slug (taxonomy in data/categories.json)
TAG_CATEGORY = {
    "bollywood": "film",
    "film": "film",
    "movie": "film",
    "soundtrack": "film",
    "kollywood": "film",
    "tollywood": "film",
    "mollywood": "film",
    "sandalwood": "film",
    "retro": "retro",
    "oldies": "retro",
    "old": "retro",
    "classic hits": "retro",
    "70s": "retro",
    "80s": "retro",
    "90s": "retro",
    "devotional": "devotional",
    "bhakti": "devotional",
    "spiritual": "devotional",
    "religious": "devotional",
    "temple": "devotional",
    "gurbani": "devotional",
    "christian": "devotional",
    "islamic": "devotional",
    "quran": "devotional",
    "news": "news",
    "talk": "talk",
    "speech": "talk",
    "discussion": "talk",
    "classical": "classical",
    "carnatic": "classical",
    "hindustani": "classical",
    "carnatica": "classical",
    "sports": "sports",
    "cricket": "sports",
    "kids": "kids",
    "children": "kids",
    "community": "community",
    "folk": "folk",
    "gaana": "folk",
    "lok": "folk",
    "romantic": "love",
    "love": "love",
    "melody": "melody",
    "hits": "hits",
    "top 40": "hits",
    "pop": "hits",
}

# name/homepage substring → network slug
NETWORK_PATTERNS = [
    (r"\bmirchi\b", "mirchi"),
    (r"red\s*fm|redfm", "redfm"),
    (r"\bbig\s*fm\b|92\.7\s*big", "bigfm"),
    (r"radio\s*city", "radiocity"),
    (r"\bsuryan\b|sooriyan|suriyan", "suryan"),
    (r"hello\s*fm", "hellofm"),
    (r"club\s*fm", "clubfm"),
    (r"\bfever\b|fever\s*fm", "feverfm"),
    (r"radio\s*one", "radioone"),
    (r"radio\s*mango", "radiomango"),
    (r"\bishq\b|ish\s*fm", "ishq"),
    (r"hit\s*95|hit95", "hit95"),
    (r"chennai\s*live", "chennailive"),
    (r"\bair\b|all\s*india\s*radio|akashvani|vividh\s*bharati|fm\s*rainbow|fm\s*gold|rainbow\s*fm", "air"),
    (r"\bbbc\b", "bbc"),
    (r"\bndtv\b", "ndtv"),
    (r"sun\s*news|sun\s*fm|suryan", "sunnetwork"),
]

# name word → (city slug, state) — matched on word boundaries
CITY_PATTERNS = [
    (r"chennai", "chennai", "Tamil Nadu"),
    (r"madurai", "madurai", "Tamil Nadu"),
    (r"coimbatore|kovai", "coimbatore", "Tamil Nadu"),
    (r"trichy|tiruchirappalli|tiruchi", "trichy", "Tamil Nadu"),
    (r"salem", "salem", "Tamil Nadu"),
    (r"tirunelveli|nellai", "tirunelveli", "Tamil Nadu"),
    (r"thanjavur|tanjore", "thanjavur", "Tamil Nadu"),
    (r"erode", "erode", "Tamil Nadu"),
    (r"vellore", "vellore", "Tamil Nadu"),
    (r"kanyakumari|nagercoil", "nagercoil", "Tamil Nadu"),
    (r"tuticorin|thoothukudi", "thoothukudi", "Tamil Nadu"),
    (r"pondicherry|puducherry", "puducherry", "Puducherry"),
    (r"karaikal", "karaikal", "Puducherry"),
    (r"ooty|udhagamandalam|udagamandalam", "ooty", "Tamil Nadu"),
    (r"hosur", "hosur", "Tamil Nadu"),
    (r"kumbakonam", "kumbakonam", "Tamil Nadu"),
    (r"mumbai|bombay", "mumbai", "Maharashtra"),
    (r"delhi|new\s*delhi", "delhi", "Delhi"),
    (r"kolkata|calcutta", "kolkata", "West Bengal"),
    (r"bengaluru|bangalore", "bengaluru", "Karnataka"),
    (r"mysuru|mysore", "mysuru", "Karnataka"),
    (r"mangaluru|mangalore", "mangaluru", "Karnataka"),
    (r"hubli|hubballi", "hubballi", "Karnataka"),
    (r"hyderabad", "hyderabad", "Telangana"),
    (r"warangal", "warangal", "Telangana"),
    (r"pune", "pune", "Maharashtra"),
    (r"nagpur", "nagpur", "Maharashtra"),
    (r"nashik", "nashik", "Maharashtra"),
    (r"ahmedabad", "ahmedabad", "Gujarat"),
    (r"surat", "surat", "Gujarat"),
    (r"vadodara|baroda", "vadodara", "Gujarat"),
    (r"rajkot", "rajkot", "Gujarat"),
    (r"jaipur", "jaipur", "Rajasthan"),
    (r"jodhpur", "jodhpur", "Rajasthan"),
    (r"udaipur", "udaipur", "Rajasthan"),
    (r"lucknow", "lucknow", "Uttar Pradesh"),
    (r"kanpur", "kanpur", "Uttar Pradesh"),
    (r"varanasi|banaras|benares", "varanasi", "Uttar Pradesh"),
    (r"agra", "agra", "Uttar Pradesh"),
    (r"meerut", "meerut", "Uttar Pradesh"),
    (r"allahabad|prayagraj", "prayagraj", "Uttar Pradesh"),
    (r"patna", "patna", "Bihar"),
    (r"ranchi", "ranchi", "Jharkhand"),
    (r"bhopal", "bhopal", "Madhya Pradesh"),
    (r"indore", "indore", "Madhya Pradesh"),
    (r"bhubaneswar", "bhubaneswar", "Odisha"),
    (r"cuttack", "cuttack", "Odisha"),
    (r"guwahati", "guwahati", "Assam"),
    (r"chandigarh", "chandigarh", "Chandigarh"),
    (r"amritsar", "amritsar", "Punjab"),
    (r"ludhiana", "ludhiana", "Punjab"),
    (r"jalandhar", "jalandhar", "Punjab"),
    (r"patiala", "patiala", "Punjab"),
    (r"dehradun", "dehradun", "Uttarakhand"),
    (r"shimla", "shimla", "Himachal Pradesh"),
    (r"jammu", "jammu", "Jammu and Kashmir"),
    (r"srinagar", "srinagar", "Jammu and Kashmir"),
    (r"kochi|cochin|ernakulam", "kochi", "Kerala"),
    (r"thiruvananthapuram|trivandrum", "thiruvananthapuram", "Kerala"),
    (r"kozhikode|calicut", "kozhikode", "Kerala"),
    (r"thrissur|trichur", "thrissur", "Kerala"),
    (r"kannur", "kannur", "Kerala"),
    (r"kollam|quilon", "kollam", "Kerala"),
    (r"alappuzha|alleppey", "alappuzha", "Kerala"),
    (r"vijayawada", "vijayawada", "Andhra Pradesh"),
    (r"visakhapatnam|vizag", "visakhapatnam", "Andhra Pradesh"),
    (r"tirupati", "tirupati", "Andhra Pradesh"),
    (r"guntur", "guntur", "Andhra Pradesh"),
    (r"nellore", "nellore", "Andhra Pradesh"),
    (r"kurnool", "kurnool", "Andhra Pradesh"),
    (r"rajahmundry", "rajahmundry", "Andhra Pradesh"),
    (r"kakinada", "kakinada", "Andhra Pradesh"),
    (r"panaji|goa", "panaji", "Goa"),
    (r"shillong", "shillong", "Meghalaya"),
    (r"aizawl", "aizawl", "Mizoram"),
    (r"imphal", "imphal", "Manipur"),
    (r"kohima", "kohima", "Nagaland"),
    (r"agartala", "agartala", "Tripura"),
    (r"gangtok", "gangtok", "Sikkim"),
    (r"itanagar", "itanagar", "Arunachal Pradesh"),
    (r"silchar", "silchar", "Assam"),
    (r"dibrugarh", "dibrugarh", "Assam"),
    (r"jorhat", "jorhat", "Assam"),
    (r"bareilly", "bareilly", "Uttar Pradesh"),
    (r"moradabad", "moradabad", "Uttar Pradesh"),
    (r"aligarh", "aligarh", "Uttar Pradesh"),
    (r"gorakhpur", "gorakhpur", "Uttar Pradesh"),
    (r"jhansi", "jhansi", "Uttar Pradesh"),
    (r"gwalior", "gwalior", "Madhya Pradesh"),
    (r"jabalpur", "jabalpur", "Madhya Pradesh"),
    (r"raipur", "raipur", "Chhattisgarh"),
    (r"aurangabad|sambhaji\s*nagar", "aurangabad", "Maharashtra"),
    (r"kolhapur", "kolhapur", "Maharashtra"),
    (r"amravati", "amravati", "Maharashtra"),
    (r"bhavnagar", "bhavnagar", "Gujarat"),
    (r"jamnagar", "jamnagar", "Gujarat"),
    (r"gandhinagar", "gandhinagar", "Gujarat"),
    (r"rourkela", "rourkela", "Odisha"),
    (r"sambalpur", "sambalpur", "Odisha"),
    (r"asansol", "asansol", "West Bengal"),
    (r"siliguri", "siliguri", "West Bengal"),
    (r"durgapur", "durgapur", "West Bengal"),
    (r"bokaro", "bokaro", "Jharkhand"),
    (r"jamshedpur", "jamshedpur", "Jharkhand"),
    (r"tirupur", "tirupur", "Tamil Nadu"),
    (r"karur", "karur", "Tamil Nadu"),
    (r"dindigul", "dindigul", "Tamil Nadu"),
    (r"theni", "theni", "Tamil Nadu"),
    (r"virudhunagar", "virudhunagar", "Tamil Nadu"),
    (r"kancheepuram|kanchipuram", "kancheepuram", "Tamil Nadu"),
    (r"krishnagiri", "krishnagiri", "Tamil Nadu"),
    (r"dharmapuri", "dharmapuri", "Tamil Nadu"),
    (r"namakkal", "namakkal", "Tamil Nadu"),
    (r"pollachi", "pollachi", "Tamil Nadu"),
    (r"chidambaram", "chidambaram", "Tamil Nadu"),
    (r"kumbakonam", "kumbakonam", "Tamil Nadu"),
    (r"palakkad|palghat", "palakkad", "Kerala"),
    (r"malappuram", "malappuram", "Kerala"),
    (r"kottayam", "kottayam", "Kerala"),
    (r"kalaburagi|gulbarga", "kalaburagi", "Karnataka"),
    (r"belagavi|belgaum", "belagavi", "Karnataka"),
    (r"ballari|bellary", "ballari", "Karnataka"),
    (r"shivamogga|shimoga", "shivamogga", "Karnataka"),
    (r"tumakuru|tumkur", "tumakuru", "Karnataka"),
    (r"udupi", "udupi", "Karnataka"),
    (r"hassan", "hassan", "Karnataka"),
    (r"bidar", "bidar", "Karnataka"),
    (r"anantapur", "anantapur", "Andhra Pradesh"),
    (r"eluru", "eluru", "Andhra Pradesh"),
    (r"kadapa|cuddapah", "kadapa", "Andhra Pradesh"),
    (r"ongole", "ongole", "Andhra Pradesh"),
    (r"chittoor", "chittoor", "Andhra Pradesh"),
    (r"nizamabad", "nizamabad", "Telangana"),
    (r"karimnagar", "karimnagar", "Telangana"),
    (r"khammam", "khammam", "Telangana"),
]


def infer_network(hay: str):
    for pat, slug in NETWORK_PATTERNS:
        if re.search(pat, hay):
            return slug
    return None


def infer_city(hay: str):
    for pat, city, state in CITY_PATTERNS:
        if re.search(r"\b" + pat + r"\b", hay):
            return city, state
    return None, None


def infer_categories(name: str, tags) -> list:
    cats = set()
    for t in tags:
        slug = TAG_CATEGORY.get(t.lower())
        if slug:
            cats.add(slug)
    low = name.lower()
    for key, slug in TAG_CATEGORY.items():
        if re.search(r"\b" + re.escape(key) + r"\b", low):
            cats.add(slug)
    return sorted(cats)


# Single-city networks — a safe city hint when the name doesn't say it.
NETWORK_CITY_HINTS = {
    "suryan": ("chennai", "Tamil Nadu"),
    "chennailive": ("chennai", "Tamil Nadu"),
    "hit95": ("delhi", "Delhi"),
}


def enrich(s: dict) -> dict:
    """Fill inferable fields on an already-v2 record (idempotent)."""
    hay = f"{s['name']} {s.get('homepage', '')}".lower()
    if not s.get("network"):
        net = infer_network(hay)
        if net:
            s["network"] = net
    if not s.get("city"):
        city, state = infer_city(s["name"].lower())
        if not city and s.get("network") in NETWORK_CITY_HINTS:
            city, state = NETWORK_CITY_HINTS[s["network"]]
        if city:
            s["city"] = city
            s["state"] = state
    if not s.get("categories"):
        cats = infer_categories(s["name"], s.get("tags") or [])
        if cats:
            s["categories"] = cats
    if not s.get("frequency_mhz"):
        m = FREQ_RE.search(s["name"])
        if m:
            s["frequency_mhz"] = float(m.group(0))
    return s


def migrate(s: dict) -> dict:
    if s.get("streams"):
        return enrich(s)  # already v2 — still fill new inference fields

    url = s.get("stream_url", "")
    out = {
        "id": s["id"],
        "slug": s["slug"],
        "name": s["name"],
        "streams": [
            {
                "url": url,
                "codec": s.get("codec", ""),
                "bitrate": s.get("bitrate", 0),
                "hls": bool(HLS_RE.search(url)),
            }
        ],
        "languages": [s["genre"]] if s.get("genre") else [],
        "categories": infer_categories(s["name"], s.get("tags") or []),
        "country": s.get("country", "India"),
        "favicon": s.get("favicon", ""),
        "homepage": s.get("homepage", ""),
        "tags": s.get("tags") or [],
        "votes": s.get("votes", 0),
        "is_active": s.get("is_active", True),
        "last_checked_at": s.get(
            "last_checked_at", datetime.now(timezone.utc).isoformat(timespec="seconds")
        ),
    }

    hay = f"{s['name']} {s.get('homepage', '')}".lower()
    net = infer_network(hay)
    if net:
        out["network"] = net
    city, state = infer_city(f"{s['name']}".lower())
    if city:
        out["city"] = city
        out["state"] = state
    m = FREQ_RE.search(s["name"])
    if m:
        out["frequency_mhz"] = float(m.group(0))
    if s.get("top_rank"):
        out["top_rank"] = s["top_rank"]
    return out


def main() -> None:
    with open(PATH, encoding="utf-8") as f:
        data = json.load(f)
    n_new = sum(1 for s in data if not s.get("streams"))
    migrated = [migrate(s) for s in data]
    with open(PATH, "w", encoding="utf-8") as f:
        json.dump(migrated, f, ensure_ascii=False, indent=1)
    cats = sum(1 for s in migrated if s.get("categories"))
    nets = sum(1 for s in migrated if s.get("network"))
    cities = sum(1 for s in migrated if s.get("city"))
    freqs = sum(1 for s in migrated if s.get("frequency_mhz"))
    print(
        f"migrated {n_new}/{len(migrated)} | categories {cats} | network {nets} | city {cities} | freq {freqs}"
    )


if __name__ == "__main__":
    main()
