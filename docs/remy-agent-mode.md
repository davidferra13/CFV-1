# Remy Agent Mode — Implementation Doc

## What Changed

Remy has been upgraded from a **read + draft** assistant to a **full agent** that can perform write actions on the chef's behalf. Every mutating action goes through a confirmation step — Remy proposes, the chef reviews and approves.

## Architecture

### Action Registry (`lib/ai/agent-registry.ts`)

A declarative registry replacing the hardcoded switch statement for new actions. Each action defines:

- `executor()` — prepares the action, validates inputs, builds a preview card
- `commitAction()` — executes the real server action on chef approval

### Agent Actions (`lib/ai/agent-actions/`)

30+ new write actions across 8 domain files:

- **client-actions.ts** — Create client, update client, invite client
- **event-actions.ts** — Create event, update event, transition event
- **inquiry-actions.ts** — Log inquiry, transition inquiry, convert to event
- **recipe-actions.ts** — Create recipe, update recipe, add ingredient
- **menu-actions.ts** — Create menu, link menu to event
- **quote-actions.ts** — Create quote, transition quote
- **operations-actions.ts** — Schedule call, create todo, log expense
- **restricted-actions.ts** — Ledger writes, role changes, deletes (always blocked with explanation)

### Safety Tiers

- **Reversible** (green) — Creates and field updates. Easy to undo.
- **Significant** (amber + warnings) — State transitions, linking records.
- **Restricted** (red) — Ledger, roles, deletes. Returns explanation + how to do it manually.

### UI Components

- **AgentConfirmationCard** (`components/ai/agent-confirmation-card.tsx`) — Rich preview card with approve/edit/dismiss
- **RemyCapabilitiesPanel** (`components/ai/remy-capabilities-panel.tsx`) — Info panel showing everything Remy can do

## Files Modified

- `lib/ai/command-types.ts` — Added `AgentActionPreview` type
- `lib/ai/remy-types.ts` — Added `preview` field to `RemyTaskResult`
- `lib/ai/command-orchestrator.ts` — Registry integration in `executeSingleTask()` and `approveTask()`
- `lib/ai/command-task-descriptions.ts` — Agent actions appended to Ollama prompt
- `lib/ai/command-intent-parser.ts` — New rules for agent.\* task routing
- `components/ai/remy-task-card.tsx` — Renders confirmation cards when preview exists
- `components/ai/remy-drawer.tsx` — Info button + capabilities panel overlay
- `app/api/remy/stream/route.ts` — Passes preview data in SSE events

## Files Created

- `lib/ai/agent-registry.ts`
- `lib/ai/agent-actions/index.ts`
- `lib/ai/agent-actions/client-actions.ts`
- `lib/ai/agent-actions/event-actions.ts`
- `lib/ai/agent-actions/inquiry-actions.ts`
- `lib/ai/agent-actions/recipe-actions.ts`
- `lib/ai/agent-actions/menu-actions.ts`
- `lib/ai/agent-actions/quote-actions.ts`
- `lib/ai/agent-actions/operations-actions.ts`
- `lib/ai/agent-actions/restricted-actions.ts`
- `components/ai/agent-confirmation-card.tsx`
- `components/ai/remy-capabilities-panel.tsx`

## How It Works

1. Chef tells Remy: "Add a client named Sarah Johnson, email sarah@example.com, gluten free"
2. Intent parser routes to `agent.create_client` (always tier 2)
3. Executor parses NL via Ollama → builds structured preview
4. Drawer renders AgentConfirmationCard with all fields
5. Chef clicks Approve → `commitAction()` calls `createClient()` server action
6. Success → redirects to new client page

## Respects AI_POLICY.md

- AI proposes, chef commits — nothing happens without explicit approval
- Financial ledger, roles, deletes are hard-blocked
- Emails are draft-only — never auto-sent
- All processing via local Ollama — no cloud LLMs
- If you unplug AI, ChefFlow still works
