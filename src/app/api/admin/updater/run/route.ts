import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth'
import { db } from '@/lib/db'
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

const appDir = process.cwd()
const updatesDir = path.join(appDir, 'updates')

// POST /api/admin/updater/run — start applying an update.
// Spawns scripts/updater.mjs fully detached so it survives the server restart
// it performs itself.
// Body: { source?: 'zip' | 'github', repo?, branch?, rebuild, npmInstall, mergeDeps }
// For source=github the repo/branch/token come from store settings
// (github_repo / github_branch / github_token) unless overridden in the body.
export async function POST(req) {
  try {
    await requireSuperAdmin()
    const body = await req.json().catch(() => ({}))

    // Refuse to start while an update is already running
    const stateFile = path.join(updatesDir, 'state.json')
    if (fs.existsSync(stateFile)) {
      try {
        const st = JSON.parse(fs.readFileSync(stateFile, 'utf8'))
        if (st.status === 'running') {
          return NextResponse.json({ error: 'An update is already running' }, { status: 409 })
        }
      } catch {}
    }

    // The updater overwrites the app files while running — run a COPY of the
    // script so the running process can't be affected by its own replacement.
    const runnerPath = path.join(updatesDir, 'runner.mjs')
    fs.mkdirSync(updatesDir, { recursive: true })
    fs.copyFileSync(path.join(appDir, 'scripts', 'updater.mjs'), runnerPath)

    const args = [runnerPath]
    const childEnv = { ...process.env }

    if (body.source === 'github') {
      // Pull the update package from GitHub (main branch or configured branch)
      const rows = await db.storeSetting.findMany({
        where: { key: { in: ['github_repo', 'github_branch', 'github_token'] } }
      })
      const map = new Map(rows.map(r => [r.key, r.value]))
      const repo = body.repo || map.get('github_repo') || ''
      const branch = body.branch || map.get('github_branch') || 'main'
      if (!repo) {
        return NextResponse.json({ error: 'No GitHub repository configured. Set it under "Update from GitHub" first.' }, { status: 400 })
      }
      args.push('--github', '--repo', repo, '--branch', branch)
      // Token travels via env (not argv) so it never shows up in /proc/*/cmdline
      const token = body.token || map.get('github_token') || ''
      if (token) childEnv.GITHUB_TOKEN = token
    } else {
      const zipPath = path.join(updatesDir, 'pending.zip')
      if (!fs.existsSync(zipPath)) {
        return NextResponse.json({ error: 'No update package uploaded yet' }, { status: 400 })
      }
      args.push('updates/pending.zip')
    }

    if (body.rebuild) args.push('--rebuild')
    if (body.npmInstall) args.push('--npm-install')
    if (body.mergeDeps === false) args.push('--no-merge-deps')

    const out = fs.openSync(path.join(updatesDir, 'runner-spawn.log'), 'a')
    const child = spawn(process.execPath, args, {
      cwd: appDir,
      detached: true,
      stdio: ['ignore', out, out],
      env: childEnv
    })
    child.unref()

    return NextResponse.json({ started: true, pid: child.pid })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
