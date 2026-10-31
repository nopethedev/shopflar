import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword } from '@/lib/password'
import { createVerificationToken, sendVerificationEmail } from '@/lib/verification'

// Resends the verification email. Requires the account's password so that
// this endpoint can't be abused to spam arbitrary email addresses.
export async function POST(req) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }
    const user = await db.user.findUnique({ where: { email: String(email).toLowerCase().trim() } })
    if (!user || !user.passwordHash || !verifyPassword(String(password), user.passwordHash)) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }
    if (user.emailVerified) {
      return NextResponse.json({ ok: true, alreadyVerified: true })
    }
    const { token, rateLimited } = await createVerificationToken(user.id)
    if (token && !rateLimited) {
      await sendVerificationEmail(user, token).catch(() => {})
    }
    // Generic response — don't reveal whether an email actually went out
    return NextResponse.json({
      ok: true,
      rateLimited,
      message: rateLimited
        ? 'A verification email was sent recently. Please wait a minute before requesting another.'
        : 'Verification email sent. Check your inbox (and spam folder).'
    })
  } catch (e) {
    console.error('Resend verification error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
