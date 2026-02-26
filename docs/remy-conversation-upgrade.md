# Remy Conversation Upgrade — TODO

**Status:** Planned (not started)
**Priority:** Next after Gustav conversation management is stable
**Reference:** Gustav implementation in `scripts/launcher/gustav-storage.js`

## What Remy Has Now

- IndexedDB storage (`lib/ai/remy-local-storage.ts`) with conversations + messages
- Basic conversation list in the drawer sidebar
- Create, delete, load conversations
- Auto-pruning (200 conversations, 500 messages each)
- Export for support

## What Remy Should Get (matching Gustav)

### 1. Projects (Folders)
- Group conversations by topic (recipe work, event planning, finance questions, etc.)
- Same 2-level hierarchy: Project > Conversation
- Add `projectId` field to `LocalConversation` in `remy-local-storage.ts`
- New `projects` object store in IndexedDB (requires DB version bump)

### 2. Pin / Archive
- Pin important conversations to the top
- Archive old conversations instead of deleting
- Add `pinned` and `archived` fields to `LocalConversation`

### 3. Message Bookmarks
- Bookmark specific messages (e.g., a recipe Remy generated that was perfect)
- Add `bookmarked` field to `LocalMessage`

### 4. Markdown Export
- Export conversations as readable `.md` files (not just JSON for support)

### 5. Search
- Full-text search across all conversations and messages
- Highlighted snippets in results

### 6. Templates
- Saved starter prompts (e.g., "Help me plan a dinner for 20 guests")
- New `templates` object store

### 7. Voice Input
- Remy already has TTS (text-to-speech) for reading responses
- Add STT (speech-to-text) for voice input using Web Speech API
- Same implementation as Gustav's `toggleVoice()`

### 8. Action Log equivalent
- Remy executes tasks (navigation, recipe lookup, etc.)
- Log all task executions across conversations for audit

## Migration Path

1. Bump `DB_VERSION` from 1 to 2 in `remy-local-storage.ts`
2. Add new stores (`projects`, `templates`) in `onupgradeneeded`
3. Add new fields to existing stores via migration (IndexedDB handles this)
4. Port the Gustav storage patterns to TypeScript (they're already based on Remy's patterns)
5. Update `remy-drawer.tsx` UI to match Gustav's list/search/action views

## Files to Modify

| File | Changes |
|------|---------|
| `lib/ai/remy-local-storage.ts` | Add projects store, templates store, bookmark/pin/archive fields, search, export |
| `components/ai/remy-drawer.tsx` | Add project grouping UI, search view, pin/archive controls, bookmark toggles |

## Key Difference from Gustav

Gustav is vanilla JS in a standalone HTML file. Remy is React/TypeScript in the Next.js app. The data model is identical, but the UI implementation will use React components instead of innerHTML templates.
