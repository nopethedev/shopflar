// Email sending helper — uses nodemailer with SMTP credentials stored in DB
// Falls back gracefully if SMTP is not configured (logs to console in dev)
// All errors are caught and logged — email failures never break the main flow

import nodemailer from 'nodemailer'
import { db } from './db'
import { logEvent } from './logs'

let transporterCache = null
let lastConfigCheck = 0
const CACHE_TTL = 30000 // 30 seconds

// Connection security modes:
//   'none'  → plain connection (port 25, no encryption — not recommended)
//   'ssl'   → implicit TLS (port 465 typically)
//   'tls'   → STARTTLS upgrade (port 587 typically — most common)
async function getSmtpConfig() {
  const now = Date.now()
  if (now - lastConfigCheck > CACHE_TTL) {
    lastConfigCheck = now
    transporterCache = null
  }
  if (transporterCache) return transporterCache

  const rows = await db.storeSetting.findMany({
    where: { key: { startsWith: 'smtp_' } }
  })
  const map = new Map(rows.map(r => [r.key, r.value]))

  const host = map.get('smtp_host')
  const port = parseInt(map.get('smtp_port') || '587')
  const user = map.get('smtp_user')
  const pass = map.get('smtp_pass')
  const fromEmail = map.get('smtp_from_email') || user
  const fromName = map.get('smtp_from_name') || 'Shopflar'
  // Security mode: 'none' | 'ssl' | 'tls'
  // Backward compat: if old 'smtp_secure' is set to 'true', treat as 'ssl'
  const securityMode = map.get('smtp_security') || (map.get('smtp_secure') === 'true' ? 'ssl' : 'tls')

  if (!host || !user || !pass) {
    return null
  }

  // Configure transporter based on security mode
  let transportConfig = {
    host,
    port,
    auth: { user, pass },
    tls: { rejectUnauthorized: true }
  }

  if (securityMode === 'ssl') {
    // Implicit TLS — entire connection is encrypted from the start (port 465)
    transportConfig.secure = true
  } else if (securityMode === 'tls') {
    // STARTTLS — connection starts plain, then upgrades to TLS (port 587)
    transportConfig.secure = false
    transportConfig.requireTLS = true
  } else {
    // None — plain connection (port 25, insecure)
    transportConfig.secure = false
    transportConfig.tls = { rejectUnauthorized: false }
  }

  transporterCache = {
    transporter: nodemailer.createTransport(transportConfig),
    fromEmail,
    fromName,
    securityMode
  }
  return transporterCache
}

// Truncate text to avoid SQLite column overflow
function truncateForLog(text, maxLen = 5000) {
  if (!text) return ''
  if (text.length <= maxLen) return text
  return text.slice(0, maxLen) + '...[truncated]'
}

// Format SMTP errors with helpful messages
function formatSmtpError(error) {
  const msg = error.message || String(error)
  const code = error.code || error.responseCode || ''

  // Gmail auth failure
  if (msg.includes('535') || msg.includes('Invalid login') || msg.includes('authentication failed')) {
    return {
      message: 'SMTP authentication failed. If using Gmail, you need an App Password (not your regular password). Generate one at https://myaccount.google.com/apppasswords',
      code: 'AUTH_FAILED'
    }
  }

  // Connection refused
  if (msg.includes('EAUTH') || msg.includes('EENVELOPE')) {
    return {
      message: `SMTP authentication error: ${msg}. Check your username and password in Admin → Email & SMTP.`,
      code: 'AUTH_ERROR'
    }
  }

  if (msg.includes('ECONNECTION') || msg.includes('connect ECONNREFUSED')) {
    return {
      message: `Could not connect to SMTP server. Check host, port, and security mode (TLS/SSL/None) in Admin → Email & SMTP. Error: ${msg}`,
      code: 'CONN_REFUSED'
    }
  }

  if (msg.includes('ETIMEDOUT')) {
    return {
      message: `SMTP connection timed out. Check your network and firewall settings. If using SSL (port 465), make sure the Security dropdown is set to "SSL". If using TLS (port 587), make sure it's set to "TLS". Error: ${msg}`,
      code: 'TIMEOUT'
    }
  }

  if (msg.includes('ESSL') || msg.includes('SSL') || msg.includes('wrong version number') || msg.includes('protocol error')) {
    return {
      message: `SSL/TLS handshake failed — your security mode doesn't match the port. Try switching between "TLS" (port 587) and "SSL" (port 465) in Admin → Email & SMTP. Error: ${msg}`,
      code: 'SSL_ERROR'
    }
  }

  if (msg.includes('UNABLE_TO_VERIFY') || msg.includes('self-signed') || msg.includes('certificate')) {
    return {
      message: `SSL certificate verification failed. This can happen with self-signed certificates or antivirus software intercepting your connection. Error: ${msg}`,
      code: 'CERT_ERROR'
    }
  }

  return {
    message: msg,
    code: code || 'UNKNOWN'
  }
}

export async function sendEmail({ to, subject, html, text }) {
  const config = await getSmtpConfig()

  if (!config) {
    // Log to console instead of failing — useful in dev
    console.log(`[EMAIL] (SMTP not configured) To: ${to} | Subject: ${subject}`)
    console.log(`[EMAIL] Body: ${(text || html?.replace(/<[^>]+>/g, '') || '').slice(0, 200)}`)

    // Log to DB (truncated to avoid column overflow)
    await db.emailLog.create({
      data: { to, subject: truncateForLog(subject), body: truncateForLog(html || text || ''), status: 'failed', error: 'SMTP not configured' }
    }).catch((e) => console.error('[EMAIL] Failed to log:', e.message))

    // Surface in Activity log + Discord — the #1 cause of "customers don't
    // receive any emails" is SMTP that was never set up.
    await logEvent('email.failed', {
      entity: 'email',
      metadata: { to, subject: truncateForLog(subject, 120), error: 'SMTP not configured — set it up in Admin → Email & SMTP' }
    })

    return { success: false, error: 'SMTP not configured' }
  }

  try {
    const info = await config.transporter.sendMail({
      from: `"${config.fromName}" <${config.fromEmail}>`,
      to,
      subject,
      html,
      text: text || html?.replace(/<[^>]+>/g, '')
    })

    // Log to DB (truncated)
    await db.emailLog.create({
      data: { to, subject: truncateForLog(subject), body: truncateForLog(html || text || ''), status: 'sent' }
    }).catch((e) => console.error('[EMAIL] Failed to log success:', e.message))

    return { success: true, messageId: info.messageId }
  } catch (e) {
    const errorInfo = formatSmtpError(e)
    console.error('[EMAIL] Send failed:', errorInfo.message)

    // Log to DB (truncated, with helpful error message)
    await db.emailLog.create({
      data: {
        to,
        subject: truncateForLog(subject),
        body: truncateForLog(html || text || ''),
        status: 'failed',
        error: truncateForLog(errorInfo.message, 500)
      }
    }).catch((e2) => console.error('[EMAIL] Failed to log error:', e2.message))

    // Surface the failure in the activity log + Discord so the shop owner
    // notices broken SMTP even without opening Admin → Logs.
    await logEvent('email.failed', {
      entity: 'email',
      metadata: { to, subject: truncateForLog(subject, 120), error: truncateForLog(errorInfo.message, 300) }
    })

    return { success: false, error: errorInfo.message }
  }
}

export async function isEmailConfigured() {
  const config = await getSmtpConfig()
  return !!config
}

// ============ Templated emails ============

export async function sendOrderConfirmation(order) {
  const items = order.items || []
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #1a1a1a;">Order Confirmation</h1>
      <p>Hi ${order.shippingAddress?.firstName || 'Customer'},</p>
      <p>Thanks for your order! Your order <strong>${order.orderNumber}</strong> has been received and is being processed.</p>
      <h2 style="color: #1a1a1a; font-size: 18px; margin-top: 24px;">Order Details</h2>
      <table style="width: 100%; border-collapse: collapse; margin: 12px 0;">
        <thead>
          <tr style="border-bottom: 1px solid #e5e5e5;">
            <th style="text-align: left; padding: 8px;">Item</th>
            <th style="text-align: right; padding: 8px;">Qty</th>
            <th style="text-align: right; padding: 8px;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${items.map(it => `
            <tr style="border-bottom: 1px solid #f0f0f0;">
              <td style="padding: 8px;">${it.name}${it.variantName ? ` <br><small style="color: #999;">${it.variantName}</small>` : ''}</td>
              <td style="padding: 8px; text-align: right;">${it.quantity}</td>
              <td style="padding: 8px; text-align: right;">$${(it.price * it.quantity).toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr><td colspan="2" style="padding: 8px; text-align: right;">Total</td><td style="padding: 8px; text-align: right;"><strong>$${order.total.toFixed(2)}</strong></td></tr>
        </tfoot>
      </table>
      ${order.shippingAddress ? `
        <h2 style="font-size: 18px; margin-top: 24px;">Shipping Address</h2>
        <p style="color: #555;">
          ${order.shippingAddress.firstName} ${order.shippingAddress.lastName}<br>
          ${order.shippingAddress.address1}<br>
          ${order.shippingAddress.address2 ? order.shippingAddress.address2 + '<br>' : ''}
          ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postalCode}<br>
          ${order.shippingAddress.country}
        </p>
      ` : ''}
      <p style="margin-top: 24px; color: #999; font-size: 12px;">If you have any questions, reply to this email.</p>
    </div>
  `
  return await sendEmail({
    to: order.email,
    subject: `Order ${order.orderNumber} — Confirmation`,
    html
  })
}

export async function sendDigitalFulfillment(order, fulfillment) {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #1a1a1a;">Your Digital Purchase</h1>
      <p>Hi ${order.shippingAddress?.firstName || 'Customer'},</p>
      <p>Your order <strong>${order.orderNumber}</strong> includes a digital product. Here are your details:</p>
      ${fulfillment.fulfillmentType === 'download_link' ? `
        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0;"><strong>Download Link:</strong></p>
          <p style="margin: 8px 0;"><a href="${fulfillment.downloadUrl}" style="color: #0066cc;">${fulfillment.downloadUrl}</a></p>
          ${fulfillment.downloadLimit > 0 ? `<p style="margin: 0; font-size: 12px; color: #999;">Download limit: ${fulfillment.downloadLimit} times. Downloads used: ${fulfillment.downloadCount}</p>` : ''}
        </div>
      ` : ''}
      ${fulfillment.fulfillmentType === 'code' ? `
        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p style="margin: 0;"><strong>Your Code:</strong></p>
          <p style="margin: 8px 0; font-family: monospace; font-size: 18px; font-weight: bold; letter-spacing: 2px;">${fulfillment.code}</p>
        </div>
        <p>Use this code to activate your product or redeem your purchase.</p>
      ` : ''}
      <p style="margin-top: 24px;">Thank you for your purchase!</p>
    </div>
  `
  return await sendEmail({
    to: order.email,
    subject: `Your digital product from order ${order.orderNumber}`,
    html
  })
}

export async function sendNewsletterWelcome(email, discountCode, discountPercent) {
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #1a1a1a;">Welcome to the newsletter! 🎉</h1>
      <p>Thanks for subscribing. You'll be the first to know about new products, exclusive offers, and styling tips.</p>
      ${discountCode ? `
        <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0; text-align: center;">
          <p style="margin: 0; font-size: 14px; color: #555;">Here's your welcome gift — ${discountPercent}% off your first order:</p>
          <p style="margin: 12px 0; font-family: monospace; font-size: 24px; font-weight: bold; letter-spacing: 3px; color: #1a1a1a;">${discountCode}</p>
          <p style="margin: 0; font-size: 12px; color: #999;">Enter this code at checkout to apply your discount.</p>
        </div>
      ` : ''}
      <p style="margin-top: 24px; color: #999; font-size: 12px;">You can unsubscribe at any time by clicking the link in any email.</p>
    </div>
  `
  return await sendEmail({
    to: email,
    subject: discountCode ? `Welcome! Here's ${discountPercent}% off` : 'Welcome to our newsletter!',
    html
  })
}

export async function sendNewsletter(subject, html, recipients) {
  let sent = 0
  let failed = 0
  for (const email of recipients) {
    const result = await sendEmail({ to: email, subject, html })
    if (result.success) sent++
    else failed++
    // Small delay to avoid overwhelming SMTP
    await new Promise(r => setTimeout(r, 100))
  }
  return { sent, failed, total: recipients.length }
}
