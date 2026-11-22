# MCP server — run your store from Claude

Shopflar ships a built-in [Model Context Protocol](https://modelcontextprotocol.io) server. Connect Claude (or any MCP
client) and manage the store in plain language: *"Add three draft products for a summer sock collection, create a
15% code SUMMER15 until Aug 31, and put a promo-tiles section on the home page."*

## Set up (2 minutes)

1. **Admin → App Library → MCP server for Claude** → create an API key (**Read & write** to build things,
   **Read only** for reporting). The key (`sfk_…`) is shown **once**; only its SHA-256 hash is stored.
2. Connect a client. The endpoint is `https://YOUR-STORE/api/mcp` (Streamable HTTP, JSON-RPC over `POST`).

**Claude Code**

```bash
claude mcp add --transport http shopflar https://YOUR-STORE/api/mcp \
  --header "Authorization: Bearer sfk_YOUR_KEY"
```

**Claude Desktop** (`claude_desktop_config.json`, needs Node.js)

```json
{
  "mcpServers": {
    "shopflar": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://YOUR-STORE/api/mcp", "--header", "Authorization: Bearer sfk_YOUR_KEY"]
    }
  }
}
```

Running locally? Use `http://localhost:3000/api/mcp`. For remote use, put the store behind HTTPS and set `APP_URL`.

## Tools

| | Tool | What it does |
|---|---|---|
| read | `store_overview` | Counts, 30-day revenue, low stock, active theme |
| read | `list_products`, `get_product`, `list_categories` | Browse the catalog |
| read | `list_orders`, `get_order`, `list_discounts`, `list_pages`, `list_campaigns` | Operations data |
| read | `list_section_types`, `get_page_layout` | Theme-editor blocks and a page's current draft layout |
| write | `create_category`, `create_product`, `update_product`, `archive_product` | Catalog (products start as **drafts**) |
| write | `create_discount`, `set_discount_active` | Promotions |
| write | `create_page`, `update_page` | Custom pages (draft by default) |
| write | `create_campaign` | Newsletter campaign **draft** |
| write | `update_order` | Status, tracking number/carrier, internal note |
| write | `add_section`, `update_section`, `remove_section`, `reorder_sections` | Design pages with theme-editor blocks (drafts) |
| write | `publish_page`, `discard_page_changes` | Make section drafts live / throw them away |

## Safety model

- **Opt-in**: the endpoint returns 403 until the app is enabled in the App Library.
- **Scoped keys**: read-only keys cannot even see write tools. Revoke a key at any time.
- **Drafts first**: products, pages and campaigns are created as drafts; theme edits stay drafts until `publish_page`.
- **No irreversible actions**: nothing deletes products (they're archived), sends email, issues refunds or moves money.
  Campaigns are reviewed and sent by a human in **Admin → Campaigns**.
- **Sanitised input**: HTML and URLs from the model go through the same sanitiser as the admin UI.
- **Audit trail**: every write is logged in **Admin → Logs** as `mcp:<key name>`.
- **Rate limit**: 120 calls/minute per key.

Add your own tools in `src/lib/mcp/tools.ts` — each is a zod schema plus a handler.
