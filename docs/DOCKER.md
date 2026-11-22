# Docker, PostgreSQL & CI

## Run with PostgreSQL (recommended)

```bash
cp .env.docker.example .env.docker
# fill in: NEXTAUTH_SECRET (openssl rand -hex 32), POSTGRES_PASSWORD (openssl rand -hex 24) and the public URLs
docker compose --env-file .env.docker up -d
docker compose --env-file .env.docker logs -f shopflar
```

`docker-compose.yml` starts **PostgreSQL 16** (with a health check and a `postgres-data` volume) and the Shopflar
image, which waits for the database, applies the schema (`prisma db push`) and starts on `:3000`. Uploads live in the
`shopflar-data` volume. The database port is not published to the host by default.

Open `http://localhost:3000/install` to create your admin account (or set `DEMO_MODE=true` for a resettable demo).

### Single container with SQLite

```bash
docker compose -f docker-compose.sqlite.yml --env-file .env.docker up -d
```

### How one image supports both databases

Prisma bakes the provider into its generated client. On boot, `scripts/ensure-db-provider.mjs` looks at
`DATABASE_URL`: `postgresql://…` switches `prisma/schema.prisma` to PostgreSQL and regenerates the client (offline,
a couple of seconds, only when the provider changed); `file:…` keeps SQLite. No second image is needed.

### Backups

```bash
docker compose exec -T postgres pg_dump -U shopflar shopflar | gzip > shopflar-$(date +%F).sql.gz
docker compose cp shopflar:/data/uploads ./uploads-backup
```

### Upgrading

```bash
docker compose --env-file .env.docker pull && docker compose --env-file .env.docker up -d
```

## GitHub Actions

- **`.github/workflows/docker-publish.yml`** — on every PR and push: builds the image, boots the full Postgres stack
  with `docker compose`, waits for a healthy app and smoke-tests it. On `main` and `v*` tags it then publishes
  `ghcr.io/<owner>/shopflar` (`latest`, branch, semver and `sha-` tags). No secrets needed — it uses `GITHUB_TOKEN`.
- **`.github/workflows/ci.yml`** — `next build` on SQLite and a `prisma validate` against the PostgreSQL schema.

To pull a published image instead of building: set `SHOPFLAR_IMAGE=ghcr.io/<owner>/shopflar:latest` (the default).
Make the package public under *Packages → shopflar → Package settings* if you want anonymous pulls.
