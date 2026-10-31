// Free Order Dice — server-authoritative mini game
//
// After an order is PAID, the customer can roll a dice on the order success
// page. If they roll the winning number (admin-configurable, e.g. 6 on a
// 6-sided dice) they win a coupon worth the order total — the order itself is
// NOT refunded (no refunds; winners receive a coupon of the same value).
//
// Security / correctness:
// - The roll happens ONLY server-side, exactly once per order. The result is
//   persisted on the order (diceRoll/diceTarget/diceWon), so refreshing the
//   page, replaying the request or sharing the link can't re-roll or cheat.
// - The atomic updateMany(... where diceRoll: null ...) claims the roll, so
//   parallel requests can never produce two results or two coupons.
// - Coupon creation + emailing happen after the roll is claimed; a failure
//   there only means the coupon needs manual issuing — the roll stays valid.

import { db } from './db'
import { randomBytes } from 'crypto'
import { logEvent } from './logs'

export const DICE_IMPRINT =
  "Doesn't refund — if you win, you get a coupon for the same price."

export async function getDiceConfig() {
  const get = async (key, dflt) => {
    try {
      const row = await db.storeSetting.findUnique({ where: { key } })
      return row?.value ?? dflt
    } catch {
      return dflt
    }
  }
  const enabled = (await get('free_order_dice_enabled', 'false')) === 'true'
  let sides = parseInt(await get('free_order_dice_sides', '6'), 10)
  let target = parseInt(await get('free_order_dice_target', '6'), 10)
  if (!Number.isFinite(sides) || sides < 2) sides = 6
  if (sides > 100) sides = 100
  if (!Number.isFinite(target) || target < 1) target = sides
  if (target > sides) target = sides
  return { enabled, sides, target }
}

function generateCouponCode() {
  return `LUCKY-${randomBytes(3).toString('hex').toUpperCase()}`
}

async function issueWinCoupon(order) {
  // Coupon worth exactly what the customer paid
  let code = generateCouponCode()
  for (let i = 0; i < 5; i++) {
    const clash = await db.discount.findUnique({ where: { code } })
    if (!clash) break
    code = generateCouponCode()
  }
  const value = Math.round(order.total * 100) / 100
  const discount = await db.discount.create({
    data: {
      code,
      type: 'FIXED_AMOUNT',
      value,
      usageLimit: 1,
      perCustomerLimit: 1,
      isActive: true,
      source: 'dice'
    }
  })
  await db.order.update({
    where: { id: order.id },
    data: { diceCouponCode: code }
  }).catch(() => {})
  return discount
}

async function sendWinEmail(order, coupon) {
  try {
    const { sendEmail } = await import('./email')
    const { getStoreSettings } = await import('./settings')
    const settings = await getStoreSettings()
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1a1a1a;">🎲 You rolled a ${order.diceTarget} — jackpot!</h1>
        <p>Congratulations! Your lucky roll on order <strong>${order.orderNumber}</strong> won you a coupon worth <strong>$${coupon.value.toFixed(2)}</strong> — exactly what you paid.</p>
        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0; text-align: center;">
          <p style="margin: 0; font-size: 14px; color: #555;">Your coupon code:</p>
          <p style="margin: 12px 0; font-family: monospace; font-size: 26px; font-weight: bold; letter-spacing: 3px; color: #1a1a1a;">${coupon.code}</p>
          <p style="margin: 0; font-size: 12px; color: #999;">Single use — enter it at checkout.</p>
        </div>
        <p style="color: #666; font-size: 13px;"><em>${DICE_IMPRINT}</em></p>
        <p style="margin-top: 24px; color: #999; font-size: 12px;">Happy shopping!<br/>${settings.storeName || 'The Store Team'}</p>
      </div>
    `
    await sendEmail({ to: order.email, subject: `🎲 You won a $${coupon.value.toFixed(2)} coupon!`, html })
  } catch (e) {
    console.error('Dice win email failed:', e.message)
  }
}

// An order can play the dice game when it's paid — or when it's a Cash on
// Delivery order that was actually placed (payment is collected on delivery;
// there is no payment webhook, so waiting for PAID would mean COD customers
// never get to roll). Cancelled/failed orders never play.
export function isDiceEligibleOrder(order) {
  if (order.paymentStatus === 'PAID') return true
  if (order.paymentProvider === 'cod') {
    return ['PENDING', 'PAYMENT_PENDING', 'PAID', 'PROCESSING', 'SHIPPED'].includes(order.status)
  }
  return false
}

// Roll (or fetch the already-rolled result) for an order.
// Returns null when the order can't play (missing, unpaid, disabled, zero total).
export async function rollDiceForOrder(orderId) {
  const order = await db.order.findUnique({ where: { id: orderId } })
  if (!order) return null
  if (!isDiceEligibleOrder(order)) return { eligible: false, reason: 'unpaid' }
  if (!(order.total > 0)) return { eligible: false, reason: 'zero-total' }

  const config = await getDiceConfig()
  if (!config.enabled) return { eligible: false, reason: 'disabled' }

  // Already rolled — return the stored result (idempotent)
  if (order.diceRoll != null) {
    let couponValue = null
    if (order.diceCouponCode) {
      const d = await db.discount.findUnique({ where: { code: order.diceCouponCode } }).catch(() => null)
      couponValue = d?.value ?? null
    }
    return {
      eligible: true,
      rolled: true,
      roll: order.diceRoll,
      target: order.diceTarget ?? config.target,
      sides: config.sides,
      won: order.diceWon,
      couponCode: order.diceCouponCode,
      couponValue,
      imprint: DICE_IMPRINT
    }
  }

  // Claim the roll atomically — only one request can win the race
  const roll = 1 + Math.floor(Math.random() * config.sides)
  const won = roll === config.target
  const claim = await db.order.updateMany({
    where: { id: order.id, diceRoll: null },
    data: { diceRoll: roll, diceTarget: config.target, diceWon: won }
  })
  if (claim.count === 0) {
    // Another request rolled first — return its result
    const fresh = await db.order.findUnique({ where: { id: order.id } })
    let couponValue = null
    if (fresh.diceCouponCode) {
      const d = await db.discount.findUnique({ where: { code: fresh.diceCouponCode } }).catch(() => null)
      couponValue = d?.value ?? null
    }
    return {
      eligible: true,
      rolled: true,
      roll: fresh.diceRoll,
      target: fresh.diceTarget ?? config.target,
      sides: config.sides,
      won: fresh.diceWon,
      couponCode: fresh.diceCouponCode,
      couponValue,
      imprint: DICE_IMPRINT
    }
  }

  let couponCode = null
  let couponValue = null
  if (won) {
    const updatedOrder = await db.order.findUnique({ where: { id: order.id } })
    const coupon = await issueWinCoupon(updatedOrder)
    couponCode = coupon.code
    couponValue = coupon.value
    await sendWinEmail({ ...updatedOrder, diceTarget: config.target }, coupon)
    await logEvent('dice.won', {
      entity: 'order',
      entityId: order.id,
      metadata: {
        orderNumber: updatedOrder.orderNumber,
        email: updatedOrder.email,
        roll,
        target: config.target,
        couponCode,
        value: `$${coupon.value.toFixed(2)}`
      }
    })
  }

  return {
    eligible: true,
    rolled: true,
    roll,
    target: config.target,
    sides: config.sides,
    won,
    couponCode,
    couponValue,
    imprint: DICE_IMPRINT
  }
}
