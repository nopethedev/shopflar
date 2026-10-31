#!/bin/bash
# E2E: COD order → confirmation email logged → dice rolls → activity logged
set -e
BASE=http://127.0.0.1:3000
JAR=/tmp/cookies.txt
rm -f $JAR

echo "== 1. shipping methods =="
SM=$(curl -s $BASE/api/shipping/methods)
MID=$(echo "$SM" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);const m=j.methods||j;const intl=m.find(x=>{try{return JSON.parse(x.countries||'[]').includes('ALL')}catch{return (x.countries||'').includes('ALL')}})||m[0]||{};console.log(intl.id||'')})")
echo "shipping method: $MID"

PID=$(curl -s "$BASE/api/products" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);const p=(j.products||j).find(x=>!x.isOutOfStock)||{};console.log(p.id||'')})")
echo "product: $PID"

echo "== 2. place COD order =="
ORD=$(curl -s -X POST $BASE/api/checkout -H 'Content-Type: application/json' -d "{
  \"items\":[{\"productId\":\"$PID\",\"quantity\":1}],
  \"email\":\"codtest@example.com\",
  \"firstName\":\"Test\",\"lastName\":\"Buyer\",
  \"address1\":\"Teststr 1\",\"city\":\"Berlin\",\"postalCode\":\"10115\",\"country\":\"US\",
  \"shippingMethodId\":\"$MID\",
  \"paymentProvider\":\"cod\"
}")
echo "$ORD"
OID=$(echo "$ORD" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{console.log(JSON.parse(d).orderId||'')})")
ONUM=$(echo "$ORD" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{console.log(JSON.parse(d).orderNumber||'')})")
echo "order id: $OID / number: $ONUM"

echo "== 3. dice roll for COD order =="
curl -s -X POST $BASE/api/orders/dice -H 'Content-Type: application/json' -d "{\"orderId\":\"$OID\"}"
echo ""

echo "== 4. DB checks (email log + audit log) =="
node -e "
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
(async () => {
  const emails = await db.emailLog.findMany({ where: { to: 'codtest@example.com' }, orderBy: { createdAt: 'desc' }, take: 3 });
  console.log('EMAIL LOGS:', emails.map(e => ({ to: e.to, subject: e.subject.slice(0,50), status: e.status, error: e.error })));
  const events = await db.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 6 });
  console.log('AUDIT LOGS:', events.map(e => ({ action: e.action, entity: e.entity, meta: (e.metadata||'').slice(0,80) })));
  const order = await db.order.findUnique({ where: { id: '$OID' } });
  console.log('ORDER:', { status: order.status, paymentStatus: order.paymentStatus, diceRoll: order.diceRoll, diceWon: order.diceWon, diceCoupon: order.diceCouponCode });
  if (order.diceCouponCode) {
    const c = await db.discount.findUnique({ where: { code: order.diceCouponCode } });
    console.log('DICE COUPON:', c ? { code: c.code, value: c.value, source: c.source } : 'MISSING');
  }
  await db.\$disconnect();
})().catch(e => { console.error('DBERR', e.message); process.exit(1); });
"
