# Elanjai FM — Product & Engineering Roadmap

> **Vision:** The cleanest, most compact and most reliable way for anyone, anywhere,
> to listen to Indian radio: every language, every region, one tap. The app should
> work for a grandparent on a ₹7,000 Android phone and for an NRI listening in
> Toronto. Monetization (Google ads plus our own ads) comes **after** reliability
> and reach, and must never get in the way of the listening.

This document is based on a full read of the codebase (`src/`, `data/`, `scripts/`,
`design/`, deployment config) and of the station catalog as of version 1.0.0. Every
finding links to the code it is based on. Items are prioritized as follows:

| Priority | Meaning |
|---|---|
| **P0** | Bug, security/cost risk or launch blocker. Fix before any growth or ads work. |
| **P1** | High value for listeners or growth. Next up. |
| **P2** | Valuable, but depends on P0/P1 work or on traffic. |
| **P3** | Nice to have / exploratory. |

Effort is sized relatively: **S** (small, isolated), **M** (a few files or a new
component), **L** (a new subsystem or data model change), **XL** (multi-part initiative).

---

## Table of contents

1. [Where the app is today](#1-where-the-app-is-today)
2. [Who we are building for](#2-who-we-are-building-for)
3. [Best-practice benchmarks for radio apps](#3-best-practice-benchmarks-for-radio-apps)
4. [Audit findings: bugs, risks and gaps](#4-audit-findings-bugs-risks-and-gaps)
5. [Roadmap by phase](#5-roadmap-by-phase)
6. [Monetization strategy (Google ads + self ads)](#6-monetization-strategy-google-ads--self-ads)
7. [Analytics, KPIs and success metrics](#7-analytics-kpis-and-success-metrics)
8. [Architecture evolution](#8-architecture-evolution)
9. [Quality: testing, CI and operations](#9-quality-testing-ci-and-operations)
10. [Legal, compliance and risk register](#10-legal-compliance-and-risk-register)
11. [Consolidated backlog](#11-consolidated-backlog)
12. [Open questions for the owner](#12-open-questions-for-the-owner)

---

## 1. Where the app is today

### 1.1 Stack and architecture

- **Next.js 16.4** (App Router, Cache Components, `partialPrefetching`, standalone
  output), **React 19.3**, **Tailwind 4**, TypeScript, `hls.js` lazy-loaded.
- **No database.** The catalog is three JSON files: `data/stations.json`,
  `data/genres.json`, `data/local-logos.json`. All station and genre pages are
  prerendered at build time (`generateStaticParams`).
- **Client state** (favorites, recents, volume, theme, recent searches) lives in
  `localStorage` under `emfm:*` keys and is managed by one large context,
  `src/components/AudioProvider.tsx` (437 lines).
- **Server routes:**
  - `GET /api/stream?u=<b64>`: proxies **all** audio through our server (fixes mixed
    content and CORS, rewrites HLS manifests and signs the segment URLs it emits).
  - `GET /api/now-playing?u=<b64>`: opens a second upstream connection, reads ICY
    `StreamTitle`, and caches it for 20 s.
  - `GET /api/stations`, `GET /api/stations/[slug]`: JSON catalog.
  - `GET /api/health`: version and commit, used by Railway and the deploy workflows.
- **Deploy:** Docker on Railway, with manual GitHub Actions for Release, Deploy and
  Rollback. There is **no CI on pull requests**.
- **Python tooling** in `scripts/` to scrape, seed, health-check, fetch and brand
  logos, and apply editorial ranks. These are run by hand.

### 1.2 Features shipped

Home (hero, language chips, "Popular now", Favorites rail, Tamil rail, three more
language sections) · Genres index · Genre pages with a language switcher · Station
pages with JSON-LD · Search with recent searches and "Trending" · Favorites ·
Recently played · Persistent mini player, plus a Now Playing sheet with prev/next,
sleep timer, share, mute, volume and "Up next" · Media Session keys · Keyboard
shortcuts · Light/dark theme · Sitemap, robots and web manifest · About, Add station
and DMCA pages.

### 1.3 Catalog facts (from `data/stations.json`)

| Metric | Value | Implication |
|---|---|---|
| Total / active stations | 401 / **368** | README and `SITE.description` still say "290+" |
| Languages ("genres") | **8**: Tamil, Hindi, Telugu, Malayalam, Kannada, Punjabi, Urdu, "India" | Bengali, Marathi, Gujarati, Odia, Assamese, Bhojpuri, Konkani and others are **missing** |
| Tamil share of active stations | 157 / 368 (**43 %**) | Catalog and home page are heavily Tamil-skewed |
| `http://` streams | 88 | These need the proxy (mixed content) |
| HLS streams | 52 | These need the proxy (CORS for hls.js) |
| `https://` non-HLS streams | **230 (62 %)** | These can play **directly** without the proxy |
| Streams on `stream.zeno.fm` | 74 | One origin allowlists a whole third-party CDN |
| Stations with no tags | 169 (46 %) | Category browsing (news, devotional, old songs) is impossible today |
| Stations with no homepage | 117 | Thin station pages |
| Near-duplicate names | ~11 pairs (e.g. "AIR Malayalam", "Radio Bolly FM") | Dedupe needed |
| `language` field | Free text ("english, hindi", "urdu/punjabi/seraiki", "Tamil") | Needs normalizing to codes |
| `country` field | Verbose UN names ("The United Kingdom Of Great Britain And Northern Ireland") | Needs normalizing to ISO codes |
| Editorial `top_rank` | 161 stations | Good foundation for curation |

**Conceptual gap:** *genre* is used to mean *language*. Indian listeners also browse by
**what's on** (film songs, old songs, devotional, news, talk, cricket and sports,
classical such as Carnatic and Hindustani, kids), by **city** ("Chennai FM", "Mumbai
FM"), by **network** (AIR or Akashvani, Vividh Bharati, Mirchi, Suryan, Red FM,
Radio City, Big FM, Hello FM) and by **FM frequency** ("93.5").

### 1.4 Design system

Dark forest green (`--brand #0B3D2E`) with warm yellow (`--accent #FDE047`) on
cream, rounded cards and floating chrome. It is documented in `design/README.md` and
implemented as tokens in `src/app/globals.css`. The look is distinctive and
app-like, and it should be **preserved and refined, not replaced**. The main
weaknesses are legibility (tiny type), touch-target size and accessibility
plumbing (see §4.4).

---

## 2. Who we are building for

"Covering all sets of people" means designing for very different listeners at once.
These personas drive the prioritization below.

| Persona | Context | Needs | Today's gaps |
|---|---|---|---|
| **Paati / Dadi (60+), at home** | Shared Android phone, large font setting, little English | Big text, big buttons, native-language UI, "my station" in one tap, voice search | Text 7.5–11.5 px is common; 30–32 px play buttons; English-only UI |
| **Daily commuter** | Patchy 4G, Bluetooth or car, phone in pocket | Fast start, **auto-reconnect** on network drops, lock-screen controls with artwork, low data use | No reconnect logic; no Media Session artwork; no data-saver option |
| **NRI / diaspora** (US, UK, UAE, Singapore, Canada, Australia) | Desktop at work or a smart speaker, nostalgic for a home city's station | Find a specific city station ("Hello FM Chennai"), cast to speaker, reliable streams | No city/frequency data; no cast; search is exact-substring only |
| **Devotional listener** | Morning routine, kirtan, suprabhatam, bhajans, Islamic or Christian radio | Category browsing, alarm-like start, sleep timer at night | No categories; devotional content is hidden in tags |
| **Young listener / student** | Mobile-first, shares on WhatsApp/Instagram | Trending, shareable cards, film-music stations, dark mode | No share preview images (OG); no trending based on real plays |
| **Low-end device / data-conscious** | 2–3 GB RAM Android, prepaid data | Light pages, data usage visibility, low-bitrate choice | Two web fonts; global context re-renders; no data indicator |
| **Visually impaired / screen-reader user** | TalkBack or VoiceOver | Proper semantics, live status announcements, focus management | Nested interactive controls; no `aria-live`; dialog without focus trap |
| **Broadcaster / station owner** | Wants listeners and analytics, might pay for promotion | Easy listing, correction and takedown flow; listener stats; featured placement | `mailto:` to a placeholder domain; no stats; no self-serve |

---

## 3. Best-practice benchmarks for radio apps

Benchmarks drawn from established players (TuneIn, Radio Garden, radio.net, myTuner,
Zeno.fm, News On AIR) and from audio-UX conventions. These become our quality bar.

| Area | Best practice | Our target |
|---|---|---|
| Time to first audio (TTFA) | Under 2–3 s on 4G | p50 < 2.5 s, p90 < 5 s (measured, §7) |
| Resilience | Auto-reconnect with backoff when the stream drops or the network changes | 3 retries (1 s, 3 s, 8 s), then a clear error with a Retry button |
| Resume | App reopens with the last station one tap away | "Continue listening: <station>" on home |
| Background | Audio continues when locked or in another tab; lock-screen artwork and controls | Media Session with artwork, `playbackState`, correct play/pause handlers |
| Discovery | Language → category → city → network; trending based on real plays | Faceted browse plus real "Trending" |
| Search | Instant, typo-tolerant, frequency-aware ("93.5"), native script, voice | Client-side fuzzy index plus Web Speech API |
| Data transparency | Show bitrate; offer a low-data mode | "~58 MB/hour" hint and a data-saver toggle |
| Accessibility | WCAG 2.2 AA, 44 × 44 px targets, legible minimum text | Body ≥ 14 px, meta ≥ 12 px, targets ≥ 44 px |
| Ads | Never interrupt live audio mid-stream; pre-roll at most, frequency-capped; display ads away from controls | See §6 |
| Trust | Real contact info, privacy policy, station removal flow | Privacy, Terms, Grievance Officer, working contact form |

---

## 4. Audit findings: bugs, risks and gaps

### 4.1 Functional bugs (P0)

| # | Bug | Where | Impact | Fix |
|---|---|---|---|---|
| B1 | **Favoriting a station that isn't playing never shows it in Favorites.** `toggleFavorite` only saves the station object into `favMap` when `current.id === id`. The heart on the station page (`FavoriteButton`) passes only an `id`, so the ID is saved but the station never renders on `/favorites` or in the home rail. | `src/components/AudioProvider.tsx:318-335` (line 328), `src/components/FavoriteButton.tsx` | Core feature silently broken | Store **slugs** only and resolve them against the catalog (also fixes stale stream URLs). Or pass the full `PublicStation` to `toggleFavorite`. Migrate the existing `emfm:favorites` IDs on load. |
| B2 | **Retry after an error doesn't actually retry.** In the `error` state, the Play buttons call `toggle()`, which calls `audio.play()` on the dead source (or on an hls instance that was never re-created). `play(current)` is only called from the `idle` state. | `AudioProvider.tsx:213-218`, `PlayButton.tsx`, `PlayerChrome.tsx`, `NowPlayingSheet.tsx` | The "Tap play to retry" copy is false | In `toggle`, when `status === "error"` (or the source is missing), call `play(current)`. |
| B3 | **Global keyboard shortcuts hijack the page.** ArrowUp/ArrowDown change volume instead of scrolling. Space toggles playback **and** activates whichever button is focused (double action). There are no guards for `SELECT`, `contenteditable` or modifier keys. | `AudioProvider.tsx:380-400` | Breaks keyboard and scroll for everyone, and especially for accessibility users | Ignore events with modifiers, on focused interactive elements, or with `isContentEditable`. Use Shift+↑/↓ (or only when focus is in the player) for volume. Use Space only when focus is on `body`. |
| B4 | **Stream drop silently becomes "Paused".** When an Icecast connection closes, the browser fires `pause` then `ended`. `ended` and `stalled` aren't handled, so the UI shows "Paused" and nothing reconnects. | `AudioProvider.tsx:122-140` | The most common failure mode for commuters | Add a reconnect state machine (see F-1.1). |
| B5 | **Next/Prev and "Up next" walk the entire catalog in raw file order**, jumping across languages (Tamil → Urdu). | `AudioProvider.tsx:236-262` | Feels random; breaks a "keep me in Tamil" session | Use a **play queue** built from the list the user started from (genre, search, favorites), falling back to the same language ranked by `rankStations`. |
| B6 | **The whole app re-renders every second while the sleep timer runs.** `sleepRemaining` is in the single context value, so every `useAudio()` consumer (157 `StationRow`s on the Tamil page, plus all `PlayButton`s) re-renders each tick. | `AudioProvider.tsx:283-293` (1 s tick) and `:403-434` (context value) | Jank and battery drain on low-end phones | Split into `PlaybackContext`, `LibraryContext` (favorites/recents) and `SleepTimerContext`. Use selector hooks. Memoize `favoriteStations`. |
| B7 | **Volume slider does nothing on iPhone/iPad.** iOS ignores `HTMLMediaElement.volume`. | `NowPlayingSheet.tsx:286-300` | Broken-looking control for iOS users | Feature-detect (set the volume, read it back) and hide the slider on iOS. Keep Mute. |
| B8 | **Station page shows "LIVE · 157"**, the language station count, on a single station's hero. Users read it as listener count. | `src/app/station/[slug]/page.tsx:107` | Misleading | Replace it with a plain "LIVE" chip. Show the count only once real listener counts exist. |
| B9 | **Placeholder emails** `stations@elanjai.example` and `dmca@elanjai.example`. | `src/app/add-station/page.tsx:35`, `src/app/dmca/page.tsx:22-23` | Broken contact paths; AdSense reviewers check these | Real domain addresses plus a form (F-4.4). |
| B10 | **Stale copy:** "290+" stations (actual is 368). The footer year is hard-coded to `© 2026`. | `src/lib/site.ts:11`, `README.md:3`, `src/app/layout.tsx:80` | Credibility | Derive the count from data (rounded down to a nearest-10 "+"). Compute the year. |
| B11 | **Theme toggle can't return to "System".** The init script supports `system`, but the toggle only ever writes `dark` or `light`. | `src/components/ThemeToggle.tsx` | Minor | Three-way control (System / Light / Dark) in a settings sheet. |
| B12 | **Recents and favorites store full station snapshots**, including the proxied stream URL. When a stream URL changes in the catalog, saved entries keep playing the dead URL. | `AudioProvider.tsx` (`emfm:recents`, `emfm:favmap`) | Gradual rot | Persist slugs plus `playedAt` only. Resolve from the catalog (same fix as B1). |

### 4.2 Security and cost risks (P0)

| # | Risk | Where | Detail | Fix |
|---|---|---|---|---|
| S1 | **Bandwidth bill scales linearly with listeners.** Every byte of audio passes through our Railway container. | `src/lib/data.ts:16-18` (`playableUrl`), `src/app/api/stream/route.ts` | A 128 kbps stream is about **57.6 MB per listener-hour**. 1,000 concurrent listeners ≈ 128 Mbps ≈ **1.4 TB/day** of egress (check against Railway's current per-GB price). This is the single biggest threat to the "free + ads" economics. | **Play the 230 `https://` non-HLS streams directly** (an `<audio>` element does not need CORS). Proxy only `http://` streams and HLS streams whose origin lacks CORS. Add a per-station `direct: boolean` flag, verified by the health check. |
| S2 | **The proxy can be hotlinked.** The proxy sets `Access-Control-Allow-Origin: *`, so any site can use our server as its stream source. | `stream/route.ts:139` | Other people's traffic on our bill | Remove the ACAO header (playback is same-origin). Check `Sec-Fetch-Site` / `Origin` / `Referer`. Add per-IP rate limiting and concurrent-stream caps. |
| S3 | **The allowlist is per origin, not per stream.** Allowing `stream.zeno.fm` lets anyone proxy **any** of Zeno's streams through us. | `stream/route.ts:18-20, 119` | Open proxy for a whole CDN | Allow only exact catalog stream URLs. Everything else must carry a valid signature. |
| S4 | **The HLS signing secret is per process** (`randomBytes(32)`). | `stream/route.ts:29` | Breaks HLS mid-session on every restart or deploy, and with more than one replica | Read the secret from an env var (`STREAM_URL_SECRET`). Add an expiry timestamp to signatures. |
| S5 | **Now-playing opens an upstream connection per stream every 20 s** and accepts any allowlisted URL. | `src/app/api/now-playing/route.ts` | Moderate load; can be abused | Reuse S3's exact-URL allowlist; key the cache by station slug; accept `?slug=` instead of an encoded URL. |
| S6 | **No security headers** (CSP, `Referrer-Policy`, `Permissions-Policy`, `X-Content-Type-Options`). | `next.config.ts` | Needed anyway before third-party ad scripts arrive | Add `headers()` in `next.config.ts`, with a CSP that allows only the ad and analytics domains we choose. |

### 4.3 Reliability and data quality

| # | Gap | Fix | Pri |
|---|---|---|---|
| D1 | Health checks are manual (`scripts/healthcheck.py`). Dead stations stay listed until someone runs it. | Nightly GitHub Actions cron that runs the health check and opens a PR that flips `is_active`. Also add **real-user failure reports** (F-1.6). | P0 |
| D2 | `language` and `country` are free text. | Normalize to `languages: string[]` (ISO 639 codes such as `ta`, `hi`) and `country: "IN"` (ISO 3166). Keep display names in a lookup table. | P1 |
| D3 | Genre equals language; 46 % of stations have no tags. | Add `categories: string[]` with a controlled vocabulary (film, retro, devotional, news, talk, classical, sports, kids, community) plus `city`, `state`, `frequency_mhz`, `network`. Backfill the flagship stations editorially first. | P1 |
| D4 | About 11 duplicate station pairs. | Dedupe script (normalized name plus stream host). Keep the better bitrate/HTTPS variant as a fallback stream (`streams: [primary, backup]`). | P1 |
| D5 | One stream per station; when it dies, the station dies. | `streams[]` with failover order. The player tries the next stream before showing an error. | P1 |
| D6 | Remote favicon fallbacks hotlink third-party CDNs. | All 368 already have local logos; drop the remote fallback and serve WebP/AVIF at the 44/96/200 px sizes actually used. | P2 |

### 4.4 Accessibility and legibility (impeccable audit lens)

| # | Finding | Where | Fix | Pri |
|---|---|---|---|---|
| A1 | **Type too small for the audience.** 7.5 px tagline, 8.5 px genre labels, 9–11.5 px meta text used about 40 times. | `AppBar.tsx`, `page.tsx`, `StationRow.tsx`, `StationCard.tsx`, `NowPlayingSheet.tsx` | Floor: body 14–16 px, secondary 12–13 px, overlines 11 px. Respect user font scaling (`rem`, not fixed px). | P0 |
| A2 | **Touch targets below 44 px.** Row play button 32 px, card play button 30 px, mini-player Next icon has no padding. | `StationRow.tsx`, `StationCard.tsx`, `PlayerChrome.tsx` | Visual size can stay compact, but hit areas should be ≥ 44 px (padding or pseudo-element). | P0 |
| A3 | **Nested interactive controls.** The mini player is a `div role="button"` that contains a `Link` and two `button`s. | `PlayerChrome.tsx:20-30` | Make the title area a plain button ("Open player") next to sibling buttons. No interactive wrapper. | P0 |
| A4 | **Dialog without focus management.** The Now Playing sheet has `aria-modal` but no focus trap, no initial focus, no focus restore, and the background stays tabbable. | `NowPlayingSheet.tsx` | Use the native `<dialog>` element with `showModal()` (gets focus trap and `inert` for free), or `inert` on `<main>`. | P1 |
| A5 | **Status changes aren't announced.** "Connecting…", "Playing", errors and now-playing titles are silent to screen readers. | Player components | One visually hidden `aria-live="polite"` region in the player. | P1 |
| A6 | **No `prefers-reduced-motion` handling.** EQ bars animate forever; the sheet slides in. | `globals.css` | Wrap animations in `@media (prefers-reduced-motion: no-preference)`. | P1 |
| A7 | **No visible focus styles** (no `focus-visible` rules anywhere). | Global | Accent focus ring tokens in `globals.css`. | P1 |
| A8 | **The sleep-timer menu isn't keyboard-navigable** and closes only on mouse-down outside. | `NowPlayingSheet.tsx:14-85` | Menu semantics (`role="menu"`, arrow keys, Escape) or a simple segmented control. | P2 |
| A9 | **Jargon in UI copy:** "Now playing · via ICY metadata". | `NowPlayingSheet.tsx:210` | "Now playing" / "Song info not shared by this station". | P1 |
| A10 | Contrast of `muted` (#5F7268) text at 9–10 px on cream is weak. | Tokens | Re-check at the new size floor; darken `muted` slightly if needed. | P1 |

### 4.5 SEO and discoverability gaps

| # | Gap | Fix | Pri |
|---|---|---|---|
| SEO1 | Station pages are near-identical templates ("Listen to X live online — free Tamil radio…"). Google treats this as thin content, which hurts rankings **and AdSense approval**. | Per-station unique content: short description, city, frequency, network, language, show highlights, FAQ ("Is Suryan FM available online?"), related stations. Start with the top 160 `top_rank` stations. | P1 |
| SEO2 | No city, category or network landing pages, where most search demand is ("chennai fm radio online", "old hindi songs radio", "AIR news live"). | `/city/[slug]`, `/category/[slug]`, `/network/[slug]` pages generated from the new data fields. | P1 |
| SEO3 | No social share images. India shares on WhatsApp; a bare link converts poorly. | `opengraph-image.tsx` per station and genre (logo + name + "Listen live on Elanjai FM"). | P1 |
| SEO4 | `sitemap.ts` sets `lastModified: new Date()` on every URL at each build. | Use the catalog file's last-changed date per station. | P2 |
| SEO5 | JSON-LD `image` uses the remote favicon; the breadcrumb uses the lowercase genre slug as its name. | `src/lib/jsonld.ts:14`, station page breadcrumb | Use the local logo and the genre's display name. | P2 |
| SEO6 | English-only pages; no `hreflang`. | Comes with i18n (F-3.1): native-language landing pages with `hreflang` alternates. | P2 |
| SEO7 | The web manifest has one 505 × 505 icon with `purpose: any`. | `src/app/manifest.ts:13` | 192 and 512 icons, a maskable variant, screenshots and `shortcuts` (Favorites, Recent). | P1 |

---

## 5. Roadmap by phase

Each phase has an exit gate. Don't start ads (Phase 4) before Phase 0 and the
reliability work in Phase 1 meet their gates.

```
Phase 0  Launch hardening            → gate: zero P0 bugs, proxy egress cut, trust pages live
Phase 1  Listener experience          → gate: TTFA p50 < 2.5 s, play success ≥ 92 %
Phase 2  Catalog & discovery          → gate: ≥ 15 languages, categories + cities live
Phase 3  Reach & growth               → gate: i18n UI, PWA/Play Store, organic traffic growing
Phase 4  Monetization                 → gate: consent + policies ready, ads don't regress KPIs
Phase 5  Retention & platform         → accounts/sync, broadcaster portal, native shells
```

### Phase 0: Launch hardening (P0)

| ID | Item | Effort | Acceptance criteria |
|---|---|---|---|
| F-0.1 | Fix B1 and B12: slug-based favorites and recents with migration from the current `emfm:*` keys | M | Favoriting from any surface shows up on `/favorites` and the home rail after a reload; old data is migrated |
| F-0.2 | Fix B2: real retry from the error state | S | After a forced 502, pressing Play re-creates the source and plays when upstream recovers |
| F-0.3 | Fix B3: scoped keyboard shortcuts | S | Arrow keys scroll pages; Space on a focused button activates only that button |
| F-0.4 | Split `AudioProvider` contexts (B6) | M | React Profiler shows no `StationRow` re-render during sleep-timer ticks |
| F-0.5 | **Direct-play for HTTPS streams** (S1) | M | Network panel shows 230 stations streaming from the broadcaster's origin; the proxy serves only `http`/non-CORS HLS |
| F-0.6 | Proxy hardening: remove `ACAO: *`, exact-URL allowlist, env-based signing secret with expiry, rate limit (S2–S5) | M | Cross-origin embedding of `/api/stream` fails; arbitrary Zeno URLs get a 403; HLS keeps working across a redeploy |
| F-0.7 | Security headers and CSP (S6) | S | securityheaders.com grade A (with an ads allowance planned) |
| F-0.8 | Legibility and target floor (A1, A2, A3) | M | No text below 11 px; all controls have ≥ 44 px hit areas; axe shows no nested-interactive errors |
| F-0.9 | Trust pages: **Privacy Policy**, **Terms of Use**, **Contact**, real emails, Grievance Officer details (IT Rules 2021); fix copy B8–B10 | S | Pages linked in the footer; no `.example` addresses left |
| F-0.10 | Add `error.tsx`, `global-error.tsx` and `loading.tsx` (none exist today) | S | A thrown error in a route shows a branded recovery screen, not a blank page |
| F-0.11 | PR CI: lint, typecheck, unit tests and build on every PR (§9) | S | Required check on `main` |

### Phase 1: Listener experience (P1)

**F-1.1 Resilient playback engine** (L). This is the heart of the product.
- A state machine: `idle → connecting → playing ⇄ buffering → reconnecting(n) → error`.
- Listen for `stalled`, `ended`, `error` and `online`/`offline` events. Reconnect with
  backoff (1 s, 3 s, 8 s), and fail over to `streams[1]` (D5) before giving up.
- Keep the 12 s connect watchdog, but measure and report TTFA (§7).
- On `navigator.onLine` turning true, auto-resume if the user was playing.
- Acceptance: toggling airplane mode for 5 s mid-stream resumes automatically without
  user action.

**F-1.2 Play queue and sensible next/prev** (M). Fixes B5.
- When the user starts playback from a list (genre, search, favorites, recents), that
  list becomes the queue. "Up next" and Media Session next/prev follow it.
- Fallback queue: the same primary language, ranked.

**F-1.3 Lock screen and background polish** (S).
- Media Session `artwork` (local logo at 96/256/512), `playbackState`, separate
  `play` and `pause` handlers, `stop`. Show the ICY title as `title` and the station
  as `artist` (already partly done).

**F-1.4 "Continue listening" and one-tap resume** (S).
- The home hero becomes personal: the last-played station with a big Play button.
  New users get the flagship station of their chosen language (F-1.5). The hero no
  longer hard-codes Tamil.

**F-1.5 First-run language picker** (M). The highest-value onboarding step.
- A single sheet on first visit: "Which languages do you listen to?" with large
  native-script chips (தமிழ், हिन्दी, తెలుగు, മലയാളം, ಕನ್ನಡ, বাংলা, मराठी,
  ગુજરાતી, ਪੰਜਾਬੀ, اردو …), multi-select. Skippable.
- Pre-select from `Accept-Language` and the browser locale.
- Home sections, Trending and the hero reorder by preference. Editable later in
  Settings.

**F-1.6 "Report a problem" and real-user health** (M).
- Players auto-send a beacon on failure (`station`, `reason`, `ttfa`, network type),
  and the user can tap "Not working?".
- A server aggregates failures; three or more failures from distinct sessions in 1 hour
  flags the station. A daily report feeds the health-check PR (D1).

**F-1.7 Instant, forgiving search** (M).
- Ship a compact client-side index (~368 entries: name, aliases, native name, city,
  frequency, network, categories). Show results as the user types.
- Typo tolerance (trigram or edit distance), aliases ("suriyan" → "Suryan FM",
  "mirchi" → all Mirchi stations), frequency matching ("93.5").
- **Voice search** with the Web Speech API (supports `en-IN`, `hi-IN`, `ta-IN` and
  others on Chrome Android). Valuable for older and low-literacy users.
- Better empty state: suggest languages and categories, and offer "Request this
  station".

**F-1.8 Data saver and transparency** (S).
- Show "≈ 58 MB/hour" next to bitrate on the station page. Show per-session data use
  in the Now Playing sheet.
- Data-saver toggle: prefer the lowest-bitrate stream variant; warn before playing
  more than 128 kbps on `navigator.connection.saveData`.

**F-1.9 Sleep timer upgrades** (S).
- Fade out over the final 30 s. Add "End of current show" later, once schedules
  exist. Add a 90 min option and a custom value.
- After the timer stops playback, keep the mini player in a paused state instead of
  removing it, so the user can resume tomorrow with one tap.

**F-1.10 Cast and AirPlay** (M). This is already in the design but not built.
- The Remote Playback API (`audio.remote.prompt()`) for Chromecast on Chrome, and the
  AirPlay picker (`webkitShowPlaybackTargetPicker`) on Safari. Hide the button when
  unsupported. Proxied URLs must be absolute and reachable by the cast device.

**F-1.11 Settings sheet** (S).
- Theme (System/Light/Dark), text size (Default/Large/Extra large), languages, data
  saver, clear history, export favorites.

**F-1.12 "Simple mode" for older listeners** (M).
- An optional mode: a huge grid of favorite station logos, one tap to play, giant
  Play/Stop, no rails or chips. It can be shared as a link a grandchild sets up
  ("Set up for Amma"), with favorites pre-filled through the URL (see F-5.2).

### Phase 2: Catalog and discovery (P1–P2)

**F-2.1 Catalog schema v2** (L). Prerequisite for most of this phase.

```ts
type Station = {
  id: string; slug: string;
  name: string; name_native?: string;          // "சூரியன் FM"
  aliases?: string[];                           // search
  streams: { url: string; codec: string; bitrate: number; direct: boolean; hls: boolean }[];
  languages: string[];                          // ["ta"] ISO 639-1/3
  categories: string[];                         // ["film", "retro"]
  network?: string;                             // "air" | "mirchi" | "suryan" | …
  city?: string; state?: string; country: string; // ISO 3166 "IN"
  frequency_mhz?: number;                       // 93.5
  homepage?: string; description?: string;
  logo: string;                                 // local only
  top_rank?: number;
  is_active: boolean; last_checked_at: string; health_score?: number;
};
```

Migrate with a script in `scripts/`. Update `src/lib/types.ts` and `src/lib/data.ts`
in one change.

**F-2.2 Language expansion** (L). Cover India properly.
- Add **Bengali, Marathi, Gujarati, Odia, Assamese, Bhojpuri, Konkani, Maithili,
  Rajasthani, Kashmiri, Sindhi, Nepali, Sanskrit, Tulu, Manipuri**, plus Indian
  English. By Census 2011, Bengali (~97 M speakers), Marathi (~83 M) and Gujarati
  (~55 M) are each larger audiences than several languages we already list.
- Sources: radio-browser (already used by `scripts/make_seed.py`), public AIR/Akashvani
  regional streams, and broadcaster submissions.
- Rebalance the home page so it is not 43 % Tamil for everyone (the language picker
  in F-1.5 does most of this).

**F-2.3 Category browsing** (M). `/category/[slug]` and chips on genre pages: Film
songs · Retro/Old songs · Devotional (with sub-filters: Hindu, Sikh/Gurbani, Islamic,
Christian) · News · Talk · Classical (Carnatic, Hindustani) · Sports/Cricket ·
Kids · Community radio.

**F-2.4 City and network pages** (M). `/city/chennai`, `/network/all-india-radio`,
and so on. Each one is an SEO landing page and a browse facet. Add a "Near me" chip
that uses coarse IP geolocation server-side, with no permission prompt.

**F-2.5 Editorial collections** (S, ongoing). Curated, seasonal rails that are cheap
to make and high-engagement: "Margazhi music season", "Navratri devotional", "Ramzan
specials", "IPL/cricket commentary", "Ilaiyaraaja & A.R. Rahman", "Kishore Kumar
classics". Defined in `data/collections.json` with start and end dates.

**F-2.6 Real "Trending"** (M). Replace the static `getFeatured()` ranking with
rolling 24 h and 7 d play counts from analytics (F-7), blended with `top_rank`.
Per-language trending.

**F-2.7 Station page v2** (M). Unique description, city, frequency and network
chips, "Song info" when available, a schedule (where we have one), a FAQ block with
`FAQPage` JSON-LD, alternative streams, "Report a problem", and related stations by
the same network or city.

**F-2.8 Programme schedules** (L, P3). AIR and some private FMs publish schedules.
Start with the top 20 stations. This enables "On now: Vividh Bharati – Chhaya Geet".

### Phase 3: Reach and growth (P1–P2)

**F-3.1 Indian-language UI (i18n)** (L).
- Locales: `en`, `ta`, `hi`, `te`, `ml`, `kn`, `bn`, `mr`, `gu`, `pa`, `ur` (RTL for
  Urdu). Start with `en`, `ta` and `hi`.
- Next 16 App Router `[lang]` segment with dictionaries. **Read
  `node_modules/next/dist/docs/` on internationalization before implementing**
  (per `AGENTS.md`; this Next version has breaking changes).
- Native-script fonts: system fonts first, plus subset Noto fonts for Indic scripts,
  loaded only for the active locale. Consider dropping Poppins or Inter to save bytes.
- `hreflang` alternates, localized metadata and OG images.

**F-3.2 Installable PWA** (M).
- Full icon set (192, 512, maskable), `screenshots`, `shortcuts`, an offline shell
  page ("You're offline. Your favorites are here when you're back."), and an install
  prompt after the second session or the third play (never on first visit).
- The service worker must **not** cache audio responses.

**F-3.3 Google Play listing through a Trusted Web Activity** (M, P2). Most Indian
users are on Android, and Play Store presence is a major discovery channel.
Packaging the PWA with Bubblewrap reuses the codebase. Check current ad-policy
compatibility for ads inside a TWA before relying on web ads there (§6).

**F-3.4 Share that converts** (S). A WhatsApp-first share button (`wa.me` deep link
with station name and link), OG images from SEO3, and "Listening to X on Elanjai FM"
copy. Share links open the station page with a large Play button.

**F-3.5 Embeddable player widget for broadcasters** (M, P2). `<iframe>` or a script
snippet stations can put on their own sites: a "Powered by Elanjai FM" backlink and
a growth loop. It must use direct streams (S1) so it doesn't add proxy cost.

**F-3.6 Diaspora SEO** (M). Landing copy aimed at "Tamil radio online in USA/UK/
Singapore", "Malayalam radio UAE" and similar. Diaspora traffic also has much higher
ad value than domestic traffic (§6.6).

**F-3.7 Performance budget** (M).
- Targets: LCP < 2.5 s and INP < 200 ms on a mid-range Android device over 4G; JS
  < 120 KB gzipped on first load excluding hls.js.
- Make `/api/stations` cacheable (it is used by next/prev and is dynamic today), or
  ship a compact catalog JSON as a static asset with long-lived caching.
- Use responsive WebP/AVIF logos at 44/96/200 px.

### Phase 4: Monetization (P2), detailed in §6

F-4.1 Analytics plus consent foundation · F-4.2 Self-ad (house and direct-sold)
engine · F-4.3 Google AdSense display units · F-4.4 Broadcaster "Featured listing"
product · F-4.5 Audio pre-roll pilot · F-4.6 "Advertise with us" and media kit page ·
F-4.7 Ad-free supporter plan.

### Phase 5: Retention and platform (P2–P3)

| ID | Item | Notes |
|---|---|---|
| F-5.1 | Optional accounts (phone OTP or Google) to sync favorites and recents across devices | Only after local-first works well. DPDP consent notice required (§10). |
| F-5.2 | Export/import favorites by link or QR (no account) | `/f?s=slug1,slug2` |
| F-5.3 | Broadcaster portal: claim a station, edit metadata, upload logo, see listener stats | Also the sales channel for F-4.4 |
| F-5.4 | Real listener counts per station ("1.2k listening") | From analytics heartbeats; show only above a threshold |
| F-5.5 | Alarm ("Wake me with Suryan FM") | Not reliable in a pure PWA; feasible in the TWA or a native shell later |
| F-5.6 | Smart speakers and Android Auto | Requires native apps; P3 |
| F-5.7 | Listening stats ("You listened 14 h this month") | Delight and retention, low cost once analytics exist |

---

## 6. Monetization strategy (Google ads + self ads)

### 6.1 Principles

1. **Audio is sacred.** Never interrupt a live stream mid-play. The only audio ad is
   an optional, frequency-capped pre-roll at the start of a session (F-4.5).
2. **Ads never sit next to controls.** No ads in the mini player, the tab bar, or
   adjacent to Play/Next. This protects users from accidental taps, and accidental
   clicks are also an AdSense policy violation risk.
3. **Reserve space and never shift layout.** Every slot has fixed dimensions to
   protect CLS and Core Web Vitals.
4. **Label clearly.** "Ad" for Google units, "Sponsored" for paid placements, in
   line with ASCI guidelines in India.
5. **Gate on KPIs.** Each ad rollout is an A/B test that must not cut listening
   minutes or play success by more than a set threshold (§7).
6. **Self-ads first, then Google.** Our own engine fills slots with house promos
   ("Install the app", "Try Simple mode") from day one. That validates placements
   with zero policy risk, and it becomes the backfill and direct-sold layer later.

### 6.2 Readiness checklist before applying to AdSense

- [ ] Privacy Policy covering cookies, ad partners and analytics; Terms; Contact;
      About with real ownership details (F-0.9)
- [ ] Unique, useful content on station, city and category pages (SEO1, F-2.7);
      template-only directory pages are a common rejection reason ("low value content")
- [ ] Custom domain (not `*.up.railway.app`) with `ads.txt` at the root
- [ ] **Consent:** a Google-certified, IAB TCF-integrated CMP is **required** to serve
      personalized ads to users in the EEA, UK and Switzerland (Google policy since
      Jan 2024 for the EEA and UK, and Jul 2024 for Switzerland). Our UK and EU
      diaspora traffic makes this relevant. Use Consent Mode v2.
- [ ] India DPDP readiness: the DPDP Rules were notified on 13 Nov 2025 with an
      18-month phased rollout, so core data-fiduciary obligations apply from about
      **May 2027**. Build a compliant notice and consent flow now rather than
      retrofitting it.
- [ ] CSP updated to allow only the ad and CMP domains (S6)
- [ ] No ad code on error pages, empty states or the DMCA/legal pages

### 6.3 Placement map

The mobile layout already stacks the tab bar (~78 px) and mini player (~68 px) at
the bottom (`body pb-44`). **Turn off AdSense Auto ads' anchor format**, because it
would cover the player. Use manually placed units only.

| Surface | Slot | Format | Notes |
|---|---|---|---|
| Home | After "Popular now" | In-feed / responsive, fixed min-height | First ad is below the fold on mobile |
| Home | After the 2nd language section | Responsive | — |
| Genre / category / city page | After row 8, then every 12 rows | In-feed matching the `StationRow` style | Max 3 per page |
| Station page | Below the Now Playing card, above related stations | Responsive rectangle | **Never** between the hero and the Play CTA |
| Search results | After result 5 | In-feed | One "Sponsored" station may sit at the top (self-ad) |
| Now Playing sheet | Small "Sponsored by" card under "Up next" | **Self-ads only** | Keep Google units out of overlays |
| Desktop | Right rail on station and genre pages (xl+) | 300 × 600 / 300 × 250 | Not sticky near the floating player |
| **Never** | Mini player, tab bar, app bar, error/empty states, legal pages, interstitials over playback | — | — |

### 6.4 Self-ad engine (F-4.2) design

Start file-based to match the current architecture, and move to a database once
there is real direct-sold demand (§8).

```ts
// data/campaigns.json (v1) → DB table (v2)
type Campaign = {
  id: string;
  advertiser: string;
  kind: "house" | "banner" | "sponsored_station" | "audio_preroll";
  label: "Sponsored" | "Ad" | "From Elanjai FM";
  creative: { image?: string; alt: string; headline: string; body?: string;
              cta?: string; url?: string; stationSlug?: string; audioUrl?: string };
  targeting: { slots: string[]; languages?: string[]; categories?: string[];
               countries?: string[]; devices?: ("mobile" | "desktop")[] };
  schedule: { start: string; end: string; dayparts?: [number, number][] };
  weight: number;                       // rotation weight among eligible campaigns
  caps: { perUserPerDay?: number; totalImpressions?: number };
  status: "draft" | "active" | "paused" | "ended";
};
```

- **Serving:** a server-rendered `<AdSlot id="home-infeed-1" />` picks an eligible
  campaign (slot + language + country + schedule + weight), and falls back to
  AdSense, then to a house ad. It renders at a fixed size with the label.
- **Tracking:** `POST /api/ads/event` beacons `{campaign, slot, type: impression|click}`
  with an `IntersectionObserver` (≥ 50 % visible for ≥ 1 s counts as an impression).
  Clicks go through `/go/<campaign>` (302) with `rel="sponsored noopener"`. Use
  aggregate counters only, no personal data.
- **Reporting:** a simple, password-protected `/admin/ads` page with impressions,
  clicks and CTR per campaign and day. Export to CSV for advertisers.
- **Frequency caps** are enforced client-side (localStorage counter) and
  server-side (sampled).

### 6.5 Revenue products

| Product | Who buys | Mechanics | Phase |
|---|---|---|---|
| **House ads** | Us | Promote installs, Simple mode, new languages | 4 (day one) |
| **Google AdSense display** | Programmatic | Manual units per the placement map | 4, after readiness |
| **Featured station** (F-4.4) | Broadcasters, especially online-only stations | Top slot on its language/category page plus a home rail, labeled "Sponsored", monthly flat fee | 4 |
| **Local/regional sponsorship** | Regional businesses (jewellers, textiles, colleges, temples' festival promos) | Language- or city-targeted banners, flat CPM or monthly | 4–5 |
| **Audio pre-roll pilot** (F-4.5) | Programmatic or direct | A single ≤ 15 s pre-roll, at most once per 30–60 min per user, never on station switches inside a session. Candidates: Google Ad Manager with the IMA SDK (supports audio ads; check eligibility and inventory minimums) or radio ad specialists such as AdsWizz or Triton Digital. Only on directly played streams we control the start of. | 5 |
| **Ad-free supporter plan** (F-4.7) | Loyal listeners | Small monthly UPI payment (e.g. via Razorpay) that removes display and pre-roll ads | 5 |
| **Revenue share with stations** | — | Share a portion of the ad revenue earned on a station's page | 5; also improves the legal position (§10) |

### 6.6 Realistic expectations

- Radio sessions are **long but low on pageviews**: one page, then 40 minutes of
  listening. Display ads monetize pageviews, so per-listener display revenue is
  structurally low.
- Indian-traffic display RPMs are typically a fraction of US/UK RPMs. **Diaspora
  traffic** (US, UK, UAE, Singapore, Canada, Australia) is worth several times more
  per pageview, which is why F-3.6 matters for revenue.
- Long-term, the meaningful revenue comes from **audio ads** (matched to how people
  actually use the app) and **direct-sold sponsorships**. Display ads are the floor.
- Cutting proxy egress (F-0.5) matters as much as revenue: costs grow with
  listening hours, while display revenue grows with pageviews.

---

## 7. Analytics, KPIs and success metrics

### 7.1 Tooling

Start with **privacy-friendly, cookieless analytics** (self-hosted Umami or Plausible
on Railway). This means no consent banner just for analytics, and the data stays
ours. Add GA4 only when the AdSense program needs it, behind Consent Mode v2.

### 7.2 Events

| Event | Properties | Used for |
|---|---|---|
| `play_start` | station, source surface (home/genre/search/fav/recent/share), queue position | Funnel, trending |
| `play_success` | station, **ttfa_ms**, direct vs proxied, network type | TTFA KPI, proxy decisions |
| `play_fail` | station, reason (timeout/http/decode/hls), ttfa_ms | Health (F-1.6) |
| `reconnect` | station, attempt, outcome | Engine tuning |
| `listen_heartbeat` | station, every 60 s while playing | Listening minutes, real listener counts |
| `favorite_add` / `favorite_remove` | station | Engagement |
| `search` | query length, results count, zero-result query text (aggregated) | Catalog gaps |
| `share` | station, channel | Growth |
| `pwa_install` / `onboarding_language` | languages chosen | Reach |
| `ad_impression` / `ad_click` | slot, campaign | Monetization (§6.4) |

### 7.3 KPIs and targets

| KPI | Target before ads | Guardrail after ads |
|---|---|---|
| Play success rate | ≥ 92 % | No drop |
| TTFA p50 / p90 | < 2.5 s / < 5 s | No regression > 10 % |
| Listening minutes per active user per day | Baseline, then +20 % | No drop > 5 % |
| D1 / D7 return rate | Baseline, then improve | No drop > 5 % |
| Favorites per active user | ≥ 2 | — |
| Zero-result search rate | < 8 % | — |
| Core Web Vitals (p75) | LCP < 2.5 s, INP < 200 ms, CLS < 0.1 | CLS stays < 0.1 with ads |

---

## 8. Architecture evolution

| Concern | Now | Next | When |
|---|---|---|---|
| Catalog | JSON in the repo, rebuilt on every change | Keep JSON plus schema v2 (F-2.1) and validation in CI | Phase 2 |
| Catalog at scale | — | Postgres (Railway) or SQLite as the source of truth, exported to JSON at build, so static pages stay fast | When the broadcaster portal (F-5.3) or admin editing arrives |
| Ads and events | — | Event counters in Postgres (or Redis plus a daily rollup) | Phase 4 |
| Player state | One 437-line context | Split contexts (F-0.4) plus a playback state machine module (F-1.1), unit-tested without React | Phases 0–1 |
| Audio path | 100 % proxied | Direct for HTTPS; proxy for `http` and non-CORS HLS; signed, rate-limited | Phase 0 |
| Proxy scaling | Single Railway instance | If proxied traffic stays high: move the stream relay to an edge/CDN worker with cheap egress, or require HTTPS streams from partner stations | After measuring F-0.5 |
| Now-playing | Polling every 15 s per listener | Slug-keyed server cache; later Server-Sent Events from one shared poller per active station | Phase 1–2 |
| i18n | English only | `[lang]` segment with dictionaries (F-3.1) | Phase 3 |

---

## 9. Quality: testing, CI and operations

There are **no automated tests** today, and nothing runs on pull requests.

| Item | Detail | Pri |
|---|---|---|
| Unit tests (Vitest) | `src/lib/data.ts` (ranking, search, genres ordering), `stream/route.ts` (allowlist, signing, `rewriteManifest`), now-playing ICY parser, playback state machine, favorites migration | P0 |
| E2E tests (Playwright) | A local fake Icecast server (chunked MP3) and fake HLS fixtures. Flows: play → pause → next; favorite from the station page then appears on `/favorites` (regression for B1); error then retry (B2); keyboard (B3); reconnect after the server drops (B4) | P1 |
| Accessibility checks | `@axe-core/playwright` on home, genre, station, search and the open player sheet | P1 |
| PR workflow | `.github/workflows/ci.yml`: `npm ci`, `npm run lint`, `npm run typecheck`, `vitest`, `next build`. Playwright on a schedule or with a label | P0 |
| Catalog validation | JSON schema check for `data/*.json` in CI (unique slugs, valid URLs, known languages, logo exists) | P1 |
| Scheduled health check | Nightly cron runs `scripts/healthcheck.py` and opens a PR (D1) | P0 |
| Error monitoring | Sentry (or similar), client and server, with PII scrubbing | P1 |
| Uptime | External monitor on `/api/health` and on one direct and one proxied stream | P1 |
| Lighthouse CI | Budget per §F-3.7 on PRs that touch UI | P2 |

---

## 10. Legal, compliance and risk register

*This section flags risks to raise with a lawyer. It is not legal advice.*

| Risk | Why it matters | Mitigation |
|---|---|---|
| **Copyright and relay of third-party streams** | The DMCA page says "we do not … restream any audio", but `/api/stream` does relay the bytes. Placing ads around other broadcasters' content raises the stakes (Indian music rights bodies such as PPL and IPRS, plus broadcasters' own terms). | Make the copy accurate. Prefer direct playback (F-0.5). Seek written permission or partnerships, starting with the flagship stations. Offer revenue share (§6.5). Honor takedowns quickly. Keep a takedown log. |
| **Indian intermediary obligations** | IT Rules 2021 require intermediaries to publish a **Grievance Officer** and a complaint mechanism. "DMCA" is US law. | Add a Grievance Officer section with name, email and response timelines next to the DMCA notice (F-0.9). |
| **Personal data (DPDP Act 2023)** | Accounts, analytics and personalized ads involve personal data. Core obligations apply from about May 2027. | Data minimization (cookieless analytics, local-first library), a clear consent notice, deletion on request, and a breach-response plan. |
| **EEA/UK/CH ad consent** | Google requires a certified TCF CMP for personalized ads there. | Certified CMP before enabling personalized ads (§6.2). |
| **Advertising standards** | ASCI requires clear disclosure of paid content. | "Ad" and "Sponsored" labels; no disguised sponsored stations (§6.1). |
| **Logos and trademarks** | Station logos are used to identify stations. | Keep nominative use and honor removal requests. Encourage broadcasters to claim and supply logos (F-5.3). |
| **Platform cost blow-up** | Proxy egress grows with listening hours (S1). | F-0.5 and F-0.6, plus egress alerts on Railway. |
| **Stream rot** | About 8 % of the catalog is already inactive; streams move often. | D1, D5, F-1.6. |

---

## 11. Consolidated backlog

| ID | Title | Pri | Effort | Phase |
|---|---|---|---|---|
| F-0.1 | Slug-based favorites/recents + migration (B1, B12) | P0 | M | 0 |
| F-0.2 | Real retry from the error state (B2) | P0 | S | 0 |
| F-0.3 | Scoped keyboard shortcuts (B3) | P0 | S | 0 |
| F-0.4 | Split AudioProvider contexts (B6) | P0 | M | 0 |
| F-0.5 | Direct-play HTTPS streams (S1) | P0 | M | 0 |
| F-0.6 | Proxy hardening (S2–S5) | P0 | M | 0 |
| F-0.7 | Security headers / CSP (S6) | P0 | S | 0 |
| F-0.8 | Type floor, touch targets, mini-player semantics (A1–A3) | P0 | M | 0 |
| F-0.9 | Privacy, Terms, Contact, Grievance Officer, copy fixes (B8–B10) | P0 | S | 0 |
| F-0.10 | Error and loading boundaries | P0 | S | 0 |
| F-0.11 | PR CI + unit tests | P0 | S | 0 |
| D1 | Nightly automated health check | P0 | S | 0 |
| B7 | Hide the volume slider on iOS | P1 | S | 1 |
| F-1.1 | Resilient playback engine (B4) | P1 | L | 1 |
| F-1.2 | Play queue, sensible next/prev (B5) | P1 | M | 1 |
| F-1.3 | Media Session artwork and state | P1 | S | 1 |
| F-1.4 | Continue listening / personal hero | P1 | S | 1 |
| F-1.5 | First-run language picker | P1 | M | 1 |
| F-1.6 | Report a problem + real-user health | P1 | M | 1 |
| F-1.7 | Instant fuzzy + voice search | P1 | M | 1 |
| F-1.8 | Data saver and usage display | P1 | S | 1 |
| F-1.9 | Sleep timer fade and resume | P2 | S | 1 |
| F-1.10 | Cast / AirPlay | P2 | M | 1 |
| F-1.11 | Settings sheet (theme, text size, languages) | P1 | S | 1 |
| F-1.12 | Simple mode for older listeners | P1 | M | 1 |
| A4–A10 | Dialog focus, live region, reduced motion, focus ring, copy, contrast | P1 | M | 1 |
| F-2.1 | Catalog schema v2 | P1 | L | 2 |
| F-2.2 | Language expansion (Bengali, Marathi, Gujarati, Odia …) | P1 | L | 2 |
| F-2.3 | Category browsing | P1 | M | 2 |
| F-2.4 | City and network pages | P1 | M | 2 |
| F-2.5 | Editorial collections | P2 | S | 2 |
| F-2.6 | Real trending | P2 | M | 2 |
| F-2.7 | Station page v2 (unique content, FAQ) | P1 | M | 2 |
| F-2.8 | Programme schedules | P3 | L | 2 |
| D2–D6 | Normalize data, dedupe, backup streams, local-only logos | P1 | M | 2 |
| F-3.1 | Indian-language UI (i18n) | P1 | L | 3 |
| F-3.2 | Installable PWA + offline shell | P1 | M | 3 |
| F-3.3 | Google Play via TWA | P2 | M | 3 |
| F-3.4 | WhatsApp-first share + OG images | P1 | S | 3 |
| F-3.5 | Embeddable player widget | P2 | M | 3 |
| F-3.6 | Diaspora SEO | P2 | M | 3 |
| F-3.7 | Performance budget | P1 | M | 3 |
| SEO1–7 | SEO fixes | P1–P2 | M | 2–3 |
| F-4.1 | Analytics + consent foundation | P1 | M | 4 (start early) |
| F-4.2 | Self-ad engine | P2 | L | 4 |
| F-4.3 | AdSense display units | P2 | M | 4 |
| F-4.4 | Featured station product | P2 | M | 4 |
| F-4.5 | Audio pre-roll pilot | P3 | L | 4–5 |
| F-4.6 | Advertise-with-us / media kit page | P2 | S | 4 |
| F-4.7 | Ad-free supporter plan | P3 | M | 5 |
| F-5.1–5.7 | Accounts, sync, broadcaster portal, listener counts, alarms, stats | P2–P3 | L–XL | 5 |

**Suggested first sprint:** F-0.1, F-0.2, F-0.3, F-0.5, F-0.6, F-0.9, F-0.11 and D1.
Together they fix the broken core features, cut the biggest cost risk and add the
safety net for everything that follows.

---

## 12. Open questions for the owner

1. **Domain and brand:** what is the production domain? It is needed for `ads.txt`,
   real email addresses, canonical URLs and the AdSense application.
2. **Scope of "Indian radio":** the catalog includes Pakistani, Bangladeshi, Nepali
   and Sri Lankan stations (Urdu, Bengali, Tamil diaspora). Keep them with country
   filters, or focus on stations based in India?
3. **Partnerships:** are you open to approaching broadcasters (AIR/Prasar Bharati,
   private FM networks, online stations on Zeno) for permission and revenue share?
   This changes how aggressively we can monetize.
4. **Accounts:** do you want sign-in at all, or should the app stay account-free
   (local-first with export by link/QR)?
5. **First UI languages:** which three Indian languages should the interface ship in
   first? Tamil and Hindi are suggested.
6. **Play Store:** is a Google Play listing (TWA) in scope for the next six months?
7. **Budget guardrail:** what monthly Railway spend should trigger alerts or the move
   to an edge relay?
