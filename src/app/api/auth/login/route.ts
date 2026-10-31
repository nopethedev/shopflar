import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword } from '@/lib/password'
import { createSession } from '@/lib/auth'
import { isVerificationEnforced } from '@/lib/verification'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
})

export async function POST(req) {
  try {
    const body = await req.json()
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    const email = parsed.data.email.toLowerCase().trim()
    const user = await db.user.findUnique({ where: { email } })
    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }
    const ok = verifyPassword(parsed.data.password, user.passwordHash)
    if (!ok) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }
    // Anti-bot gate: unverified accounts can't sign in (when enforced).
    const enforcement = await isVerificationEnforced()
    if (enforcement.enforced && !user.emailVerified) {
      return NextResponse.json(
        {
          error: 'Please verify your email address before signing in. Check your inbox for the verification link.',
          code: 'EMAIL_NOT_VERIFIED'
        },
        { status: 403 }
      )
    }
    await createSession(user)
    return NextResponse.json({ user: { id: user.id, email: user.email, role: user.role, name: user.name } })
  } catch (e) {
    console.error('Login error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
