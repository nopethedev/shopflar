const { PrismaClient } = require('@prisma/client')

const BASE = 'http://127.0.0.1:3000'
const prisma = new PrismaClient()

function ok(cond, msg, extra) {
  if (!cond) throw new Error('FAIL: ' + msg + (extra ? '\n' + JSON.stringify(extra) : ''))
  console.log('PASS:', msg)
}

async function main() {
  const products = await prisma.product.findMany({ where: { status: 'PUBLISHED' }, take: 2 })
  if (products.length < 2) throw new Error('need two published products')
  const [p1, p2] = products

  const makeOrder = (orderNumber, data) => prisma.order.create({
    data: {
      orderNumber,
      email: 'ordertest@example.com',
      currency: 'USD',
      subtotal: p1.price,
      total: p1.price,
      ...data,
      items: {
        create: [{
          productId: p1.id,
          name: p1.name,
          price: p1.price,
          quantity: 1,
          sku: p1.sku,
          imageUrl: null
        }]
      }
    },
    include: { items: true }
  })

  const created = []
  try {
    const unpaid = await makeOrder('TEST-UNPAID', { status: 'PENDING', paymentStatus: 'UNPAID' })
    const partial = await makeOrder('TEST-PARTIAL', { status: 'PROCESSING', paymentStatus: 'PARTIALLY_REFUNDED' })
    const cancelled = await makeOrder('TEST-CANCELLED', { status: 'CANCELLED', paymentStatus: 'UNPAID' })
    const paid = await makeOrder('TEST-PAID', { status: 'PAID', paymentStatus: 'PAID' })
    created.push(unpaid.id, partial.id, cancelled.id, paid.id)

    const login = await fetch(BASE + '/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'admin@shopflar.dev', password: 'admin12345' })
    })
    ok(login.ok, 'admin login')
    const cookie = (login.headers.getSetCookie ? login.headers.getSetCookie() : [])
      .map(c => c.split(';')[0]).join('; ')
    const api = (path, opts = {}) => fetch(BASE + path, {
      ...opts,
      headers: { cookie, 'content-type': 'application/json', ...(opts.headers || {}) }
    })

    // ---- Unpaid tab ----
    const unpaidHtml = await (await api('/admin/orders?tab=unpaid')).text()
    ok(unpaidHtml.includes('TEST-UNPAID'), 'unpaid tab lists the genuinely unpaid order')
    ok(!unpaidHtml.includes('TEST-PARTIAL'), 'unpaid tab excludes the partially refunded order')
    ok(!unpaidHtml.includes('TEST-CANCELLED'), 'unpaid tab excludes cancelled orders')

    const allHtml = await (await api('/admin/orders?tab=all')).text()
    ok(allHtml.includes('TEST-PARTIAL'), 'partially refunded order still appears under All')

    // ---- Bulk fulfillment guard ----
    const badFulfill = await api(`/api/admin/orders/${cancelled.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ fulfillmentStatus: 'FULFILLED' })
    })
    ok(badFulfill.status === 400, 'cancelled order cannot be marked fulfilled', { status: badFulfill.status })
    const badJson = await badFulfill.json()
    ok(/cannot be fulfilled/i.test(badJson.error || ''), 'rejection explains why', badJson)
    const stillCancelled = await prisma.order.findUnique({ where: { id: cancelled.id } })
    ok(stillCancelled.fulfillmentStatus === 'UNFULFILLED', 'cancelled order fulfillment unchanged')

    const goodFulfill = await api(`/api/admin/orders/${paid.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ fulfillmentStatus: 'FULFILLED' })
    })
    ok(goodFulfill.status === 200, 'paid order can still be fulfilled', { status: goodFulfill.status })

    // ---- Order editing ----
    const editPayload = {
      items: [{ id: unpaid.items[0].id, quantity: 2 }],
      removedItemIds: [],
      addItems: [{ productId: p2.id, quantity: 1 }],
      shippingAddress: {
        firstName: 'Edited', lastName: 'Customer', address1: '12 Test Street',
        city: 'Helsinki', postalCode: '00100', country: 'Finland'
      }
    }
    const editRes = await api(`/api/admin/orders/${unpaid.id}/edit`, {
      method: 'PATCH',
      body: JSON.stringify(editPayload)
    })
    const editJson = await editRes.json()
    ok(editRes.status === 200, 'order edit succeeds', editJson)
    const expectedSubtotal = Math.round((p1.price * 2 + p2.price) * 100) / 100
    ok(editJson.order.items.length === 2, 'edited order has the added line item')
    ok(editJson.order.subtotal === expectedSubtotal, 'subtotal recalculated from line items', {
      got: editJson.order.subtotal, expectedSubtotal
    })
    ok(editJson.order.total === expectedSubtotal, 'total recalculated', { total: editJson.order.total })
    ok(editJson.order.shippingAddress.firstName === 'Edited' &&
      editJson.order.shippingAddress.address1 === '12 Test Street', 'shipping address saved')
    const qty2 = editJson.order.items.find(i => i.id === unpaid.items[0].id)
    ok(qty2.quantity === 2, 'existing line quantity updated')

    const detail = await (await api(`/admin/orders/${unpaid.id}`)).text()
    ok(detail.includes('Edit order'), 'order page renders the Edit order action')

    // Removing everything must be rejected without emptying the order.
    const removeAll = await api(`/api/admin/orders/${unpaid.id}/edit`, {
      method: 'PATCH',
      body: JSON.stringify({
        items: [],
        removedItemIds: editJson.order.items.map(i => i.id),
        addItems: []
      })
    })
    ok(removeAll.status === 400, 'edit removing every line item is rejected', { status: removeAll.status })
    const afterReject = await prisma.orderItem.count({ where: { orderId: unpaid.id } })
    ok(afterReject === 2, 'rejected edit did not delete line items', { afterReject })

    // Archived orders are not editable.
    const cancelledEdit = await api(`/api/admin/orders/${cancelled.id}/edit`, {
      method: 'PATCH',
      body: JSON.stringify({ items: [], removedItemIds: [], addItems: [] })
    })
    ok(cancelledEdit.status === 400, 'cancelled order cannot be edited', { status: cancelledEdit.status })

    console.log('\nALL ORDER CHECKS PASSED')
  } finally {
    if (created.length) {
      await prisma.order.deleteMany({ where: { id: { in: created } } })
      const left = await prisma.order.count({ where: { orderNumber: { startsWith: 'TEST-' } } })
      console.log('cleanup: remaining TEST orders =', left)
    }
    await prisma.$disconnect()
  }
}

main().catch(async (e) => {
  console.error('\n' + (e.stack || e.message))
  try { await prisma.$disconnect() } catch {}
  process.exit(1)
})
