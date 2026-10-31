import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth'
import fs from 'node:fs'
import path from 'node:path'

const updatesDir = path.join(process.cwd(), 'updates')
const MAX_ZIP_BYTES = 500 * 1024 * 1024 // 500 MB

// POST /api/admin/updater — upload an update package (.zip)
export async function POST(req) {
  try {
    await requireSuperAdmin()
    const form = await req.formData()
    const file = form.get('file')
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }
    if (!file.name.toLowerCase().endsWith('.zip')) {
      return NextResponse.json({ error: 'Only .zip packages are supported' }, { status: 400 })
    }
    const buf = Buffer.from(await file.arrayBuffer())
    if (buf.length < 1000) {
      return NextResponse.json({ error: 'File is too small to be an update package' }, { status: 400 })
    }
    if (buf.length > MAX_ZIP_BYTES) {
      return NextResponse.json({ error: 'Package is larger than 500 MB' }, { status: 400 })
    }
    // Zip magic bytes: PK\x03\x04
    if (buf.readUInt32LE(0) !== 0x04034b50) {
      return NextResponse.json({ error: 'This is not a valid zip archive' }, { status: 400 })
    }

    fs.mkdirSync(updatesDir, { recursive: true })
    fs.writeFileSync(path.join(updatesDir, 'pending.zip'), buf)
    fs.writeFileSync(
      path.join(updatesDir, 'pending.json'),
      JSON.stringify({ originalName: file.name, size: buf.length, uploadedAt: new Date().toISOString() })
    )

    return NextResponse.json({ ok: true, filename: file.name, size: buf.length })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
