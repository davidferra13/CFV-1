# Event Readiness Assistant Persistent Dismissals Build Spec

Date: 2026-04-24

## Scope

Build persistent, per-chef/per-event dismissal support for Event Readiness Assistant suggestions.

This is the single highest-leverage additive action remaining inside the Event Readiness Assistant scope because the assistant is already optional, mode-aware, and integrated, but dismissed suggestions currently return after refresh. Persistent dismissals make the assistant quieter without changing readiness math, pricing infrastructure, or event workflows.

## Evidence

- The current panel stores dismissed suggestions only in local React state: `components/events/event-readiness-assistant-panel.tsx:115`.
- Visible suggestions are filtered against that local-only state: `components/events/event-readiness-assistant-panel.tsx:118-124`.
- Clicking dismiss only appends to local state, so the dismissal is lost on refresh/navigation: `components/events/event-readiness-assistant-panel.tsx:238-245`.
- The implementation note explicitly says the panel has "local-only dismissal of suggestions": `docs/specs/event-readiness-assistant.md:41`.
- Existing assistant preference migration added global and per-event assistant toggles but no dismissal persistence: `database/migrations/20260424000005_event_readiness_assistant.sql:5-6` and `database/migrations/20260424000005_event_readiness_assistant.sql:25-26`.

## Goal

When a chef dismisses a dismissible Event Readiness Assistant suggestion, it should stay dismissed for that chef and event across refreshes, page navigation, and future sessions until the underlying suggestion identity changes or the chef explicitly resets dismissals.

## Non-Goals

- Do not change readiness scoring.
- Do not change pricing intelligence calculations.
- Do not add blocking warnings, modals, nagging flows, or hard validation gates.
- Do not auto-refresh OpenClaw or ingredient prices.
- Do not persist dismissals for non-dismissible checks or suggestions where `canDismiss` is false.
- Do not create a disconnected dashboard.

## Data Model

Add a small migration for a new table, for example:

```sql
CREATE TABLE IF NOT EXISTS event_readiness_suggestion_dismissals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  suggestion_id TEXT NOT NULL,
  dismissed_by UUID NULL,
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, event_id, suggestion_id)
);
```

Add practical indexes:

- `(tenant_id, event_id)`
- `(tenant_id, event_id, suggestion_id)`

Follow existing project RLS/migration conventions. If this project has intentionally disabled RLS for the current development schema, document that in the migration comment instead of inventing a new security pattern.

## Server Behavior

Extend `lib/events/event-readiness-assistant-actions.ts`.

Required additions:

- Fetch dismissed suggestion IDs for the current chef/event when assembling the assistant payload.
- Remove dismissed suggestions from `suggestions` and `hiddenSuggestions` before returning to the UI.
- Keep `hiddenSuggestionCount` consistent with the filtered hidden suggestions.
- Add a server action to dismiss a suggestion:
  - Input: `eventId`, `suggestionId`.
  - Verify the current chef owns the event.
  - Upsert the dismissal row by `(tenant_id, event_id, suggestion_id)`.
  - Revalidate `/events/{eventId}` and `/events/{eventId}/financial`.
- Add a server action to reset event dismissals:
  - Input: `eventId`.
  - Verify ownership.
  - Delete rows for that chef/event.
  - Revalidate the same paths.

Use the existing `getCurrentChef`, Supabase action, and `revalidatePath` patterns already present in `lib/events/event-readiness-assistant-actions.ts`.

## UI Behavior

Update `components/events/event-readiness-assistant-panel.tsx`.

Required behavior:

- Dismiss buttons should call the new server action.
- Optimistically hide the suggestion immediately.
- If the server action fails, restore the suggestion and show a calm toast error.
- Do not show a dismiss button for `canDismiss: false`.
- Add a small, non-prominent "Reset dismissed" control inside the assistant settings area only when the assistant is visible.
- No popups, no modal, no blocking confirmation.
- Quiet mode must remain quiet: dismissed hidden suggestions should reduce the available count.

## Tests

Add or update focused tests.

Minimum unit/action coverage:

- Dismissed suggestion IDs are filtered from normal-mode suggestions.
- Dismissed suggestion IDs are filtered from quiet-mode hidden suggestions.
- `hiddenSuggestionCount` reflects filtered quiet suggestions.
- Non-dismissed suggestions still appear.
- Dismiss action validates event ownership.
- Reset action removes only the current chef/event dismissals.

Minimum UI/E2E coverage if the current Playwright environment is available:

- In normal mode, dismiss a suggestion, reload, and confirm it stays hidden.
- Reset dismissed suggestions and confirm the suggestion can appear again.
- Confirm no dialog/modal appears during dismiss or reset.

If Playwright cannot run because the E2E database has not applied the latest assistant migrations, keep the test guarded the same way the current readiness assistant E2E test is guarded and document the skip.

## Performance

- Fetch dismissals in one query by `tenant_id` and `event_id`.
- Do not add extra pricing/costing queries.
- Do not run assistant calculations when global or event mode is off.

## Definition Of Done

- A chef can dismiss Event Readiness Assistant suggestions and they stay dismissed across refreshes.
- Dismissals are scoped to the current chef and event.
- Quiet and normal modes both respect persisted dismissals.
- The chef can reset dismissed suggestions from the assistant settings area.
- Existing pricing, costing, quote, event, expense, and readiness calculations are unchanged.
- No blocking UI or nagging behavior is introduced.
- Focused tests pass, and any blocked E2E verification is documented with the exact command and reason.
