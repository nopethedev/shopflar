#!/bin/bash
# Simulated update test: verify the updater keeps the user's DB provider
set -e
T=/tmp/updatertest
rm -rf "$T"
mkdir -p "$T/install/scripts" "$T/install/prisma" "$T/install/src/lib" "$T/build/prisma" "$T/build/src/lib"

# --- fake user install: mysql provider, custom start port ---
cat > "$T/install/package.json" <<'EOF'
{
  "name": "my-shopflar",
  "version": "1.1.0",
  "scripts": {
    "dev": "next dev -p 4321",
    "start": "next start -p 4321",
    "db:push": "echo '[fake db:push] provider is:' && grep -o 'provider = \"[a-z]*\"' prisma/schema.prisma",
    "build": "echo fake-build"
  }
}
EOF
cat > "$T/install/prisma/schema.prisma" <<'EOF'
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model StoreSetting {
  id String @id @default(cuid())
  key String @unique
  value String
}
EOF
cp /home/z/my-project/scripts/updater.mjs "$T/install/scripts/"

# --- fake update package (ships sqlite schema, v1.2.0, new file) ---
cat > "$T/build/package.json" <<'EOF'
{
  "name": "shopflar",
  "version": "1.2.0",
  "scripts": { "start": "next start", "db:push": "prisma db push" }
}
EOF
cat > "$T/build/prisma/schema.prisma" <<'EOF'
generator client {
  provider = "prisma-client-js"
}

datasource db {
  // Switch to "postgresql" when deploying to Supabase
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model StoreSetting {
  id String @id @default(cuid())
  key String @unique
  value String
}

model AuditLog {
  id String @id @default(cuid())
  action String
}
EOF
echo "new code" > "$T/build/src/lib/feature.ts"
cd "$T/build" && zip -qr "$T/update.zip" . && cd /

# --- run updater against the fake install ---
cd "$T/install"
node scripts/updater.mjs "$T/update.zip" --no-restart --skip-backfill --no-merge-deps 2>&1 | tail -20

echo "================= FINAL SCHEMA ================="
cat "$T/install/prisma/schema.prisma"
echo "================= FINAL package.json ================="
cat "$T/install/package.json"
