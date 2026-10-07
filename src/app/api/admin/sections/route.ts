import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

export async function POST(req) {
  try {
    await requireAdmin()
    const body = await req.json()
    const section = await db.pageSection.create({
      data: {
        pageType: body.pageType || 'home',
        pageId: body.pageId || null,
        sectionType: body.sectionType,
        config: JSON.stringify(body.config || {}),
        sortOrder: body.sortOrder || 0,
        isVisible: body.isVisible !== false
      }
    })
    return NextResponse.json({ section: { ...section, config: JSON.parse(section.config) } })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

export async function GET() {
  try {
    await requireAdmin()
    const sections = await db.pageSection.findMany({
      where: { pageType: 'home' },
      orderBy: { sortOrder: 'asc' }
    })
    return NextResponse.json({ sections })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
