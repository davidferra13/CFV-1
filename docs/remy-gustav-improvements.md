# Remy + Gustav Improvement Sweep

**Date:** 2026-02-27
**Branch:** `feature/risk-gap-closure`

## Summary

Full improvement pass on both in-app AI systems. Remy (client-facing concierge) was refactored from a 2100-line monolith into modular hooks and extracted utilities. Gustav (Mission Control ops AI) had bugs fixed and hardening applied.

---

## Phase 1: Gustav Bug Fixes

### 1A. `timeAgo()` crash fix

- **File:** `scripts/launcher/index.html:5372`
- **Bug:** Referenced `dateStr` (undefined) instead of `dateInput` — crashed for conversations older than 7 days
- **Fix:** Changed `dateStr` to `dateInput`

### 1B. Search project label improvement

- **File:** `scripts/launcher/index.html:5727`
- **Was:** Only showed "Uncategorized" label, never showed actual project names in search results
- **Now:** Looks up project names from IndexedDB, shows actual project name for categorized conversations and "Uncategorized" for unassigned

---

## Phase 2: Remy Monolith Refactor

Extracted from `components/ai/remy-drawer.tsx` (2100 lines → ~1100 lines):

### Pure function extractions

| New file                          | What it contains                                                                             |
| --------------------------------- | -------------------------------------------------------------------------------------------- |
| `lib/ai/remy-starters.ts`         | `getStartersForPage()` — context-aware chat starters + `getThinkingMessage()` — loading text |
| `lib/ai/remy-markdown-config.tsx` | `markdownComponents` — ReactMarkdown component overrides                                     |

### Custom hook extractions

| New file                                   | What it encapsulates                                                                         |
| ------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `lib/hooks/use-voice-input.ts`             | Web Speech API voice recognition (STT), `isListening` state, `toggleVoiceInput()`            |
| `lib/hooks/use-message-actions.ts`         | Copy, bookmark, TTS speak, voice settings, message/memory deletion                           |
| `lib/hooks/use-conversation-management.ts` | Conversation CRUD, project suggestions, message loading, welcome message                     |
| `lib/hooks/use-remy-send.ts`               | 270-line `handleSend()` streaming logic, cancel, task approval/rejection, notification sound |

### Architecture after refactor

```
RemyDrawer (orchestrator, ~1100 lines)
  ├── useConversationManagement — owns messages/conversations state
  ├── useMessageActions — owns voice settings, copy/bookmark/TTS
  ├── useRemySend — owns streaming state, sends messages
  ├── useVoiceInput — owns STT recognition
  ├── getStartersForPage() — pure function
  ├── markdownComponents — static config
  └── Existing extracted views:
      ├── RemyConversationList
      ├── RemySearchView
      ├── RemyActionLog
      ├── RemyTemplatesView
      └── RemyCapabilitiesPanel
```

---

## Phase 3: Gustav Hardening

### 3A. Template variable interpolation

- **File:** `scripts/launcher/index.html`
- Added `interpolateTemplate(prompt)` — replaces `{{date}}`, `{{time}}`, `{{day}}`, `{{month}}`, `{{year}}`, `{{timestamp}}` with current values
- Applied automatically when running a template

### 3B. Auto-enforce memory limits on init

- **File:** `scripts/launcher/index.html`
- `pruneOldConversations()` now called on first chat drawer open (was only on conversation create)

### 3C. Template name validation

- **File:** `scripts/launcher/index.html`
- Template names capped at 100 characters

### 3D. Search result pagination

- **File:** `scripts/launcher/index.html`
- Shows first 20 results, "Show more" button loads next 20
- Displays total result count

### 3E. DB connection pooling

- **File:** `scripts/launcher/gustav-storage.js`
- Added `getDB()` — caches IndexedDB connection with 5-second idle timeout
- Handles `onversionchange` to invalidate cache if another tab upgrades the DB

### 3F. Archive cleanup

- **File:** `scripts/launcher/gustav-storage.js`
- Added `MAX_ARCHIVED = 100` constant
- `pruneOldConversations()` now has two phases: (1) trim total if over 500, (2) cap archived at 100

---

## Phase 4: Remy Template Interpolation

- **File:** `components/ai/remy-templates-view.tsx`
- Added `interpolateTemplate()` — same `{{var}}` syntax as Gustav
- Applied when `handleRun()` fires a template

---

## Verification

- `npx tsc --noEmit --skipLibCheck` — zero errors in new/modified Remy files
- All pre-existing errors are in unrelated files (stations, finance, vendors)
- No behavioral changes — all extractions preserve exact existing behavior
