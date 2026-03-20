# Post-Event Content Pipeline

## Overview

System that helps chefs create social media content from completed events. AI assists with drafting only; the chef always edits and approves before posting externally.

## What Changed

### New Table: `event_content_drafts`

Migration: `supabase/migrations/20260401000089_content_pipeline.sql`

- Stores AI-generated or manually written content drafts
- Fields: event_id, tenant_id, platform (instagram/story/blog), draft_text, status (draft/approved/posted), photo_ids, ai_generated flag
- RLS policies scoped to chef tenant
- Updated_at trigger included

### Server Actions: `lib/content/post-event-content-actions.ts`

All actions require `requireChef()` + tenant scoping + `requirePro('marketing')`.

| Action | Purpose |
|--------|---------|
| `getContentReadyEvents()` | Lists completed events with photos, includes NDA/privacy flags |
| `generateContentDraft(eventId, platform)` | Uses Ollama to draft content. Checks NDA/photo_permission first |
| `saveContentDraft(input)` | Saves a draft (AI or manual) |
| `updateContentDraft(draftId, text)` | Chef edits draft text |
| `updateDraftStatus(draftId, status)` | Moves through draft -> approved -> posted |
| `getEventContentDrafts(eventId)` | Gets all drafts for an event |
| `deleteContentDraft(draftId)` | Removes a draft |

### UI Component: `components/content/content-pipeline-panel.tsx`

Client component that shows:
- Completed events eligible for content (with photo counts)
- NDA/privacy restriction badges
- Platform selector (Instagram, Story, Blog)
- "Generate Draft" button (calls Ollama)
- Text editor for chef modifications
- Saved drafts list with Edit, Copy, Approve, Mark as Posted, Delete actions
- Ollama offline error handling with clear message

## Privacy and AI Rules

- Uses `parseWithOllama` exclusively (client data stays local)
- If client has `nda_active = true` or `photo_permission = 'none'`, draft content is anonymized (no client name, no location, no specific occasion details)
- AI prompt explicitly forbids em dashes
- OllamaOfflineError is thrown (not caught silently) so the UI can show "Start Ollama to generate content drafts"
- Drafts are NEVER posted automatically. Chef copies text and posts manually.

## Tier

Pro feature gated behind `marketing` module slug.

## Integration Points

- Reads from: `events`, `clients` (NDA fields), `event_photos`, `menus`
- Writes to: `event_content_drafts`
- Uses: `parseWithOllama`, `requirePro('marketing')`, `requireChef()`
