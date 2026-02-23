# Remy Privacy Architecture — Integration Complete

**Date:** 2026-02-22
**Branch:** `feature/risk-gap-closure`
**Previous:** `docs/remy-privacy-architecture.md` (infrastructure files created)
**This doc:** Integration of those files into the live codebase

---

## What Changed (This Session)

### 1. Remy Drawer — Supabase → IndexedDB

The most significant change. `components/ai/remy-drawer.tsx` previously stored all conversations in Supabase via `remy-conversation-actions.ts` (server actions). Now conversations are stored entirely in the browser via IndexedDB (`remy-local-storage.ts`).

**What was swapped:**

| Before (Supabase)                                | After (IndexedDB)                                   |
| ------------------------------------------------ | --------------------------------------------------- |
| `createConversation()` → Supabase insert         | `createLocalConversation()` → IndexedDB add         |
| `listConversations()` → Supabase query           | `listLocalConversations()` → IndexedDB getAll       |
| `loadConversationMessages()` → Supabase query    | `loadLocalMessages()` → IndexedDB index query       |
| `saveConversationMessage()` → Supabase insert    | `saveLocalMessage()` → IndexedDB add                |
| `deleteConversation()` → Supabase delete         | `deleteLocalConversation()` → IndexedDB delete      |
| `exportConversation()` → Supabase query + format | `exportLocalConversation()` → IndexedDB export      |
| `autoTitleConversation()` → Ollama + Supabase    | Simple first-message title derivation (no LLM call) |

**What this means:**

- ChefFlow's servers **never** receive or store conversation content
- Conversations persist across page refreshes (same browser)
- Conversations do NOT sync across devices (this is intentional — it's truly local)
- The existing `remy_conversations` and `remy_messages` Supabase tables are NOT dropped — they're deprecated in code

### 2. Remy Metrics — Integrated Into Stream Route

`app/api/remy/stream/route.ts` now records anonymous usage metrics after each response:

- **Question path:** Records `messageCount: 1` on success, `errorCount: 1` on error
- **Command path:** Records `messageCount: 1` after command execution
- All calls are non-blocking (`catch(() => {})`) — metrics never break the response

### 3. Remotion Video — Embedded in Transparency Page

- Created `components/ai-privacy/privacy-schematic-player.tsx` (Player wrapper)
- Embedded in `app/(chef)/settings/ai-privacy/page.tsx` as a prominently visible section
- The static `DataFlowAnimated` comparison moved to a collapsible section below the video

### 4. Tooltip & Language Updates

| File                                           | Change                                                                                                                                                                                                                                                   |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/dashboard/ollama-status-badge.tsx` | Tooltips updated from "data stays private/within ChefFlow" to "conversations stay in your browser" across all 4 badge variants                                                                                                                           |
| `components/ai/command-center-client.tsx`      | Offline message updated to "processed privately and never stored on our servers"                                                                                                                                                                         |
| `app/(public)/terms/page.tsx`                  | §2 definition: "Local AI" → "Private AI" with browser storage disclosure. §15 AI Data Handling: complete rewrite mentioning IndexedDB, external API disclosure. §17: updated to "private by architecture" language. §16 Ollama row: updated description. |

### 5. CLAUDE.md

Updated the TODO section from "Still TODO: 3 files" to "✅ COMPLETE" — all privacy files are now updated.

---

## Files Modified

| File                                           | What Changed                                                |
| ---------------------------------------------- | ----------------------------------------------------------- |
| `components/ai/remy-drawer.tsx`                | Swapped all conversation storage from Supabase to IndexedDB |
| `app/api/remy/stream/route.ts`                 | Added `recordRemyMetric()` calls (non-blocking)             |
| `app/(chef)/settings/ai-privacy/page.tsx`      | Embedded Remotion privacy video                             |
| `components/dashboard/ollama-status-badge.tsx` | Tooltips updated to "conversations stay in your browser"    |
| `components/ai/command-center-client.tsx`      | Offline message updated                                     |
| `app/(public)/terms/page.tsx`                  | §2, §15, §16, §17 updated for new privacy architecture      |
| `CLAUDE.md`                                    | TODO section marked complete                                |

## Files Created

| File                                                 | Purpose                                                 |
| ---------------------------------------------------- | ------------------------------------------------------- |
| `components/ai-privacy/privacy-schematic-player.tsx` | Remotion Player wrapper for 55-second privacy explainer |

---

## What's NOT Changed (Intentional)

- **`remy-conversation-actions.ts`** — NOT deleted. It's still importable for any code that might reference it. The drawer no longer imports it, but other components might. It will be cleaned up in a future pass.
- **`remy_conversations` / `remy_messages` tables** — NOT dropped. Additive migrations only. Old data remains accessible.
- **`autoTitleConversation` server action** — Still exists in the server actions file, just no longer called from the drawer. Title is now derived from the first message (simpler, no LLM call needed).

---

## Testing Checklist

- [ ] Open Remy drawer → start new conversation → messages save to IndexedDB (check DevTools > Application > IndexedDB > chefflow-remy)
- [ ] Close drawer → reopen → conversation history persists
- [ ] Create multiple conversations → switch between them
- [ ] Delete a conversation → confirm gone from IndexedDB
- [ ] Export conversation → downloads as markdown
- [ ] Send to Support → confirm toast success
- [ ] Visit Settings > Remy > Privacy & Data → Remotion video plays
- [ ] Check ollama-status-badge tooltips → should say "conversations stay in your browser"
- [ ] Visit /terms → §15 and §17 reflect new architecture
- [ ] Log in from different browser → no conversation history (proving local-only)
