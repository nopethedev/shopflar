import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { slugify } from '@/lib/settings'

export async function PATCH(req, { params }) {
  params = await params
  try {
    await requireAdmin()
    const body = await req.json()
    const existing = await db.category.findUnique({ where: { id: params.id } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    let slug = existing.slug
    if (body.slug && body.slug !== existing.slug) {
      slug = slugify(body.slug)
      const dup = await db.category.findUnique({ where: { slug } })
      if (dup && dup.id !== params.id) slug = `${slug}-${Date.now().toString(36).slice(-4)}`
    }

    const updated = await db.category.update({
      where: { id: params.id },
      data: {
        ...(body.name != null ? { name: body.name } : {}),
        ...(slug !== existing.slug ? { slug } : {}),
        ...(body.description !== undefined ? { description: body.description || null } : {}),
        ...(body.imageUrl !== undefined ? { imageUrl: body.imageUrl || null } : {}),
        ...(body.parentId !== undefined ? { parentId: body.parentId || null } : {}),
        ...(body.isVisible != null ? { isVisible: !!body.isVisible } : {}),
        ...(body.sortOrder != null ? { sortOrder: parseInt(body.sortOrder) || 0 } : {})
      }
    })
    return NextResponse.json({ category: updated })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

export async function DELETE(_req, { params }) {
  params = await params
  try {
    await requireAdmin()
    // Unlink products before delete
    await db.productCategory.deleteMany({ where: { categoryId: params.id } })
    await db.category.delete({ where: { id: params.id } }).catch(() => {})
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
