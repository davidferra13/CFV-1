# Circle-First Lifecycle Integration

**Date:** 2026-03-06
**Branch:** `feature/risk-gap-closure`

## What Changed

The Dinner Circle (created automatically on inquiry) now receives structured updates at every major lifecycle transition. Previously, the circle was created with the first response and then went silent. Now it's the client's single source of truth.

## Lifecycle Events Posted to Circle

| Event                | When                                  | Message Type | File                            |
| -------------------- | ------------------------------------- | ------------ | ------------------------------- |
| Menu shared          | Menu transitions to `shared`          | system       | `circle-lifecycle-hooks.ts`     |
| Quote sent           | Quote transitions to `sent`           | system       | `circle-lifecycle-hooks.ts`     |
| Quote accepted       | Client accepts quote                  | system       | `circle-lifecycle-hooks.ts`     |
| Payment received     | Stripe webhook confirms payment       | system       | `circle-lifecycle-hooks.ts`     |
| Event confirmed      | Event transitions to `confirmed`      | system       | `circle-lifecycle-hooks.ts`     |
| Pre-event briefing   | Chef sends via Remy (2-3 days before) | text         | `pre-event-briefing-actions.ts` |
| Arrival notification | Chef triggers via Remy (day-of)       | system       | `circle-lifecycle-hooks.ts`     |
| Event completed      | Event transitions to `completed`      | text         | `circle-lifecycle-hooks.ts`     |
| Photos shared        | First photo uploaded                  | system       | `circle-lifecycle-hooks.ts`     |
| Menu proposal        | Chef proposes menus via Remy          | text         | `menu-proposal-actions.ts`      |

## New Files Created

### Templates (Formula > AI, deterministic)

- `lib/templates/menu-proposal-message.ts` - Menu proposal formatting
- `lib/templates/pre-event-briefing.ts` - Pre-event client briefing
- `lib/templates/post-event-circle-messages.ts` - Thank-you and photo share messages

### Hub Actions

- `lib/hub/circle-lookup.ts` - Find circle by event/inquiry, get chef hub profile
- `lib/hub/circle-lifecycle-hooks.ts` - All lifecycle posting functions
- `lib/hub/menu-proposal-actions.ts` - Share menu proposals to circle
- `lib/hub/pre-event-briefing-actions.ts` - Post pre-event briefing to circle

### Remy Actions

- `lib/ai/agent-actions/menu-proposal-actions.ts` - Tier 2: propose menus
- `lib/ai/agent-actions/lifecycle-circle-actions.ts` - Tier 2: pre-event briefing + arrival notification

### Agent-Brain Docs

- `docs/agent-brain/09-MENU_PLANNING.md` - Menu planning communication rules
- `docs/agent-brain/10-PREP_AND_DAY_OF.md` - Prep and day-of communication rules
- `docs/agent-brain/11-POST_EVENT.md` - Post-event relationship rules

## Files Modified

| File                               | Change                                                |
| ---------------------------------- | ----------------------------------------------------- |
| `lib/menus/actions.ts`             | Hook `postMenuSharedToCircle()` in `transitionMenu()` |
| `lib/quotes/actions.ts`            | Hook `postQuoteSentToCircle()` in `transitionQuote()` |
| `lib/quotes/client-actions.ts`     | Hook `postQuoteAcceptedToCircle()` in `acceptQuote()` |
| `lib/events/transitions.ts`        | Hook confirmed + completed circle posts               |
| `lib/events/photo-actions.ts`      | Hook `postPhotosToCircle()` on first photo upload     |
| `app/api/webhooks/stripe/route.ts` | Hook `postPaymentReceivedToCircle()` after payment    |
| `lib/ai/agent-brain.ts`            | Load 09/10/11 docs, inject by lifecycle state         |
| `lib/ai/agent-actions/index.ts`    | Register menu proposal + lifecycle circle actions     |

## Architecture

All hooks follow the same pattern:

1. Non-blocking (wrapped in try/catch, main operation succeeds regardless)
2. Use `getCircleForEvent()` or `getCircleForContext()` to find the circle
3. Use `getChefHubProfileId()` to post as the chef
4. Skip silently if no circle exists (not all events have circles yet)
5. Admin supabase client for cross-tenant queries

## Data Flow

```
Inquiry arrives
  -> Circle created, first response posted (already built)
  -> Client gets circle link in email (already built)

Chef creates menus
  -> "Propose menus" Remy action -> menu proposal in circle (NEW)
  -> Menu transitions to shared -> system message in circle (NEW)

Chef sends quote
  -> Quote summary in circle (NEW)
  -> Client accepts -> "Quote accepted!" in circle (NEW)

Payment received
  -> "Payment received" in circle (NEW)

Event confirmed
  -> "Event confirmed, prep underway" in circle (NEW)
  -> Chef sends pre-event briefing via Remy (NEW)

Day-of
  -> Chef sends arrival notification via Remy (NEW)

Event completed
  -> Immediate thank-you in circle (NEW)
  -> First photo uploaded -> photo notification in circle (NEW)
```

## New Remy Actions (Chef Commands)

| Action               | Task Type                   | What Chef Says               |
| -------------------- | --------------------------- | ---------------------------- |
| Propose menus        | `draft.menu_proposal`       | "Propose menus to Sarah"     |
| Pre-event briefing   | `send.pre_event_briefing`   | "Send the briefing to Sarah" |
| Arrival notification | `send.arrival_notification` | "Tell Sarah I'm on my way"   |

## Dependencies

- Migration `20260330000057_hub_inquiry_link.sql` must be applied (adds `inquiry_id` to `hub_groups`)
- Hub messaging system must be active
- Chef must have a hub profile (created during circle creation)
