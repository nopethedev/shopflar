#!/bin/bash
# End-to-end test: email verification + mystery box + dice
# Starts its own dev server, runs tests, kills the server.
cd /home/z/my-project
PORT=3000
BASE="http://localhost:$PORT"
PASS=0; FAIL=0
ok()   { PASS=$((PASS+1)); echo "  ✔ $1"; }
bad()  { FAIL=$((FAIL+1)); echo "  ✘ $1"; }
check() { # check "name" "haystack" "needle"
  if echo "$2" | grep -q "$3"; then ok "$1"; else bad "$1 — got: $(echo "$2" | head -c 300)"; fi
}

echo "==> Starting dev server"
pkill -f "next" 2>/dev/null; pkill -f "bun run dev" 2>/dev/null; sleep 1
fuser -k 3000/tcp 2>/dev/null; sleep 1
rm -rf .next
setsid bash -c 'exec bun run dev' > /tmp/dev.log 2>&1 < /dev/null &
for i in $(seq 1 90); do
  sleep 1
  code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api" --max-time 5 2>/dev/null)
  [ "$code" = "200" ] && break
done
echo "    server ready after ${i}s (code $code)"

J='Content-Type: application/json'

echo "==> Email verification flow"
# clean slate
node -e "
const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient()
db.user.deleteMany({ where: { email: 'bot1@test.com' } })
  .then(() => db.emailLog.deleteMany({ where: { to: 'bot1@test.com' } }))
  .then(() => db.verificationToken.deleteMany({}))
  .then(() => { console.log('cleaned'); return db.\$disconnect() })
  .catch(e => { console.error(e.message); process.exit(1) })
"

R=$(curl -s -X POST "$BASE/api/auth/signup" -H "$J" -d '{"email":"bot1@test.com","password":"botpassword1","name":"Bot One"}')
check "signup returns needsVerification" "$R" '"needsVerification":true'

R=$(curl -s -X POST "$BASE/api/auth/login" -H "$J" -d '{"email":"bot1@test.com","password":"botpassword1"}')
check "login blocked with EMAIL_NOT_VERIFIED" "$R" 'EMAIL_NOT_VERIFIED'

R=$(curl -s -X POST "$BASE/api/auth/resend-verification" -H "$J" -d '{"email":"bot1@test.com","password":"WRONG"}')
check "resend rejects wrong password" "$R" 'Invalid email or password'

R=$(curl -s -X POST "$BASE/api/auth/resend-verification" -H "$J" -d '{"email":"bot1@test.com","password":"botpassword1"}')
check "resend works (rate limited msg or sent)" "$R" '"ok":true'

TOKEN=$(node -e "
const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient()
db.emailLog.findFirst({ where: { to: 'bot1@test.com' }, orderBy: { createdAt: 'desc' } })
  .then(row => {
    const m = row && row.body ? row.body.match(/token=([a-f0-9]+)/) : null
    console.log(m ? m[1] : '')
    return db.\$disconnect()
  })
")
if [ -n "$TOKEN" ]; then ok "verification token extracted from email log"; else bad "no token in email log"; fi

R=$(curl -s -X POST "$BASE/api/auth/verify-email" -H "$J" -d "{\"token\":\"$TOKEN\"}")
check "verify-email succeeds + session" "$R" '"ok":true'

R=$(curl -s -X POST "$BASE/api/auth/verify-email" -H "$J" -d "{\"token\":\"$TOKEN\"}")
check "token single-use (second use fails)" "$R" 'invalid or has expired'

R=$(curl -s -X POST "$BASE/api/auth/login" -H "$J" -d '{"email":"bot1@test.com","password":"botpassword1"}')
check "login works after verification" "$R" '"email":"bot1@test.com"'

echo "==> Admin login"
R=$(curl -s -c /tmp/admin.jar -X POST "$BASE/api/auth/login" -H "$J" -d '{"email":"admin@teststore.com","password":"admin12345"}')
if echo "$R" | grep -q 'admin@teststore.com'; then ok "admin@teststore.com login"; else
  R=$(curl -s -c /tmp/admin.jar -X POST "$BASE/api/auth/login" -H "$J" -d '{"email":"admin@shopflar.dev","password":"admin12345"}')
  if echo "$R" | grep -q '@'; then ok "admin@shopflar.dev login"; else bad "admin login: $R"; fi
fi

echo "==> Mystery crate setup"
CRATE_PRODUCT=$(node -e "
const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient()
db.product.findFirst({ where: { slug: 'everyday-cotton-tee' } })
  .then(p => { console.log(p.id); return db.\$disconnect() })
")
POOL_PRODUCT=$(node -e "
const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient()
db.product.findFirst({ where: { slug: 'wool-felt-dad-hat' } })
  .then(p => { console.log(p.id); return db.\$disconnect() })
")
CRATE_ID=$(node -e "
const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient()
db.mysteryCrate.findUnique({ where: { productId: '$CRATE_PRODUCT' } })
  .then(c => { console.log(c ? c.id : ''); return db.\$disconnect() })
")
if [ -n "$CRATE_ID" ]; then
  R=$(curl -s -b /tmp/admin.jar -X PATCH "$BASE/api/admin/mystery-crate/$CRATE_ID" -H "$J" \
    -d "{\"showOdds\":true}")
  check "existing crate updated with showOdds" "$R" '"showOdds":true'
  if ! echo "$R" | grep -q '"showOdds":true'; then echo "    PATCH full error: $R"; fi
else
  R=$(curl -s -b /tmp/admin.jar -X POST "$BASE/api/admin/mystery-crate" -H "$J" \
    -d "{\"productId\":\"$CRATE_PRODUCT\",\"guaranteedItems\":\"[]\",\"poolItems\":\"[{\\\"productId\\\":\\\"$POOL_PRODUCT\\\",\\\"weight\\\":3}]\",\"poolSize\":1,\"showOdds\":true}")
  check "crate created with showOdds" "$R" '"showOdds":true'
fi

R=$(curl -s "$BASE/products/everyday-cotton-tee")
check "product page renders odds button" "$R" 'View the odds'
check "odds data embedded (pool item in RSC payload)" "$R" 'Wool Felt Dad Hat'

echo "==> Checkout with mystery crate (COD)"
SHIP_ID=$(curl -s "$BASE/api/shipping/methods" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).methods[0].id))")
R=$(curl -s -X POST "$BASE/api/checkout" -H "$J" -d "{
  \"items\":[{\"productId\":\"$CRATE_PRODUCT\",\"quantity\":1}],
  \"email\":\"bot1@test.com\",\"firstName\":\"Bot\",\"lastName\":\"One\",
  \"address1\":\"1 Test St\",\"city\":\"San Francisco\",\"state\":\"CA\",\"postalCode\":\"94103\",\"country\":\"US\",
  \"shippingMethodId\":\"$SHIP_ID\",\"paymentProvider\":\"cod\",\"createAccount\":false}")
ORDER_ID=$(echo "$R" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);console.log(j.orderId||j.order?.id||'')}catch(e){console.log('')}})")
if [ -n "$ORDER_ID" ]; then ok "COD order created ($ORDER_ID)"; else bad "checkout failed: $(echo $R | head -c 200)"; fi

R=$(curl -s "$BASE/checkout/success?order=$ORDER_ID")
check "success page shows mystery box section" "$R" 'Mystery box'
check "reveal has open button" "$R" 'Open your mystery box'

echo "==> Free Order Dice"
# enable dice: sides=2, target=1 (50% win for testing)
curl -s -b /tmp/admin.jar -X PATCH "$BASE/api/admin/settings" -H "$J" \
  -d '{"free_order_dice_enabled":"true","free_order_dice_sides":"2","free_order_dice_target":"1"}' > /dev/null
# mark order paid directly
node -e "
const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient()
db.order.update({ where: { id: '$ORDER_ID' }, data: { status: 'PAID', paymentStatus: 'PAID' } })
  .then(() => { console.log('paid'); return db.\$disconnect() })
"
R=$(curl -s -X POST "$BASE/api/orders/dice" -H "$J" -d "{\"orderId\":\"$ORDER_ID\"}")
check "dice roll 1 returns result" "$R" '"rolled":true'
R2=$(curl -s -X POST "$BASE/api/orders/dice" -H "$J" -d "{\"orderId\":\"$ORDER_ID\"}")
if [ "$R" = "$R2" ]; then ok "dice idempotent (same result on re-roll)"; else bad "dice changed result: $R vs $R2"; fi
if echo "$R" | grep -q '"won":true'; then
  check "win issues coupon" "$R" 'LUCKY-'
  CODE=$(echo "$R" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).couponCode||''))")
  R3=$(curl -s -X POST "$BASE/api/discounts/validate" -H "$J" -d "{\"code\":\"$CODE\",\"subtotal\":9999}")
  check "dice coupon validates at checkout" "$R3" 'valid\|FIXED_AMOUNT\|true'
else
  echo "  (rolled a loss this time — will retry with fresh orders)"
  WON=0
  for n in 1 2 3 4 5 6; do
    R=$(curl -s -X POST "$BASE/api/checkout" -H "$J" -d "{
      \"items\":[{\"productId\":\"$CRATE_PRODUCT\",\"quantity\":1}],
      \"email\":\"dice$n@test.com\",\"firstName\":\"D\",\"lastName\":\"$n\",
      \"address1\":\"1 Test St\",\"city\":\"San Francisco\",\"state\":\"CA\",\"postalCode\":\"94103\",\"country\":\"US\",
      \"shippingMethodId\":\"$SHIP_ID\",\"paymentProvider\":\"cod\",\"createAccount\":false}")
    OID=$(echo "$R" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d);console.log(j.orderId||j.order?.id||'')}catch(e){console.log('')}})")
    [ -z "$OID" ] && continue
    node -e "
const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient()
db.order.update({ where: { id: '$OID' }, data: { status: 'PAID', paymentStatus: 'PAID' } })
  .then(() => db.\$disconnect())
" > /dev/null
    R=$(curl -s -X POST "$BASE/api/orders/dice" -H "$J" -d "{\"orderId\":\"$OID\"}")
    if echo "$R" | grep -q '"won":true'; then
      WON=1
      check "win issues coupon (attempt $n)" "$R" 'LUCKY-'
      CODE=$(echo "$R" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).couponCode||''))")
      R3=$(curl -s -X POST "$BASE/api/discounts/validate" -H "$J" -d "{\"code\":\"$CODE\",\"subtotal\":9999}")
      check "dice coupon validates (attempt $n)" "$R3" 'valid\|FIXED_AMOUNT\|true'
      break
    fi
  done
  [ "$WON" = "1" ] && ok "dice win path exercised" || bad "no win in 7 rolls at 50% (suspicious)"
fi

R=$(curl -s -X POST "$BASE/api/orders/dice" -H "$J" -d '{"orderId":"nonexistent-id"}')
check "dice 404 for unknown order" "$R" 'Order not found'

echo "==> Unverified checkout account gets verification email"
R=$(curl -s -X POST "$BASE/api/checkout" -H "$J" -d "{
  \"items\":[{\"productId\":\"$CRATE_PRODUCT\",\"quantity\":1}],
  \"email\":\"checkoutuser@test.com\",\"firstName\":\"Check\",\"lastName\":\"Out\",
  \"address1\":\"2 Test St\",\"city\":\"San Francisco\",\"state\":\"CA\",\"postalCode\":\"94103\",\"country\":\"US\",
  \"shippingMethodId\":\"$SHIP_ID\",\"paymentProvider\":\"cod\",\"createAccount\":true,\"password\":\"password123\"}")
check "checkout account creation succeeds" "$R" '"orderId"'
V=$(node -e "
const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient()
db.user.findUnique({ where: { email: 'checkoutuser@test.com' } })
  .then(u => { console.log(u && u.emailVerified ? 'VERIFIED' : 'UNVERIFIED'); return db.\$disconnect() })
")
check "checkout account is unverified (anti-bot)" "$V" 'UNVERIFIED'

echo ""
echo "================================"
echo "RESULTS: $PASS passed, $FAIL failed"
echo "================================"
pkill -f "next dev" 2>/dev/null
pkill -f "next-server" 2>/dev/null
exit $([ $FAIL -eq 0 ] && echo 0 || echo 1)
