import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { setPaymentSetting, getPaymentSettings } from '@/lib/payments'

export async function GET() {
  await requireAdmin()
  const settings = await getPaymentSettings()
  return NextResponse.json({ settings })
}

export async function PATCH(req) {
  try {
    await requireAdmin()
    const { key, value } = await req.json()
    await setPaymentSetting(key, value)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
