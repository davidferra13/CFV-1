# Event Readiness Assistant Implementation Note

Date: 2026-04-24

## What Already Exists

- `lib/events/readiness.ts` and `components/events/readiness-gate-panel.tsx` provide hard readiness gates for service simulation/document generation. That system can block transitions when critical operational proofs are missing.
- `lib/formulas/event-risk-score.ts` calculates operational event risk from date, payment, guest count, menu, contract, dietary, and travel inputs.
- `lib/finance/event-pricing-intelligence.ts` provides deterministic pricing math and warning generation.
- `lib/finance/event-pricing-intelligence-actions.ts` assembles event pricing data from event, menu, expense, quote, ingredient confidence, stale price, and variance sources.
- Event money surfaces already exist at `app/(chef)/events/[id]/financial/page.tsx` and `app/(chef)/events/[id]/_components/event-detail-money-tab.tsx`.
- Chef-level preferences already live in `chef_preferences`, surfaced through `lib/chef/actions.ts`, `lib/scheduling/types.ts`, and `components/settings/preferences-form.tsx`.

## What Is Missing

- There is no optional, non-blocking assistant layer that combines financial readiness, pricing confidence, and light ops completeness into one calm event-level status.
- Existing readiness gates are too operational and forceful for pricing/margin suggestions.
- Global and per-event assistant preferences do not exist.
- Event money surfaces do not currently have quiet/normal/off behavior for advisory readiness suggestions.

## What Will Be Reused

- `getEventPricingIntelligence` for projected food cost, suggested price, actual spend, variance, stale prices, low-confidence ingredients, and warning signals.
- `getChefPreferences` for target margin and global preference storage.
- Existing event fields for guest count, quote, status, timing, travel, food cost budgets, cost refresh state, menu attachment, and per-event toggles.
- Existing `Card`, `Badge`, `Button`, settings, and server-action patterns.

## What Will Be Built

- A pure `Event Readiness Assistant` evaluator that returns UI-friendly `enabled`, `mode`, `status`, `score`, `summary`, `checks`, and `suggestions`.
- A server action to assemble the readiness payload only when global/event settings allow it.
- Global settings in chef preferences:
  - assistant enabled by default
  - default mode: off/quiet/normal
  - financial suggestions on/off
  - pricing confidence suggestions on/off
  - ops-readiness suggestions on/off
- Event settings on events:
  - per-event assistant enabled/disabled
  - per-event mode: off/quiet/normal
- A compact client panel that supports quiet and normal display modes, per-event toggles, mode changes, and local-only dismissal of suggestions.

## Toggle Behavior

- Global off: the assistant returns disabled and expensive event intelligence is not loaded.
- Event off: the assistant returns disabled for that event.
- Quiet: only a passive readiness summary and suggestion count are shown; details stay behind "View suggestions".
- Normal: compact status, top checks, and top suggestions are visible. No blocking language or modals.
- Suggestion category toggles suppress financial, pricing confidence, or ops suggestions without affecting the rest of the event page.

## Expected Files To Change

- `database/migrations/*_event_readiness_assistant.sql`
- `lib/scheduling/types.ts`
- `lib/chef/actions.ts`
- `components/settings/preferences-form.tsx`
- `lib/events/event-readiness-assistant.ts`
- `lib/events/event-readiness-assistant-actions.ts`
- `components/events/event-readiness-assistant-panel.tsx`
- `app/(chef)/events/[id]/financial/page.tsx`
- `app/(chef)/events/[id]/_components/event-detail-money-tab.tsx`
- `app/(chef)/events/[id]/page.tsx`
- `tests/unit/event-readiness-assistant.test.ts`

## Definition Of Done

- A chef can enable the assistant globally, open an event, and see an advisory readiness status in the event money/financial surface.
- The chef can turn the assistant off for the event, keep it quiet, or use normal suggestions.
- The assistant evaluates only available data and does not fabricate missing data.
- Pricing, costing, expense, quote, menu, ingredient confidence, stale pricing, and light ops assumptions are reused instead of rebuilt.
- No popups, blocking modals, hard gates, or compliance-style language are introduced.
- Unit tests cover status/score, off/quiet/normal behavior, margin risk, missing quote, low-confidence pricing, and actual spend variance.
