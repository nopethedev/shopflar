import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { getAiConfig, maskApiKey, DEFAULT_BASE_URL, DEFAULT_MODEL } from '@/lib/ai'
import { logEvent } from '@/lib/logs'

// Never returns the raw key — only whether one exists and a masked preview.
export async function GET() {
  try {
    await requireAdmin()
    const config = await getAiConfig()
    return NextResponse.json({
      hasKey: !!config.apiKey,
      maskedKey: maskApiKey(config.apiKey),
      baseUrl: config.baseUrl,
      model: config.model,
      source: config.source
    })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}

export async function POST(req) {
  try {
    const admin = await requireAdmin()
    const body = await req.json()

    const upsert = async (key: string, value: string) => {
      await db.storeSetting.upsert({
        where: { key },
        update: { value },
        create: { key, value }
      })
    }

    if (body.baseUrl !== undefined) {
      const baseUrl = String(body.baseUrl || DEFAULT_BASE_URL).trim().replace(/\/+$/, '')
      if (!/^https?:\/\/.+/i.test(baseUrl)) {
        return NextResponse.json({ error: 'The API base URL must start with http:// or https://' }, { status: 400 })
      }
      await upsert('ai_base_url', baseUrl)
    }

    if (body.model !== undefined) {
      const model = String(body.model || DEFAULT_MODEL).trim().slice(0, 120)
      await upsert('ai_model', model || DEFAULT_MODEL)
    }

    // An empty apiKey means "keep the existing key"; clearKey removes it.
    if (body.clearKey) {
      await upsert('ai_api_key', '')
    } else if (typeof body.apiKey === 'string' && body.apiKey.trim()) {
      const apiKey = body.apiKey.trim()
      if (apiKey.length < 8 || /\s/.test(apiKey)) {
        return NextResponse.json({ error: 'That API key does not look valid.' }, { status: 400 })
      }
      await upsert('ai_api_key', apiKey)
    }

    await logEvent('settings.updated', {
      actorId: admin.id, actorEmail: admin.email,
      entity: 'ai',
      metadata: {
        baseUrl: body.baseUrl !== undefined ? String(body.baseUrl).slice(0, 200) : undefined,
        model: body.model !== undefined ? String(body.model).slice(0, 120) : undefined,
        apiKeyChanged: !!(body.apiKey || body.clearKey)
      },
      notify: false
    })

    const config = await getAiConfig()
    return NextResponse.json({
      ok: true,
      hasKey: !!config.apiKey,
      maskedKey: maskApiKey(config.apiKey),
      baseUrl: config.baseUrl,
      model: config.model,
      source: config.source
    })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 })
  }
}
