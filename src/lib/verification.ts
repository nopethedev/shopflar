// Email verification helpers
// - Tokens are random 32-byte hex values; only the SHA-256 hash is stored in DB
// - Tokens expire after 24h and are single-use
// - Rate limited: one email per address per 60 seconds
// - Enforcement is controlled by the `require_email_verification` store setting
//   (Admin → Store Settings → Security) and requires SMTP to be configured

import { createHash, randomBytes } from 'crypto'
import { db } from './db'
import { sendEmail, isEmailConfigured } from './email'
import { getAppUrl } from './settings'

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 // 24 hours
const RESEND_COOLDOWN_MS = 1000 * 60 // 60 seconds between emails

export const VERIFICATION_TYPE = 'email_verify'

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

export async function getVerificationSetting() {
  try {
    const row = await db.storeSetting.findUnique({ where: { key: 'require_email_verification' } })
    return row?.value !== 'false' // default ON
  } catch {
    return true
  }
}

// Full enforcement check: setting enabled AND SMTP configured.
// If the admin hasn't set up SMTP, verification links couldn't be delivered,
// so accounts are verified automatically instead of locking everyone out.
export async function isVerificationEnforced() {
  const settingEnabled = await getVerificationSetting()
  const smtpConfigured = await isEmailConfigured().catch(() => false)
  return {
    settingEnabled,
    smtpConfigured,
    enforced: settingEnabled && smtpConfigured
  }
}

// Creates a single-use verification token. Returns { token, rateLimited }.
// When rateLimited is true the existing token is still valid and no new email
// should be sent.
export async function createVerificationToken(userId, type = VERIFICATION_TYPE) {
  // Remove expired tokens for this user
  await db.verificationToken.deleteMany({
    where: { userId, type, expiresAt: { lt: new Date() } }
  }).catch(() => {})

  const latest = await db.verificationToken.findFirst({
    where: { userId, type },
    orderBy: { createdAt: 'desc' }
  })
  if (latest && Date.now() - new Date(latest.createdAt).getTime() < RESEND_COOLDOWN_MS) {
    return { token: null, rateLimited: true }
  }

  const token = randomBytes(32).toString('hex')
  await db.verificationToken.deleteMany({ where: { userId, type } })
  await db.verificationToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      type,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MS)
    }
  })
  return { token, rateLimited: false }
}

export async function sendVerificationEmail(user, token) {
  const appUrl = await getAppUrl()
  const link = `${appUrl}/verify-email?token=${token}`
  const name = user.name || user.email.split('@')[0]
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #1a1a1a;">Confirm your email address</h1>
      <p>Hi ${name},</p>
      <p>Welcome! Please confirm your email address to activate your account. This keeps the store safe from fake signups.</p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="${link}" style="display: inline-block; background: #1a1a1a; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600;">Verify my email</a>
      </div>
      <p style="color: #555; font-size: 14px;">Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; background: #f5f5f5; padding: 12px; border-radius: 8px; font-size: 13px;"><a href="${link}" style="color: #0066cc;">${link}</a></p>
      <p style="margin-top: 24px; color: #999; font-size: 12px;">This link expires in 24 hours and can only be used once. If you didn't create an account, you can safely ignore this email.</p>
    </div>
  `
  return await sendEmail({
    to: user.email,
    subject: 'Confirm your email address',
    html
  })
}

// Consumes a raw token: validates it, marks the user verified, and deletes
// all of that user's tokens of this type. Returns the user or null.
export async function consumeVerificationToken(token, type = VERIFICATION_TYPE) {
  if (!token || typeof token !== 'string' || token.length > 128) return null
  const record = await db.verificationToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true }
  })
  if (!record || record.type !== type) return null
  if (new Date(record.expiresAt).getTime() < Date.now()) {
    await db.verificationToken.delete({ where: { id: record.id } }).catch(() => {})
    return null
  }
  const user = await db.user.update({
    where: { id: record.userId },
    data: { emailVerified: new Date() }
  })
  await db.verificationToken.deleteMany({ where: { userId: record.userId, type } })
  return user
}
