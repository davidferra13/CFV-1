# Remy Concierge Upgrade - Design Spec

> **Status:** Draft
> **Date:** 2026-05-10
> **Scope:** 4 foundation upgrades to transform Remy from stateless chatbot to intelligent concierge

---

## Current State

Remy is a stateless request-response system. Each message rebuilds context from DB, sends to Ollama, streams back via SSE. Key gaps:

- **Memory retrieval is keyword-based** - `loadRelevantMemories` uses word overlap and SQL filters. "What can't Sarah eat?" won't match "Sarah has a shellfish allergy" because keywords don't overlap.
- **Conversation summaries are keyword-based** - `remy-conversation-summary.ts` uses regex topic detection and entity extraction. No LLM involvement. Summaries are shallow.
- **Remy can't take actions** - Answers questions but can't create events, update menus, send emails, or look up data mid-response. The command orchestrator runs ONE command, not iterative tool chains.
- **No output safety scanning** - Input validation exists (`remy-guardrails.ts`, `remy-input-validation.ts`). Output is never scanned for accidentally leaked PII from other clients/tenants.

---

## Phase 1: Semantic Memory (pgvector + nomic-embed-text)

### Goal

Replace keyword-based memory retrieval with vector similarity search so Remy finds conceptually related memories, not just keyword matches.

### Database Changes

**Migration: `20260511000018_remy_semantic_memory.sql`**

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to remy_memories
ALTER TABLE remy_memories ADD COLUMN embedding vector(768);

-- HNSW index for fast cosine similarity search
CREATE INDEX idx_remy_memories_embedding
  ON remy_memories USING hnsw (embedding vector_cosine_ops)
  WHERE is_active = true;

-- RAG chunks table for broader semantic search
CREATE TABLE rag_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,  -- 'conversation_summary', 'recipe', 'client_note', 'email'
  source_id TEXT,             -- ID of the source record
  chunk_text TEXT NOT NULL,
  embedding vector(768) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rag_chunks_embedding
  ON rag_chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_rag_chunks_tenant
  ON rag_chunks (tenant_id, source_type);
```

**Drizzle schema update:** Add `embedding` column to `remyMemories`, add `ragChunks` table.

### New Files

**`lib/ai/embeddings.ts`** - Embedding utility module:

- `embedText(text: string): Promise<number[]>` - calls Ollama embeddings API with nomic-embed-text
- `embedBatch(texts: string[]): Promise<number[][]>` - batch embedding for bulk operations
- `cosineSimilarity(a: number[], b: number[]): number` - pure math, no DB
- Uses `POST http://localhost:11434/api/embed` with model `nomic-embed-text`
- Graceful fallback: if Ollama is offline, return null (caller falls back to keyword search)
- Cache embeddings for identical texts within a request cycle

### Modified Files

**`lib/ai/remy-memory-actions.ts`:**

- `extractAndSaveMemories()` - after inserting a new memory, call `embedText(mem.content)` and update the embedding column
- `loadRelevantMemories()` - add a new Layer before the existing layers:
  - Embed the current message via `embedText(currentMessage)`
  - Query `remy_memories` using `cosineDistance(embedding, queryVector) < 0.7` ordered by distance, limit 10
  - Merge with existing keyword/category/client layers (semantic results get priority)
  - Fall back to existing keyword logic if embedding fails
- `handleCorrectionMemory()` - use semantic search instead of word overlap to find the memory being corrected

### Setup Requirements

- `ollama pull nomic-embed-text` on the server
- pgvector extension installed in Postgres (usually `apt install postgresql-16-pgvector` or already available)
- Backfill script: embed all existing `remy_memories` rows that have `embedding IS NULL`

---

## Phase 2: Vercel AI SDK Integration

### Goal

Replace custom Ollama client code with Vercel AI SDK for streaming, structured output, and multi-step tool use. This is a library swap, not a hosting change. Zero cloud dependency.

### New Dependencies

```
npm install ai @ai-sdk/openai-compatible
```

### New Files

**`lib/ai/ai-provider.ts`** - Provider configuration:

```typescript
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'

export const ollama = createOpenAICompatible({
  name: 'ollama',
  baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
})

// Model helpers matching existing tier system
export const models = {
  fast: ollama('gemma3:4b'), // maps to existing 'fast' tier
  standard: ollama('gemma4:e4b'), // maps to existing 'standard' tier
  thinking: ollama('gemma4:e4b'), // with thinking enabled
} as const
```

**`lib/ai/remy-tools.ts`** - Tool definitions for agent loops:

```typescript
import { tool } from 'ai'
import { z } from 'zod'

export const remyTools = {
  lookupClient: tool({
    description: 'Find a client by name and return their details',
    parameters: z.object({ name: z.string() }),
    execute: async ({ name }) => {
      /* DB query */
    },
  }),
  checkCalendar: tool({
    description: 'Check chef availability for a date',
    parameters: z.object({ date: z.string() }),
    execute: async ({ date }) => {
      /* calendar query */
    },
  }),
  searchRecipes: tool({
    description: 'Search recipes by keyword or ingredient',
    parameters: z.object({ query: z.string() }),
    execute: async ({ query }) => {
      /* recipe search */
    },
  }),
  getEventDetails: tool({
    description: 'Get full details of an event by ID or description',
    parameters: z.object({ eventRef: z.string() }),
    execute: async ({ eventRef }) => {
      /* event lookup */
    },
  }),
  draftEmail: tool({
    description: 'Draft an email to a client (chef must approve before sending)',
    parameters: z.object({
      clientName: z.string(),
      subject: z.string(),
      body: z.string(),
    }),
    execute: async (params) => {
      /* creates draft, returns preview */
    },
  }),
  lookupPrice: tool({
    description: 'Look up current market price for an ingredient',
    parameters: z.object({ ingredient: z.string() }),
    execute: async ({ ingredient }) => {
      /* PIE query */
    },
  }),
  searchMemories: tool({
    description: 'Search chef memories for relevant facts about a topic or person',
    parameters: z.object({ query: z.string() }),
    execute: async ({ query }) => {
      /* semantic memory search */
    },
  }),
}
```

### Modified Files

**`app/api/remy/stream/route.ts`** - Replace manual Ollama streaming with AI SDK:

- Replace `new Ollama()` + manual SSE encoding with `streamText()` from AI SDK
- Wire `remyTools` with `maxSteps: 5` for agent loops
- Keep all existing: auth, rate limiting, context loading, personality, guardrails
- The route structure stays the same; only the LLM interaction layer changes

**`app/api/remy/client/route.ts`** - Same pattern, no tools (clients can't take actions)

**`app/api/remy/circle/route.ts`** - Same pattern, limited tools (circle-appropriate only)

**`app/api/remy/public/route.ts`** - Same pattern, no tools

**`app/api/remy/landing/route.ts`** - Same pattern, no tools

**`lib/ai/parse-ollama.ts`** - Replace `parseWithOllama` internals with AI SDK's `generateObject`:

- Keep the same function signature for backwards compatibility (138 callers)
- Swap internals from manual Ollama client to `generateObject({ model, schema, prompt })`
- This is the least-disruptive migration path: 138 files keep working unchanged

### Key Constraint

- Gemma 4 E4B supports tool calling but reliability varies. Tools must be simple, well-described, with clear parameter schemas. `maxSteps: 5` prevents runaway loops.
- Each tool must include `needsApproval` flag for destructive actions (sending emails, modifying data). Read-only lookups execute immediately.

---

## Phase 3: LLM-Powered Conversation Summarization

### Goal

Replace keyword-based conversation summaries with LLM-generated summaries. Embed summaries for cross-session semantic retrieval.

### Modified Files

**`lib/ai/remy-conversation-summary.ts`** - Complete rewrite:

- Keep the `ConversationSummary` interface
- Replace keyword topic detection with LLM summarization via AI SDK `generateObject`
- Schema:
  ```typescript
  const SummarySchema = z.object({
    summary: z.string().describe('2-3 sentence summary of the conversation'),
    topics: z.array(z.string()).describe('Main topics discussed'),
    entities: z.array(z.string()).describe('People, events, recipes mentioned'),
    decisions: z.array(z.string()).describe('Decisions made during the conversation'),
    actionItems: z.array(z.string()).describe('Action items or follow-ups identified'),
    sentiment: z.enum(['positive', 'neutral', 'frustrated', 'urgent']),
  })
  ```
- After generating summary, embed it via `embedText()` and store in `rag_chunks` table with `source_type: 'conversation_summary'`
- Trigger: when conversation reaches 10+ messages OR on explicit "end conversation" signal

### New Behavior in `app/api/remy/stream/route.ts`

- When starting a new conversation (history.length === 0), retrieve top-3 semantically similar past summaries from `rag_chunks` via pgvector
- Inject as "Previous relevant conversations" section in system prompt
- Replaces the current `searchRemyConversationSummaries` keyword-based approach

### Client-Side Change

- `lib/ai/remy-local-storage.ts` - when conversation is saved to IndexedDB, also POST the messages to a new endpoint `/api/remy/summarize` for server-side LLM summarization
- This endpoint is fire-and-forget (non-blocking)

### New API Route

**`app/api/remy/summarize/route.ts`:**

- Accepts conversation messages
- Generates LLM summary
- Embeds and stores in `rag_chunks`
- Returns 202 Accepted (async processing)

---

## Phase 4: Output Guardrails

### Goal

Scan Remy's output before it reaches the user to prevent accidental PII leakage across tenants/clients.

### New Files

**`lib/ai/remy-output-guardrails.ts`:**

```typescript
export interface OutputScanResult {
  safe: boolean
  violations: OutputViolation[]
  redactedText?: string
}

export interface OutputViolation {
  type: 'pii_leak' | 'cross_client' | 'financial_data' | 'internal_data'
  severity: 'block' | 'redact' | 'warn'
  detail: string
  position: { start: number; end: number }
}
```

**Scanning layers:**

1. **PII Pattern Scanner** - Regex for emails, phone numbers, SSNs, credit card numbers, addresses in output text. If found and NOT belonging to the current user context, flag as violation.

2. **Cross-Client Boundary Check** - When responding to Client A, scan output for names/details of other clients. Compare output entities against the current context scope. If Client B's name appears in a response to Client A, block.

3. **Financial Data Guard** - In client/public/circle surfaces, scan for revenue figures, profit margins, cost breakdowns that should only be visible to the chef.

4. **Internal Reference Guard** - Scan for internal system terms, table names, API endpoints, error stack traces that should never reach users.

### Integration Points

All 5 Remy streaming routes get output scanning inserted into the SSE stream pipeline:

- Accumulate tokens into a buffer
- Scan completed sentences (not mid-word)
- If violation detected with severity `block`: terminate stream, send error message
- If violation detected with severity `redact`: replace the sensitive portion with `[redacted]`
- If violation detected with severity `warn`: log for review, let through

### Key Design Decision

- Scanning happens on accumulated text, not individual tokens (can't detect PII from single tokens)
- Buffer accumulates until sentence boundary (period, question mark, newline)
- Performance: regex scanning on sentence-length strings is <1ms, negligible latency impact

---

## Implementation Order & Dependencies

```
Phase 1 (pgvector)     ──────┐
Phase 2 (AI SDK)       ──────┼──> Phase 3 (Summarization) [needs embeddings + AI SDK]
Phase 4 (Guardrails)   ──────┘
```

- Phases 1, 2, 4 are fully independent (parallel)
- Phase 3 depends on Phase 1 (embeddings) and Phase 2 (generateObject)

## Constraints

- **$0 cloud cost.** Everything runs on local Ollama + existing Postgres.
- **Self-hosted only.** No API keys, no external services.
- **Backwards compatible.** `parseWithOllama` signature preserved (138 callers). Existing routes keep their auth/rate-limit/personality layers.
- **Graceful degradation.** If Ollama is offline or pgvector not installed, fall back to existing keyword behavior. Never break Remy because an upgrade isn't available.
- **Privacy.** Conversation content stays in browser IndexedDB. Only summaries (not raw messages) go to the server. Embeddings are numbers, not reversible to text.

## Files Created (Summary)

| File                                                          | Purpose                                       |
| ------------------------------------------------------------- | --------------------------------------------- |
| `lib/ai/embeddings.ts`                                        | Embedding utilities (Ollama nomic-embed-text) |
| `lib/ai/ai-provider.ts`                                       | Vercel AI SDK Ollama provider config          |
| `lib/ai/remy-tools.ts`                                        | Tool definitions for agent loops              |
| `lib/ai/remy-output-guardrails.ts`                            | Output PII/boundary scanning                  |
| `app/api/remy/summarize/route.ts`                             | Async conversation summarization endpoint     |
| `database/migrations/20260511000018_remy_semantic_memory.sql` | pgvector + rag_chunks                         |
| `scripts/backfill-memory-embeddings.ts`                       | One-time backfill for existing memories       |

## Files Modified (Summary)

| File                                  | Change                                         |
| ------------------------------------- | ---------------------------------------------- |
| `lib/ai/remy-memory-actions.ts`       | Embed on save, semantic retrieval              |
| `lib/ai/parse-ollama.ts`              | Swap internals to AI SDK generateObject        |
| `lib/ai/remy-conversation-summary.ts` | LLM-powered summaries                          |
| `app/api/remy/stream/route.ts`        | AI SDK streaming + tools + output scan         |
| `app/api/remy/client/route.ts`        | AI SDK streaming + output scan                 |
| `app/api/remy/circle/route.ts`        | AI SDK streaming + limited tools + output scan |
| `app/api/remy/public/route.ts`        | AI SDK streaming + output scan                 |
| `app/api/remy/landing/route.ts`       | AI SDK streaming + output scan                 |
| `lib/ai/remy-local-storage.ts`        | POST summaries to server on conversation save  |
| `lib/db/schema/schema.ts`             | Add embedding column, rag_chunks table         |
| `package.json`                        | Add ai, @ai-sdk/openai-compatible              |
