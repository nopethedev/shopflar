import { NextResponse } from 'next/server'

// Best-effort cart sync — just accept any payload (logged-in user syncing can be implemented later)
export async function POST() {
  return NextResponse.json({ ok: true })
}
