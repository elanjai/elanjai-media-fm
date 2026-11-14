"""Apply editorial top-20 ranking → stations.json `top_rank` field.

Each genre's list below follows the community top-20 order, mapped onto
stations that actually exist in our catalog (terrestrial FM networks like
Mirchi/Red FM have no public streams — the nearest live equivalents are
used: AIR/Akashvani channels, FM Rainbow/Gold, network FMs, diaspora and
genre-matched online stations).

`rankStations()` in src/lib/data.ts sorts `top_rank` first (lower wins),
then falls back to the votes×quality score — so these channels lead every
genre page, search result and the home "popular" picks.

Usage:  python scripts/apply_top_rank.py
"""

import json, os

ROOT = os.path.join(os.path.dirname(__file__), "..")
STATIONS = os.path.join(ROOT, "data", "stations.json")

RANKED = {
    # India — national/multilingual networks → AIR + Bollywood equivalents
    "india": [
        "bollywood-gaane-purane",          # flagship Bollywood hits (Mirchi-equiv)
        "hits-of-bollywood",
        "air-fm-gold-delhi",               # AIR FM Gold
        "akashvani-fm-rainbow-kolkata",    # AIR FM Rainbow
        "goldy-evergreen",                 # retro Bollywood (Nasha-equiv)
        "hits-of-kishor-kumar",
        "goldy-cool",
        "goldy-mukesh",
        "new-hits-of-bollywood",
        "radiobollyfm",
        "free-fm-rock-bombay",             # intl hits (Indigo/Radio One-equiv)
        "radio-bollywood-gaane-purane",
        "goldy-blast",
        "ndtv",                            # news (AIR News 24x7-equiv)
        "radio-jagriti-90-4-fm",           # community FM
        "radio-maria-india",
        "maayboli-marathi",
        "divyavani",
        "pollachi-fm",
        "radio-badal",
        "rad",
    ],
    # Tamil — Suryan/Hello FM/BIG FM + AIR + intl Tamil networks
    "tamil": [
        "suryan-fm",                       # Suryan FM 93.5
        "hello-fm",                        # Hello FM 106.4
        "big-fm-tamil",                    # BIG FM 92.7
        "fmrainbowtamil",                  # AIR FM Rainbow Chennai
        "fmgoldtamil",                     # AIR FM Gold
        "vividhbharathitamil",             # Vividh Bharati
        "radio-gilli",                     # Radio Gilli 106.5 (Dubai)
        "oli-968-radio",                   # Oli 96.8 (Singapore)
        "shakthi-fm",                      # Shakthi FM (Sri Lanka)
        "sooriyanfm",                      # Sooriyan FM (Sri Lanka)
        "cirv-hd3-88-9-thaalam-fm-tamil-stream-toronto-on",  # CMR Tamil HD (Toronto)
        "lankasri-fm",                     # Lankasri FM
        "sun-tamil-radio",                 # Tamil Sun
        "cityfmtamil",                     # Radio City Tamil
        "vanavilfm-arr-radio",             # ARR (A.R. Rahman) radio
        "air-kodai-fm",                    # Akashvani Tamil network
        "air-madurai-fm",
        "air-nagercoil",
        "air-tuticorin",
        "airtamil",
    ],
    # Hindi — Mirchi/Vividh Bharati/BIG FM + retro + news
    "hindi": [
        "filmy-mirchi",                    # Radio Mirchi-equiv
        "vividh-bharti-mumbai",            # Vividh Bharati
        "big-92-7-fm",                     # BIG FM 92.7
        "fm-gold-mumbai",                  # AIR FM Gold
        "radio-retro-bollywood-90s",       # Radio Nasha / Hungama 90s-equiv
        "radio-retro-bollywood",           # retro Bollywood
        "bollywood-90s-radio",
        "radio-hungama-bollywood-dil-se",  # Hungama Bollywood
        "hitsofbollywood",                 # Hits Of Bollywood
        "radio-bollyfm",
        "bollywood-classic-songs",
        "60sforever",
        "bollywood-2010-s",
        "bollywood-dance",
        "hindi-gold-radio",
        "classic-radio-bhakti-sangeet",    # Radio City Bhakti-equiv
        "2b-radio-sangam-shri-ram",        # devotional
        "all-india-radio-news-24x7",       # AIR News
        "aaj-tak-news-radio-live",
        "air-news-24-7",
    ],
    # Urdu — Radio Pakistan/FM 101/FM 100 + city networks + diaspora
    "urdu": [
        "101peshawar",                     # FM 101 (Radio Pakistan flagship FM)
        "fm-100-pakistan",                 # FM 100 Pakistan
        "fm-100-pakistan-karachi",
        "mera-fm-107-4",                   # Mera FM
        "hot-fm-105",                      # Hot FM 105
        "hot-fm-karachi",
        "hum-fm-106-2",                    # Hum FM
        "radio-pakistan-lahore",           # Radio Pakistan network
        "radio-pakistan-lahore-news-and-current-affair-am-1332-khz",
        "radio-pakistan-multan",
        "radio-pakistan-ws",
        "radio-pak-filmi",
        "radio-srinagar",                  # Radio Kashmir / Akashvani Srinagar
        "soutul-quran-pbc-fm-93-4-islamabad",  # Saut-ul-Quran
        "lyca-radio",                      # diaspora (Radio Azad-equiv)
        "sangeet-radio-fm-95-1-am-1460-houston-tx-us",
        "vahonfm-vahon-hindustani-radio",
        "radio-mirpur",                    # regional (Radio Awaz-equiv)
        "bahawal-pur-mw-station",
        "ak-radio-trarkhal",
    ],
    # Punjabi — diaspora networks + Red FM Canada + Gurbani
    "punjabi": [
        "panjab-radio-uk",                 # Panjab Radio (UK)
        "red-fm-vancouver-89-1-fm-93-1fm", # Red FM Vancouver/Toronto
        "ckyr-fm-106-7-red-fm-calgary-ab", # Red FM Calgary
        "radio-spice-auckland-new-zealand",# Spice Radio-equiv
        "radio-punjabi-usa",               # Punjabi Radio USA
        "radio-punjabi-usa-618924f6",
        "radio-punjabi-virsa",             # Radio Virsa
        "desi-world-radio",                # Desi World Radio
        "mera-fm-107-4-lahore",            # Mera FM Lahore
        "live-kirtan-sri-harmandir-sahib", # Harmandir Sahib live Gurbani
        "live-kirtan-sri-harmandir-sahib-72e71a76",
        "sri-harmandir-sahib-live-kirtan",
        "hazur-sahib-live",
        "gurbani-kirtan",
        "khalsa-fm",
        "jap-radio",
        "sikhnet-radio",
        "all-india-radio-air-punjabi",     # Akashvani Punjabi
        "airpunjabi",
        "fm-100-pakistan-gujrat",
    ],
    # Telugu — TORi + Vividh Bharati/AIR + devotional
    "telugu": [
        "tori-live-8000",                  # Tori — Telugu One Radio
        "tori-live-radio",
        "vividh-bharati-telugu-vijayawada",# Vividh Bharati
        "vb-telugu-hyderabad",
        "fm-rainbow-hyderabad",            # AIR FM Rainbow
        "fm-rainbow-vijayawada",
        "fm-rainbow-visakhapatnam",
        "svbc-ttd-radio",                  # SVBC Tirupati
        "airtelugu",
        "air-telugu",
        "akashvani-hyderabad",
        "akashvani-visakhapatnam",
        "akashvani-tirupati",
        "akashvani-anantapur",
        "radiosai-global-harmony",         # devotional
        "radio-sai",
        "radio-sai-telugu-stream",
        "ap-9-fm",                         # community FM-equiv
        "fm-simhapuri-nellore",
        "oye-radio",
    ],
    # Malayalam — Akashvani regional FMs + community + diaspora
    "malayalam": [
        "ananthapurifm",                   # AIR Ananthapuri FM 101.9
        "air-kozhikode-real-fm",           # AIR Kozhikode Real FM 103.6
        "airkozhikodefm",
        "air-malayalam",                   # AIR Malayalam / Rainbow-equiv
        "airmalayalam",
        "radiomattoli",                    # Radio Mattoli 90.4 Wayanad
        "radio-kochi",                     # community FM-equiv
        "kjyesudas",                       # K.J. Yesudas stream
        "fm-city-100-1",                   # F.M. City 100.1
        "radio-suno-91-7-fm",              # Radio Suno
        "986malayalamradio",
        "london-malayalam-radio",          # diaspora
        "chitrahitsmalayalam",             # film hits (Radio City Malayalam-equiv)
        "retro-ma",                        # retro (Ganam-equiv)
        "radio-malabar",
        "radiopalakkad",
        "radio-tirur",
        "radio-onattukara",
        "radio-keral",
        "anbu-fm-malayalam",
    ],
    # Kannada — AIR/FM Rainbow/Amrutavarshini + Namm Radio + folk
    "kannada": [
        "air-fm-rainbow-bangalore",        # AIR FM Rainbow Bengaluru 101.3
        "fmrainbowkannada",
        "amruthavarshini-fm",              # AIR Amrutavarshini 100.1
        "vividhbharatikannada",            # Vividh Bharati Bengaluru
        "akashvanikarnataka",              # Akashvani Karnataka
        "namm-radio-kannada",              # Namm Radio
        "nammradio",
        "nammradiogulf",
        "nammradious",
        "radiogirmit",                     # Radio Girmit
        "nammura-baanuli",                 # folk (Janapada-equiv)
        "raagam",                          # Raagam classical/folk
        "kannadahits",                     # Kannada hits
        "radio-amr-kannada",               # diaspora
        "amrradiokannada",
        "anbu-fm-kannada",
        "radiosunokannada",
        "live-fm",
        "sakkathradio",
        "radio-panchajanya",
    ],
}


def main():
    stations = json.load(open(STATIONS, encoding="utf-8"))
    by_slug = {s["slug"]: s for s in stations}

    for s in stations:
        s.pop("top_rank", None)

    problems = []
    for genre, slugs in RANKED.items():
        for i, slug in enumerate(slugs, 1):
            s = by_slug.get(slug)
            if not s:
                problems.append(f"{genre}: missing slug {slug}")
                continue
            if s["genre"] != genre:
                problems.append(f"{slug}: genre {s['genre']} != {genre}")
            if not s.get("is_active"):
                problems.append(f"{slug}: inactive")
            s["top_rank"] = i

    # keep stable field order — insert top_rank before is_active
    def reorder(s):
        out = {}
        for k in ("id", "name", "slug", "stream_url", "homepage", "favicon",
                  "genre", "language", "country", "codec", "bitrate", "votes",
                  "tags", "top_rank", "is_active"):
            if k in s:
                out[k] = s[k]
        out.update(s)  # any extra keys
        return out

    with open(STATIONS, "w", encoding="utf-8") as fp:
        json.dump([reorder(s) for s in stations], fp, ensure_ascii=False,
                  indent=2)
        fp.write("\n")

    for genre, slugs in RANKED.items():
        top = by_slug[slugs[0]]
        print(f"{genre:10} #{1:2} {top['name']}  ({len(slugs)} ranked)")
    for p in problems:
        print("WARN:", p)


if __name__ == "__main__":
    main()
