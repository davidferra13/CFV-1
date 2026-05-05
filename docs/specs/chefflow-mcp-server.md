# ChefFlow MCP Server

> Agent-first infrastructure for ChefFlow. Makes the platform programmable by any AI agent, not just Remy.

**Status:** Spec  
**Priority:** P0  
**Inspired by:** Karpathy's Software 3.0 / agent-first infrastructure thesis

---

## The Problem

ChefFlow is 100% human-UI. Every operation requires a human navigating browser pages, clicking buttons, filling forms. Remy can act inside the app (24 write commands), but no external agent can discover or use ChefFlow programmatically.

In a Software 3.0 world, the chef's AI agent (Claude Code, Codex, a scheduled agent, a phone-based assistant) should be able to:

- "Create a dinner for the Johnsons next Saturday, 8 guests, no shellfish"
- "What's my schedule this week?"
- "Send arrival info to all ticket holders for the farm dinner"
- "How much did I spend on protein last month?"

Without opening a browser. Without going through Remy's chat interface. Through direct tool calls.

## The Solution

A ChefFlow MCP server that exposes the platform's capabilities as MCP tools. Runs as a stdio process (like ollama-delegate), connects to the same database, reuses existing server actions.

## Architecture

```
Claude Code / Codex / Any MCP Client
        |
        v
  ChefFlow MCP Server (stdio, Node.js)
        |
        v
  Existing Server Actions (lib/**/actions.ts)
        |
        v
  PostgreSQL (same database as the web app)
```

### Key decisions

1. **Reuse, don't rebuild.** Every MCP tool calls an existing server action. Zero new business logic.
2. **Auth via API key.** MCP server reads a tenant API key from env. All operations scoped to that tenant. No session/cookie auth.
3. **Approval tiers carry over.** Tier 1 tools execute immediately. Tier 2/3 tools return a draft/preview and require a confirmation call.
4. **Read-heavy, write-careful.** Most tools are reads. Writes follow the same safety model as Remy.
5. **Stdio transport.** Same pattern as ollama-delegate. Configured in `.claude/mcp.json`.

## Tool Design: Progressive Disclosure

500+ server actions is too many MCP tools. The server exposes ~30 tools organized by domain, using structured inputs to select sub-operations. Agents discover what they need through tool descriptions and a `chefflow_help` meta-tool.

### Phase 1: Core Operations (ship first)

#### Meta

| Tool              | Description                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------ |
| `chefflow_help`   | List available tools, describe capabilities, show examples for a domain                    |
| `chefflow_status` | Business health snapshot: upcoming events, open inquiries, overdue payments, schedule gaps |

#### Events

| Tool                       | Description                                                           |
| -------------------------- | --------------------------------------------------------------------- |
| `chefflow_events_list`     | List events with filters (upcoming, past, status, client, date range) |
| `chefflow_events_get`      | Get full event details by ID or by description ("the Johnson dinner") |
| `chefflow_events_create`   | Create an event. Returns draft for confirmation (tier 2)              |
| `chefflow_events_update`   | Update event fields (date, guests, location, notes, etc.)             |
| `chefflow_events_timeline` | Get prep timeline, day-of schedule, shopping windows for an event     |

#### Clients

| Tool                      | Description                                                |
| ------------------------- | ---------------------------------------------------------- |
| `chefflow_clients_list`   | List clients with filters (active, dormant, dietary needs) |
| `chefflow_clients_get`    | Get client details including dietary, history, preferences |
| `chefflow_clients_create` | Create a client (tier 2)                                   |
| `chefflow_clients_search` | Fuzzy search by name, dietary need, or last event          |

#### Menus

| Tool                    | Description                                      |
| ----------------------- | ------------------------------------------------ |
| `chefflow_menus_get`    | Get menu with courses, dishes, components, costs |
| `chefflow_menus_create` | Create a menu for an event (tier 2)              |
| `chefflow_menus_cost`   | Get cost breakdown for a menu                    |

#### Calendar

| Tool                             | Description                                                             |
| -------------------------------- | ----------------------------------------------------------------------- |
| `chefflow_calendar`              | Get calendar for a date range (events, blocked dates, travel, personal) |
| `chefflow_calendar_availability` | Check availability for a date/range                                     |
| `chefflow_calendar_block`        | Block a date (tier 1)                                                   |

#### Finance

| Tool                           | Description                                         |
| ------------------------------ | --------------------------------------------------- |
| `chefflow_finance_summary`     | Revenue, expenses, profit for a period              |
| `chefflow_finance_outstanding` | Overdue payments, expiring quotes, pending deposits |
| `chefflow_expenses_create`     | Log an expense (tier 2)                             |

#### Quotes

| Tool                     | Description                             |
| ------------------------ | --------------------------------------- |
| `chefflow_quotes_list`   | List quotes with filters                |
| `chefflow_quotes_create` | Create a quote from event data (tier 3) |

#### Communications

| Tool                         | Description                                                   |
| ---------------------------- | ------------------------------------------------------------- |
| `chefflow_draft_email`       | Draft an email (thank you, follow-up, payment reminder, etc.) |
| `chefflow_tickets_broadcast` | Draft a broadcast to ticket holders (tier 3)                  |
| `chefflow_send_arrival_info` | Send arrival logistics to event guests (tier 3)               |

#### Shopping & Prep

| Tool                     | Description                                             |
| ------------------------ | ------------------------------------------------------- |
| `chefflow_shopping_list` | Generate consolidated shopping list for upcoming events |
| `chefflow_prep_schedule` | Get prep schedule across events for a date range        |

#### Intelligence

| Tool                      | Description                                                            |
| ------------------------- | ---------------------------------------------------------------------- |
| `chefflow_pricing_lookup` | Look up ingredient pricing from PIE/OpenClaw                           |
| `chefflow_insights`       | Business insights: churn risk, rebooking predictions, capacity ceiling |

### Phase 2: Extended Operations (after Phase 1 is validated)

- `chefflow_inventory_*` (pantry, counts, reorder)
- `chefflow_staff_*` (scheduling, availability, payroll)
- `chefflow_tickets_*` (create ticket types, view sales, revenue split)
- `chefflow_recipes_*` (search, scale, cost)
- `chefflow_documents_generate` (invoice, contract, grocery list PDFs)
- `chefflow_commerce_*` (POS operations)
- `chefflow_campaigns_*` (marketing campaigns)
- `chefflow_collaboration_*` (co-host management)

### Phase 3: Agent Workflows

Compound tools that chain multiple operations:

- `chefflow_plan_event` - Full event planning: check availability, create event, build menu from client preferences, generate quote, draft proposal
- `chefflow_morning_briefing` - Today's events, prep needed, payments due, follow-ups overdue
- `chefflow_week_ahead` - Week planning with shopping consolidation, staff needs, revenue forecast
- `chefflow_client_prep` - Everything about a client before a call: history, preferences, dietary, past events, LTV

## Implementation

### File structure

```
.claude/mcp-servers/chefflow/
  server.mjs          # MCP server (same pattern as ollama-delegate)
  tools/              # Tool definitions grouped by domain
    meta.mjs
    events.mjs
    clients.mjs
    menus.mjs
    calendar.mjs
    finance.mjs
    quotes.mjs
    communications.mjs
    shopping.mjs
    intelligence.mjs
  auth.mjs            # API key validation, tenant resolution
  package.json
```

### Auth model

```js
// Environment variable in mcp.json
"env": {
  "CHEFFLOW_API_KEY": "<tenant-api-key>",
  "CHEFFLOW_DB_URL": "postgresql://..."
}

// auth.mjs resolves tenant from API key
// All queries scoped to that tenant's chef_id
```

API keys stored in a new `api_keys` table:

```sql
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id),
  key_hash TEXT NOT NULL,        -- bcrypt hash of the key
  name TEXT NOT NULL,            -- "Claude Code MCP", "Scheduled Agent"
  scopes TEXT[] DEFAULT '{}',    -- optional scope restrictions
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ
);
```

For Phase 1 (single-user, local only), skip the table. Use the chef's existing session or a hardcoded tenant ID from env. API key table comes when we need multi-tenant or remote access.

### Confirmation flow for tier 2/3

Tier 2/3 tools return a preview object instead of executing:

```json
{
  "status": "confirmation_required",
  "tier": 2,
  "action": "event.create",
  "preview": {
    "client": "Johnson Family",
    "date": "2026-05-10",
    "guests": 8,
    "restrictions": ["no shellfish"],
    "estimatedCost": "$1,200"
  },
  "confirmationId": "cf_abc123"
}
```

Agent then calls `chefflow_confirm` with the `confirmationId` to execute. This mirrors Remy's existing approval card pattern.

| Tool               | Description                                    |
| ------------------ | ---------------------------------------------- |
| `chefflow_confirm` | Execute a previously previewed tier 2/3 action |
| `chefflow_reject`  | Dismiss a previewed action                     |

### Database access

The MCP server imports from `lib/` directly (it's a Node.js process in the same repo). This means:

- Same Drizzle schema
- Same server actions (they're just functions)
- Same validation, same tenant scoping
- No HTTP overhead, no API versioning

The server needs the Next.js module resolution (`@/` paths), so it either:

1. Uses `tsx` to run with TypeScript + path aliases, or
2. Runs as a thin HTTP proxy to the running Next.js app's API routes

Option 1 is cleaner but requires `tsx` setup. Option 2 is simpler, just calls `localhost:3100/api/v2/*`. Start with option 2 for speed, migrate to option 1 if latency matters.

### Example: Option 2 (HTTP proxy to v2 API)

```js
const BASE = process.env.CHEFFLOW_URL || 'http://localhost:3100'
const API_KEY = process.env.CHEFFLOW_API_KEY

async function chefflowAPI(method, path, body) {
  const res = await fetch(`${BASE}/api/v2${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`ChefFlow API ${res.status}: ${await res.text()}`)
  return res.json()
}
```

## What This Enables

### Immediate (Phase 1)

- **Claude Code manages ChefFlow.** "Check my schedule this week" / "Create a dinner for..." / "What do I owe vendors?" without browser.
- **Scheduled agents.** Hermes or cron-based agents can query ChefFlow, generate reports, send alerts.
- **Voice assistant path.** Phone-based agent calls MCP tools instead of navigating UI.

### Near-term (Phase 2-3)

- **Conversation-driven operations.** Client texts chef. Agent creates event, checks dietary, builds menu, sends proposal. Zero UI.
- **Cross-system orchestration.** Agent reads ChefFlow schedule + OpenClaw prices + calendar, produces consolidated prep plan.
- **Delegation.** Chef says "handle the Johnson dinner" and agent chains: create event, pull past preferences, build menu, generate quote, draft email.

### Long-term

- **Client-facing agents.** Client's own AI agent discovers ChefFlow via MCP, checks availability, requests a booking.
- **LLM.txt on public pages.** Machine-readable event metadata so guest agents can RSVP, read menus, get logistics.

## What This Does NOT Do

- Replace Remy. Remy is the personality, the conversational layer, the chef's concierge. The MCP server is plumbing, not personality.
- Expose raw database. Everything goes through existing server actions with their validation, auth gates, and tenant scoping.
- Allow unauthenticated access. Every call requires a valid API key.

## Success Criteria

1. Claude Code can list upcoming events, create a client, and check calendar availability via MCP tools
2. A scheduled agent can generate a morning briefing without the web UI
3. Tool descriptions are clear enough that an agent with no prior knowledge of ChefFlow can discover and use them
4. Tier 2/3 operations require explicit confirmation before executing
5. Zero new business logic (all tools wrap existing server actions)

## Build Order

1. Scaffold server with `@modelcontextprotocol/sdk` (copy ollama-delegate pattern)
2. Add `chefflow_help` and `chefflow_status`
3. Add read tools: events_list, events_get, clients_list, calendar, finance_summary
4. Add write tools with confirmation flow: events_create, clients_create, expenses_create
5. Register in `.claude/mcp.json`
6. Test from Claude Code: "use the chefflow MCP to show my upcoming events"
7. Iterate on tool descriptions until agent discovery works cold

## Karpathy Alignment

| Karpathy Principle         | How This Delivers                                                                                                                  |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Agent-first infrastructure | Strips away human UI, makes ChefFlow directly usable by agents                                                                     |
| Verifiable domain          | Chef ops is deterministic, outputs are checkable (dates, costs, guest counts)                                                      |
| Context is the lever       | MCP tools expose the chef's full business context to any agent's context window                                                    |
| Software 3.0               | Enables workflows that couldn't exist before: conversation-driven event creation, cross-system orchestration, delegated operations |
| Build the brain            | ChefFlow becomes part of the agent's brain, not a separate app to log into                                                         |
