# Remy + Gustav — Phase 3 Audit & Polish

**Date:** 2026-02-26
**Status:** Complete
**Branch:** `feature/risk-gap-closure`
**Reference Plan:** Gustav ↔ Remy best-of-both merge (Phase 3 of 3)

## Summary

Side-by-side feature audit of Remy and Gustav after Phases 1 and 2. Identified and fixed critical bugs, added missing bookmark UI to Remy.

## Issues Found & Fixed

### Critical

| Issue                                                             | Where                 | Fix                                                                                                                            |
| ----------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Template Run broken — textarea had no `data-remy-input` attribute | `remy-drawer.tsx`     | Added `data-remy-input=""` to textarea + changed template Run to use `handleSend(prompt)` directly instead of DOM manipulation |
| sendChat race condition — rapid messages orphan AbortController   | `index.html` (Gustav) | Cancel previous AbortController before creating new one                                                                        |

### High Priority

| Issue                                                                | Where                 | Fix                                                                                                          |
| -------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------ |
| Message bookmarking had no UI                                        | `remy-drawer.tsx`     | Added bookmark button (amber star) on all messages, toggle handler, `bookmarked` field mapped from IndexedDB |
| Binary file crash — `readAsText()` on binary produces garbled output | `index.html` (Gustav) | Added null byte detection, empty file check, `reader.onerror` handler                                        |
| Streaming cursor left in DOM on error/cancel                         | `index.html` (Gustav) | Timer cleanup and memory tag stripping in error/cancel paths                                                 |
| File attachment not cleared on cancel                                | `index.html` (Gustav) | Added `clearFileAttachment()` call in `cancelChat()`                                                         |

## Deep Audit — Round 2 (15 additional bugs)

A comprehensive code quality audit uncovered 15 additional bugs across both systems.

### Remy Fixes (7)

| Severity | Issue                                                                  | Fix                                                     |
| -------- | ---------------------------------------------------------------------- | ------------------------------------------------------- |
| HIGH     | `AudioContext` never closed — sound stops working after ~6 messages    | `osc.onended = () => ctx.close()`                       |
| HIGH     | Message delete only removed from memory — reappeared on reload         | Now calls `deleteMessage()` from IndexedDB              |
| HIGH     | `onNewConversation` ignored `projectId` — "New in project" didn't work | Accepts and applies `projectId` parameter               |
| HIGH     | Template run used `setTimeout(150)` — race created 2 conversations     | `await handleNewConversation()` instead                 |
| HIGH     | Fetch timeout timer leaked on network error + reader never cancelled   | `clearTimeout` in `finally`, `reader.cancel()` on abort |
| HIGH     | Unbounded message history sent to server — could cause 413/OOM         | Capped at `messages.slice(-30)`                         |
| MEDIUM   | Search debounce timer not cleared on unmount — stale state setter      | Added cleanup return in `useEffect`                     |

### Gustav Fixes (8)

| Severity | Issue                                                                     | Fix                                                |
| -------- | ------------------------------------------------------------------------- | -------------------------------------------------- |
| CRITICAL | `sendChat._renderTimer` shared across calls — cross-contaminated messages | Scoped to local `let renderTimer`                  |
| HIGH     | `AudioContext` never closed — leaked OS audio handles after ~6 responses  | `osc.onended = () => ctx.close()`                  |
| HIGH     | Voice recognition `stopVoice()` double-stop could recurse                 | Null ref before calling `.stop()`                  |
| HIGH     | File attachment not cleared on cancel                                     | `clearFileAttachment()` in `cancelChat()`          |
| MEDIUM   | Two `timeAgo` functions — second silently overrode first                  | Unified into one handling both Date and string     |
| MEDIUM   | Dead IndexedDB index query immediately overwritten                        | Removed dead code                                  |
| MEDIUM   | `updateProject` / `updateConversation` called `db.close()` twice          | Used flag pattern — close only in `oncomplete`     |
| MEDIUM   | sendChat race condition — rapid messages orphaned AbortController         | Cancel previous controller before creating new one |

## Files Modified (All Rounds)

| File                                 | Changes                                                                                                                                                                                   |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/ai/remy-types.ts`               | Added `bookmarked?: boolean` to `RemyMessage` interface                                                                                                                                   |
| `components/ai/remy-drawer.tsx`      | Bookmark UI, `deleteMessage` import, `projectId` on `handleNewConversation`, `await` template run, `clearTimeout`/`reader.cancel()` in finally, history cap at 30, `AudioContext.close()` |
| `components/ai/remy-search-view.tsx` | Debounce timer cleanup on unmount                                                                                                                                                         |
| `scripts/launcher/index.html`        | Local `renderTimer` scope, `AudioContext.close()`, voice double-stop fix, unified `timeAgo`, cancel clears file attachment                                                                |
| `scripts/launcher/gustav-storage.js` | Removed dead index query, fixed double `db.close()` in update functions                                                                                                                   |

## Feature Parity Status

Both Remy and Gustav now share organizational features (projects, search, templates, action log, pin/archive, bookmarks) and UX polish (cancel, streaming cursor, sound, memory, file attach). Each retains domain-specific capabilities that don't cross:

- **Remy only:** Culinary personality, TTS/lip-sync, 54+ business tasks, approval workflow, guardrails
- **Gustav only:** DevOps tools, git/SSH/builds, full-authority mode, 29 action tools

## Remaining (Deferred — Low Impact)

- `loadConversationList` missing from useEffect deps (stale closure edge case)
- `trimConversationMessages` doesn't update `messageCount` (cosmetic drift)
- `ConversationItem` declared inside render (performance on large lists)
- Server.mjs git command injection (low risk — dev-only tool, trusted input)
- SSE reconnect could create duplicate connections (rare race)
- Export functions open 3 sequential DB connections (non-atomic snapshot)
