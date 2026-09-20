import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth'
import { exec } from 'child_process'

export async function POST() {
  try {
    await requireSuperAdmin()
    await new Promise((resolve, reject) => {
      // Try npm first, fall back to bun if available
      exec('node scripts/seed.js', { cwd: process.cwd() }, (err) => {
        if (err) return reject(err)
        resolve()
      })
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
