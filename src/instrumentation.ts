// Next.js instrumentation — runs once when the server boots (dev or start).
// Writes the server's PID to updates/server.pid so the auto-updater
// (Admin → Updates) can stop this exact process when applying an update.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  try {
    const fs = await import('node:fs')
    const path = await import('node:path')
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
