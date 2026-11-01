import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

// POST /api/upload — admin-only file upload.
// Used by the shared <FileUpload> component across the admin (newsletter
// editor, page builder, product editor, appearance, store mode).
// Stores files under public/uploads/<images|files>/ and returns a
// root-relative URL so the same file works in emails (made absolute at
// render time via the store URL) and on the storefront.

const IMAGE_EXTS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.avif', '.svg', '.ico']
const MAX_BYTES = 25 * 1024 * 1024 // 25 MB

function extOf(name) {
  const i = name.lastIndexOf('.')
  return i === -1 ? '' : name.slice(i).toLowerCase()
}

function safeBase(name) {
  const i = name.lastIndexOf('.')
  const base = i === -1 ? name : name.slice(0, i)
  return (
    base
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'file'
  )
}

export async function POST(req) {
  try {
    await requireAdmin()

    const form = await req.formData()
    const file = form.get('file')
    const type = String(form.get('type') || 'image')

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const ext = extOf(file.name || '')
    if (type === 'image' && !IMAGE_EXTS.includes(ext)) {
      return NextResponse.json(
        { error: `Unsupported image type "${ext || 'unknown'}" — use PNG, JPG, WEBP, GIF, AVIF, SVG or ICO` },
        { status: 400 }
      )
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File too large (max 25 MB)' }, { status: 400 })
    }

    const sub = type === 'image' ? 'images' : 'files'
    const dir = path.join(process.cwd(), 'public', 'uploads', sub)
    fs.mkdirSync(dir, { recursive: true })

    const filename = `${safeBase(file.name || 'file')}-${Date.now().toString(36)}-${crypto
      .randomBytes(4)
      .toString('hex')}${ext}`
    const buf = Buffer.from(await file.arrayBuffer())
    fs.writeFileSync(path.join(dir, filename), buf)

    const url = `/uploads/${sub}/${filename}`
    return NextResponse.json({ ok: true, url, filename })
  } catch (e) {
    if (e && e.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: e?.message || 'Upload failed' }, { status: 500 })
  }
}
