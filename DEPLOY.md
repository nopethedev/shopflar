# Deploy Shopflar on a Node host

This is the supported production path: the Next.js server runs in a Docker
container next to **PostgreSQL**, with one persistent volume for uploads
(`/data`). A single-container **SQLite** variant is also available.

| Where | Contents |
| --- | --- |
| `postgres-data` volume | PostgreSQL database (default stack) |
| `/data/uploads/` (`shopflar-data` volume) | Admin uploads (images/files) |
| `/data/shopflar.db` | SQLite database — only with `docker-compose.sqlite.yml` |
| `/data/demo-state.json` | Demo inactivity timer |

The container maps `/app/public/uploads` onto `/data/uploads`, so no extra paths
need configuring.

## Quick start with Docker Compose (PostgreSQL)

```bash
cp .env.docker.example .env.docker
# edit .env.docker: NEXTAUTH_SECRET, POSTGRES_PASSWORD + the three public URLs
openssl rand -hex 32          # NEXTAUTH_SECRET
openssl rand -hex 24          # POSTGRES_PASSWORD (hex = no URL-encoding needed)

docker compose --env-file .env.docker up -d
docker compose --env-file .env.docker logs -f shopflar
```

Open `http://localhost:3000/install` to create the admin account. The database
and uploads survive `docker compose down`; use `down -v` only when you want to
wipe them. Prefer one container and no database server?

```bash
docker compose -f docker-compose.sqlite.yml --env-file .env.docker up -d
```

The image applies the Prisma schema on every boot (`RUN_DB_PUSH=true`) and
retries until the database accepts connections. Set it to `false` after the
first deploy if you prefer to manage migrations yourself. More (backups,
upgrades, CI): [docs/DOCKER.md](docs/DOCKER.md).

## Required environment variables

| Variable | Purpose |
| --- | --- |
| `NEXTAUTH_SECRET` | Session signing secret. Required; generate with `openssl rand -hex 32`. Changing it signs everyone out. |
| `NEXTAUTH_URL` | Public HTTPS URL, e.g. `https://demo.example.com`. |
| `APP_URL` | Same public URL; used for absolute links and emails. |
| `NEXT_PUBLIC_APP_URL` | Same public URL; read at runtime, so no rebuild is needed. |
| `POSTGRES_PASSWORD` | Password for the bundled PostgreSQL (`docker-compose.yml`). Required. |
| `DATABASE_URL` | Built for you by `docker-compose.yml`. For SQLite use `file:/data/shopflar.db` (inside `/data`); an external Postgres works too: `postgresql://user:pass@host:5432/db`. |
| `DEMO_MODE` | `true` for the resettable demo, `false` for a normal store. |
| `DEMO_RESET_MINUTES` | Inactivity window before the demo wipes and reseeds (default `30`). |
| `AI_API_KEY` | Optional Sidekick key; stays server-side. |
| `AI_BASE_URL`, `AI_MODEL` | Optional OpenAI-compatible endpoint/model. |

Optional: `DEMO_ADMIN_EMAIL`, `DEMO_ADMIN_PASSWORD`, Stripe (`STRIPE_*`),
SMTP (`SMTP_*`), `SESSION_COOKIE_SAMESITE=none` (only for cross-site iframes
over HTTPS).

Put secrets in the host's secret manager or an untracked `.env.docker`; never
commit them.

## Run the published GHCR image

Every push to `main` builds a `linux/amd64` image with
`.github/workflows/docker-publish.yml` (after smoke-testing the PostgreSQL stack):

```bash
docker pull ghcr.io/nopethedev/shopflar:latest
docker run -d --name shopflar \
  -p 3000:3000 \
  -v shopflar-data:/data \
  --env-file .env.docker \
  ghcr.io/nopethedev/shopflar:latest
```

Tags: `latest`, `main`, `sha-<commit>`, and `v*` for version tags. The first
push creates a **private** GHCR package; make it public under the package's
settings if you want to pull without `docker login ghcr.io`.

## Render (persistent disk)

`render.yaml` is a blueprint for a Docker web service with a 10 GB disk at
`/data`. Create a Blueprint from the repo, then set the three public URLs to
`https://<service>.onrender.com` (or your domain). `NEXTAUTH_SECRET` is
generated automatically. Disks require a paid instance type.

Other Node hosts work the same way: deploy the Dockerfile, mount a persistent
volume at `/data`, and set the env vars above. On Railway/Fly/VPS map the
volume to `/data` — not to `public/uploads`.

## Reverse proxy and HTTPS

Terminate TLS in front of the container (Caddy, Nginx, or the platform's
proxy) and point it at port `3000`. Keep `NEXTAUTH_URL`, `APP_URL`, and
`NEXT_PUBLIC_APP_URL` on the same external HTTPS origin, or auth callbacks and
absolute upload URLs will point at the wrong host.

## Backups

Back up the whole volume, or at minimum `/data/shopflar.db` and
`/data/uploads`. SQLite is safest copied while the container is stopped, or
with `sqlite3 /data/shopflar.db ".backup /data/backup.db"`.

## Verify a deployment

```bash
curl -I https://demo.example.com/login          # 200
docker compose --env-file .env.docker ps        # healthy
docker compose --env-file .env.docker logs shopflar | tail -20
```

Sign in with the demo account, edit a product, and confirm it is still there
after `docker compose restart`. If uploads 404, check that `/data/uploads`
exists and the container is mounting the volume at `/data`.
