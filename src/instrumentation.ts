// Next.js instrumentation — runs once when the server boots (dev or start).
// Writes the server's PID to updates/server.pid so the auto-updater
// (Admin → Updates) can stop this exact process when applying an update.
// The NEXT_RUNTIME guard keeps the Edge runtime from executing Node APIs;
// the bundler warnings about node: imports are expected and harmless.
import fs from 'node:fs'
import path from 'node:path'

export function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  try {
    const dir = path.join(process.cwd(), 'updates')
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(
      path.join(dir, 'server.pid'),
      JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() })
    )
  } catch (e) {
    // Never break the server because of this
    console.warn('[instrumentation] could not write server.pid:', e?.message)
  }
}
