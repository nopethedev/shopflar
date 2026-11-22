# syntax=docker/dockerfile:1.7
# Production image for running Shopflar on a Node host.
# All mutable state lives in /data: uploads, demo timer and (for SQLite) the
# database. Set DATABASE_URL=postgresql://… to use PostgreSQL instead — see
# docker-compose.yml.

FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Build with Node so the next/prisma binaries run on their declared runtime.
FROM node:22-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates openssl \
 && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 \
    DATABASE_URL=file:/tmp/build.db
# A throwaway schema keeps build-time data access (sitemap, static analysis)
# from failing when no runtime database exists yet.
RUN ./node_modules/.bin/prisma generate \
 && ./node_modules/.bin/prisma db push --skip-generate \
 && ./node_modules/.bin/next build

# Runtime dependencies only. Prisma stays installed because the entrypoint
# applies the schema on first boot (`prisma db push`).
FROM node:22-bookworm-slim AS prod-deps
WORKDIR /app
COPY --from=oven/bun:1 /usr/local/bin/bun /usr/local/bin/bun
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates openssl \
 && rm -rf /var/lib/apt/lists/*
COPY package.json bun.lock ./
COPY prisma ./prisma
RUN bun install --frozen-lockfile --production
RUN ./node_modules/.bin/prisma generate

FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOST=0.0.0.0 \
    DATABASE_URL=file:/data/shopflar.db

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates openssl gosu \
 && rm -rf /var/lib/apt/lists/* \
 && mkdir -p /data/uploads \
 && chown -R node:node /data

COPY --from=prod-deps --chown=node:node /app/node_modules ./node_modules
# next.config.ts is TypeScript, so keep the compiler available at runtime.
COPY --from=builder --chown=node:node /app/node_modules/typescript ./node_modules/typescript
COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/next.config.ts ./next.config.ts
COPY --chown=node:node scripts/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
COPY --chown=node:node scripts/ensure-db-provider.mjs ./scripts/ensure-db-provider.mjs

# Uploads and demo state are written through these symlinks into the volume.
RUN chmod +x /usr/local/bin/docker-entrypoint.sh \
 && rm -rf /app/public/uploads /app/db \
 && ln -s /data/uploads /app/public/uploads \
 && ln -s /data /app/db

EXPOSE 3000
VOLUME ["/data"]

ENTRYPOINT ["docker-entrypoint.sh"]
