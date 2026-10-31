import { NextResponse } from 'next/server'
import { createSession } from '@/lib/auth'
import { consumeVerificationToken } from '@/lib/verification'

export async function POST(req) {
  try {
    const { token } = await req.json()
    if (!token) {
      return NextResponse.json({ error: 'Missing verification token' }, { status: 400 })
    }
    const user = await consumeVerificationToken(token)
    if (!user) {
      return NextResponse.json(
        { error: 'This verification link is invalid or has expired. Please request a new one from the sign-in page.' },
        { status: 400 }
      )
    }
    // The visitor proved ownership of the email address — sign them in.
    await createSession(user)
    return NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email, role: user.role, name: user.name }
    })
  } catch (e) {
    console.error('Verify email error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
