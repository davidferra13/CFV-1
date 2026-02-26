# Post-Event Debrief System

## What This Is

After a chef marks a dinner as `completed`, ChefFlow surfaces a guided debrief flow at `/events/[id]/debrief`. The goal is to capture knowledge while it's still fresh — things the chef observed during the dinner that aren't yet in the system.

This is the **fill-in-the-blanks** concept: instead of showing a giant form, the system computes exactly what's missing for _this client_ and _these recipes_, and only prompts for those specific gaps.

## Why This Exists

Private chef work generates a lot of knowledge that historically lives in the chef's head:

- "Her birthday is in April — I saw the calendar."
- "He's actually vegetarian now, he mentioned it when he passed on the lamb."
- "The salmon roulade needed 10 more minutes than the recipe said — write that down."
- "They loved the lighting and music, very relaxed energy."

The debrief flow is an invitation to capture all of this in one natural moment right after the event, rather than expecting the chef to navigate to client settings and recipe pages individually.

## Architecture

### Database Changes

Migration `20260302000001_post_event_debrief_fields.sql` adds three nullable columns to the `events` table:

| Column                 | Type             | Purpose                                                            |
| ---------------------- | ---------------- | ------------------------------------------------------------------ |
| `debrief_completed_at` | `TIMESTAMPTZ`    | Timestamp when chef clicked "Complete Debrief". `NULL` = not done. |
| `chef_outcome_notes`   | `TEXT`           | Free-text reflection — what stood out, what to remember next time. |
| `chef_outcome_rating`  | `SMALLINT (1–5)` | Star rating of how the dinner went overall.                        |

All columns are additive and nullable. No existing data is affected.

### Guard Condition

The debrief page (`app/(chef)/events/[id]/debrief/page.tsx`) and its data loader (`getEventDebriefBlanks`) both enforce `status === 'completed'`. Attempting to access the debrief URL for an event in any other state returns a 404.

### Blank Detection (getEventDebriefBlanks)

The server action `getEventDebriefBlanks(eventId)` runs several queries in parallel and computes what's missing as pure TypeScript — no extra DB columns, no stored flags:

**Client blanks detected:**

- `personal_milestones` — array is empty
- `dietary_restrictions` AND `allergies` — both empty (shown as one combined section)
- `preferred_name` — null
- `vibe_notes` — null
- `fun_qa_answers` — for each of the 12 Q&A questions, shows only unanswered ones (up to 4 displayed)

**Recipe blanks detected** (via events → menus → dishes → components → recipes):

- `photo_url` — null
- `method_detailed` — null
- `notes` — null
- `prep_time_minutes` AND `cook_time_minutes` — both null

A recipe is only shown in the debrief if it has _at least one_ blank field. Recipes that are fully filled in are excluded.

**Section visibility:**

- Dish Gallery — always shown
- Recipe Notes — only if 1+ recipes have blanks
- Client Insights — only if `client.hasAnyBlanks === true`
- Reflection — always shown

### Security Model

- `requireChef()` on every server action
- Tenant scoping on every query
- `saveRecipeDebrief` verifies the recipe is actually linked to this event before writing (events → menus → dishes → components → recipe_id chain check). This prevents a chef from editing any arbitrary recipe through the debrief endpoint.
- `saveClientInsights` verifies `event.client_id === clientId` before updating the client record.

### AI Policy Compliance

The debrief does **not** use AI to auto-fill any fields. It is pure chef-driven capture. This complies with the project's AI policy: AI never mutates canonical state, and all AI output requires explicit chef confirmation before becoming canonical.

A future enhancement could add a brain dump textarea that calls `parseBrainDump()` and returns suggestions for the chef to review — but the current implementation doesn't do this to keep the MVP focused and compliant.

### Activity Logging

Two activity actions are used (non-blocking):

- `client_updated` (domain: `client`) — when client insights are saved
- `recipe_updated` (domain: `recipe`) — when recipe notes are saved
- `debrief_completed` (domain: `operational`) — when the chef clicks "Complete Debrief"

`debrief_completed` was added to the `ChefActivityAction` union type in `lib/activity/chef-types.ts`.

### Save Pattern

Each section saves independently:

| Section           | Trigger                           | Action                                |
| ----------------- | --------------------------------- | ------------------------------------- |
| Photos            | On each upload (existing gallery) | `uploadEventPhoto`                    |
| Recipe notes      | Per-recipe "Save" button          | `saveRecipeDebrief`                   |
| Client insights   | "Save Client Insights" button     | `saveClientInsights`                  |
| Reflection rating | On star click                     | `saveDebriefReflection`               |
| Reflection notes  | On textarea blur                  | `saveDebriefReflection`               |
| Complete          | "Complete Debrief" button         | `completeDebrief` → redirect to event |

Fun Q&A answers are **merged** — existing answers set by the client or in prior debriefs are never overwritten. Only new keys or explicit updates are applied.

## Files Changed

| File                                                               | Change Type | Purpose                                                                 |
| ------------------------------------------------------------------ | ----------- | ----------------------------------------------------------------------- |
| `supabase/migrations/20260302000001_post_event_debrief_fields.sql` | New         | Additive migration: 3 columns on events                                 |
| `lib/activity/chef-types.ts`                                       | Modified    | Added `debrief_completed` to `ChefActivityAction`                       |
| `lib/events/debrief-actions.ts`                                    | New         | All server actions for the debrief flow                                 |
| `app/(chef)/events/[id]/debrief/page.tsx`                          | New         | Server component page (guard + data loading)                            |
| `components/events/event-debrief-client.tsx`                       | New         | Client component: section UI, star rating, tag input, per-section saves |
| `app/(chef)/events/[id]/page.tsx`                                  | Modified    | Added debrief CTA cards (amber if pending, green if complete)           |
| `docs/post-event-debrief.md`                                       | New         | This document                                                           |

## How to Test

1. Mark any event as `completed` (or find one that already is).
2. On the event detail page, confirm the amber "Capture what you learned tonight" card appears.
3. Click "Start Debrief" — the page loads at `/events/[id]/debrief`.
4. Confirm only sections with actual blanks are shown (e.g., Recipe Notes only appears if a recipe is linked and has gaps).
5. Add a milestone (birthday), set a star rating, save client insights.
6. Click "Complete Debrief" — you're redirected back to the event page.
7. On the event page, confirm the amber card is replaced by the green "Debrief complete" card with the date.
8. Re-entering `/events/[id]/debrief` still works (editable, but shows "Debrief marked complete" status).
9. Check the client profile — verify personal_milestones updated.
10. Check `chef_activity_log` in Supabase dashboard — verify `debrief_completed` entry.

## Migration Notes

- Apply with `supabase db push --linked` against project `luefkpakzvxcsqroxyhz`.
- Backup the database first (production data).
- All three columns are nullable with `ADD COLUMN IF NOT EXISTS` — safe to run even if partially applied.
- Run `supabase gen types typescript --linked` after migration to update `types/database.ts`.
