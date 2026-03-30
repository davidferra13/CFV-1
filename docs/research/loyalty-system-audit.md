# Research: Loyalty System Comprehensive Audit

> **Date:** 2026-03-29
> **Question:** Is the ChefFlow loyalty system fully wired, fair, automated, and production-ready?
> **Status:** complete

## Summary

The loyalty system has a solid foundation (append-only ledger, tier computation, three program modes, three earn modes, service-denominated rewards, auto-referral, guest milestones) but has five high-impact gaps: no SSE real-time broadcasts, no hybrid earn mode for fairness, no quick setup presets, a limited default reward catalog, and no client-facing milestone progress tracking. Everything already built works correctly with proper idempotency, tenant scoping, and non-blocking side effects.

## Detailed Findings

### 1. End-to-End Point Flows (Verified Working)

| Flow                          | Trigger                      | File:Line                                                | Status                           |
| ----------------------------- | ---------------------------- | -------------------------------------------------------- | -------------------------------- |
| Event completion (per_guest)  | Chef marks event completed   | `lib/loyalty/actions.ts:560-773`                         | Working                          |
| Event completion (per_dollar) | Chef marks event completed   | `lib/loyalty/actions.ts:570-577`                         | Working                          |
| Event completion (per_event)  | Chef marks event completed   | `lib/loyalty/actions.ts:578-581`                         | Working                          |
| Large party bonus             | Guest count >= threshold     | `lib/loyalty/actions.ts:600-608`                         | Working                          |
| Event milestones              | Exact match on event count   | `lib/loyalty/actions.ts:634-644`                         | Working                          |
| Guest milestones              | Range check on guest count   | `lib/loyalty/actions.ts:646-658`                         | Working (Phase 2)                |
| Welcome points                | First enrollment             | `lib/loyalty/actions.ts` (enrollment flow)               | Working                          |
| Manual bonus                  | Chef awards points           | `lib/loyalty/actions.ts:898-913` via `award-internal.ts` | Working                          |
| Auto-referral                 | Referral status -> completed | `lib/clients/referral-actions.ts:132-195`                | Working (Phase 2)                |
| Reward redemption             | Client redeems reward        | `lib/loyalty/actions.ts:919+`                            | Working                          |
| Backfill                      | Historical event import      | `lib/loyalty/actions.ts:1550+`                           | Working (incl. guest milestones) |

### 2. Notifications (Verified Working)

| Notification          | Recipient     | File:Line                        |
| --------------------- | ------------- | -------------------------------- |
| Points awarded        | Client        | `lib/loyalty/actions.ts:707-718` |
| Tier upgraded         | Client + Chef | `lib/loyalty/actions.ts:720-748` |
| Lite mode tier change | Client + Chef | `lib/loyalty/actions.ts:846-878` |

**Gap:** Notifications use the DB-backed notification system (`createClientNotification`), not SSE real-time broadcasts. Clients see notifications on next page load, not instantly.

### 3. Operator Controls (Verified Working)

| Control                       | Location              | Status            |
| ----------------------------- | --------------------- | ----------------- |
| Program mode (full/lite/off)  | Loyalty settings form | Working           |
| Earn mode selection           | Loyalty settings form | Working           |
| Points per guest/dollar/event | Loyalty settings form | Working           |
| Tier thresholds               | Loyalty settings form | Working           |
| Tier perks (custom per tier)  | Loyalty settings form | Working (Phase 1) |
| Milestone bonuses (events)    | Loyalty settings form | Working           |
| Guest milestones              | Loyalty settings form | Working (Phase 2) |
| Referral points value         | Loyalty settings form | Working           |
| Welcome points                | Loyalty settings form | Working           |
| Large party bonus             | Loyalty settings form | Working           |
| Manual bonus award            | Client detail page    | Working           |
| Manual point adjustment       | Client detail page    | Working           |
| Reward catalog CRUD           | Loyalty rewards page  | Working           |
| Reward active/inactive toggle | Loyalty rewards page  | Working           |

### 4. Security and Integrity

| Check                                       | Status   | Evidence                                                      |
| ------------------------------------------- | -------- | ------------------------------------------------------------- |
| Append-only ledger                          | Enforced | DB trigger prevents UPDATE/DELETE on `loyalty_transactions`   |
| Tier based on lifetime earned (not balance) | Correct  | `computeTier()` uses sum of earned+bonus, never balance       |
| Tenant scoping on all queries               | Correct  | Every query includes `.eq('tenant_id', ...)`                  |
| Auth on all public actions                  | Correct  | `requireChef()` or `requireClient()` on every exported action |
| Referral idempotency                        | Correct  | SELECT check + CAS guard (`WHERE reward_points_awarded = 0`)  |
| Event double-award prevention               | Correct  | `loyalty_points_awarded` boolean flag on events table         |
| Internal helper not directly callable       | Correct  | `award-internal.ts` is NOT a `'use server'` file              |

### 5. Default Reward Catalog

Current defaults in `lib/loyalty/actions.ts:199-245`:

- Complimentary appetizer course (50 pts)
- Complimentary dessert course (75 pts)
- $25 off next dinner (100 pts)
- 15% off dinner for two (150 pts)
- Chef's tasting menu experience (200 pts)
- 50% off dinner for two (250 pts)
- Free dinner for two (300 pts)

**Gap:** Only 7 rewards. No upgrade-tier rewards, no experience-based rewards, no seasonal options. The catalog is functional but thin.

### 6. Client-Facing UI

| Component                 | Location                                    | Status                    |
| ------------------------- | ------------------------------------------- | ------------------------- |
| My Rewards page           | `app/(client)/my-rewards/page.tsx`          | Working                   |
| Tier badge + progress bar | My Rewards page                             | Working                   |
| Available rewards         | My Rewards page                             | Working                   |
| All rewards catalog       | My Rewards page                             | Working                   |
| Pending redemptions       | My Rewards page                             | Working                   |
| How to Earn panel         | `components/loyalty/how-to-earn-panel.tsx`  | Working (Phase 2 updated) |
| Tier perks display        | `components/loyalty/tier-perks-display.tsx` | Working (Phase 1)         |
| Next reward card          | `components/loyalty/next-reward-card.tsx`   | Working                   |
| Points activity history   | My Rewards page                             | Working                   |

**Gap:** No milestone progress tracking. Client can't see "3 more guests until your next milestone" or "2 more events until your 10th dinner bonus."

## Gaps and Unknowns

### Gap 1: No SSE Real-Time Broadcasts (High Impact)

Points are awarded and notifications stored in DB, but there's no SSE broadcast. The `broadcastInsert` / `broadcastUpdate` helpers exist (`lib/realtime/broadcast.ts`) and are used elsewhere in the app, but loyalty actions never call them. Clients and chefs don't get instant feedback when points are awarded.

### Gap 2: Earn Mode Fairness (High Impact)

- `per_guest` mode: A client who hosts 20-person parties earns 10x more than a client who hosts intimate dinners for 2. The frequent intimate-dinner client gets penalized.
- `per_dollar` mode: A client who books expensive multi-course dinners earns more per event than one who books simpler meals, even if the simpler-meal client books more often.
- `per_event` mode: Fair across party sizes but ignores event value entirely.
- **No hybrid mode exists.** A chef can't say "base 50 pts per event + 5 pts per guest" which would balance both factors.

### Gap 3: No Quick Setup Presets (Medium Impact)

New chefs face 15+ configuration fields with no guidance. There are no preset profiles like "Private Dining" (per_guest heavy) or "Catering" (per_dollar heavy) or "Balanced" (hybrid). Chefs must manually configure everything from scratch.

### Gap 4: Limited Reward Templates (Medium Impact)

Only 7 default rewards. No priority booking, no custom menu consultation, no wine pairing upgrade, no cooking class, no recipe sharing, no kitchen tour. The catalog covers basic discounts and free meals but misses experience-based rewards that cost the chef nothing but time.

### Gap 5: No Client Milestone Progress (Medium Impact)

Clients see their current tier and progress to next tier, but can't see progress toward event or guest milestones. "You're 2 events away from your 10th dinner bonus (50 pts)" would drive bookings.

## Recommendations

1. **SSE broadcasts on loyalty events** - quick fix. Add `broadcastInsert` calls after point awards and redemptions. Client pages can subscribe for live updates.
2. **Hybrid earn mode** - needs spec. New earn mode `hybrid` with `base_points_per_event` + existing per_guest/per_dollar modifier. Solves fairness without breaking existing modes.
3. **Quick setup presets** - quick fix. Three preset buttons on the settings form that pre-fill all fields. No backend changes needed.
4. **Expanded reward templates** - quick fix. Add 8-10 more defaults covering experience-based rewards.
5. **Client milestone progress** - needs spec. Add milestone progress section to My Rewards page showing distance to next event and guest milestones.
6. **Membership/subscription program** - needs separate research + spec. Monthly fee for reduced dinner prices, priority booking. Requires Stripe subscription infrastructure. Out of scope for Phase 3.
