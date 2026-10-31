// One-time backfill: marks all existing users as email-verified.
// Run automatically by the updater (scripts/updater.mjs) right after the first
// `db:push` that introduces the verification system, guarded by the marker
// file updates/.verified-backfilled. Without this, every pre-existing account
// would be locked out of sign-in once verification is enforced.
//
// Safe to run manually any time:  node scripts/backfill-verify.mjs
import { PrismaClient } from '@prisma/client'
import { writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const marker = join(appDir, 'updates', '.verified-backfilled')

const db = new PrismaClient()

try {
  const result = await db.user.updateMany({
    where: { emailVerified: null },
    data: { emailVerified: new Date() }
  })
  console.log(`[backfill-verify] Marked ${result.count} existing user(s) as email-verified.`)
  mkdirSync(join(appDir, 'updates'), { recursive: true })
  if (!existsSync(marker)) {
    writeFileSync(marker, new Date().toISOString())
  }
} catch (e) {
  console.error('[backfill-verify] Failed:', e.message)
  process.exitCode = 1
} finally {
  await db.$disconnect()
}
