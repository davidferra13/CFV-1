# Remy Mascot Chat — Dual-Chat Architecture

> Created: 2026-02-28

## Overview

Remy now has **two independent chat interfaces** that work in tandem:

| Interface           | Location                                  | Purpose                                     | Persistence              |
| ------------------- | ----------------------------------------- | ------------------------------------------- | ------------------------ |
| **Mascot Chat**     | Floating panel above mascot (bottom-left) | Quick, conversational, person-like          | Ephemeral (session-only) |
| **Drawer** (Ctrl+K) | Right-side panel                          | Deep conversations, tasks, actions, history | Persistent (IndexedDB)   |

Both hit the same backend (`/api/remy/stream`), share the same lip-sync engine, and can be open simultaneously — but only one can stream at a time (Ollama is single-threaded).

## Architecture

### New Files

| File                                 | Purpose                                                |
| ------------------------------------ | ------------------------------------------------------ |
| `lib/ai/remy-stream-parser.ts`       | Shared SSE stream parsing (extracted from drawer hook) |
| `lib/hooks/use-remy-mascot-send.ts`  | Lightweight send hook — no IndexedDB, shorter history  |
| `components/ai/remy-mascot-chat.tsx` | Compact floating chat panel UI                         |

### Modified Files

| File                             | Change                                                                       |
| -------------------------------- | ---------------------------------------------------------------------------- |
| `components/ai/remy-context.tsx` | Added `isMascotChatOpen`, `toggleMascotChat`, `isMascotLoading` state        |
| `components/ai/remy-wrapper.tsx` | Mascot click → `toggleMascotChat` (not drawer), renders `<RemyMascotChat />` |
| `lib/hooks/use-remy-send.ts`     | Refactored to use shared `remy-stream-parser.ts`                             |

### Untouched

- `remy-drawer.tsx` — completely untouched
- `remy-mascot-button.tsx` — interface unchanged
- `/api/remy/stream/route.ts` — no API changes
- `remy-local-storage.ts` — mascot chat doesn't use it

## How It Works

### Click Behavior

- **Click mascot** → toggles mascot chat panel (was: toggle drawer)
- **Ctrl+K** → toggles drawer
- **Escape** → closes drawer first, then mascot chat
- **Click outside mascot chat** → closes it

### Concurrency

Both UIs share `isLoading` (drawer) and `isMascotLoading` (mascot) flags via context. If one is streaming, the other shows a "Remy is busy" message and disables input. This prevents Ollama conflicts.

### Lip-Sync

Both UIs call `feedText()` from shared context. Whichever streamed the last token drives the mascot's mouth animation. Only one streams at a time, so there's no conflict.

### History

- Mascot chat sends last **10 messages** for context (short, quick exchanges)
- Drawer sends last **30 messages** (deeper conversations)
- Mascot chat history is lost on page refresh (by design)

## Mascot Chat UI

- **Width:** 340px, max height 420px
- **Position:** `fixed bottom-[120px] left-4 lg:left-64` (above mascot, sidebar-aware)
- **Theme:** Dark (stone-900 bg, brand accents)
- **Features:** Message bubbles, streaming cursor, loading spinner, retry button, 3 starter prompts, "Remy is busy" indicator
- **Footer hint:** "Quick chat — use Ctrl+K for deeper conversations"

## Shared Stream Parser

`remy-stream-parser.ts` handles SSE parsing for both hooks:

```typescript
parseRemyStream(reader, {
  onToken: (token) => {
    /* append to streaming content */
  },
  onTasks: (tasks) => {
    /* drawer only */
  },
  onNav: (navs) => {
    /* drawer only */
  },
  onError: (err) => {
    /* show error message */
  },
  onDone: () => {
    /* finalize */
  },
})
```

Returns `{ fullContent, isError, tasks, navSuggestions, memoryItems }`.
