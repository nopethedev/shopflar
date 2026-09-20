import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { slugify } from '@/lib/settings'

export async function POST(req) {
  try {
    await requireAdmin()
    const body = await req.json()
    let slug = body.slug ? slugify(body.slug) : slugify(body.name)
    const existing = await db.category.findUnique({ where: { slug } })
    if (existing) slug = `${slug}-${Date.now().toString(36).slice(-4)}`

    const cat = await db.category.create({
      data: {
        name: body.name,
        slug,
        description: body.description || null,
        imageUrl: body.imageUrl || null,
        parentId: body.parentId || null,
        isVisible: body.isVisible ?? true,
        sortOrder: parseInt(body.sortOrder) || 0
      }
    })
    return NextResponse.json({ category: cat })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
