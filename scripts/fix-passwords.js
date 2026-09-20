// Quick script to update admin & customer passwords using the correct hash
// Compatible with both Node.js and Bun (CommonJS)
const { PrismaClient } = require('@prisma/client')
const { scryptSync, randomBytes } = require('crypto')

const db = new PrismaClient()

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

async function main() {
  await db.user.update({
    where: { email: 'admin@shopflar.dev' },
    data: { passwordHash: hashPassword('admin12345') }
  })
  console.log('Updated admin password')

  await db.user.update({
    where: { email: 'customer@example.com' },
    data: { passwordHash: hashPassword('customer123') }
  })
  console.log('Updated customer password')
}

main().then(() => db.$disconnect())
