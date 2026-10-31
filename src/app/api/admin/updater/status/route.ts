import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import fs from 'node:fs'
import path from 'node:path'

const appDir = process.cwd()
const updatesDir = path.join(appDir, 'updates')

function readJsonSafe(file) {
  try { return JSON.parse(fs.readFileSync(path.join(updatesDir, file), 'utf8')) } catch { return null }
}

// GET /api/admin/updater/status — polled by the admin UI while an update runs.
// Note: while the server restarts this endpoint briefly fails; the UI treats
// fetch errors as "server restarting".
export async function GET() {
  try {
    await requireAdmin()

    let version = null
    try { version = JSON.parse(fs.readFileSync(path.join(appDir, 'package.json'), 'utf8')).version } catch {}

    const state = readJsonSafe('state.json')
    const lastUpdate = readJsonSafe('last-update.json')
    const pending = readJsonSafe('pending.json')

    let pendingZip = null
    if (fs.existsSync(path.join(updatesDir, 'pending.zip'))) {
      const st = fs.statSync(path.join(updatesDir, 'pending.zip'))
      pendingZip = { size: st.size, mtime: st.mtimeMs, ...(pending || {}) }
    }

    // Server PID (written by instrumentation on boot)
    let serverPid = null
    let serverPidAlive = false
    try {
      serverPid = JSON.parse(fs.readFileSync(path.join(updatesDir, 'server.pid'), 'utf8')).pid
      process.kill(serverPid, 0)
      serverPidAlive = true
    } catch {}

    return NextResponse.json({
      version,
      state,
      lastUpdate,
      pendingZip,
      serverPid: serverPidAlive ? serverPid : null,
      now: new Date().toISOString()
    })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

// DELETE /api/admin/updater/status — remove the uploaded pending package
export async function DELETE() {
  try {
    await requireSuperAdmin()
    for (const f of ['pending.zip', 'pending.json']) {
      try { fs.unlinkSync(path.join(updatesDir, f)) } catch {}
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
