# Phase 4: Smart Chat Insights (AI-Powered)

## What Changed

Added an AI-powered insight extraction system that automatically analyzes every client message for actionable intelligence -- dietary preferences, allergy mentions, important dates, budget signals, and more. Insights surface in the chef's chat sidebar as suggestions requiring explicit confirmation before any data changes.

## Why

Chefs often learn critical details about clients through casual conversation -- "my wife is allergic to shellfish" or "we're thinking around $150 per person." Without a capture system, these details get buried in chat history. AI insight extraction surfaces them immediately so the chef can save them as structured notes with one click.

## Architecture

### AI Analysis Pipeline

1. **Trigger**: After a client sends a text message (or a file message with a caption), `processMessageInsights()` fires asynchronously (non-blocking, fire-and-forget)
2. **Context gathering**: The system loads the message body, the last 5 messages for conversation context, and the client's existing profile (dietary restrictions, allergies, favorite cuisines) for deduplication
3. **AI extraction**: `analyzeMessageForInsights()` sends the message + context to Gemini 2.5 Flash with a structured Zod schema, requesting typed insight objects
4. **Filtering**: Insights below 0.5 confidence are discarded
5. **Storage**: Remaining insights are inserted into `chat_insights` with `status: 'pending'`
6. **Surface**: Chef sees pending insights in the chat sidebar, can accept (saves as pinned client note) or dismiss

### AI Policy Compliance

This implementation follows the AI Policy (`docs/AI_POLICY.md`) strictly:

- **AI assists, never owns truth**: Insights are suggestions only, displayed with dashed amber borders and "AI Suggestions" label
- **Explicit confirmation required**: Chef must click "Save as Note" -- no auto-mutations
- **No lifecycle transitions**: Insights never change event states, ledger entries, or identity data
- **No silent automation**: All insight processing errors are logged, never silently swallowed
- **Unplug test passes**: Remove AI entirely and the chat system works exactly the same -- just without suggestions

## New Files

### Migration
- `supabase/migrations/20260220000004_chat_insights.sql` -- `chat_insights` table with insight_type and insight_status enums, RLS policies (chef-only within tenant), performance indexes

### AI Module
- `lib/ai/chat-insights.ts` -- `analyzeMessageForInsights()` using the `parseWithAI()` pattern from `lib/ai/parse.ts`, Zod validation for structured output, system prompt tuned for private chef context

### Server Actions
- `lib/insights/actions.ts` -- `processMessageInsights()` (async trigger), `getPendingInsights()` (sidebar data), `acceptInsight()` (save as note), `dismissInsight()` (mark dismissed)

### Component
- `components/chat/chat-insights-panel.tsx` -- Renders pending insights with type-specific icons (dietary=fork, allergy=warning, date=calendar, etc.), color-coded by type, confidence percentage, accept/dismiss buttons

## Modified Files

### `lib/chat/actions.ts`
- Added import of `processMessageInsights`
- Added fire-and-forget call after client text messages in `sendChatMessage()`
- Added fire-and-forget call after client file messages with captions in `sendFileMessage()`

### `components/chat/chat-sidebar.tsx`
- Added `initialInsights` prop (optional, defaults to empty array)
- Renders `ChatInsightsPanel` below pinned notes section
- Shows sparkle icon + count in collapsed state when insights exist

### `app/(chef)/chat/[id]/page.tsx`
- Added import of `getPendingInsights`
- Fetches pending insights for the conversation
- Passes `initialInsights` to `ChatSidebar`

## Insight Types

| Type | Icon | Color | Example |
|------|------|-------|---------|
| inquiry_intent | MessageSquare | brand-600 | "We'd love to book you for our anniversary" |
| dietary_preference | Utensils | orange-600 | "We're mostly vegetarian" |
| allergy_mention | AlertTriangle | red-600 | "My daughter is allergic to tree nuts" |
| important_date | Calendar | purple-600 | "Our anniversary is June 15th" |
| guest_count | Users | blue-600 | "There will be about 20 of us" |
| event_detail | Calendar | blue-600 | "We're thinking cocktail-style" |
| budget_mention | DollarSign | green-600 | "Budget is around $150 per person" |
| location_mention | MapPin | teal-600 | "It'll be at our home in Malibu" |
| general_preference | Heart | pink-600 | "We love Italian and Japanese food" |

## Accept Flow

When a chef clicks "Save as Note":
1. Insight type maps to note category: dietary_preference -> dietary, allergy_mention -> dietary, important_date -> relationship, budget/guest/event/location -> logistics, inquiry_intent -> general, general_preference -> preference
2. `addClientNote()` creates a pinned note with the insight title and detail
3. Insight status updates to `accepted` with `applied_to: 'note'` and `applied_at` timestamp
4. Insight disappears from the panel

## Data Model

```sql
chat_insights (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES chefs,
  conversation_id UUID REFERENCES conversations,
  message_id UUID REFERENCES chat_messages,
  client_id UUID REFERENCES clients,
  insight_type insight_type NOT NULL,
  status insight_status DEFAULT 'pending',
  title TEXT NOT NULL,
  detail TEXT,
  extracted_data JSONB,
  confidence REAL NOT NULL,
  applied_to TEXT,
  applied_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
)
```

## Connection to System

- Uses existing `parseWithAI()` from `lib/ai/parse.ts` (Gemini 2.5 Flash)
- Uses existing `addClientNote()` from `lib/notes/actions.ts` (Phase 3) for accept flow
- Tenant-scoped via RLS, consistent with all other data access
- `@ts-nocheck` directive on `lib/insights/actions.ts` -- remove after migration applied and types regenerated
