import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendNewsletterWelcome } from '@/lib/email'
import { generateOrderNumber } from '@/lib/settings'

export async function POST(req) {
  try {
    const { email, name, source } = await req.json()
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    const cleanEmail = email.toLowerCase().trim()
    const existing = await db.newsletterSubscriber.findUnique({ where: { email: cleanEmail } })
    if (existing) {
      return NextResponse.json({ ok: true, alreadySubscribed: true })
    }

    await db.newsletterSubscriber.create({
      data: {
        email: cleanEmail,
        name: name || null,
        source: source || 'STOREFRONT'
      }
    })

    // Check if welcome email with discount is enabled
    const welcomeEnabled = await getSetting('newsletter_welcome_enabled')
    if (welcomeEnabled === 'true') {
      const percent = parseInt(await getSetting('newsletter_welcome_discount_percent') || '10')
      const prefix = (await getSetting('newsletter_welcome_code_prefix') || 'WELCOME').toUpperCase()

      // Generate a unique discount code
      const suffix = Math.random().toString(36).slice(2, 8).toUpperCase()
      const code = `${prefix}-${suffix}`

      // Create the discount in the DB
      await db.discount.create({
        data: {
          code,
          type: 'PERCENTAGE',
          value: percent,
          usageLimit: 1,            // single use
          perCustomerLimit: 1,
          isActive: true,
          startDate: new Date(),
          endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30) // 30 days
        }
      })

      // Send welcome email with the code
      const emailResult = await sendNewsletterWelcome(cleanEmail, code, percent)
      if (emailResult.success) {
        return NextResponse.json({ ok: true, welcomeEmailSent: true, discountCode: code })
      } else {
        return NextResponse.json({ ok: true, welcomeEmailFailed: true, error: emailResult.error })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Newsletter subscribe error:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

async function getSetting(key) {
  try {
    const row = await db.storeSetting.findUnique({ where: { key } })
    return row?.value || ''
  } catch {
    return ''
  }
}
