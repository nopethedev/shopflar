import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  const methods = await db.shippingMethod.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' }
  })
  return NextResponse.json({ methods })
}
