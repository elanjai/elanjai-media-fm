# Elanjai FM — UX/UI Deep Analysis & Improvement Plan

**Method:** dual independent assessments — a design review (Nielsen heuristics, cognitive load, personas) and a deterministic detector scan (source + rendered URL scans at desktop 1280×800 and mobile 390×844 on `localhost:3001`). All detector findings were verified against source code.
**Scope:** whole app — home, station/genre/search/favorites/recent/simple surfaces, player chrome, first-run flow, i18n, data layer.
**Date:** 2026-11-21

---

## 1. Health scores

### Nielsen heuristics — 29/40 (Good)

| # | Heuristic | Score | Key issue |
|---|-----------|-------|-----------|
| 1 | Visibility of system status | 4 | Best in class: connecting/buffering/"Reconnecting n/3", session MB counter, eq bars, sleep countdown |
| 2 | Match system / real world | 3 | Human copy (MB/hr, "wake me at"); but "x" icon = mute, "plus" = copy, X button = stop |
| 3 | User control / freedom | 3 | Stop/next/prev/sleep cancel exist; no confirm on "Clear history" / "Reset stats"; sheet X stops playback |
| 4 | Consistency / standards | 2 | Localized genre in rows but raw slug on cards; dead `.hit` class; English walls in ta/hi UI |
| 5 | Error prevention | 3 | Data-saver gate, alarm roll-forward; destructive clears unconfirmed; X-as-stop tap trap |
| 6 | Recognition vs recall | 3 | Recent-search chips, Continue listening, trending; but 7 unlabeled icon buttons in the sheet |
| 7 | Flexibility / efficiency | 3 | Keyboard shortcuts, voice search, cast, simple mode, export; no gesture layer or shortcut legend |
| 8 | Aesthetic / minimalist | 3 | Coherent tokens and calm surfaces; genre pages stack ~33 chips; home has ~8–10 shelves |
| 9 | Error recovery | 3 | Retry, "Not working?" report, offline page; no "try a similar station" when a stream dies |
| 10 | Help / documentation | 2 | Per-station FAQ + About (English only); no shortcut legend; sleep/alarm hidden behind icon guessing |

### Technical audit — 15/20 (Good)

| Dimension | Score | Key finding |
|-----------|-------|-------------|
| Accessibility | 2 | No skip-to-content, no focus trap in sheets, dead `.hit` → sub-44px targets, contrast 4.2–4.4:1 |
| Performance | 4 | 300+ prerendered pages, lazy hls.js, buffer cap, per-glyph fonts, direct https streams |
| Theming | 3 | Full light/dark token system; ~8 className hex bypasses + one off-palette genre tile |
| Responsive | 3 | Mobile-first chrome, safe-area, `hit-expand`; dead `.hit` chips and chip-wall genre rails |
| Implementation integrity | 3 | Genuinely product-specific system; dead class, dead `name_native`, i18n gaps |

### Detector scan summary (rendered pages)

- `/en` desktop: 11 findings — hero text 4.3:1 / 11px, tamil tile 4.4:1, muted chip 4.2:1, 10px "From Elanjai FM" badge, line-length ~101 chars (station page), Inter overuse advisory, cream-palette advisory, violet accent advisory
- `/en` mobile 390×844: 9 findings — adds unbalanced h1 ("Every Indian station. One tap." wraps badly)
- All scans ran with the first-run language-picker modal auto-open — corroborates the first-run overlay collision below
- Source regex scan: 0 findings (element-level rules don't run on source; URL scans are the real signal)

---

## 2. What's working (keep & replicate)

1. **Status honesty engine** — playback state machine surfaces everywhere: reconnect countdown, session MB estimate, MB/hr on the data-saver hold, ICY now-playing line, labeled ad pre-roll. Rare, trust-building, exactly right for a data-conscious audience.
2. **Mobile chrome composition** — floating pill tab bar (exactly 4 tabs) + docked mini player + expandable sheet; `.hit-expand` honestly solves small-visual/big-target; `pb-44` reserves space; rails peek the next card.
3. **The senior/accessibility layer** — `/simple` giant one-tap grid, `?favs=` caregiver setup links, whole-UI text-size zoom, OS/data-saver detection, voice-search locale mapping. A differentiator, not a checkbox.
4. **The end-of-session design** — sleep timer *fades* the last 30s and pauses (not stops). Best-designed ending in the app.

---

## 3. Priority issues — fix list

### P0 — blocking the core audience or the first run

**P0-1. Native-script & voice search dead-ends for the core audience.**
`SearchInput.tsx:85-86` sets the Web Speech locale to the UI language (e.g. `ta-IN`), so a Tamil speaker dictates Tamil script — but `searchLocal`'s `norm()` strips every non-Latin character (`src/lib/search.ts:15-22`) → the query normalizes to empty → "No stations found." `nameNative`/`aliases` aren't in the haystack (`search.ts:65-67`), and `name_native` is populated for **0 of ~478 stations** in `data/stations.json` (the field is rendered on station pages `station/[slug]/page.tsx:186` and searched in `data.ts:361` — wired end-to-end, empty in data).
*Fix:* (a) populate `name_native` for at least the top ~150 stations per language; (b) add `nameNative` + `aliases` to the `searchLocal` haystack; (c) keep a script-aware path in `norm()` — either transliterate Indic scripts or match raw native input against `name_native` before the Latin strip.

**P0-2. First-run overlay collision: consent banner covers the language picker's actions.**
`ConsentBanner.tsx:36` is `fixed bottom-0 z-[70]`; `LanguagePickerSheet.tsx:58-64` is a bottom sheet at `z-50` auto-opened on first run (`PrefsProvider.tsx:101`). On a phone the consent card physically occludes the picker's Done/Skip — the app's first interactive moment is a blocked CTA. The detector independently confirmed every fresh-profile page load shows the picker.
*Fix:* defer the consent banner until language selection completes (gate on `!langPickerOpen` / `hasChosenLangs`), or raise the picker above `z-[70]` when open.

### P1 — major, fix before next release

**P1-1. English walls inside ta/hi locales — dict keys exist but components hardcode English.**
`ClientStationList.tsx:7-16,33-39,65-83` ignores the existing `favorites.emptyTitle/emptyHint/deviceNote` and `recent.*` keys (present in `ta.json`/`hi.json`); `ShareFavorites.tsx:46,55,74` ignores `share.*` keys. Hardcoded English body copy: `ad-free/page.tsx:33-36,60-62`, `add-station/page.tsx:23-26`, plus the entire station-page FAQ + composed description (`station/[slug]/page.tsx:73-99`, `lib/data.ts:281-300`) in every locale.
*Fix:* wire the existing dict keys first (free win), add dict entries for page bodies; if FAQ stays English by design, mark it `lang="en"`.

**P1-2. Dead `.hit` class → sub-44px touch targets, violating the design's own rule (`design/README.md`).**
`.hit` is used but never defined (globals.css defines only `.hit-expand`). Affected: city/network/category chips (`station/[slug]/page.tsx:221,230,246` — `px-3 text-xs`, no vertical padding → ~18–24px tall), `ReportButton.tsx:20`, `EmbedBlock.tsx:30`, `listen/page.tsx:72`.
*Fix:* define `.hit { min-height: 44px; }` (one line) or swap for `py-2.5` / `hit-expand`.

**P1-3. Sheets are `aria-modal` but have no focus management.**
`NowPlayingSheet.tsx:217-224`, `SettingsButton.tsx:197-208`: no focus trap, no initial focus, no focus return — keyboard/screen-reader focus stays behind the dialog. Also: no skip-to-content link (`layout.tsx:130-142`), and single-letter shortcuts (m/n/p — `AudioProvider.tsx:1070-1097`) can fire while a screen-reader user navigates.
*Fix:* trap + return focus in sheets, add a skip link to `<main>`, gate letter shortcuts when a dialog is open or focus is in a form field.

### P2 — meaningful polish

**P2-1. Icon misuse + the sheet's close/stop trap.**
X button stops playback AND closes — users read X as "dismiss" (the real dismiss is the left chevron; `NowPlayingSheet.tsx:228-251`); mute renders an "x" glyph (`:392-401`); embed copy uses a "plus" glyph (`EmbedBlock.tsx:32`).
*Fix:* add real `volOff`/`copy`/`stop` glyphs to `icon-paths.ts`; make stop an explicit labeled action.

**P2-2. Localization & copy polish.**
`StationCard.tsx:36` renders the raw genre slug ("tamil · 128k") where `StationRow` uses localized `gn()`; no plural rule → "1 stations" on 4 single-station genres; `--font-display` has no Noto Tamil/Devanagari fallback so ta/hi headings render in a system face; "LIVE · {count}" inside the single-station sheet shows the *app-wide* count (`NowPlayingSheet.tsx:264`).

**P2-3. Contrast & type-scale fixes (detector-verified).**
Hero 11px text at 4.3:1 on the gradient (`page.tsx:69`); genre tile pairs below AA — tamil `#C2410C/#FFE9D6` 4.4:1, muted chip `#5f7268/#e7eae8` 4.2:1 (`lib/genre-style.ts`); 10px "From Elanjai FM" sponsored badge (`AdSlotClient.tsx:133,165`, `SponsoredStationRow.tsx:69`); station about text runs ~101 chars/line (`station/[slug]/page.tsx:296` → cap at `max-w-prose`); mobile h1 wraps unbalanced (`page.tsx:63` → `text-balance`).

### P3 — nice to fix

- `SponsoredStationRow.tsx:64` logs a `clk` beacon on *any* row interaction — inflates ad CTR.
- Volume slider: no `aria-valuetext`; `audio.volume` is a no-op on iOS but the slider still shows.
- Consent "Manage" pre-checks analytics — mild dark-pattern adjacency.
- `LocaleSwitcher` hidden below 420px — smallest phones rely on Settings.
- `/recent` has no mobile entry point except the footer.
- Alarm (`AlarmCircle`) only exists while that station is playing — can't arm without playing first.
- No `:focus-visible` styles anywhere — keyboard focus relies on browser defaults.
- `ai-color-palette` advisory: Punjabi tile `#EDE9FE/#6D28D9` (`genre-style.ts`) is the only violet accent — one tile off-palette; and 12 of 20 languages have no `GENRE_STYLE` at all, rendering as identical gray tiles.
- `hero.play` ("Listen now") dict key defined but unused.
- `cream-palette` / `overused-font` / `em-dash` advisories — intentional brand choices; note and ignore.

---

## 4. Feature opportunities — make it more attractive to use

Ranked by impact ÷ effort. Each is grounded in what exists today.

| # | Opportunity | Why it wins | Effort | Grounding |
|---|-------------|-------------|--------|-----------|
| 1 | **"Just play something" first-run path** | First 10s currently ask 2 questions before a single note. Let the picker offer a "Play now" that uses `langsFromNavigator` (already exists) to arm the hero flagship — first audio in ≤1 tap. | S | `PrefsProvider.tsx`, `HeroPlay.tsx` |
| 2 | **Native-script station identity** | Fill `name_native` (top ~150 stations) + index it in search + native glyphs (த, हिं) on genre tiles. The single biggest "made for me" change for the stated audience. | M | `types.ts:19`, `station/[slug]/page.tsx:186`, `genre-style.ts` |
| 3 | **"Try a similar station" on stream death** | Dead streams now dead-end at "tap play to retry". Offer next-best same-genre stations — turns the worst valley into a discovery beat. | S | `NowPlayingSheet.tsx:296-314`, `AudioProvider` queue logic |
| 4 | **Sleep/alarm discoverability** | Two of the most delightful features hide behind a moon and a clock glyph among 7 unlabeled icons. Label the primary action, add a one-time coach mark after first play, allow arming an alarm from the station page (not only mid-playback). | S | `NowPlayingSheet.tsx:356-402`, `AlarmCircle.tsx` |
| 5 | **"Your week in radio" card** | `StatsView` already computes listening stats locally — surface a home-page recap ("14h this week, mostly Suryan FM"). Retention hook at zero privacy cost. | M | `StatsView.tsx`, `lib/stats.ts` |
| 6 | **"Shuffle India" serendipity lever** | A dice/shuffle button (genre-aware) fits radio's lean-back nature — one button, needs only `play()` + the catalog. | S | `AudioProvider.play`, `lib/data.ts` |
| 7 | **Mini-player gestures** | Swipe-up to expand, swipe left/right for next/prev — expected on a bottom-docked player. | M | `PlayerChrome.tsx` |
| 8 | **Richer Now Playing** | ICY title already polls — extend to "earlier: …" history, "find this song" link, and surface `ScheduleCard` ("on now") inside the sheet instead of only on station pages. | M | `api/now-playing`, `ScheduleCard.tsx`, `NowPlayingSheet.tsx` |
| 9 | **Offline favorites dial** | SW caches only the offline shell; favorites metadata lives in localStorage. Render "can't stream, but here's your dial" (cached logos/names) on `/offline` instead of a dead end. | S | `offline/page.tsx`, `sw.js` |
| 10 | **Promote the caregiver link** | `/simple?favs=` is a gem buried in Settings — surface on the favorites page and first run ("Setting up for a parent?"). | S | `SettingsButton.tsx:163-175`, favorites page |
| 11 | **Consolidate discovery surfaces** | near-me geo, cities, networks, collections, diaspora, listener counts are all built but reachable only via footer. An "Explore" rail/section could consolidate them. | M | `city/`, `network/`, `near-me/route.ts`, `listen/` |
| 12 | **Recents on mobile nav** | Recents are primary-form-factor users' fastest path back — a Home rail or a 5th slot. | S | `recent/page.tsx`, `TabBar.tsx` |

---

## 5. Persona view

- **Jordan (first-timer):** hero FAB is clear, but every station card *navigates* instead of playing — play affordance is only the small corner badge. First run buries him under two stacked modals; the 7-icon row is undecodable iconography.
- **Casey (distracted mobile):** dead `.hit` leaves ~20px chips; genre page needs scrolling past ~33 chips; `autoFocus` pops the keyboard unasked on `/search`. Strong counterweights: 44px targets on main controls, MB estimates, buffer cap.
- **Sam (screen reader / keyboard / low vision):** no skip link, sheets don't trap or return focus, letter shortcuts can hijack navigation, active genre chip is a non-focusable `<span>` with no `aria-current`. Counterweights: `aria-live` result counts, `aria-pressed` everywhere, text-size zoom.
- **Priya (Tamil, 40–60, low-end Android, limited English):** voice search returns nothing for Tamil dictation (P0-1); no station has a Tamil name; favorites/recent/share empty states are English; `/simple` was built for her but is only findable via Settings. The ta dictionary is deep and real — the chrome is localized, the product isn't yet.

---

## 6. Suggested phasing

**Phase 0 — this week's quick wins (mostly <30 min each):**
define `.hit`, gate consent behind the language picker, wire existing dict keys (`favorites.*`, `recent.*`, `share.*`), add `.hit`→44px chips, `text-balance` the h1, cap about text at `max-w-prose`, fix "1 stations" plurals, localized genre on `StationCard`, `volOff`/`copy`/`stop` glyphs.

**Phase 1 — core-audience fixes:**
native-script search (index `nameNative`/`aliases`, script-aware `norm`), populate `name_native` top ~150, focus management in sheets, skip link, contrast pairs in `genre-style.ts`, "try a similar station", sleep/alarm labeling + arm-from-station-page, "just play" first-run.

**Phase 2 — engagement & delight:**
"Your week" recap card, Shuffle, player gestures, now-playing history/schedule in sheet, offline favorites dial, Explore consolidation, recents entry point, promote caregiver link.

---

## 7. Design-specificity verdict

Genuinely authored, not category-interchangeable: dark-forest + warm-yellow-on-cream, pastel-per-language tiles, floating pill tab bar + docked player, ICY now-playing idiom, WhatsApp-first sharing, Tamil-first ordering, `/simple` senior mode, MB/hour data-saver honesty, the "fires only while open" alarm note. **The gap:** the authored layer covers 8 of 20 languages (the rest are gray tiles) and every station name is Roman transliteration only — the product's identity stops exactly where its core audience's identity begins.

**Open questions for the product:**
1. If Priya can't search in Tamil, can't read station names in Tamil, and hits English on Favorites — is the app localized, or only its chrome?
2. Is this a radio player or a directory? Every card navigates before it plays — "browse" is the primary verb today. Is that the right bet when the magic is the audio?
3. The first 10 seconds ask two questions before playing a note. What would retention look like if the first tap played a station and the questions waited?
4. Seven unlabeled icons and a hidden senior mode vs. "one tap" as the brand promise — does the Now Playing sheet serve listeners, or the feature checklist?

---

## 8. Implementation status (post-review pass)

**Phase 0 — shipped**
- `.hit` class defined (44px min-height) and applied to genre/category chips; dead-class uses on station page + `ReportButton` now resolve.
- Consent banner gated while the language picker is open (`ConsentBanner` checks `langPickerOpen`); picker moved inside `AudioProvider`.
- `favorites.*`, `recent.*`, `share.*` dictionary keys wired into `ClientStationList` / `ShareFavorites`; `StationCard` gained a `genreLabel` prop, passed localized names from all server call sites incl. `FavoritesRail`.
- `text-balance` hero h1, prose-width cap on long copy, hero subline contrast raised, `lang="en"` on generated English FAQ.
- Plurals: `fmtCount(one, many, count)` helper + `*One` dictionary variants in en/ta/hi; applied to station counts, live counts, shared/import counts, genre counts, network/collection counts.
- Real glyphs: `stop`, `volOff`, `copy`, `shuffle` added to the icon set; "x-as-stop" and "plus-as-copy" replaced.
- Destructive actions: `recent.clearConfirm` and `stats.resetConfirm` confirm strings added and wired.

**Phase 1 — shipped**
- Native-script search: `searchLocal` detects non-ASCII queries and matches a native haystack (`name_native` + aliases + `NATIVE_NAMES` for genre/languages). Regression tests in `search.test.ts` (8/8 pass).
- `name_native` populated for 20 flagship Tamil/Hindi stations in `data/stations.json` (top stations per language).
- Focus management: shared `useFocusTrap` hook applied to NowPlayingSheet, LanguagePickerSheet, Settings sheet; keyboard letter-shortcuts gated while any `[role="dialog"]` is open; `aria-current` on the active genre chip.
- Contrast: `--muted` darkened (4.5+ on cream), tamil/kannada genre-tile foregrounds deepened, ad/sponsored badges raised to 11px.
- Error recovery: "try a similar station" card in the Now Playing sheet on stream error (uses the queue's next station).
- Recognition: secondary action row now carries visible micro-labels (Favorite/Sleep/Alarm/Cast/WhatsApp/Share/Mute); volume slider announces `aria-valuetext` percent.
- "Just play" first run: `prefs.playNow` row in the language picker plays a flagship of the picked language immediately.
- Bonus: "Find this song" (YouTube lookup) under the ICY track line.

**Phase 2 — shipped**
- Shuffle: hero row gains a language-aware shuffle button (`action.shuffle`, picks from chosen languages' pools).
- RecentsRail on home (mirrors FavoritesRail) → recents get a one-tap re-entry.
- `WeekCard` "Your week in radio" recap on home (local stats, top station; renders after ≥10 min/7 days).
- Player gestures: horizontal swipe = prev/next station, swipe up = open Now Playing sheet.
- Offline dial: `OfflineFavorites` renders saved station tiles on `/offline` from local snapshots.
- Caregiver promo: `/simple` promo card on the Favorites page.
- Explore consolidation: city / genres / network / diaspora chip row under the language rail.

**Deferred**
- Full `name_native` coverage beyond flagships (~150-station goal needs a curated data pass, not guessed spellings).
- Now-playing track *history* ("Earlier · {track}") — dictionary keys exist; needs a previous-title ref in `AudioProvider`.
- Localizing the content-heavy pages (FAQ/ad-free/add-station English walls) — needs translated copy, not code.
- Genre styles for the other ~12 language slugs.

**Verification:** `tsc --noEmit` clean · `eslint` clean · `vitest` 45/45 + 8 search tests · dev server 200 on /en, /favorites, /offline, /genre/tamil, /search, /recent, /city.
