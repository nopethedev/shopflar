import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth'
import { exec } from 'child_process'

export async function POST() {
  try {
    await requireSuperAdmin()
    await new Promise((resolve, reject) => {
      exec('cd /home/z/my-project && bun scripts/seed.js', (err) => {
        if (err) return reject(err)
        resolve()
      })
    })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
