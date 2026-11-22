import { getAppState } from '@/lib/apps'
import { listApiKeys } from '@/lib/mcp/keys'
import { TOOLS } from '@/lib/mcp/tools'
import { absoluteUrlFromEnv } from '@/lib/app-url'
import { AdminMcpManager } from '@/components/admin/admin-mcp-manager'

export const dynamic = 'force-dynamic'

export default async function McpPage() {
  const [state, keys] = await Promise.all([getAppState('mcp-server'), listApiKeys()])
  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">MCP server for Claude</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Let Claude run your store: create products, launch discount codes, draft campaigns and redesign pages by chatting. Uses the open Model Context Protocol.
        </p>
      </div>
      <AdminMcpManager
        enabled={state.enabled}
        initialKeys={keys}
        endpoint={`${absoluteUrlFromEnv()}/api/mcp`}
        tools={TOOLS.map(t => ({ name: t.name, description: t.description, write: t.write }))}
      />
    </div>
  )
}
