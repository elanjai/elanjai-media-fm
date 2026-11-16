# Deployment — Docker on Railway

The app ships as a Docker container built from the multi-stage [`Dockerfile`](Dockerfile)
(Next.js `output: "standalone"` → minimal `server.js` runtime, non-root user,
BuildKit npm/Next caches). Railway builds the image from the connected GitHub
repo — every deploy is an exact commit.

## Architecture

```
GitHub repo ──commit──▶ Railway build (Dockerfile) ──▶ deploy + healthcheck /api/health
     │
     └─ Release workflow  : version bump → tag v*.*.* → GitHub Release
        Deploy workflow   : tag/branch/sha → commit → serviceInstanceDeployV2
        Rollback workflow : previous deployment or tagged release
```

`railway.json` codifies the service settings (DOCKERFILE builder, dockerfile
path, `/api/health` healthcheck, restart policy) so a fresh service is
configured by the repo itself.

## One-time setup

### 1. Create the Railway service

1. [railway.com](https://railway.com) → **New Project** → **Deploy from GitHub repo**.
   Install/authorize the Railway GitHub App if prompted (it needs read access
   to this repo).
2. Pick this repository and the production branch (e.g. `main`). Railway
   creates a **service** inside a **project**, inside an **environment**
   (default `production`).
3. `railway.json` at the repo root is applied automatically. Verify under
   service **Settings → Build**:
   - Builder: `Dockerfile`
   - Dockerfile Path: `Dockerfile`  ← the field in the settings UI
   - Healthcheck path (Settings → Deploy): `/api/health`
4. **Public domain** — service → **Networking → Public Networking** →
   **Generate Domain** (or attach a custom domain). You'll get something like
   `https://elanjai-media-fm-production.up.railway.app`. Copy it — it becomes
   `APP_URL` below.
5. **Service variables** (service → **Variables**):
   - `NEXT_PUBLIC_SITE_URL` — your public origin, e.g.
     `https://fm.example.com`. It's inlined into the build for canonical
     URLs, sitemap and JSON-LD. Railway forwards service variables as Docker
     build args; the Dockerfile's `ARG` line picks it up. (If unset, the app
     falls back to a placeholder origin — set it before the first real release.)
   - `STREAM_URL_SECRET` — any long random string. It signs the HLS URLs the
     `/api/stream` proxy emits; when unset a random per-process secret is used,
     so signed URLs break on every restart/redeploy. Set it once — it's a
     runtime variable, no build arg needed.
   - `ADMIN_ADS_KEY` — any long random string. It gates the admin pages
     (`/admin/ads?key=<token>`, `/admin/claims?key=<token>`) and the CSV
     export at `/api/ads/report.csv?key=<token>`. When unset all of them
     return 404, which is the desired state until you want the reports.
     Runtime variable.
   - `NEXT_PUBLIC_ADSENSE_CLIENT` / `NEXT_PUBLIC_ADSENSE_SLOT` — the
     `ca-pub-…` client id and one manual ad-unit id once the site is
     AdSense-approved. Until both are set, ad slots serve only our own
     campaigns and `/ads.txt` returns 404. Both are `NEXT_PUBLIC_` build
     args — the CSP ad allowlist is compiled in at build time, so set them
     before the release that turns ads on (changing them later needs a
     rebuild). Ads default to non-personalized unless the listener opted
     into ad personalization in the consent banner; a Google-certified
     TCF CMP is still required for EEA/UK/CH personalization — do not
     remove that gating until a real CMP is in place.
   - `NEXT_PUBLIC_PREROLL_ENABLED` — set to `1` to arm the audio pre-roll
     pilot (F-4.5). Even armed, a clip only plays when an
     `audio_preroll` campaign is `active` in `data/campaigns.json` —
     the pilot ships dark with both gates off by default. Build arg.
   - `NEXT_PUBLIC_ADFREE_URL` / `NEXT_PUBLIC_ADFREE_CODE` — the
     supporter plan (F-4.7). The URL is the payment link shown on
     `/ad-free` (Razorpay page, UPI intent, …). The CODE is the
     activation code sent to supporters after payment; when unset,
     `/ad-free` runs in honor mode. Build args.
   - Do **not** set `PORT`/`HOSTNAME` — Railway injects `PORT` at runtime and
     `server.js` binds `0.0.0.0:$PORT` automatically.

### 2. Collect the three Railway IDs

Open your project in the Railway dashboard and look at the URL:

```
railway.com/project/<PROJECT_ID>/service/<SERVICE_ID>?environmentId=<ENVIRONMENT_ID>
```

- `RAILWAY_PROJECT_ID` — also in Project → **Settings → General**
- `RAILWAY_SERVICE_ID` — also in Service → **Settings → General**
- `RAILWAY_ENVIRONMENT_ID` — also under the environment menu (⋯ next to the
  environment name → copy ID)

### 3. Create the Railway API token

Two token types work — the scripts auto-detect which one you provide.
Use **one** of them (a project token is the narrowest scope; a workspace
token covers the whole workspace):

- **Project token** — Railway *project* → **Settings → Tokens → New Token**.
  Scoped to one environment in one project; sent via `Project-Access-Token`
  header. Store as secret **`RAILWAY_PROJECT_TOKEN`**.
- **Workspace or account token** — railway.com → avatar →
  **Account Settings → Tokens → New Token** → pick the workspace (or
  "No workspace" for an account token). Sent via `Authorization: Bearer`.
  Store as secret **`RAILWAY_API_TOKEN`**.

If both secrets exist, `RAILWAY_PROJECT_TOKEN` wins. Copy the token — it's
shown once.

### 4. Configure GitHub secrets & variables

Repo → **Settings → Secrets and variables → Actions**.

**Secrets** (Secrets tab → *New repository secret*):

| Name                    | Value |
|-------------------------|-------|
| `RAILWAY_API_TOKEN`     | a workspace/account token from step 3 **or** |
| `RAILWAY_PROJECT_TOKEN` | a project token from step 3 (either one is enough) |
| `RELEASE_TOKEN`         | *(optional)* a PAT with `contents: write` — only needed if `main` has branch protection that blocks pushes from `github-actions[bot]`. Without it, the Release workflow's version-bump push fails. |

**Variables** (Variables tab → *New repository variable*):

| Name                     | Value |
|--------------------------|-------|
| `RAILWAY_PROJECT_ID`     | from step 2 |
| `RAILWAY_SERVICE_ID`     | from step 2 |
| `RAILWAY_ENVIRONMENT_ID` | from step 2 |
| `APP_URL`                | public https URL from step 1.4, e.g. `https://elanjai-fm.up.railway.app` — used for post-deploy health verification (include the `https://` scheme) |

IDs and `APP_URL` are variables (not secrets) — they're identifiers, not
credentials, and keeping them as variables makes them visible when debugging.

### 5. Choose your deploy trigger model

The workflows are fully on-demand — nothing deploys on push by itself.
Decide what a push to `main` should do:

- **Recommended: disable auto-deploy.** Service → **Settings → Source /
  Deploy Triggers** → turn off automatic deploys for the connected branch.
  Every deploy then goes through the Release/Deploy workflows, which keeps
  the version tag ⇄ deployed commit mapping clean.
- *Or* leave it on if you want pushes to deploy immediately too — the
  workflows still work for releases/rollbacks on top of that.

## Versioning model

- **`package.json` version is the source of truth.** The Release workflow is
  the *only* way versions are minted — no manual `npm version` + push.
- Every release = semver git tag `vX.Y.Z` + GitHub Release with generated notes.
- `/api/health` reports `version` + `commit`, so the live app always
  advertises exactly what's running.

## Running the workflows

All three are manual-only (`workflow_dispatch`) — nothing deploys on push.

### Release — *"ship a new version"*

Actions → **Release** → Run workflow:

- `bump`: `patch` / `minor` / `major` / `pre*` variants
- `deploy`: keep checked to deploy the new tag right after releasing

It lints + typechecks + builds, bumps `package.json`, pushes the tag,
creates the GitHub Release, then chains into **Deploy** with the new tag.

### Deploy — *"put a specific commit/ref live"*

Actions → **Deploy** → Run workflow:

- `ref`: `v1.2.0` (a release tag), `main`, or a full SHA.
  Leave empty to deploy the latest release tag.

The workflow resolves the ref → commit SHA, calls Railway
`serviceInstanceDeployV2` (Railway builds the Dockerfile at that commit),
polls the deployment until `SUCCESS`, then verifies `/api/health` reports
the right version/commit.

### Rollback — *"go back"*

Actions → **Rollback** → Run workflow, type `rollback` to confirm:

- `to` **empty** → rolls back to the previous successful deployment
  (`deploymentRollback` — instant, no rebuild).
- `to` = `v1.1.0` → redeploys that tag's commit as a new deployment.
  Use this when the previous deployment isn't rollback-eligible or you need
  to jump back several versions.

## Local Docker check

```bash
docker build -t elanjai-media-fm .
docker run --rm -p 3000:3000 elanjai-media-fm
# → http://localhost:3000 , http://localhost:3000/api/health
```

## Google Play via TWA (F-3.3)

The PWA (F-3.2) is Play-Store-ready through a Trusted Web Activity —
Bubblewrap wraps the existing site; no separate codebase.

1. `npm i -g @bubblewrap/cli` → `bubblewrap init --manifest https://<domain>/manifest.webmanifest`
2. Choose a package name (e.g. `media.elanjai.fm`), generate the signing
   key (`keytool -genkey`), and let Bubblewrap print its SHA-256 cert
   fingerprint.
3. Set service variables in Railway:
   - `TWA_PACKAGE_NAME` — e.g. `media.elanjai.fm`
   - `TWA_SHA256_FINGERPRINT` — the fingerprint Bubblewrap prints
   `/.well-known/assetlinks.json` then serves the delegation statement and
   Android verifies the app↔site link (no URL bar in the TWA).
4. `bubblewrap build` → upload the AAB to Play Console.

Policy notes: Play requires a privacy-policy URL (`/en/privacy` works);
check current Play policy on web ads inside a TWA before enabling display
ads there — a "house ads only" Play build is the safe default.

## Phase 5 platform gates — what's deferred and why

Phase 5 shipped everything the browser/local-first architecture can
honestly deliver. Two roadmap items need infrastructure this codebase
deliberately doesn't have yet, so they're documented here rather than
faked.

### F-5.1 — Optional accounts (deferred)

Real sync needs all of: an identity provider (phone OTP — Firebase
Auth / Supabase Auth / MSG91 OTP — or Google OAuth), a persistent user
store, a session model, and DPDP-compliant consent, export, and
deletion flows. Shipping "accounts" without those would be theatre.

Until then the local-first model covers the same need:

- favorites/recents/stats live in `localStorage` (`emfm:favorites`,
  `emfm:recents`, `emfm:snaps`, `emfm:stats`);
- cross-device transfer works today without an account: Settings →
  share favorites produces a `/f?s=slug1,slug2` link + QR (F-5.2).

When accounts arrive, the migration path is: keep localStorage as the
source of truth, upload the local snapshots on first sign-in, and merge
server-side by `last`-modified. The `/f?s=` format stays as a no-account
fallback forever.

### F-5.6 — Smart speakers and Android Auto (deferred)

Both require native shells — a browser tab can't register an Android
Auto `MediaBrowserService` or an Alexa skill:

- **Android Auto** — the TWA shell (above) is the prerequisite; Auto
  integration then needs a native `MediaBrowserServiceCompat`/`Media3`
  layer, which is a real Android app, not a PWA feature.
- **Alexa / Google Home** — custom skills/actions need a separate
  backend endpoint + certification; nothing in this repo can claim it.
- What *does* work today: Media Session metadata (Assistant can show
  what's playing from the browser), Chromecast via the Cast button,
  and the TWA once published.

### Partial items shipped in Phase 5

- **F-5.3** — the claim-intake half is live (`/claim` → in-memory inbox
  at `/admin/claims`, gated by `ADMIN_CLAIMS_KEY`). The portal half
  (station self-service editing, logo upload, stats dashboard) rides on
  the same F-5.1/F-7 backend work — auth + persistent storage.
- **F-5.5** — the open-app alarm shipped (Now Playing sheet → clock
  button). Reliable background wake alarms are a TWA/native feature —
  the web version says so in the UI.

## Build memory notes

Railway builds the image on its own builders; `next build` is memory-hungry,
and silent build deaths (log just stops) are almost always OOM kills. The
mitigations in place:

- **`NEXT_BUILD_SKIP_CHECKS=true`** (Dockerfile builder stage) →
  `typescript.ignoreBuildErrors` — skips the in-build `tsc` pass, the
  heaviest step. Type safety is still enforced: the Release workflow runs
  `npm run lint` + `npm run typecheck` + `npm run build` before any tag is
  pushed, so Railway only ever rebuilds already-verified commits.
- The same flag also sets `experimental.cpus: 4` — Next defaults to one
  worker per CPU core, and each worker loads the app + the full station
  catalog. Bounding worker count caps peak memory on builders with many
  cores but modest RAM.
- **No `.next/cache` BuildKit mount** — a stale/corrupt Turbopack cache
  persists across rebuilds and can crash the compiler silently. (The npm
  cache mount stays; it only holds package tarballs.)

If a build *still* dies during compile, try the image on a bigger builder
(Railway plan) or test `docker build` locally to compare environments.

## Troubleshooting

- **"Failed to build an image" with logs that just stop** — almost always an
  OOM kill, not a real error. The banner is generic; open the deployment →
  **Build logs** tab (or `railway logs --build`) for the real output. The
  memory notes above address this.
- **`Railway API error: Not Authorized`** — the token can't act on this
  service. Usually it's a project token stored in `RAILWAY_API_TOKEN`
  (project tokens need the `Project-Access-Token` header — store it as
  `RAILWAY_PROJECT_TOKEN` instead), or a workspace/account token for the
  wrong workspace. The deploy script's preflight check prints which env var
  to use for each token type.
- **`Failed to collect page data` / `Invalid URL` during build** —
  `NEXT_PUBLIC_SITE_URL` was set to an empty value somewhere (service var or
  build arg); `new URL("")` in the root layout throws. `site.ts` treats empty
  as unset, and the Dockerfile `ARG` carries a default — set a real
  `https://…` value in Railway for correct SEO, but builds no longer break
  when it's missing.
- **"No ref given and no v\* release tags exist"** — run Release first.
- **Deploy waits then fails** — check that deployment's build logs in Railway.
- **Rollback target not eligible** — pass a tag instead; redeploying a commit
  always works.
- **Health verify warns on commit** — Railway didn't inject
  `RAILWAY_GIT_COMMIT_SHA` for that build type; version check still applies.
- **Release push rejected** — `main` is protected; add `RELEASE_TOKEN` (PAT).
