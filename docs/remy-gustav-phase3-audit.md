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

## Files Modified

| File                            | Changes                                                                                                                                    |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `lib/ai/remy-types.ts`          | Added `bookmarked?: boolean` to `RemyMessage` interface                                                                                    |
| `components/ai/remy-drawer.tsx` | Added `Bookmark` icon, `toggleBookmark` import, bookmark toggle handler, bookmark button on messages, `bookmarked` mapping in message load |
| `scripts/launcher/index.html`   | Fixed sendChat race, cancel clears file attachment                                                                                         |

## Feature Parity Status

Both Remy and Gustav now share organizational features (projects, search, templates, action log, pin/archive, bookmarks) and UX polish (cancel, streaming cursor, sound, memory, file attach). Each retains domain-specific capabilities that don't cross:

- **Remy only:** Culinary personality, TTS/lip-sync, 54+ business tasks, approval workflow, guardrails
- **Gustav only:** DevOps tools, git/SSH/builds, full-authority mode, 29 action tools

## What's Next

- All 3 phases complete — feature merge is done
- Monitor for edge cases in production use
