#!/bin/bash
# Full verification run — starts receiver + server, runs all checks, prints results.
BASE=http://127.0.0.1:3000

echo "=== 0. Discord test receiver on :9899 ==="
cat > /tmp/discord-receiver.mjs <<'EOF'
import http from 'node:http'
import fs from 'node:fs'
const server = http.createServer((req, res) => {
  let body = ''
  req.on('data', c => body += c)
  req.on('end', () => {
    const arr = JSON.parse(fs.readFileSync('/tmp/discord_received.json', 'utf8').catch ? '[]' : '[]')
  })
})
EOF
# simpler receiver:
cat > /tmp/discord-receiver.mjs <<'EOF'
import http from 'node:http'
import fs from 'node:fs'
const server = http.createServer((req, res) => {
  let body = ''
  req.on('data', c => { body += c })
  req.on('end', () => {
    try {
      const list = JSON.parse(fs.readFileSync('/tmp/discord_received.json', 'utf8'))
      list.push({ at: new Date().toISOString(), path: req.url, body: body.slice(0, 2000) })
      fs.writeFileSync('/tmp/discord_received.json', JSON.stringify(list, null, 2))
    } catch (e) { console.error('receiver err', e.message) }
    res.writeHead(204).end()
  })
})
server.listen(9899, '127.0.0.1', () => console.log('receiver ready'))
EOF
echo '[]' > /tmp/discord_received.json
nohup setsid node /tmp/discord-receiver.mjs > /tmp/receiver.log 2>&1 < /dev/null & disown
sleep 1
curl -s -o /dev/null -w "receiver health: %{http_code}\n" -X POST http://127.0.0.1:9899/ping

echo "=== 1. start next dev ==="
cd /home/z/my-project
nohup setsid npx next dev -H 0.0.0.0 -p 3000 > /tmp/nextdev.log 2>&1 < /dev/null & disown
for i in $(seq 1 50); do code=$(curl -s -o /dev/null -w "%{http_code}" $BASE/ --max-time 5 2>/dev/null); [ "$code" = "200" ] && { echo "server up (attempt $i)"; break; }; sleep 3; done

echo "=== 2. admin login ==="
JAR=/tmp/cookies.txt; rm -f $JAR
curl -s -c $JAR -X POST $BASE/api/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@teststore.com","password":"admin12345"}' | head -c 200; echo

echo "=== 3. configure Discord webhook (to local receiver) ==="
curl -s -b $JAR -X POST $BASE/api/admin/notifications -H 'Content-Type: application/json' \
  -d '{"enabled":true,"webhookUrl":"http://127.0.0.1:9899/discord","events":["order.placed","order.paid","email.failed","dice.won","user.registered","stock.low"]}'; echo

echo "=== 4. COD order ==="
SM=$(curl -s $BASE/api/shipping/methods)
MID=$(echo "$SM" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);const m=j.methods||j;console.log((m[0]||{}).id||'')})")
PID=$(curl -s "$BASE/api/products" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);const p=(j.products||j).find(x=>!x.isOutOfStock)||{};console.log(p.id||'')})")
echo "shipping=$MID product=$PID"
ORD=$(curl -s -X POST $BASE/api/checkout -H 'Content-Type: application/json' -d "{
  \"items\":[{\"productId\":\"$PID\",\"quantity\":1}],
  \"email\":\"codtest@example.com\",
  \"firstName\":\"Test\",\"lastName\":\"Buyer\",
  \"address1\":\"1 Main St\",\"city\":\"Springfield\",\"postalCode\":\"10001\",\"state\":\"NY\",\"country\":\"US\",
  \"shippingMethodId\":\"$MID\",
  \"paymentProvider\":\"cod\"
}")
echo "checkout: $ORD"
OID=$(echo "$ORD" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{console.log(JSON.parse(d).orderId||'')})")

echo "=== 5. dice roll for COD order (must work now) ==="
curl -s -X POST $BASE/api/orders/dice -H 'Content-Type: application/json' -d "{\"orderId\":\"$OID\"}"; echo

echo "=== 6. signup → user.registered event ==="
curl -s -X POST $BASE/api/auth/signup -H 'Content-Type: application/json' \
  -d '{"email":"newuser@example.com","password":"password123","name":"New User"}' | head -c 200; echo

echo "=== 7. admin logs API ==="
echo "--- activity (top 5):"
curl -s -b $JAR "$BASE/api/admin/logs?type=activity" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);console.log('total:',j.total);(j.rows||[]).slice(0,5).forEach(r=>console.log(' •',r.action,'|',r.actorEmail||'-','|',(r.metadata||'').slice(0,90)))})"
echo "--- emails (top 5):"
curl -s -b $JAR "$BASE/api/admin/logs?type=emails" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);console.log('total:',j.total);(j.rows||[]).slice(0,5).forEach(r=>console.log(' •',r.status,'|',r.to,'|',(r.subject||'').slice(0,50),'|',r.error||''))})"

echo "=== 8. pages render check ==="
for P in /admin/logs /admin/notifications /admin/updater; do
  C=$(curl -s -b $JAR -o /dev/null -w "%{http_code}" $BASE$P --max-time 60)
  echo "GET $P → $C"
done

echo "=== 9. discord receiver got: ==="
node -e "const l=JSON.parse(require('fs').readFileSync('/tmp/discord_received.json','utf8'));console.log('received',l.length,'webhook calls');l.forEach(x=>{try{const b=JSON.parse(x.body||'{}');console.log(' •',(b.embeds&&b.embeds[0]&&b.embeds[0].title)||'(no embed)','| fields:',((b.embeds&&b.embeds[0]&&b.embeds[0].fields)||[]).map(f=>f.name+':'+String(f.value).slice(0,40)).join(' / '))}catch{console.log(' • (unparseable body)')}})"

echo "=== 10. order state + email log + dice state in DB ==="
node -e "
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
(async () => {
  const emails = await db.emailLog.findMany({ where: { to: 'codtest@example.com' }, orderBy: { createdAt: 'desc' }, take: 2 });
  console.log('EMAILS:', emails.map(e => ({ subject: e.subject.slice(0,45), status: e.status, error: (e.error||'').slice(0,60) })));
  const order = await db.order.findFirst({ where: { email: 'codtest@example.com' }, orderBy: { createdAt: 'desc' } });
  console.log('ORDER:', { status: order.status, paymentStatus: order.paymentStatus, diceRoll: order.diceRoll, diceWon: order.diceWon, coupon: order.diceCouponCode });
  if (order.diceCouponCode) {
    const c = await db.discount.findUnique({ where: { code: order.diceCouponCode } });
    console.log('COUPON:', c && { code: c.code, value: c.value, source: c.source });
  }
  const events = await db.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 8 });
  console.log('AUDIT:', events.map(e => e.action).join(', '));
  await db.\$disconnect();
})().catch(e => { console.error('DBERR', e.message); process.exit(1); });
"
echo "=== DONE ==="
