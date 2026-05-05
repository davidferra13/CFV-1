// GET /api/llm-txt
// Machine-readable platform description for AI agents.
// No auth required. Cached for 24h.

import { NextResponse } from 'next/server'

const LLM_TXT = `# ChefFlow
> Private chef operations platform. Manage events, clients, menus, quotes, and finances.

## What this platform does
ChefFlow is a business management platform for private chefs and food service professionals. Chefs use it to manage their entire operation: client relationships, event planning, menu creation, quoting, scheduling, inventory, and financial tracking.

## For AI agents
ChefFlow exposes a REST API (v2) for programmatic access. Authenticated agents can:
- List and create events, clients, menus, quotes
- Search across all data
- Get financial summaries
- Manage staff and inventory

## API access
- Base URL: /api/v2/
- Auth: Bearer token (API key with cf_live_ prefix)
- Format: JSON request/response
- Rate limit: 100 req/min per tenant
- Pagination: ?page=1&per_page=50

## Available endpoints
- GET /api/v2/events - List events (filter by status, client, date range)
- GET /api/v2/clients - List clients (search by name, filter by status)
- GET /api/v2/menus - List menus (filter by event)
- GET /api/v2/quotes - List quotes (filter by status, event, client)
- GET /api/v2/recipes - List recipes (search by name, filter by category/cuisine)
- GET /api/v2/staff - List staff (filter by role)
- GET /api/v2/inventory - Stock summary or transaction history
- GET /api/v2/inquiries - List incoming leads
- GET /api/v2/expenses - List expenses (filter by event, category, date)
- GET /api/v2/financials/summary - Revenue, expenses, profit
- GET /api/v2/search?q=term - Cross-entity search

## MCP server
ChefFlow ships an MCP (Model Context Protocol) server for direct tool-call integration with Claude Code, Codex, and other MCP-compatible agents.

## Contact
For API key provisioning, contact the platform administrator.
`

export async function GET() {
  return new NextResponse(LLM_TXT.trim(), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  })
}
