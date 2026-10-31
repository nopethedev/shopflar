import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth'
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

const appDir = process.cwd()
const updatesDir = path.join(appDir, 'updates')

// POST /api/admin/updater/run — start applying the uploaded update package.
// Spawns scripts/updater.mjs fully detached so it survives the server restart
// it performs itself. Body: { rebuild, npmInstall, mergeDeps }
export async function POST(req) {
  try {
    await requireSuperAdmin()
    const body = await req.json().catch(() => ({}))

    const zipPath = path.join(updatesDir, 'pending.zip')
    if (!fs.existsSync(zipPath)) {
      return NextResponse.json({ error: 'No update package uploaded yet' }, { status: 400 })
    }

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

    const args = [runnerPath, 'updates/pending.zip']
    if (body.rebuild) args.push('--rebuild')
    if (body.npmInstall) args.push('--npm-install')
    if (body.mergeDeps === false) args.push('--no-merge-deps')

    const out = fs.openSync(path.join(updatesDir, 'runner-spawn.log'), 'a')
    const child = spawn(process.execPath, args, {
      cwd: appDir,
      detached: true,
      stdio: ['ignore', out, out],
      env: process.env
    })
    child.unref()

    return NextResponse.json({ started: true, pid: child.pid })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
