# Remy Upgrade: Personality, Memory & Conversation Threads

**Date:** 2026-02-21
**Branch:** `feature/risk-gap-closure`

---

## What Changed

### 1. Timeout Removed

The 20-second client-side timeout in the Remy drawer was causing constant "Remy is taking too long" errors with the 30B local model. The timeout has been completely removed — Ollama now takes as long as it needs. An elapsed timer ("Remy is thinking... 15s") provides feedback during long responses.

### 2. Full Voice & Personality Guide

Remy now has a comprehensive personality system defined in `lib/ai/remy-personality.ts`:

- **Identity:** Sous chef + business partner, named after Ratatouille's Remy
- **Voice:** Warm, direct, slightly informal — like texting a trusted colleague
- **Tone adaptation:** Casual for scheduling, precise for financials, careful for client-facing drafts
- **Response structure:** Lead with the answer, bullets for lists, 1-3 paragraphs default
- **Boundaries:** Labels drafts as drafts, never fabricates data, flags allergies prominently
- **Domain expertise:** Event lifecycle, food costing, client psychology, menu engineering
- **Client-facing drafts:** Chef's voice (first person), warm but professional, 3-4 sentences

### 3. Conversation Threads

Remy now supports multiple conversation threads:

- **New tables:** `remy_conversations` (threads) and `remy_messages` (messages within threads)
- **UI:** New conversation button (+), conversation list (message square icon), switch between threads
- **Auto-titling:** After the first exchange, Ollama generates a short title for the thread
- **Delete:** Conversations and individual messages can be deleted
- **Persistence:** Messages are saved to the DB immediately — reopen the drawer and your conversation is still there

### 4. Persistent Memory System

Remy now learns from every conversation and remembers across sessions:

- **New table:** `remy_memories` — stores categorized facts extracted from conversations
- **Categories:** chef_preference, client_insight, business_rule, communication_style, culinary_note, scheduling_pattern, pricing_pattern, workflow_preference
- **Extraction:** After each response, a background Ollama call (fast model) extracts memorable facts
- **Loading:** Before each response, relevant memories are loaded into the system prompt (layered by client relevance, importance, category match, and recency — capped at 30)
- **Deduplication:** Content hash prevents exact duplicates; repeated mentions reinforce importance
- **Decay:** Memories not accessed in 90 days with low importance are soft-deactivated

---

## New Files

| File                                                        | Purpose                                   |
| ----------------------------------------------------------- | ----------------------------------------- |
| `lib/ai/remy-personality.ts`                                | Full voice/personality constants          |
| `lib/ai/remy-memory-types.ts`                               | TypeScript types for memory system        |
| `lib/ai/remy-memory-actions.ts`                             | Memory extraction, loading, decay, delete |
| `lib/ai/remy-conversation-actions.ts`                       | Conversation CRUD, auto-titling           |
| `supabase/migrations/20260322000035_remy_conversations.sql` | Conversations + messages tables           |
| `supabase/migrations/20260322000036_remy_memories.sql`      | Memories table with dedup + decay indexes |

## Modified Files

| File                            | Changes                                                                                       |
| ------------------------------- | --------------------------------------------------------------------------------------------- |
| `components/ai/remy-drawer.tsx` | Removed timeout, added threads UI, memory extraction trigger, delete buttons, elapsed timer   |
| `lib/ai/remy-actions.ts`        | Imported personality guide, wired memory loading into sendRemyMessage + buildRemySystemPrompt |

---

## Architecture

```
User types message
    ↓
remy-drawer.tsx (client)
    ↓ saveConversationMessage (non-blocking)
    ↓
sendRemyMessage (server action)
    ↓ Promise.all([loadRemyContext, classifyIntent, loadRelevantMemories])
    ↓ buildRemySystemPrompt(context, memories) ← personality + memories + business context
    ↓ parseWithOllama → response
    ↓
remy-drawer.tsx receives response
    ↓ saveConversationMessage (non-blocking)
    ↓ autoSave → saveRemyMessage, saveRemyTaskResult (non-blocking)
    ↓ extractAndSaveMemories (non-blocking, background)
    ↓ autoTitleConversation (non-blocking, first exchange only)
```

All persistence is non-blocking — if any save fails, the UI still works. Memory extraction happens in the background using the fast model.

---

## Memory Context Window Budget

| Layer         | What                       | Max items |
| ------------- | -------------------------- | --------- |
| 1             | Client-specific memories   | 10        |
| 2             | High importance (8+)       | 15        |
| 3             | Category-matched by intent | 10        |
| 4             | Recently accessed          | 5         |
| **Total cap** |                            | **30**    |

~600-900 tokens, well within budget alongside personality (~800 tokens) and business context (~300 tokens).

---

## Migration Safety

Both migrations are **additive only** — new tables, no changes to existing tables. Safe to apply without data risk.
