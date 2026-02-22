# Remy Memory Management — User-Facing Controls

**Date:** 2026-02-21
**Branch:** `feature/risk-gap-closure`

## What Changed

Remy now lets the chef view, add, and delete memories directly from the chat drawer. Previously, memories were extracted silently in the background with no visibility or control for the user.

## How It Works

### Viewing Memories

The chef can say any of these (and similar variations):

- "Show my memories"
- "What do you remember?"
- "List your memories"
- "What have you learned?"

Remy responds with a bulleted list grouped by category (chef preference, client insight, business rule, etc.), with high-importance items flagged. Each memory has a delete button (X) that appears on hover.

A "Show my memories" starter button was added to the welcome screen.

### Adding Memories

The chef can say:

- "Remember that I always use organic produce"
- "Keep in mind that the Patels are vegetarian"
- "Don't forget I charge $150/person for tasting menus"
- "Note that I never double-book Saturdays"
- "Add a memory: I prefer shopping the day before"

Remy extracts the fact, auto-categorizes it (chef preference, client insight, pricing pattern, etc.), and saves it. No LLM call needed — simple regex + heuristic categorization.

### Deleting Memories

Two paths:

1. **From the memory list** — hover over any memory item and tap the X button
2. The delete calls `deleteRemyMemory()` which soft-deletes (sets `is_active = false`)

## Files Changed

| File                            | What                                                                                                        |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `lib/ai/remy-actions.ts`        | Added memory intent detection (regex), `handleMemoryList()`, `handleMemoryAdd()` — intercepts before Ollama |
| `lib/ai/remy-memory-actions.ts` | Added `addRemyMemoryManual()` server action                                                                 |
| `lib/ai/remy-types.ts`          | Added `RemyMemoryItem` type, `'memory'` intent, `memoryItems` on `RemyResponse` and `RemyMessage`           |
| `components/ai/remy-drawer.tsx` | Memory items UI with grouped display + delete buttons, `handleDeleteMemory`, `Brain` icon starter           |

## Design Decisions

1. **Regex over LLM for detection** — Memory requests are predictable phrases. No need to burn an Ollama call for "show my memories." Faster and more reliable.

2. **Heuristic categorization for manual adds** — When the chef says "remember that X," we categorize using keyword matching rather than an LLM call. Good enough for user-added facts, and instant.

3. **Memory items rendered separately from message text** — The bulleted list in `text` gives the conversational feel, while the `memoryItems` array powers the interactive delete UI below it. Both are present so the message reads naturally even without JS interaction.

4. **Soft delete** — `deleteRemyMemory` sets `is_active = false` rather than hard deleting. Consistent with existing pattern and allows recovery.
