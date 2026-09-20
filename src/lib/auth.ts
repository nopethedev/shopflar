import { cookies } from 'next/headers'
import { db } from './db'
import { verifyPassword } from './password'
import { SignJWT, jwtVerify } from 'jose'

const SESSION_COOKIE = 'shopflar_session'
const SESSION_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'dev-secret-change-me')

const SESSION_TTL = 60 * 60 * 24 * 30 // 30 days

async function sign(payload) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL}s`)
    .sign(SESSION_SECRET)
}

async function verify(token) {
  try {
    const { payload } = await jwtVerify(token, SESSION_SECRET)
    return payload
  } catch {
    return null
  }
}

export async function createSession(user) {
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role,
    name: user.name || ''
  }
  const token = await sign(payload)
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_TTL,
    path: '/'
  })
}

export async function destroySession() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}

export async function getSessionUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  if (!token) return null
  const payload = await verify(token)
  if (!payload) return null

  // Re-fetch from DB to ensure user still exists & get fresh role
  const user = await db.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, role: true, name: true, profile: true }
  })
  return user
}

export async function requireUser() {
  const user = await getSessionUser()
  if (!user) {
    throw new Error('UNAUTHORIZED')
  }
  return user
}

export async function requireAdmin() {
  const user = await getSessionUser()
  if (!user) {
    throw new Error('UNAUTHORIZED')
  }
  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
    throw new Error('FORBIDDEN')
  }
  return user
}

export async function requireSuperAdmin() {
  const user = await getSessionUser()
  if (!user) {
    throw new Error('UNAUTHORIZED')
  }
  if (user.role !== 'SUPER_ADMIN') {
    throw new Error('FORBIDDEN')
  }
  return user
}

export async function authenticate(email, password) {
  const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } })
  if (!user || !user.passwordHash) return null
  const ok = verifyPassword(password, user.passwordHash)
  if (!ok) return null
  await createSession(user)
  return user
}
