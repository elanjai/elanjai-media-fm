"""Upgrade every station's stream list to quality-ordered fallbacks.

For each station in data/stations.json:
  1. Gather candidate stream URLs — the existing streams plus every
     radio-browser.info entry whose name/homepage matches the station.
  2. Probe each candidate (raw-socket, ICY + Icecast aware, follows
     redirects) to learn real liveness, codec and bitrate. HLS playlists
     are parsed for BANDWIDTH.
  3. Sort candidates by effective quality (codec-adjusted bitrate, capped)
     with small bonuses for https transport and for streams we already
     trust (existing URL, exact-name/homepage match). Keep the top 3:
     streams[0] is the player's first attempt, [1] and [2] its fallbacks.
  4. Rewrite streams[] with probed codec/bitrate; refresh is_active and
     last_checked_at for stations we changed.

Safety: dead candidates are dropped; an existing stream is only removed
when it is dead *and* a live alternative exists. Stations with no live
candidates are left untouched.

Usage:  python scripts/upgrade_streams.py [--dry] [--slug suryan-fm] [--limit 20]
"""

import json, os, re, ssl, socket, sys, urllib.request, urllib.error, urllib.parse
import concurrent.futures, difflib, datetime

ROOT = os.path.join(os.path.dirname(__file__), "..")
PATH = os.path.join(ROOT, "data", "stations.json")
UA = "ElanjaiMediaFM/1.0"
RB_API = "https://de1.api.radio-browser.info/json/stations"
MAX_STREAMS = 3
MAX_CANDIDATES = 6

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
socket.setdefaulttimeout(8)

DROP_WORDS = ("fm", "radio", "radios", "tamil", "online", "live", "hd", "am", "the")


def norm(name):
    """Loose name key — drop fm/radio/etc. tokens and digits-dots."""
    t = re.sub(r"[^a-z0-9]", "", name.lower())
    for w in DROP_WORDS:
        t = t.replace(w, "")
    return t


def tokens(name):
    return {w for w in re.sub(r"[^a-z0-9 ]", " ", name.lower()).split()
            if w not in DROP_WORDS}


def host_of(url):
    m = re.match(r"https?://([^/:]+)", url or "")
    return m.group(1).lower() if m else ""


def stream_key(url):
    """Dedupe key ignoring scheme — http/https on same mount is one stream."""
    try:
        u = urllib.parse.urlparse(url)
        port = u.port or (443 if u.scheme == "https" else 80)
        return f"{u.hostname}:{port}{u.path}"
    except Exception:
        return url


# ---------- radio-browser index ----------

COUNTRYCODES = {
    "India": "IN", "Nepal": "NP", "Pakistan": "PK", "Bangladesh": "BD",
    "The United States Of America": "US", "Canada": "CA", "Kuwait": "KW",
    "The United Kingdom Of Great Britain And Northern Ireland": "GB",
    "Australia": "AU", "The Netherlands": "NL",
    "The United Arab Emirates": "AE", "Singapore": "SG", "Sri Lanka": "LK",
    "Mauritius": "MU", "Bahrain": "BH", "New Zealand": "NZ",
    "American Samoa": "AS",
}


def rb_fetch(path):
    req = urllib.request.Request(
        f"{RB_API}{path}", headers={"User-Agent": f"{UA} (stream upgrade)"})
    return json.load(urllib.request.urlopen(req, timeout=30, context=ctx))


def build_rb_index(stations):
    """normalized-name → [rb entries] for the countries present in catalog."""
    index = {}
    codes = {COUNTRYCODES[s["country"]] for s in stations
             if s["country"] in COUNTRYCODES}
    for cc in sorted(codes):
        try:
            rows = rb_fetch(f"/bycountrycodeexact/{cc}?hidebroken=false&limit=100000")
        except Exception as e:
            print(f"  radio-browser {cc}: {str(e)[:60]}")
            continue
        for r in rows:
            index.setdefault(norm(r.get("name", "")), []).append(r)
        print(f"  radio-browser {cc}: {len(rows)} stations")
    return index


# Directory hosts — a shared homepage here means "same listing site", not
# "same station", so they can't serve as a match signal.
DIRECTORY_HOSTS = {"radiosindia.com", "onlineradiohub.com", "onlineradiobox.com",
                   "streema.com", "radio.garden", "fmstream.org", "zeno.fm",
                   "mytuner-radio.com", "radio.net", "tunein.com"}


def home_key(url):
    try:
        u = urllib.parse.urlparse(url if "//" in (url or "") else "https://" + url)
        host = (u.hostname or "").lower().removeprefix("www.")
        if host in DIRECTORY_HOSTS:
            return None
        return host + u.path.rstrip("/")
    except Exception:
        return None


def match_strength(station, rb):
    """0 = no match. Higher = more confident it is the same station."""
    a, b = norm(station["name"]), norm(rb.get("name", ""))
    if not a or not b:
        return 0
    sh, rh = home_key(station.get("homepage", "")), home_key(rb.get("homepage", ""))
    if sh and sh == rh:
        return 90
    if a == b:
        return 80
    short, long = (a, b) if len(a) <= len(b) else (b, a)
    if len(short) >= 4 and short in long:
        return 60
    ratio = difflib.SequenceMatcher(None, a, b).ratio()
    if ratio >= 0.72:
        return 50
    return 0


# ---------- probing ----------

def _read_headers(sock):
    buf = b""
    while b"\r\n\r\n" not in buf and len(buf) < 16384:
        chunk = sock.recv(4096)
        if not chunk:
            break
        buf += chunk
    head, _, body = buf.partition(b"\r\n\r\n")
    lines = head.decode("iso-8859-1", "replace").split("\r\n")
    hdrs = {}
    for ln in lines[1:]:
        k, _, v = ln.partition(":")
        if k:
            hdrs[k.strip().lower()] = v.strip()
    return lines[0].strip(), hdrs, body


def _get_once(url, redirects=0):
    """One GET via raw socket → (status_line, headers, body_start, final_url)."""
    u = urllib.parse.urlparse(url)
    if not u.hostname:
        raise ValueError("bad url")
    port = u.port or (443 if u.scheme == "https" else 80)
    path = (u.path or "/") + (("?" + u.query) if u.query else "")
    sock = socket.create_connection((u.hostname, port), 8)
    try:
        if u.scheme == "https":
            sock = ctx.wrap_socket(sock, server_hostname=u.hostname)
        req = (f"GET {path} HTTP/1.1\r\nHost: {u.hostname}\r\n"
               f"User-Agent: {UA}\r\nIcy-MetaData: 1\r\n"
               f"Accept: */*\r\nConnection: close\r\n\r\n")
        sock.sendall(req.encode())
        status, hdrs, body = _read_headers(sock)
    finally:
        sock.close()
    code = int(re.search(r"(\d{3})", status).group(1)) if re.search(r"\d{3}", status) else 0
    if code in (301, 302, 303, 307, 308) and hdrs.get("location") and redirects < 3:
        nxt = urllib.parse.urljoin(url, hdrs["location"])
        return _get_once(nxt, redirects + 1)
    return status, hdrs, body, url


CODEC_BY_CT = {"mpeg": "MP3", "mp3": "MP3", "aacp": "AAC+", "aac": "AAC",
               "ogg": "OGG", "opus": "OPUS"}


def codec_of(ctype, rb_codec=""):
    ct = ctype.lower()
    if "mpegurl" in ct or "m3u" in ct:  # HLS playlist — says nothing about codec
        return rb_codec if rb_codec in ("MP3", "AAC", "AAC+", "OGG", "OPUS") else "UNKNOWN"
    for k, v in CODEC_BY_CT.items():
        if k in ct:
            return v
    return rb_codec if rb_codec in ("MP3", "AAC", "AAC+", "OGG", "OPUS") else "UNKNOWN"


def url_bitrate_hint(url):
    """'...64kbps.m3u8' / '..._128' style bitrate hints in the URL itself."""
    m = re.search(r"(\d{2,3})\s*kbps", url, re.I) or \
        re.search(r"[_-](\d{2,3})k?[/._]", url)
    return int(m.group(1)) if m else 0


# Content types that mean "this URL is a web page, not an audio stream".
NON_AUDIO_CT = ("text/html", "application/json", "text/xml", "application/xml")


def resolve_playlist(url):
    """.m3u/.pls playlist URLs wrap the real stream URL — browsers can't play
    them directly, so extract the inner stream. zeno-style .m3u resolves to
    the same path minus the suffix (canonical, no expiring edge tokens)."""
    path = url.split("?")[0]
    if path.endswith(".m3u") and not path.endswith(".m3u8"):
        stripped = path[:-4]
        try:
            status, _, _, f = _get_once(stripped)
            if "ICY" in status.upper() or re.search(r"\b2\d\d\b", status):
                return f
        except Exception:
            pass
    try:
        _, _, body, _ = _get_once(url)
        for ln in body.decode("utf-8", "replace").splitlines():
            ln = ln.strip()
            if ln.lower().startswith("file") and "=" in ln:
                return ln.split("=", 1)[1].strip()
            if ln.startswith("http"):
                return ln
    except Exception:
        pass
    return url


def probe(cand):
    """Candidate dict → same dict + probe results (alive, codec, bitrate, hls)."""
    url, is_hls = cand["url"], cand.get("hls", False)
    if re.search(r"\.(m3u|pls)([?#]|$)", url, re.I) and ".m3u8" not in url:
        inner = resolve_playlist(url)
        if inner != url:
            cand["url"] = url = inner
    try:
        status, hdrs, body, final = _get_once(url)
        code = int(re.search(r"(\d{3})", status).group(1)) if re.search(r"\d{3}", status) else 0
        ctype = hdrs.get("content-type", "")
        if any(t in ctype.lower() for t in NON_AUDIO_CT):
            cand.update(alive=False, err=f"non-audio {ctype[:30]}")
            return cand
        if "ICY" in status.upper() or (200 <= code < 400):
            if is_hls or "mpegurl" in ctype or url.rsplit("?", 1)[0].endswith((".m3u8", ".m3u")):
                bws = [int(x) for x in re.findall(
                    r"BANDWIDTH=(\d+)", body.decode("utf-8", "replace"))]
                br = (max(bws) // 1000 if bws else 0) or url_bitrate_hint(url) or \
                    int(cand.get("rb_bitrate") or 0) or int(cand.get("declared") or 0)
                co = codec_of(ctype)
                cand.update(alive=True, codec=co if co != "UNKNOWN" else "AAC",
                            bitrate=br, hls=True, final_url=final,
                            icy_name=hdrs.get("icy-name", ""))
            else:
                br = hdrs.get("icy-br", "")
                cand.update(alive=True, codec=codec_of(ctype, cand.get("rb_codec", "")),
                            bitrate=int(br) if br.isdigit() else (
                                url_bitrate_hint(url) or int(cand.get("rb_bitrate") or 0)
                                or int(cand.get("declared") or 0)),
                            hls=False, final_url=final,
                            icy_name=hdrs.get("icy-name", ""))
        else:
            cand.update(alive=False, err=f"HTTP {code}")
    except urllib.error.HTTPError as e:
        cand.update(alive=False, err=f"HTTP {e.code}")
    except Exception as e:
        msg = str(e)
        cand.update(alive="ICY" in msg.upper(), err=msg[:50],
                    codec="MP3", bitrate=int(cand.get("rb_bitrate") or 0), hls=False)
        if cand["alive"]:
            cand["final_url"] = url
    return cand


CODEC_FACTOR = {"MP3": 1.0, "AAC": 1.5, "AAC+": 1.5, "OPUS": 1.8, "OGG": 1.4,
                "UNKNOWN": 1.0}


def quality(c):
    """Effective quality score — codec-adjusted bitrate, capped at 384."""
    br = c.get("bitrate") or 0
    return min(br, 384) * CODEC_FACTOR.get(c.get("codec") or "UNKNOWN", 1.0)


def rank_score(c):
    s = quality(c)
    if c["url"].startswith("https") and not c.get("hls"):
        s += 24          # direct-playable https saves proxy bandwidth
    if c.get("hls"):
        s -= quality(c) * 0.1  # always proxied, slightly less reliable
    s += c.get("trust", 0)
    return s


RI_FILE = re.compile(r'file:"([^"]+)"')


def fetch_radiosindia(url):
    """radiosindia station pages list same-station alternates as
    file:"streamA or streamB" — the most trustworthy fallback source there is."""
    try:
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        html = urllib.request.urlopen(req, timeout=10, context=ctx).read(600_000).decode("utf-8", "replace")
        m = RI_FILE.search(html)
        if not m:
            return []
        return [u.strip() for u in m.group(1).split(" or ")
                if u.strip().startswith("http")]
    except Exception:
        return []


def candidates_for(station, rb_index, ri_streams):
    """Candidate dicts for one station, capped at MAX_CANDIDATES."""
    cands = []
    existing_hosts = set()
    seen = set()
    for v in station.get("streams", []):
        existing_hosts.add(host_of(v["url"]))
        seen.add(stream_key(v["url"]))
        cands.append({"url": v["url"], "hls": v.get("hls", False),
                      "trust": 32, "origin": "existing", "primary_ok": True,
                      "declared": v.get("bitrate", 0)})
    # radiosindia same-station alternates — trusted like catalog sources
    for u in ri_streams[:3]:
        if stream_key(u) not in seen:
            seen.add(stream_key(u))
            cands.append({"url": u, "hls": ".m3u8" in u, "trust": 24,
                          "origin": "radiosindia", "primary_ok": True})
    key = norm(station["name"])
    pool = list(rb_index.get(key, []))
    if not pool:  # fuzzy pass only when no exact-normalized hit
        for nk, rows in rb_index.items():
            if not nk or nk[0] != key[:1] or abs(len(nk) - len(key)) > 8:
                continue
            short, long = (key, nk) if len(key) <= len(nk) else (nk, key)
            if (len(short) >= 4 and short in long) or \
               difflib.SequenceMatcher(None, key, nk).ratio() >= 0.72:
                pool.extend(rows)
    pool.sort(key=lambda r: (r.get("votes", 0), r.get("lastcheckok", 0)), reverse=True)
    cc = COUNTRYCODES.get(station.get("country", ""))
    for r in pool:
        st = match_strength(station, r)
        if st < 50:
            continue
        # Same name in a different country is almost always a different
        # station — e.g. a Tamil-language show on a foreign community radio.
        if cc and r.get("countrycode") and r["countrycode"] != cc:
            continue
        # Prefer the canonical published URL — url_resolved is often a
        # tokenized CDN edge (zeno rj-tok/rj-ttl) that expires in days.
        url = (r.get("url") or r.get("url_resolved") or "").strip()
        url = re.sub(r"[?&](rj-tok|rj-ttl|zato|expires|token|auth)=[^&]*", "", url)
        url = url.rstrip("?&")
        if not url or stream_key(url) in seen:
            continue
        seen.add(stream_key(url))
        # streams[0] is the player's first attempt — only strong matches may
        # occupy it. Weaker name matches can still serve as fallbacks.
        primary_ok = st >= 80 or (st >= 60 and host_of(url) in existing_hosts)
        cands.append({"url": url, "hls": bool(r.get("hls")),
                      "trust": 16 if st >= 80 else (8 if st >= 60 else 0),
                      "origin": "radio-browser", "primary_ok": primary_ok,
                      "rb_bitrate": r.get("bitrate", 0),
                      "rb_codec": (r.get("codec") or "").upper()})
        if len(cands) >= MAX_CANDIDATES:
            break
    return cands[:MAX_CANDIDATES]


# icy-name values that carry no station identity — vetoes don't apply to them.
GENERIC_ICY = ("unnamed", "unspecified", "radio station", "shoutcast", "icecast",
               "no name", "my radio", "listen", "stream", "test")


def icy_vetoed(cand, station):
    """True when a non-generic icy-name shares no token with the station name —
    strong evidence the stream is a different station entirely."""
    name = (cand.get("icy_name") or "").strip().lower()
    if not name or any(g in name for g in GENERIC_ICY):
        return False
    t = {w for w in re.findall(r"[a-z]+", name)
         if w not in DROP_WORDS and len(w) > 2}
    if not t or (t & tokens(station["name"])):
        return False
    # single-word names ("sunrisefm") vs spaced icy names ("Sunrise Radio")
    # need a normalized whole-string check too
    icy_norm, sta_norm = norm(" ".join(t)), norm(station["name"])
    short, long = (icy_norm, sta_norm) if len(icy_norm) <= len(sta_norm) \
        else (sta_norm, icy_norm)
    return not (short and short in long)


def pick_streams(station, probed):
    """Ordered top-3 StreamVariants. (None, False) = leave station untouched:
    either nothing is alive or no candidate is confident enough to lead."""
    alive = [c for c in probed if c.get("alive")]
    if station.get("streams"):  # only name-matched streams need the ICY-name check
        alive = [c for c in alive
                 if c["origin"] != "radio-browser" or not icy_vetoed(c, station)]
    if not alive:
        return None, "dead"
    if not any(c.get("primary_ok") for c in alive):
        return None, "no-primary"
    best = {}
    for c in alive:
        k = stream_key(c.get("final_url") or c["url"])
        if k not in best or rank_score(c) > rank_score(best[k]):
            best[k] = c
    ordered = sorted(best.values(), key=rank_score, reverse=True)
    primaries = [c for c in ordered if c.get("primary_ok")]
    fallbacks = [c for c in ordered if not c.get("primary_ok")]
    seq = primaries[:1] + (primaries[1:] + fallbacks)[:MAX_STREAMS - 1]
    out = [{"url": c["url"],
            "codec": c.get("codec") or "UNKNOWN",
            "bitrate": int(c.get("bitrate") or 0),
            "hls": bool(c.get("hls"))} for c in seq]
    same = out == [{"url": v["url"], "codec": v.get("codec", "UNKNOWN"),
                    "bitrate": v.get("bitrate", 0), "hls": v.get("hls", False)}
                   for v in station.get("streams", [])]
    return (None if same else out), "ok"


def main():
    dry = "--dry" in sys.argv
    only = None
    if "--slug" in sys.argv:
        only = sys.argv[sys.argv.index("--slug") + 1]
    limit = None
    if "--limit" in sys.argv:
        limit = int(sys.argv[sys.argv.index("--limit") + 1])

    stations = json.load(open(PATH, encoding="utf-8"))
    targets = [s for s in stations if not only or s["slug"] == only]
    if limit:
        targets = targets[:limit]
    print(f"{len(targets)} station(s) in scope")

    print("building radio-browser index...")
    rb_index = build_rb_index(stations)

    ri_slugs = [s["slug"] for s in targets
                if "radiosindia.com" in (s.get("homepage") or "")]
    ri_map = {}
    if ri_slugs:
        print(f"fetching {len(ri_slugs)} radiosindia station pages...")
        home = {s["slug"]: s.get("homepage", "") for s in targets}
        with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ex:
            for slug, urls in zip(ri_slugs, ex.map(
                    lambda k: fetch_radiosindia(home[k]), ri_slugs)):
                ri_map[slug] = urls

    cand_map = {}
    for s in targets:
        cand_map[s["slug"]] = candidates_for(s, rb_index, ri_map.get(s["slug"], []))
    total_c = sum(len(v) for v in cand_map.values())
    print(f"probing {total_c} candidate streams…")

    with concurrent.futures.ThreadPoolExecutor(max_workers=32) as ex:
        for slug, res in zip(cand_map, ex.map(
                lambda kv: [probe(dict(c)) for c in kv[1]], cand_map.items())):
            cand_map[slug] = res

    now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S+00:00")
    upgraded = revived = unchanged = dead = noprimary = 0
    for s in targets:
        picked, status = pick_streams(s, cand_map[s["slug"]])
        if status == "dead":
            dead += 1
            continue
        if status == "no-primary" or picked is None:
            noprimary += status == "no-primary"
            unchanged += status != "no-primary"
            continue
        was_inactive = not s.get("is_active")
        s["streams"] = picked
        s["is_active"] = True
        s["last_checked_at"] = now
        if was_inactive:
            revived += 1
        upgraded += 1

    print(f"\nupgraded {upgraded} | revived {revived} | unchanged {unchanged}"
          f" | all-dead {dead} | no-confident-primary {noprimary}")
    if dry:
        for s in targets[:25]:
            print(f"  {s['slug']:32} -> " +
                  " | ".join(f"{v['bitrate']}k {v['codec']}{' hls' if v['hls'] else ''}"
                             for v in s["streams"]))
        return
    with open(PATH, "w", encoding="utf-8") as f:
        json.dump(stations, f, ensure_ascii=False, indent=1)
    print(f"wrote {PATH}")


if __name__ == "__main__":
    main()
