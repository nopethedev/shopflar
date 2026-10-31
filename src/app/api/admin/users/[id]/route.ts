import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSuperAdmin } from '@/lib/auth'
import { createVerificationToken, sendVerificationEmail } from '@/lib/verification'

// PATCH: update role and/or email-verified status
export async function PATCH(req, { params }) {
  params = await params
  try {
    await requireSuperAdmin()
    const body = await req.json()
    const data = {}

    if (body.role !== undefined) {
      if (!['CUSTOMER', 'ADMIN', 'SUPER_ADMIN'].includes(body.role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
      }
      data.role = body.role
    }

    if (body.verified !== undefined) {
      data.emailVerified = body.verified ? new Date() : null
      if (body.verified) {
        // Verified manually by admin — clear any pending tokens
        await db.verificationToken.deleteMany({ where: { userId: params.id, type: 'email_verify' } })
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const updated = await db.user.update({ where: { id: params.id }, data })
    return NextResponse.json({ user: { id: updated.id, email: updated.email, role: updated.role, emailVerified: updated.emailVerified } })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

// POST: resend the verification email to this user (admin action)
export async function POST(_req, { params }) {
  params = await params
  try {
    await requireSuperAdmin()
    const user = await db.user.findUnique({ where: { id: params.id } })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    if (user.emailVerified) {
      return NextResponse.json({ error: 'This user is already verified' }, { status: 400 })
    }
    const { token, rateLimited } = await createVerificationToken(user.id)
    if (!token || rateLimited) {
      return NextResponse.json({ error: 'A verification email was sent less than a minute ago. Try again shortly.' }, { status: 429 })
    }
    const result = await sendVerificationEmail(user, token)
    if (!result.success) {
      return NextResponse.json({ error: `Could not send email: ${result.error}` }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

export async function DELETE(_req, { params }) {
  params = await params
  try {
    await requireSuperAdmin()
    await db.user.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
