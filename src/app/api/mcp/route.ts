import { NextResponse } from 'next/server'
import { getAppState } from '@/lib/apps'
import { verifyBearer } from '@/lib/mcp/keys'
import { handleRpc } from '@/lib/mcp/server'

export const dynamic = 'force-dynamic'

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

// MCP over Streamable HTTP: POST a JSON-RPC message (or batch), get JSON back.
export async function POST(req: Request) {
  const { enabled } = await getAppState('mcp-server')
  if (!enabled) {
    return json({ jsonrpc: '2.0', id: null, error: { code: -32000, message: 'The MCP server is disabled. Enable it in Admin → App Library → MCP server.' } }, 403)
  }
  const key = await verifyBearer(req.headers.get('authorization'))
  if (!key) {
    return NextResponse.json(
      { jsonrpc: '2.0', id: null, error: { code: -32001, message: 'Unauthorized: send "Authorization: Bearer sfk_…" with a key from Admin → App Library → MCP server.' } },
      { status: 401, headers: { 'WWW-Authenticate': 'Bearer realm="shopflar-mcp"', 'Cache-Control': 'no-store' } }
    )
  }

  let body: any
  try { body = await req.json() } catch { return json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, 400) }

  if (Array.isArray(body)) {
    const out = (await Promise.all(body.slice(0, 20).map(m => handleRpc(m, key)))).filter(Boolean)
    return out.length ? json(out) : new NextResponse(null, { status: 202 })
  }
  const res = await handleRpc(body, key)
  return res ? json(res) : new NextResponse(null, { status: 202 })
}

// No server-initiated stream and no sessions to terminate
export async function GET() {
  return new NextResponse(null, { status: 405, headers: { Allow: 'POST' } })
}
export async function DELETE() {
  return new NextResponse(null, { status: 405, headers: { Allow: 'POST' } })
}
