#!/bin/bash
# Round 2: COD email + discord embeds + success page
BASE=http://127.0.0.1:3000
echo '[]' > /tmp/discord_received.json

# receiver
if ! curl -s -o /dev/null --max-time 2 -X POST http://127.0.0.1:9899/ping; then
  nohup setsid node /tmp/discord-receiver.mjs > /tmp/receiver.log 2>&1 < /dev/null & disown
  sleep 1
fi

# server
if ! curl -s -o /dev/null --max-time 4 $BASE/; then
  cd /home/z/my-project
  nohup setsid npx next dev -H 0.0.0.0 -p 3000 > /tmp/nextdev.log 2>&1 < /dev/null & disown
  for i in $(seq 1 50); do code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/ --max-time 5 2>/dev/null); [ "$code" = "200" ] && { echo "server up"; break; }; sleep 3; done
fi

echo "=== COD order (round 2) ==="
SM=$(curl -s $BASE/api/shipping/methods)
MID=$(echo "$SM" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{console.log((JSON.parse(d).methods||[])[0].id||'')})")
PID=$(curl -s "$BASE/api/products" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);const p=(j.products||j).find(x=>!x.isOutOfStock)||{};console.log(p.id||'')})")
ORD=$(curl -s -X POST $BASE/api/checkout -H 'Content-Type: application/json' -d "{
  \"items\":[{\"productId\":\"$PID\",\"quantity\":1}],
  \"email\":\"codround2@example.com\",
  \"firstName\":\"Round\",\"lastName\":\"Two\",
  \"address1\":\"2 Main St\",\"city\":\"Springfield\",\"postalCode\":\"10001\",\"state\":\"NY\",\"country\":\"US\",
  \"shippingMethodId\":\"$MID\",
  \"paymentProvider\":\"cod\"
}")
echo "checkout: $ORD"
OID=$(echo "$ORD" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{console.log(JSON.parse(d).orderId||'')})")

echo "=== success page render (must be 200, contains dice) ==="
C=$(curl -s -o /tmp/success.html -w "%{http_code}" "$BASE/checkout/success?order=$OID" --max-time 90)
echo "success page: $C"
grep -o "dice" /tmp/success.html | head -1 && echo "  (dice markup found)" || echo "  (NO dice markup)"

echo "=== discord receiver ==="
sleep 2
node -e "const l=JSON.parse(require('fs').readFileSync('/tmp/discord_received.json','utf8'));console.log('received',l.length,'webhook calls');l.forEach(x=>{try{const b=JSON.parse(x.body||'{}');console.log(' •',(b.embeds&&b.embeds[0]&&b.embeds[0].title)||'(no embed)','| fields:',((b.embeds&&b.embeds[0]&&b.embeds[0].fields)||[]).map(f=>f.name+'='+String(f.value).slice(0,50)).join(' / '))}catch{console.log(' • (unparseable)')}})"

echo "=== DB: email log for codround2 + audit ==="
node -e "
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
(async () => {
  const emails = await db.emailLog.findMany({ where: { to: 'codround2@example.com' }, orderBy: { createdAt: 'desc' } });
  console.log('EMAILS:', emails.map(e => ({ subject: e.subject.slice(0,50), status: e.status, error: (e.error||'').slice(0,70) })));
  const events = await db.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 5 });
  console.log('AUDIT:', events.map(e => e.action + '(' + ((e.metadata||'').match(/\"orderNumber\":\"[^\"]+\"/)||[''])[0] + ')').join(' → '));
  await db.\$disconnect();
})().catch(e => { console.error('DBERR', e.message); process.exit(1); });
"
echo "=== DONE round 2 ==="
