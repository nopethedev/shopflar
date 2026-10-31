import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/password'
import { createSession } from '@/lib/auth'
import { createVerificationToken, sendVerificationEmail, isVerificationEnforced } from '@/lib/verification'
import { logEvent } from '@/lib/logs'
import { z } from 'zod'

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().max(100).optional()
})

export async function POST(req) {
  try {
    const body = await req.json()
    const parsed = signupSchema.safeParse(body)
    if (!parsed.success) {
      const msg = parsed.error.issues?.[0]?.message || 'Invalid input'
      return NextResponse.json({ error: msg }, { status: 400 })
    }
    const email = parsed.data.email.toLowerCase().trim()
    const name = parsed.data.name?.trim() || null

    const existing = await db.user.findUnique({ where: { email } })
    const enforcement = await isVerificationEnforced()

    // Already registered?
    if (existing) {
      if (enforcement.enforced && !existing.emailVerified) {
        // Unverified account (maybe a bot, maybe the same visitor who lost the
        // email) — resend the verification link instead of revealing details.
        const { token, rateLimited } = await createVerificationToken(existing.id)
        if (token && !rateLimited) {
          await sendVerificationEmail(existing, token).catch(() => {})
        }
        return NextResponse.json({
          needsVerification: true,
          message: 'This email is already registered but not verified. We sent a new verification link — check your inbox.'
        })
      }
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
    }

    const user = await db.user.create({
      data: {
        email,
        passwordHash: hashPassword(parsed.data.password),
        name,
        role: 'CUSTOMER',
        profile: { create: {} }
      }
    })

    await logEvent('user.registered', {
      actorId: user.id,
      actorEmail: email,
      entity: 'user',
      entityId: user.id,
      metadata: { email, name: name || '—' }
    })

    if (enforcement.enforced) {
      // Anti-bot: account stays unverified until the emailed link is clicked.
      const { token, rateLimited } = await createVerificationToken(user.id)
      const mail = token ? await sendVerificationEmail(user, token).catch((e) => ({ success: false, error: e.message })) : { success: false }
      if (!mail?.success) {
        console.warn(`[signup] Verification email for ${email} not delivered (rateLimited=${rateLimited})`)
      }
      return NextResponse.json({
        needsVerification: true,
        message: 'Account created! Check your inbox for a verification link to activate your account.'
      })
    }

    // Verification disabled (or SMTP not configured) — verify immediately.
    const verified = await db.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() }
    })
    await createSession(verified)
    return NextResponse.json({
      user: { id: verified.id, email: verified.email, role: verified.role, name: verified.name }
    })
  } catch (e) {
    console.error('Signup error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
