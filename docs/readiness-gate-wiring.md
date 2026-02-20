# Readiness Gate Wiring to EventTransitions

## What Changed
`components/events/event-transitions.tsx` — rewritten to surface blockers inline
`app/(chef)/events/[id]/page.tsx` — passes `readiness` prop to `<EventTransitions>`

## Before
EventTransitions showed action buttons with no pre-flight checks. The `ReadinessGatePanel`
was a separate read-only display component — disconnected from the buttons.

## After
EventTransitions now:
1. Accepts `readiness?: ReadinessResult | null` prop (already fetched by the event detail page)
2. Renders a `GateList` component showing blockers above relevant action buttons
3. Hard blocks (e.g., anaphylaxis allergy not verified) disable the button entirely + show red ✕
4. Soft blocks show amber ! warning but allow proceeding

## Gate logic by transition
- `paid → confirmed`: allergies_verified, documents_generated
- `confirmed → in_progress`: packing_reviewed
- `in_progress → completed`: receipts_uploaded, kitchen_clean, financial_reconciled

## Files Modified
- `components/events/event-transitions.tsx`
- `app/(chef)/events/[id]/page.tsx`

## No schema changes
All readiness data is already fetched by `getEventReadiness()` in `lib/events/readiness.ts`.
