#!/bin/bash
# ============================================================
# Updater end-to-end test in /tmp (does NOT touch the main app)
# Simulates a user install:
#   - extracted from a release zip
#   - custom package.json (own start port + own version)
#   - own .env, own database with data
#   - an old-code marker in a source file
# Then runs scripts/updater.mjs with the NEW zip + --rebuild and
# verifies everything the user cares about survived.
# ============================================================
set -u
APP=/tmp/updater-test/shopflar
ZIP=/home/z/my-project/download/shopflar.zip
PASS=0; FAIL=0
ok()  { PASS=$((PASS+1)); echo "  ✔ $1"; }
bad() { FAIL=$((FAIL+1)); echo "  ✘ $1"; }

echo "==> Preparing simulated user install at $APP"
rm -rf /tmp/updater-test && mkdir -p /tmp/updater-test
cd /tmp/updater-test && unzip -q "$ZIP"
cd "$APP"

# 1. User's customized package.json (custom start port + custom version)
node -e "
const fs = require('fs')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
pkg.version = '0.9.0-custom'
pkg.scripts.start = 'next start -H 0.0.0.0 -p 3456'
pkg.scripts['my-custom-command'] = 'echo my-custom-thing'
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
console.log('package.json customization OK')
"
echo "  package.json customized (port 3456, v0.9.0-custom)"

# 2. User's .env with custom secret
cat > .env <<EOF
DATABASE_URL="file:/tmp/updater-test/shopflar/db/custom.db"
NEXTAUTH_SECRET="my-super-secret-123"
APP_URL="http://localhost:3456"
EOF

# 3. Install deps + create DB with data
echo "  bun install…"
bun install > /tmp/updater-install.log 2>&1 || { echo "bun install failed"; tail -5 /tmp/updater-install.log; exit 1; }
bun run db:push > /tmp/updater-dbpush.log 2>&1 || { echo "db push failed"; tail -5 /tmp/updater-dbpush.log; exit 1; }
node -e "
const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient()
db.storeSetting.create({ data: { key: 'user_precious_data', value: 'keep-me' } })
  .then(() => db.\$disconnect())
  .catch(e => { console.error(e.message); process.exit(1) })
"

# 4. Old-code marker in a source file (must be replaced by the update)
echo "// OLD-CODE-MARKER-v0.9" >> src/app/page.tsx
echo "  marker inserted into src/app/page.tsx"

echo "==> Starting OLD server on port 3456 (their custom port)"
PORT=3456 setsid bash -c 'exec bun run dev' > /tmp/updater-old-server.log 2>&1 < /dev/null &
for i in $(seq 1 90); do
  sleep 1
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3456/api --max-time 5 2>/dev/null)
  [ "$code" = "200" ] && break
done
if [ "$code" = "200" ]; then ok "old server running on 3456"; else bad "old server did not start"; exit 1; fi
PIDFILE="$APP/updates/server.pid"
if [ -f "$PIDFILE" ]; then ok "instrumentation wrote updates/server.pid ($(cat $PIDFILE | head -c 60)…)"; else bad "server.pid missing"; fi

echo "==> Running the updater (node scripts/updater.mjs … --rebuild)"
node scripts/updater.mjs "$ZIP" --rebuild
UPDATER_EXIT=$?

echo "==> Assertions"
if [ $UPDATER_EXIT -eq 0 ]; then ok "updater exited 0"; else bad "updater exited $UPDATER_EXIT"; fi

# state.json
node -e "
const fs = require('fs')
const s = JSON.parse(fs.readFileSync('updates/state.json', 'utf8'))
console.log('STATE: status=' + s.status + ' step=' + s.step + ' health=' + JSON.stringify(s.health))
if (s.status !== 'done') process.exit(1)
if (!s.health || s.health.ok !== true) process.exit(2)
if (s.serverRestarted !== true) process.exit(3)
" && ok "state.json: done + server restarted + health ok" || bad "state.json check failed"

# package.json preserved
node -e "
const fs = require('fs')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
let bad = []
if (pkg.version !== '0.9.0-custom') bad.push('version changed to ' + pkg.version)
if (!/3456/.test(pkg.scripts.start)) bad.push('start script lost: ' + pkg.scripts.start)
if (pkg.scripts['my-custom-command'] !== 'echo my-custom-thing') bad.push('custom command lost')
if (bad.length) { console.error(bad.join('; ')); process.exit(1) }
" && ok "package.json: version, custom start port and custom commands preserved" || bad "package.json NOT preserved"

# .env preserved
grep -q "my-super-secret-123" .env && ok ".env preserved" || bad ".env lost"

# DB preserved
node -e "
const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient()
async function main() {
  const r = await db.storeSetting.findUnique({ where: { key: 'user_precious_data' } })
  console.log(r ? 'found' : 'missing')
  await db.\$disconnect()
  process.exit(r ? 0 : 1)
}
main()
" && ok "database data preserved (db:push kept existing rows)" || bad "database data lost"

# source updated (marker gone, new code present)
if grep -q "OLD-CODE-MARKER-v0.9" src/app/page.tsx; then bad "old-code marker still present (files not applied)"; else ok "source files updated (old marker removed)"; fi
grep -q "emailVerified" prisma/schema.prisma && ok "new schema shipped" || bad "schema not updated"

# server answering on THEIR port 3456 (via their own npm run start)
for i in $(seq 1 60); do
  sleep 1
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3456/api --max-time 5 2>/dev/null)
  [ "$code" = "200" ] && break
done
if [ "$code" = "200" ]; then ok "server back up on custom port 3456 (production, via their npm run start)"; else bad "server not answering on 3456 (code $code)"; tail -20 "$APP/updates/"updater-*.log 2>/dev/null | tail -20; fi

# verify it's the NEW code serving (marker string must NOT appear in served HTML)
HTML=$(curl -s http://localhost:3456/ --max-time 30)
if echo "$HTML" | grep -q "OLD-CODE-MARKER"; then bad "serving OLD code"; else ok "serving NEW code"; fi

# verify dice/verification APIs exist on the updated install
R=$(curl -s -X POST http://localhost:3456/api/auth/signup -H 'Content-Type: application/json' -d '{"email":"x"}')
if echo "$R" | grep -qE "Invalid|error|email"; then ok "new API routes live on updated install (signup route responds)"; else bad "signup route missing: $R"; fi

echo ""
echo "================================"
echo "UPDATER E2E: $PASS passed, $FAIL failed"
echo "================================"
pkill -f "next start" 2>/dev/null
exit $([ $FAIL -eq 0 ] && echo 0 || echo 1)
