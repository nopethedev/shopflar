#!/bin/bash
# Smoke test the async-params-fixed admin [id] routes + admin pages
cd /home/z/my-project
BASE="http://localhost:3000"
J='Content-Type: application/json'
PASS=0; FAIL=0
ok()  { PASS=$((PASS+1)); echo "  ✔ $1"; }
bad() { FAIL=$((FAIL+1)); echo "  ✘ $1 — $(echo "$2" | head -c 200)"; }
check() { if echo "$2" | grep -q "$3"; then ok "$1"; else bad "$1" "$2"; fi }

curl -s -c /tmp/admin.jar -X POST "$BASE/api/auth/login" -H "$J" -d '{"email":"admin@teststore.com","password":"admin12345"}' > /dev/null

ids=$(node -e "
const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient()
async function main() {
  const p = await db.product.findFirst()
  const d = await db.discount.findFirst()
  const t = await db.taxRate.findFirst()
  const s = await db.shippingMethod.findFirst()
  const c = await db.category.findFirst()
  const o = await db.order.findFirst()
  const r = await db.productReview.findFirst()
  const sec = await db.pageSection.findFirst()
  console.log(JSON.stringify({ p: p?.id, d: d?.id, t: t?.id, s: s?.id, c: c?.id, o: o?.id, r: r?.id, sec: sec?.id }))
  await db.\$disconnect()
}
main()
")
PID=$(echo "$ids" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).p||''))")
DID=$(echo "$ids" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).d||''))")
TID=$(echo "$ids" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).t||''))")
SID=$(echo "$ids" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).s||''))")
CID=$(echo "$ids" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).c||''))")
OID=$(echo "$ids" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).o||''))")

echo "==> Patched [id] API routes"
R=$(curl -s -b /tmp/admin.jar "$BASE/api/admin/products/$PID")
check "GET /api/admin/products/[id]" "$R" '"id"'

R=$(curl -s -b /tmp/admin.jar -X PATCH "$BASE/api/admin/products/$PID" -H "$J" -d "{\"name\":\"Everyday Cotton Tee\"}")
check "PATCH /api/admin/products/[id]" "$R" '"id"'

R=$(curl -s -b /tmp/admin.jar -X PATCH "$BASE/api/admin/discounts/$DID" -H "$J" -d "{\"isActive\":true}")
check "PATCH /api/admin/discounts/[id]" "$R" '"isActive"'

R=$(curl -s -b /tmp/admin.jar -X PATCH "$BASE/api/admin/tax/$TID" -H "$J" -d "{\"rate\":8.5}")
check "PATCH /api/admin/tax/[id]" "$R" '"rate"'

R=$(curl -s -b /tmp/admin.jar -X PATCH "$BASE/api/admin/shipping/$SID" -H "$J" -d "{\"isActive\":true}")
check "PATCH /api/admin/shipping/[id]" "$R" '"isActive"'

R=$(curl -s -b /tmp/admin.jar -X PATCH "$BASE/api/admin/categories/$CID" -H "$J" -d "{\"name\":\"Apparel\"}")
check "PATCH /api/admin/categories/[id]" "$R" '"name"'

R=$(curl -s -b /tmp/admin.jar -X PATCH "$BASE/api/admin/orders/$OID" -H "$J" -d "{\"internalNotes\":\"smoke test note\"}")
check "PATCH /api/admin/orders/[id]" "$R" '"id"'

R=$(curl -s -b /tmp/admin.jar -X PATCH "$BASE/api/admin/plugins/mystery-crate" -H "$J" -d '{"enabled":true}')
check "PATCH /api/admin/plugins/[slug]" "$R" '"enabled"'

echo "==> Admin pages render"
for page in "/admin" "/admin/users" "/admin/settings" "/admin/updater" "/admin/plugins/mystery-crate" "/admin/orders/$OID" "/admin/products/$PID" "/admin/discounts" "/admin/customers" "/admin/builder"; do
  code=$(curl -s -b /tmp/admin.jar -o /tmp/page.html -w "%{http_code}" "$BASE$page" --max-time 90)
  if [ "$code" = "200" ] && ! grep -q "__next_error__" /tmp/page.html; then ok "GET $page"; else bad "GET $page (code $code)" "$(head -c 120 /tmp/page.html)"; fi
done

echo "==> Storefront pages render"
for page in "/" "/products" "/cart" "/checkout" "/login" "/signup" "/verify-email" "/account"; do
  code=$(curl -s -b /tmp/admin.jar -o /tmp/page.html -w "%{http_code}" "$BASE$page" --max-time 90)
  if [ "$code" = "200" ] || [ "$code" = "307" ]; then ok "GET $page ($code)"; else bad "GET $page (code $code)" ""; fi
done

echo "==> Updater status API"
R=$(curl -s -b /tmp/admin.jar "$BASE/api/admin/updater/status")
check "GET /api/admin/updater/status" "$R" '"version"'

echo ""
echo "RESULTS: $PASS passed, $FAIL failed"
exit $([ $FAIL -eq 0 ] && echo 0 || echo 1)
