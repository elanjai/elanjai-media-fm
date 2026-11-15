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

### 1. Railway service

1. Railway dashboard → **New Project** → **Deploy from GitHub repo** → pick
   this repo and the production branch (e.g. `main`).
2. `railway.json` is picked up automatically — verify under service **Settings**
   that builder = Dockerfile and Dockerfile Path = `Dockerfile`
   (the field shown when editing the service).
3. Add a public domain (service → **Networking** → generate domain or add a
   custom one). Note the HTTPS URL — you'll use it as `APP_URL`.
4. Service variables:
   - `NEXT_PUBLIC_SITE_URL` — your public origin, e.g.
     `https://fm.example.com` (inlined into the build for canonical URLs,
     sitemap, JSON-LD).
   - `PORT` is injected by Railway automatically — do **not** set it.

### 2. GitHub secrets & variables

Repo → **Settings → Secrets and variables → Actions**.

| Name                       | Type     | Where to find it |
|----------------------------|----------|------------------|
| `RAILWAY_API_TOKEN`        | Secret   | railway.com → account → **Tokens**. A **Workspace token** is best for CI/CD; an Account token also works (project tokens use a different auth header — don't use one here). |
| `RAILWAY_PROJECT_ID`       | Variable | Railway project URL / Settings → General |
| `RAILWAY_SERVICE_ID`       | Variable | Service → Settings → General |
| `RAILWAY_ENVIRONMENT_ID`   | Variable | Environment dropdown → ⋯ → copy ID, or project canvas URL |
| `APP_URL`                  | Variable | Public https URL from step 1.3 — used for post-deploy health verification |
| `RELEASE_TOKEN`            | Secret (optional) | PAT with `contents: write` — only needed if `main` is protected against pushes by `github-actions[bot]` |

IDs are visible in the Railway dashboard URL too:
`railway.com/project/<PROJECT_ID>/service/<SERVICE_ID>?environmentId=<ENVIRONMENT_ID>`.

### 3. Disable auto-deploy (optional but recommended)

Since releases are driven manually via workflows, turn off
service → **Settings → Source → auto-deploy on push** (or leave it on if you
want `main` pushes to deploy too — the workflows are unaffected).

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

It lints + builds, bumps `package.json`, pushes the tag, creates the GitHub
Release, then chains into **Deploy** with the new tag.

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

## Troubleshooting

- **"No ref given and no v\* release tags exist"** — run Release first.
- **Deploy waits then fails** — check build logs in Railway for that
  deployment (`deployments` list → the failed id).
- **Rollback target not eligible** — pass a tag instead; redeploying a commit
  always works.
- **Health verify warns on commit** — Railway didn't inject
  `RAILWAY_GIT_COMMIT_SHA` for that build type; version check still applies.
