import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { slugify } from '@/lib/settings'

export async function POST(req) {
  try {
    await requireAdmin()
    const body = await req.json()
    let slug = body.slug ? slugify(body.slug) : slugify(body.title)
    const existing = await db.customPage.findUnique({ where: { slug } })
    if (existing) slug = `${slug}-${Date.now().toString(36).slice(-4)}`

    const page = await db.customPage.create({
      data: {
        title: body.title,
        slug,
        content: body.content || '',
        excerpt: body.excerpt || null,
        status: body.status || 'DRAFT',
        showInNav: !!body.showInNav,
        navLabel: body.navLabel || null,
        sortOrder: parseInt(body.sortOrder) || 0,
        seoTitle: body.seoTitle || null,
        seoDescription: body.seoDescription || null
      }
    })
    return NextResponse.json({ page })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

export async function GET() {
  await requireAdmin()
  const pages = await db.customPage.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json({ pages })
}
