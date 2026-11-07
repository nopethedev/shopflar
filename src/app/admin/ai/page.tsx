import { db } from '@/lib/db'
import { getAiConfig, maskApiKey } from '@/lib/ai'
import { AiAssistant } from '@/components/admin/ai-assistant'

export const dynamic = 'force-dynamic'

export default async function AdminAiPage() {
  const [config, settings] = await Promise.all([
    getAiConfig(),
    db.storeSetting.findMany({ where: { key: 'store_name' } })
  ])
  const storeName = settings[0]?.value || 'your store'

  return (
    <AiAssistant
      storeName={storeName}
      initialSettings={{
        hasKey: !!config.apiKey,
        maskedKey: maskApiKey(config.apiKey),
        baseUrl: config.baseUrl,
        model: config.model,
        source: config.source
      }}
    />
  )
}
