# Stream health check — 2026-11-21

Checked 494 unique stream URLs across 444 active stations.

- **Working**: 432
- **Down** (all streams fail): 10
- **Primary link down** (alternate works): 2

Result legend: ok = HTTP 2xx/3xx, blocked = 401/403, timeout/error = unreachable.
`*` marks the primary stream (`streams[0]`) the app plays first.

## Down channels (no working stream)

### Tamil — 7

| Channel | Primary stream URL | All streams status |
|---|---|---|
| dance tamizha | https://listen.openstream.co/3558/audio | *HTTP 502 |
| GTR FM | https://eu4.fastcast4u.com/proxy/goguna00?mp=/; | *error |
| ITR FM | https://radio5.pro-fhi.net/flux-hgtidrcv/stream | *blocked |
| Radio Petti | https://radiopetti.in/radio.mp3 | *timeout |
| tamilaruvifm | https://servidor18-4.brlogic.com:7740/live | *HTTP 404 |
| TTR FM | https://radio.massstream.net/8010/stream | *timeout |
| VTR FM | https://radio.massstream.net/8010/stream | *timeout |

### Punjabi — 2

| Channel | Primary stream URL | All streams status |
|---|---|---|
| Parwaz Radio Punjabi | http://mehramedia.com:8081/; | *error |
| Radio Chann Pardesi | http://mehramedia.com:8021/; | *error |

### Bengali — 1

| Channel | Primary stream URL | All streams status |
|---|---|---|
| Dhaka FM | https://play.dhakafm904.com/; | *error |

## Primary link down (backup stream works)

### Hindi — 1

| Channel | Primary stream URL | All streams status |
|---|---|---|
| Fnf.Fm Hindi | https://usa1.fastcast4u.com/proxy/qrekthei?mp=/ | *HTTP 404; ok 200 |

### Tamil — 1

| Channel | Primary stream URL | All streams status |
|---|---|---|
| Suryan FM | https://radios.crabdance.com:8002/1 | *error; error; ok 200 |

