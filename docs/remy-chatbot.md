# Remy: AI Chatbot Companion

## What Changed

The old "Assistant" (CopilotDrawer) and the Command Center task execution system have been merged into **Remy** — a named AI companion that lives as a slide-in drawer accessible from any chef page.

## Why

The old copilot felt like typing into a void. The command center felt like a form. Neither felt like talking to a teammate. Remy is a conversational chatbot that can both answer questions AND take actions, all powered by local Ollama (data never leaves the machine).

## Architecture

### Intent Classification (Two-Phase Processing)

When the chef types a message:

1. **Context loading** + **intent classification** run in parallel
2. Classification (fast model, `qwen3:8b`) determines: QUESTION, COMMAND, or MIXED
3. Based on intent:
   - **Question** → Ollama answers conversationally with rich business context
   - **Command** → Intent parser decomposes into tasks, orchestrator executes them
   - **Mixed** → Both paths run in parallel, responses merged

### Tier System (from Command Center)

- **Tier 1 (auto)**: Read-only queries — client search, event listing, financial summary
- **Tier 2 (draft)**: Mutations requiring approval — email drafts, event creation
- **Tier 3 (hold)**: Ambiguous requests — held for chef clarification

### Context Loading (Tiered Strategy)

- **Always fresh** (every message): chef profile, client/event/inquiry counts
- **Cached 5 min**: upcoming events, recent clients, month revenue, pending quotes
- **From client**: current page pathname (for contextual suggestions)

## Files Created

| File                               | Purpose                                                     |
| ---------------------------------- | ----------------------------------------------------------- |
| `lib/ai/remy-types.ts`             | Shared types (RemyMessage, RemyResponse, RemyContext, etc.) |
| `lib/ai/remy-context.ts`           | Tiered context loader with 5-min cache                      |
| `lib/ai/remy-classifier.ts`        | Fast-model intent classifier (question vs command)          |
| `lib/ai/remy-actions.ts`           | Main server action: `sendRemyMessage()`                     |
| `components/ai/remy-task-card.tsx` | Inline task result cards with approve/reject                |
| `components/ai/remy-drawer.tsx`    | Main drawer UI (replaces CopilotDrawer)                     |

## Files Modified

| File                                  | Change                                                      |
| ------------------------------------- | ----------------------------------------------------------- |
| `lib/ai/command-task-descriptions.ts` | Added 10 new task types                                     |
| `lib/ai/command-orchestrator.ts`      | Added 10 new task executors                                 |
| `app/(chef)/layout.tsx`               | Swapped CopilotDrawer for RemyDrawer                        |
| `lib/notifications/types.ts`          | Added 'review' notification category (pre-existing bug fix) |
| `lib/testimonials/actions.ts`         | Fixed missing recipientId/action in notification call       |

## Files Deleted

| File                               | Reason                      |
| ---------------------------------- | --------------------------- |
| `components/ai/copilot-drawer.tsx` | Replaced by remy-drawer.tsx |
| `lib/ai/copilot-actions.ts`        | Replaced by remy-actions.ts |

## Available Task Types (16 total)

| Task                        | Tier | What it does               |
| --------------------------- | ---- | -------------------------- |
| `client.search`             | 1    | Search clients by name     |
| `client.list_recent`        | 1    | List 5 most recent clients |
| `client.details`            | 1    | Look up client profile     |
| `calendar.availability`     | 1    | Check if a date is free    |
| `event.list_upcoming`       | 1    | Show upcoming events       |
| `event.details`             | 1    | Get event details          |
| `event.list_by_status`      | 1    | Filter events by status    |
| `inquiry.list_open`         | 1    | List active inquiries      |
| `inquiry.details`           | 1    | Get inquiry details        |
| `finance.summary`           | 1    | Revenue and event summary  |
| `finance.monthly_snapshot`  | 1    | Monthly financial snapshot |
| `recipe.search`             | 1    | Search recipes by name     |
| `menu.list`                 | 1    | List menus                 |
| `scheduling.next_available` | 1    | Find next open date        |
| `email.followup`            | 2    | Draft follow-up email      |
| `event.create_draft`        | 2    | Draft a new event          |

## AI Policy Compliance

- All responses are drafts/suggestions — chef confirms before anything is canonical
- Tier 1 = read-only queries only
- Tier 2 = presented for approval, never auto-executed
- All processing via local Ollama — no cloud LLMs
- Cannot do lifecycle transitions, ledger writes, or identity changes
- Offline fallback: clear "Start Ollama" message

## Future Enhancements (Phase 2)

- Conversation persistence (save chat history to Supabase)
- Keyboard shortcut (Ctrl+K / Cmd+K) to open Remy
- Streaming responses for faster perceived speed
- Context-aware starter prompts based on current page
- More task types covering the full 150+ server action inventory
