#!/bin/sh
# Prepares the persistent volume, applies the database schema, then starts Next.
set -eu

DATA_DIR=/data
APP_DIR=/app

mkdir -p "$DATA_DIR/uploads"

# Named volumes inherit ownership from the image, but bind mounts and some
# host disks arrive as root. Fix ownership once per boot before dropping user.
if [ "$(id -u)" = "0" ]; then
  chown -R node:node "$DATA_DIR"
fi

# Keep the app paths pointing into the volume. The image ships these as
# symlinks; only create them when a mount replaced the path entirely, and
# never delete an existing directory (it may be a user's bind mount).
if [ ! -e "$APP_DIR/public/uploads" ] && [ ! -L "$APP_DIR/public/uploads" ]; then
  ln -s "$DATA_DIR/uploads" "$APP_DIR/public/uploads"
fi
if [ ! -e "$APP_DIR/db" ] && [ ! -L "$APP_DIR/db" ]; then
  ln -s "$DATA_DIR" "$APP_DIR/db"
fi

# Absolute path so schema files never end up inside the image layer.
export DATABASE_URL="${DATABASE_URL:-file:$DATA_DIR/shopflar.db}"

as_node() {
  if [ "$(id -u)" = "0" ]; then
    gosu node "$@"
  else
    "$@"
  fi
}

# SQLite (file:) or PostgreSQL (postgresql://). The Prisma client is generated
# for the right provider on first boot of a Postgres deployment.
APP_DIR="$APP_DIR" as_node node "$APP_DIR/scripts/ensure-db-provider.mjs"

# Never print credentials from the connection string
SAFE_URL=$(printf '%s' "$DATABASE_URL" | sed -E 's#(://[^:/@]+):[^@]*@#\1:***@#')

if [ "${RUN_DB_PUSH:-true}" = "true" ]; then
  echo "Applying database schema to $SAFE_URL"
  # The database container may still be starting — retry for up to ~60s
  attempt=1
  until as_node "$APP_DIR/node_modules/.bin/prisma" db push --skip-generate --accept-data-loss; do
    if [ "$attempt" -ge 30 ]; then
      echo "Could not reach the database after $attempt attempts — giving up." >&2
      exit 1
    fi
    attempt=$((attempt + 1))
    echo "Database not ready yet (attempt $attempt/30) — retrying in 2s…"
    sleep 2
  done
fi

if [ "$(id -u)" = "0" ]; then
  exec gosu node "$APP_DIR/node_modules/.bin/next" start -H "${HOST:-0.0.0.0}" -p "${PORT:-3000}"
fi
exec "$APP_DIR/node_modules/.bin/next" start -H "${HOST:-0.0.0.0}" -p "${PORT:-3000}"
