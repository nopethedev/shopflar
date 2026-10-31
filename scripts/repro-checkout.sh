#!/bin/bash
# Minimal repro: fresh server + single COD checkout
cd /home/z/my-project
pkill -f "next dev" 2>/dev/null; pkill -f "next-server" 2>/dev/null; sleep 1
setsid bash -c 'exec bun run dev' > /tmp/dev2.log 2>&1 < /dev/null &
for i in $(seq 1 90); do
  sleep 1
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api" --max-time 5 2>/dev/null)
  [ "$code" = "200" ] && break
done
echo "server ready after ${i}s"

CRATE_PRODUCT=$(node -e "
const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient()
db.product.findFirst({ where: { slug: 'everyday-cotton-tee' } }).then(p => { console.log(p.id); return db.\$disconnect() })
")
SHIP_ID=$(curl -s "http://localhost:3000/api/shipping/methods" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const m=JSON.parse(d).methods;const x=m.find(mm=>mm.countries.includes('ALL'))||m[0];console.log(x.id)})")
echo "product=$CRATE_PRODUCT ship=$SHIP_ID"

echo "=== checkout attempt ==="
curl -s -X POST "http://localhost:3000/api/checkout" -H 'Content-Type: application/json' -d "{
  \"items\":[{\"productId\":\"$CRATE_PRODUCT\",\"quantity\":1}],
  \"email\":\"repro@test.com\",\"firstName\":\"Re\",\"lastName\":\"Pro\",
  \"address1\":\"1 Test St\",\"city\":\"San Francisco\",\"state\":\"CA\",\"postalCode\":\"94103\",\"country\":\"US\",
  \"shippingMethodId\":\"$SHIP_ID\",\"paymentProvider\":\"cod\",\"createAccount\":false}" | head -c 600
echo ""
sleep 2
echo "=== dev log tail (non-noise) ==="
grep -v "Edge Runtime\|node:fs\|node:path\|process\.cwd\|process\.pid\|instrumentation\|Learn\|Ecmascript\|^ *[0-9]* *|\|^ *\^\|^$\|import(\|try {\|const dir\|fs\.\|JSON\.\|} catch\|// Never\|register\|NEXT_RUNTIME\|^> " /tmp/dev2.log | tail -25
pkill -f "next dev" 2>/dev/null; pkill -f "next-server" 2>/dev/null
