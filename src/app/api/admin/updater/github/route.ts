import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
import { logEvent } from '@/lib/logs'

// GET /api/admin/updater/github — current repo settings + latest commit on the
// configured branch ("Check for updates" button in Admin → Updates).
export async function GET() {
  try {
    await requireSuperAdmin()

    const rows = await db.storeSetting.findMany({
      where: { key: { in: ['github_repo', 'github_branch', 'github_token'] } }
    })
    const map = new Map(rows.map(r => [r.key, r.value]))
    const repo = map.get('github_repo') || ''
    const branch = map.get('github_branch') || 'main'
    const hasToken = !!map.get('github_token')

    const result = { repo, branch, hasToken, commit: null, error: null }

    if (repo) {
      try {
        const clean = repo.replace(/^https:\/\/github\.com\//, '').replace(/\.git$/, '').replace(/\/$/, '')
        const res = await fetch(`https://api.github.com/repos/${clean}/commits/${encodeURIComponent(branch)}`, {
          headers: {
            'User-Agent': 'Shopflar-Updater',
            'Accept': 'application/vnd.github+json',
            ...(hasToken ? { 'Authorization': `Bearer ${map.get('github_token')}` } : {})
          },
          signal: AbortSignal.timeout(10000)
        })
        if (res.ok) {
          const c = await res.json()
          result.commit = {
            sha: c.sha?.slice(0, 7),
            url: c.html_url,
            message: c.commit?.message?.split('\n')[0]?.slice(0, 140),
            author: c.commit?.author?.name || c.author?.login || 'unknown',
            date: c.commit?.author?.date
          }
        } else if (res.status === 404) {
          result.error = 'Repository or branch not found. Check the owner/name and branch — private repos also need a token.'
        } else if (res.status === 401 || res.status === 403) {
          result.error = 'GitHub rejected the request (401/403). The token may be missing or expired.'
        } else {
          result.error = `GitHub responded with HTTP ${res.status}`
        }
      } catch (e) {
        result.error = `Could not reach GitHub: ${e.message}`
      }
    }

    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

// POST /api/admin/updater/github — save repo settings.
// Body: { repo, branch, token? } — token omitted = keep the saved one;
// token: '' = remove the saved token.
export async function POST(req) {
  try {
    const admin = await requireSuperAdmin()
    const body = await req.json().catch(() => ({}))

    const repo = String(body.repo || '').trim().replace(/^https:\/\/github\.com\//, '').replace(/\.git$/, '').replace(/\/$/, '')
    const branch = String(body.branch || 'main').trim() || 'main'

    const writes = []
    if ('repo' in body) {
      writes.push(db.storeSetting.upsert({
        where: { key: 'github_repo' },
        update: { value: repo },
        create: { key: 'github_repo', value: repo }
      }))
    }
    if ('branch' in body) {
      writes.push(db.storeSetting.upsert({
        where: { key: 'github_branch' },
        update: { value: branch },
        create: { key: 'github_branch', value: branch }
      }))
    }
    if ('token' in body) {
      writes.push(db.storeSetting.upsert({
        where: { key: 'github_token' },
        update: { value: String(body.token || '') },
        create: { key: 'github_token', value: String(body.token || '') }
      }))
    }
    await Promise.all(writes)

    await logEvent('settings.updated', {
      actorId: admin.id, actorEmail: admin.email,
      entity: 'settings',
      metadata: { section: 'updater.github', repo, branch, tokenChanged: 'token' in body },
      notify: false
    })

    return NextResponse.json({ ok: true, repo, branch })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
