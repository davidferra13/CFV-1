# Debrief Page + AI Draft Action

## What Changed
- `lib/events/debrief-actions.ts` — added `generateDebriefDraft(eventId)`
- `components/events/event-debrief-client.tsx` — added "Draft with AI" button in Reflection section

## Context
`app/(chef)/events/[id]/debrief/page.tsx` and `components/events/event-debrief-client.tsx`
were already fully implemented. No new page was needed.

## AI Draft Action (`generateDebriefDraft`)
- Server action with `requireChef()` auth
- Fetches event context: occasion, date, guest count, client name, first 5 menu dishes
- Calls Gemini API (`gemini-2.5-flash`) with a chef-perspective reflection prompt
- Returns `{ draft: string }` — **never writes to DB**
- Returns `{ error: string }` on failure or when `GEMINI_API_KEY` is not configured
- Fully compliant with AI Policy: draft-only, chef must save explicitly

## UI Change (event-debrief-client.tsx)
In the "Notes to self" section of the Reflection tab:
- When `outcomeNotes` is empty, shows a "✨ Draft with AI" button next to the label
- On click: calls `generateDebriefDraft`, populates textarea with draft text
- Loading state: "⏳ Drafting..."
- Error state: "Try again" (red, auto-resets after 3s)
- Button disappears once notes are filled — will not overwrite existing text

## Files Modified
- `lib/events/debrief-actions.ts`
- `components/events/event-debrief-client.tsx`
