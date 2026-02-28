# Remy Upgrade — Phase 1: Conversational Quality + Tool Coverage

**Date:** 2026-02-28
**Branch:** `feature/risk-gap-closure`

## What Changed

### 1. Few-Shot Examples (8 conversation demonstrations)

Added `REMY_FEW_SHOT_EXAMPLES` constant to `lib/ai/remy-personality.ts` — 8 structured Chef/Remy conversation pairs covering the most common interaction patterns:

| #   | Pattern              | What It Teaches                                         |
| --- | -------------------- | ------------------------------------------------------- |
| 1   | Schedule question    | Reference UPCOMING EVENTS, list by day, flag prep needs |
| 2   | Financial question   | Use real numbers, compare to YTD, suggest action        |
| 3   | Client lookup        | Pull loyalty, dietary, vibe notes, history              |
| 4   | Draft request        | Warm, chef-voiced email with event-specific details     |
| 5   | What should I do?    | Prioritized daily plan: admin → prep → creative         |
| 6   | Missing data         | Say exactly what's missing, suggest where to add it     |
| 7   | Navigation help      | Give exact route with context                           |
| 8   | Multi-intent (MIXED) | Handle two tasks in one message                         |

Injected into both streaming (`app/api/remy/stream/route.ts`) and non-streaming (`lib/ai/remy-actions.ts`) system prompt builders, after personality guide, before draft instructions.

### 2. New Tools (7 tools added)

**Tier 1 (auto-execute):**

| Tool                     | Description                                     | File                      |
| ------------------------ | ----------------------------------------------- | ------------------------- |
| `nav.go`                 | Navigate chef to any app page                   | `command-orchestrator.ts` |
| `loyalty.status`         | Client loyalty tier, points, next-tier progress | `command-orchestrator.ts` |
| `safety.event_allergens` | Cross-check all guests' allergies against menu  | `command-orchestrator.ts` |
| `waitlist.list`          | View all waitlisted clients                     | `command-orchestrator.ts` |
| `quote.compare`          | Side-by-side quote versions for an event        | `command-orchestrator.ts` |

**Tier 2 (chef approval):**

| Tool                   | Description                                               | File                                |
| ---------------------- | --------------------------------------------------------- | ----------------------------------- |
| `agent.daily_briefing` | Morning summary: today's events, prep, overdue, inquiries | `agent-actions/briefing-actions.ts` |
| `agent.hold_date`      | Tentatively block a calendar date (reversible)            | `agent-actions/briefing-actions.ts` |

All tools registered in `command-task-descriptions.ts` (for intent parser) and `agent-actions/index.ts` (for agent registry).

### 3. Context Enrichment (6 new data sections)

Added to `loadDetailedContext()` in `lib/ai/remy-context.ts`:

| Data                    | Cache Tier     | What It Gives Remy                                          |
| ----------------------- | -------------- | ----------------------------------------------------------- |
| Recipe library stats    | Tier 2 (5-min) | Recipe count + categories                                   |
| Client vibe notes       | Tier 2 (5-min) | Personality/communication style for all clients with notes  |
| Recent AAR insights     | Tier 2 (5-min) | Last 3 after-action reviews: went well, to improve, lessons |
| Pending menu approvals  | Tier 2 (5-min) | Clients waiting for menu approval response                  |
| Unread inquiry messages | Tier 2 (5-min) | Lead messages that need a response                          |

Formatted into system prompt in both streaming and non-streaming paths.

Types updated in `lib/ai/remy-types.ts` (`RemyContext` interface).

## Files Changed

| File                                       | Change                                                                 |
| ------------------------------------------ | ---------------------------------------------------------------------- |
| `lib/ai/remy-personality.ts`               | Added `REMY_FEW_SHOT_EXAMPLES` (~100 lines)                            |
| `app/api/remy/stream/route.ts`             | Import + inject few-shots + format new context sections                |
| `lib/ai/remy-actions.ts`                   | Import + inject few-shots + format new context sections                |
| `lib/ai/remy-types.ts`                     | Added 5 new fields to `RemyContext` interface                          |
| `lib/ai/remy-context.ts`                   | 5 new queries in `loadDetailedContext()` + process results             |
| `lib/ai/command-task-descriptions.ts`      | 5 new task descriptions (nav.go, loyalty, allergens, waitlist, quotes) |
| `lib/ai/command-orchestrator.ts`           | 5 new executor functions + switch cases                                |
| `lib/ai/agent-actions/briefing-actions.ts` | **New** — daily briefing + date hold actions                           |
| `lib/ai/agent-actions/index.ts`            | Register briefing actions                                              |

## Coordination

This work is scoped to Remy's **conversational brain and tool coverage**. A separate agent is handling:

- Privacy fixes (quote-draft, menu-suggestions → Ollama)
- Broken grocery UUIDs
- Truncated outputs (AAR, staff briefing, brain dump)
- Weak followup-draft prompt
- Parser few-shots (inquiry, recipe, transcript, brain dump)
- Gemini Zod validation

## Type Check

`npx tsc --noEmit --skipLibCheck` — zero errors.
