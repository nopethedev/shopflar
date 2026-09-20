// Server-side password hashing using Node's scrypt (no external deps)
import { scryptSync, randomBytes, timingSafeEqual } from 'crypto'

const SALT_LEN = 16
const KEY_LEN = 64

export function hashPassword(password) {
  const salt = randomBytes(SALT_LEN).toString('hex')
  const hash = scryptSync(password, salt, KEY_LEN).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false
  const [salt, hash] = stored.split(':')
  try {
    const hashBuf = Buffer.from(hash, 'hex')
    const testBuf = scryptSync(password, salt, KEY_LEN)
    return hashBuf.length === testBuf.length && timingSafeEqual(hashBuf, testBuf)
  } catch {
    return false
  }
}
