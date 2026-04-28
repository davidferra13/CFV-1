# Lifecycle Call Checkpoints

Date: 2026-04-28

## What Changed

ChefFlow now connects the existing calls subsystem to the cash-moving client lifecycle moments:

- Inquiry detail offers a human call checkpoint before the inquiry is confirmed.
- Event detail offers proposal, logistics, or follow-up call checkpoints based on event status.
- The call scheduler accepts prefill query params for call type, contact, linked inquiry or event, title, prep notes, duration, and notification preference.
- Dashboard focus now renders upcoming calls with an honest unavailable state if call data fails to load.

## Why

The system already had scheduled calls, agenda items, reminders, outcomes, and dashboard widgets. The missing connection was putting calls directly at the moments where a manager would move cash: discovery, proposal walkthrough, pre-service logistics, and day-after follow-up.

## Verification

- `npx tsc --noEmit --skipLibCheck`
- `node --test --import tsx tests/unit/lifecycle-call-prefill.test.ts`
