# MemPalace Integration Brief: ChefFlow + OpenClaw

**Date:** 2026-04-07
**Status:** Research complete, ready for spec
**Depends on:** MemPalace MCP server running locally (installed, mining in progress)

---

## What We Have

### MemPalace (20 MCP tools, 100% local)

| Tool Category       | Tools                                                                 | What They Do                                                              |
| ------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **Search**          | `search`, `check_duplicate`                                           | Semantic vector search across all indexed content                         |
| **Write**           | `add_drawer`, `delete_drawer`                                         | Store verbatim content in wing/room structure                             |
| **Knowledge Graph** | `kg_add`, `kg_query`, `kg_invalidate`, `kg_timeline`, `kg_stats`      | Temporal fact triples (subject-predicate-object with valid_from/valid_to) |
| **Graph Traversal** | `traverse`, `find_tunnels`, `graph_stats`                             | Walk connections between topics across domains                            |
| **Agent Diary**     | `diary_write`, `diary_read`                                           | Per-agent journal entries                                                 |
| **Structure**       | `status`, `list_wings`, `list_rooms`, `get_taxonomy`, `get_aaak_spec` | Palace navigation                                                         |

### Remy's Current Memory (SQL-only, no semantic search)

- 8 memory categories, importance 1-10, decay after 90 days
- 4-layer loading: client-specific, high-importance, category-matched, recent
- Hard cap: 30 memories per message
- **Gap 1:** No cross-conversation context
- **Gap 2:** No semantic/meaning-based retrieval (pure SQL filters)
- **Gap 3:** No temporal fact tracking (knows "X is true" but not "X was true from date A to date B")

---

## Integration Architecture

### Layer A: Remy Semantic Memory (highest leverage)

**Problem:** Remy loads memories by importance score and category, not by relevance to what the chef is actually asking about. A chef asking "what did Mrs. Chen like last time?" gets category-matched memories, not semantically relevant ones.

**Solution:** Add a Layer 0 to `loadRelevantMemories()` that runs the chef's message through MemPalace semantic search before the existing 4 SQL layers.

**Implementation (additive, non-breaking):**

```typescript
// In remy-memory-actions.ts, inside loadRelevantMemories()
// NEW Layer 0: Semantic search via MemPalace (before existing layers)

async function searchMemPalace(query: string, limit: number = 5): Promise<RemyMemory[]> {
  try {
    const result = await fetch('http://localhost:MEMPALACE_PORT/search', {
      method: 'POST',
      body: JSON.stringify({ query, limit, wing: 'chefflow-conversations' }),
    })
    // Map MemPalace results to RemyMemory format
    // These get pushed into the same dedup pipeline
  } catch {
    // Non-blocking: if MemPalace is down, fall through to SQL layers
    return []
  }
}
```

**Key design decisions:**

- MemPalace search is Layer 0 (runs first, highest relevance)
- Non-blocking: if MemPalace is down, existing 4 layers still work
- Results merge into the same dedup pipeline (seenIds set)
- The 30-memory cap stays, but now the top slots go to semantically relevant memories instead of just high-importance ones

**Risk:** Near zero. Additive only. Existing system unchanged. MemPalace is a bonus layer.

### Layer B: Remy Cross-Conversation Context

**Problem:** Each new Remy conversation starts with zero context from previous conversations. The chef has to re-explain things.

**Solution:** On conversation start, query MemPalace for the chef's recent conversation summaries and inject them into Remy's system prompt as "recent context."

**Implementation:**

- After each Remy conversation ends, extract a summary and `mempalace_add_drawer` it into a `remy-sessions` wing
- On new conversation start, `mempalace_search` for recent summaries relevant to the chef's opening message
- Inject top 3 results into system prompt under "Recent conversations" section

### Layer C: OpenClaw Knowledge Graph (high value)

**Problem:** OpenClaw tracks ingredient prices in SQL tables. But facts like "Store X stopped carrying organic basil in March" or "Supplier Y raised prices 15% after the freeze" are lost. Price data has temporal meaning that SQL alone doesn't capture well.

**Solution:** Use MemPalace's knowledge graph (`kg_add`, `kg_query`, `kg_invalidate`) to track supply chain facts with temporal validity.

**Examples:**

```
kg_add("Market Basket Haverhill", "carries", "organic basil", valid_from="2026-01-01")
kg_add("Market Basket Haverhill", "price_per_lb", "$4.99", valid_from="2026-03-15")
kg_invalidate("Market Basket Haverhill", "carries", "organic basil", ended="2026-04-01")
kg_add("Market Basket Haverhill", "seasonal_note", "no basil until May", valid_from="2026-04-01")
```

**Query:** `kg_query("organic basil")` returns all stores, prices, and availability windows.

This turns OpenClaw from a price snapshot database into a supply chain intelligence system.

### Layer D: Gustav Session Memory

**Problem:** Gustav (Mission Control) has no memory between sessions.

**Solution:** `mempalace_diary_write` after each Gustav session. `mempalace_diary_read` on startup. Automatic.

---

## Priority Order

| Priority | Integration                                            | Effort   | Impact                               |
| -------- | ------------------------------------------------------ | -------- | ------------------------------------ |
| **P0**   | Verify MemPalace MCP works in next Claude Code session | 5 min    | Unlocks everything                   |
| **P1**   | Layer A: Remy semantic memory layer                    | ~2 hours | Dramatically better memory retrieval |
| **P2**   | Layer B: Remy cross-conversation context               | ~3 hours | Solves #1 Remy gap                   |
| **P3**   | Layer C: OpenClaw knowledge graph                      | ~4 hours | Supply chain intelligence            |
| **P4**   | Layer D: Gustav diary                                  | ~30 min  | Nice-to-have                         |

---

## Constraints

- **No cloud.** MemPalace runs 100% local (ChromaDB). Compliant.
- **No concurrent writes.** ChromaDB segfaults on parallel access. All writes must be sequential.
- **Privacy safe.** Client PII stays in the same local ChromaDB that Remy memories already live in. No new privacy surface.
- **Formula > AI still applies.** MemPalace search is a retrieval layer, not an AI generation layer. It finds relevant memories; Remy still decides what to do with them.
- **Non-blocking side effect.** All MemPalace calls wrapped in try/catch. If it's down, everything falls back to existing behavior.

---

## What This Does NOT Change

- Remy's 8 memory categories (unchanged)
- Remy's extraction pipeline (unchanged)
- Remy's importance scoring (unchanged)
- Remy's decay system (unchanged)
- OpenClaw's SQL price tables (unchanged)
- Any existing server actions (unchanged)

This is purely additive. A new retrieval layer on top of everything that already works.
