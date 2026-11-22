import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error']
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// Case-insensitive "contains" filter that works on every supported database.
// SQLite's LIKE is already case-insensitive; PostgreSQL needs mode:'insensitive'
// (which SQLite's Prisma connector rejects), so pick based on DATABASE_URL.
const IS_POSTGRES = /^postgres(ql)?:\/\//i.test(process.env.DATABASE_URL || '')
export const like = (value) => (IS_POSTGRES ? { contains: value, mode: 'insensitive' as const } : { contains: value })
