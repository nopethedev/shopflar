import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { db } from '@/lib/db'

function parseIntSafe(v, dflt) {
  const n = parseInt(v, 10)
  return Number.isFinite(n) && n > 0 ? n : dflt
}

// GET /api/admin/logs?type=activity|emails&page=1&q=&status=
// Returns one page (25 rows) of either the activity log (audit_logs) or the
// email log (email_logs), newest first.
export async function GET(req) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') === 'emails' ? 'emails' : 'activity'
    const page = parseIntSafe(searchParams.get('page'), 1)
    const q = (searchParams.get('q') || '').trim()
    const status = (searchParams.get('status') || '').trim()
    const PER = 25

    if (type === 'emails') {
      const where = {}
      if (status && ['sent', 'failed'].includes(status)) where.status = status
      if (q) {
        where.OR = [
          { to: { contains: q } },
          { subject: { contains: q } }
        ]
      }
      const [total, rows] = await Promise.all([
        db.emailLog.count({ where }),
        db.emailLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * PER,
          take: PER,
          select: {
            id: true, to: true, subject: true, status: true, error: true, createdAt: true
          }
        })
      ])
      return NextResponse.json({ type, page, perPage: PER, total, rows })
    }

    // Activity
    const where = {}
    if (q) {
      where.OR = [
        { action: { contains: q } },
        { actorEmail: { contains: q } },
        { entity: { contains: q } }
      ]
    }
    const [total, rows] = await Promise.all([
      db.auditLog.count({ where }),
      db.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * PER,
        take: PER
      })
    ])
    return NextResponse.json({ type, page, perPage: PER, total, rows })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

// GET a single email's body — /api/admin/logs?emailId=<id>
export async function POST(req) {
  try {
    await requireAdmin()
    const body = await req.json().catch(() => ({}))
    if (!body.emailId) return NextResponse.json({ error: 'emailId required' }, { status: 400 })
    const row = await db.emailLog.findUnique({ where: { id: body.emailId } })
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ email: row })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

// DELETE /api/admin/logs?type=activity|emails[&beforeDays=30] — clear logs
export async function DELETE(req) {
  try {
    await requireAdmin()
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') === 'emails' ? 'emails' : 'activity'
    const days = parseIntSafe(searchParams.get('beforeDays'), 0)

    const cutoff = days > 0 ? new Date(Date.now() - days * 24 * 60 * 60 * 1000) : null
    const opts = cutoff ? { where: { createdAt: { lt: cutoff } } } : {}

    const count = type === 'emails'
      ? await db.emailLog.deleteMany(opts).then(r => r.count)
      : await db.auditLog.deleteMany(opts).then(r => r.count)

    return NextResponse.json({ ok: true, deleted: count })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
