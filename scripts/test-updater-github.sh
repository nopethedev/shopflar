#!/bin/bash
# Test updater GitHub source: API check + real zipball dry-run through the updater
BASE=http://127.0.0.1:3000
if ! curl -s -o /dev/null --max-time 4 $BASE/; then
  cd /home/z/my-project
  nohup setsid npx next dev -H 0.0.0.0 -p 3000 > /tmp/nextdev.log 2>&1 < /dev/null & disown
  for i in $(seq 1 50); do code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/ --max-time 5 2>/dev/null); [ "$code" = "200" ] && { echo "server up"; break; }; sleep 3; done
fi

JAR=/tmp/cookies.txt; rm -f $JAR
curl -s -c $JAR -X POST $BASE/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@teststore.com","password":"admin12345"}' > /dev/null

echo "=== GET /api/admin/updater/github (check for updates) ==="
curl -s -b $JAR $BASE/api/admin/updater/github; echo

echo "=== run source=github DRY-RUN via updater script (validates download+extract) ==="
# Token comes from the environment (or the local DB settings) — never hardcode it
if [ -z "$GITHUB_TOKEN" ]; then
  GITHUB_TOKEN=$(node -e "
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
db.storeSetting.findUnique({ where: { key: 'github_token' } }).then(r => { console.log(r?.value || ''); return db.\$disconnect(); });
" 2>/dev/null)
fi
if [ -z "$GITHUB_TOKEN" ]; then
  echo "No GITHUB_TOKEN available — skipping authenticated dry-run (use a public repo or set GITHUB_TOKEN)"
else
  GITHUB_TOKEN="$GITHUB_TOKEN" node scripts/updater.mjs --github --repo nopethedev/shopflar --branch main --dry-run 2>&1 | tail -8
fi
