import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireSuperAdmin } from '@/lib/auth'
import { hashPassword } from '@/lib/password'

export async function POST(req) {
  try {
    await requireSuperAdmin()
    const { email, password, name, role } = await req.json()
    if (!email || !password || password.length < 8) {
      return NextResponse.json({ error: 'Email and password (min 8 chars) required' }, { status: 400 })
    }
    const existing = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } })
    if (existing) return NextResponse.json({ error: 'Email already in use' }, { status: 409 })

    const user = await db.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash: hashPassword(password),
        name: name || null,
        role: role || 'ADMIN',
        emailVerified: new Date()
      }
    })
    return NextResponse.json({ user: { id: user.id, email: user.email, role: user.role } })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
