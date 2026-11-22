// Minimal MCP server over Streamable HTTP (stateless JSON responses).
// Implements initialize / ping / tools/list / tools/call, which is all that
// Claude Desktop, Claude Code and other MCP clients need for tools.
import { z } from 'zod'
import { TOOL_BY_NAME, ToolError, toolDescriptors } from './tools'
import type { VerifiedKey } from './keys'
import { rateLimited } from './keys'

const SUPPORTED = ['2025-06-18', '2025-03-26', '2024-11-05']

const INSTRUCTIONS = `You are connected to a Shopflar store. Start with store_overview. \
Products and campaigns are created as drafts; theme-editor changes stay drafts until publish_page. \
Prefer list_* / get_* tools before changing anything, and confirm destructive-looking changes with the user.`

type RpcRequest = { jsonrpc: '2.0'; id?: string | number | null; method: string; params?: any }

const ok = (id: any, result: unknown) => ({ jsonrpc: '2.0', id, result })
const err = (id: any, code: number, message: string) => ({ jsonrpc: '2.0', id: id ?? null, error: { code, message } })

export async function handleRpc(msg: RpcRequest, key: VerifiedKey): Promise<object | null> {
  if (!msg || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') return err(msg?.id, -32600, 'Invalid Request')
  const isNotification = msg.id === undefined || msg.id === null

  switch (msg.method) {
    case 'initialize': {
      const requested = msg.params?.protocolVersion
      return ok(msg.id, {
        protocolVersion: SUPPORTED.includes(requested) ? requested : SUPPORTED[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'shopflar', title: 'Shopflar store', version: '1.0.0' },
        instructions: INSTRUCTIONS
      })
    }
    case 'ping':
      return ok(msg.id, {})
    case 'tools/list':
      return ok(msg.id, { tools: toolDescriptors(key.scope) })
    case 'tools/call': {
      const tool = TOOL_BY_NAME[msg.params?.name]
      if (!tool) return err(msg.id, -32602, `Unknown tool: ${msg.params?.name}`)
      if (rateLimited(key.id)) {
        return ok(msg.id, { isError: true, content: [{ type: 'text', text: 'Rate limit reached (120 calls/minute). Wait a moment and retry.' }] })
      }
      if (tool.write && key.scope !== 'write') {
        return ok(msg.id, { isError: true, content: [{ type: 'text', text: `This API key is read-only. Create a "write" key in Admin → App Library → MCP server to use ${tool.name}.` }] })
      }
      const parsed = tool.schema.safeParse(msg.params?.arguments ?? {})
      if (!parsed.success) {
        const issues = parsed.error.issues.map(i => `${i.path.join('.') || 'input'}: ${i.message}`).join('; ')
        return ok(msg.id, { isError: true, content: [{ type: 'text', text: `Invalid arguments — ${issues}` }] })
      }
      try {
        const result = await tool.handler(parsed.data, { key })
        return ok(msg.id, { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] })
      } catch (e: any) {
        // Tool errors are shown to the model; unexpected ones are logged and generalised
        if (!(e instanceof ToolError)) console.error(`MCP tool ${tool.name} failed:`, e)
        const text = e instanceof ToolError ? e.message : `Something went wrong running ${tool.name}.`
        return ok(msg.id, { isError: true, content: [{ type: 'text', text }] })
      }
    }
    default:
      // Notifications (initialized, cancelled, …) need no response
      if (isNotification) return null
      return err(msg.id, -32601, `Method not found: ${msg.method}`)
  }
}
