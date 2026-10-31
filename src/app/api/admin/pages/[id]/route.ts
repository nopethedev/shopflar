import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { slugify } from '@/lib/settings'

export async function PATCH(req, { params }) {
  params = await params
  try {
    await requireAdmin()
    const body = await req.json()
    const existing = await db.customPage.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    let slug = existing.slug
    if (body.slug && body.slug !== existing.slug) {
      slug = slugify(body.slug)
      const dup = await db.customPage.findUnique({ where: { slug } })
      if (dup && dup.id !== params.id) slug = `${slug}-${Date.now().toString(36).slice(-4)}`
    }

    const updated = await db.customPage.update({
      where: { id: params.id },
      data: {
        ...(body.title != null ? { title: body.title } : {}),
        ...(slug !== existing.slug ? { slug } : {}),
        ...(body.content !== undefined ? { content: body.content } : {}),
        ...(body.excerpt !== undefined ? { excerpt: body.excerpt || null } : {}),
        ...(body.status != null ? { status: body.status } : {}),
        ...(body.showInNav != null ? { showInNav: !!body.showInNav } : {}),
        ...(body.navLabel !== undefined ? { navLabel: body.navLabel || null } : {}),
        ...(body.sortOrder != null ? { sortOrder: parseInt(body.sortOrder) || 0 } : {}),
        ...(body.seoTitle !== undefined ? { seoTitle: body.seoTitle || null } : {}),
        ...(body.seoDescription !== undefined ? { seoDescription: body.seoDescription || null } : {})
      }
    })
    return NextResponse.json({ page: updated })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

export async function DELETE(_req, { params }) {
  params = await params
  try {
    await requireAdmin()
    await db.customPage.delete({ where: { id: params.id } })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
