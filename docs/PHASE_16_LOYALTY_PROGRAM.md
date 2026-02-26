# Phase 16: Loyalty Program

## What Changed

The loyalty program is a client retention engine. It rewards repeat clients with service-denominated perks — the chef never spends money, and every reward drives a rebooking.

### Core Design Decisions

1. **Points per GUEST, not per booking.** A dinner for 8 earns 80 points. A dinner for 2 earns 20 points. This incentivizes larger parties and reflects the chef's actual workload.

2. **Tiers never decrease from redemption.** If a client redeems 100 points and drops below the Silver threshold numerically, they stay Silver. Tiers are earned by cumulative activity (lifetime earned points), not current balance.

3. **Rewards are service-denominated, never cash.** Free courses, discounts on future dinners, upgrades. Every reward drives a rebooking.

4. **Auto-award is autonomous.** Points are calculated and awarded automatically when an event completes — no chef intervention needed. The chef sees every award and can adjust manually.

5. **Approaching-milestone prompts are outreach gold.** "Michel is 15 points from a free appetizer" is a reason to reach out and suggest booking.

---

## Schema Changes

### New Migration: `supabase/migrations/20260216000002_loyalty_program.sql`

**3 new enums:**

- `loyalty_transaction_type`: earned, redeemed, bonus, adjustment, expired
- `loyalty_reward_type`: discount_fixed, discount_percent, free_course, free_dinner, upgrade
- `loyalty_tier`: bronze, silver, gold, platinum

**3 new tables:**

- `loyalty_transactions` — Append-only ledger of all point changes. Immutability enforced by trigger.
- `loyalty_rewards` — Service-denominated reward catalog per tenant.
- `loyalty_config` — Per-tenant program settings (points per guest, tier thresholds, milestones).

**Columns added to existing tables:**

- `clients.total_guests_served` (INTEGER DEFAULT 0)
- `clients.total_events_completed` (INTEGER DEFAULT 0)
- `clients.loyalty_tier` — converted from untyped TEXT to `loyalty_tier` enum
- `events.loyalty_points_awarded` (BOOLEAN DEFAULT false) — idempotency guard

**RLS policies:** 8 total (chef tenant isolation + client read access for own records)

**Triggers:** 3 (immutability on loyalty_transactions, updated_at on rewards/config)

---

## Server Actions: `lib/loyalty/actions.ts`

14 server functions (13 from spec + 1 client-side):

| #   | Function                                     | Role   | Purpose                                                                                             |
| --- | -------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------- |
| 1   | `getLoyaltyConfig()`                         | Chef   | Get/initialize program config. Auto-seeds default rewards on first call.                            |
| 2   | `updateLoyaltyConfig()`                      | Chef   | Update points per guest, tier thresholds, bonuses.                                                  |
| 3   | `awardEventPoints(eventId)`                  | Chef   | Auto-called on event completion. Calculates guest × points, milestone bonuses, large party bonuses. |
| 4   | `awardBonusPoints(clientId, points, desc)`   | Chef   | Manual bonus for referrals, special occasions.                                                      |
| 5   | `redeemReward(clientId, rewardId, eventId?)` | Chef   | Deduct points, link to event. Tier never decreases.                                                 |
| 6   | `getClientLoyaltyProfile(clientId)`          | Chef   | Full loyalty status: tier, balance, progress, rewards, history.                                     |
| 7   | `getLoyaltyTransactions(clientId)`           | Chef   | Full transaction history.                                                                           |
| 8   | `createReward(data)`                         | Chef   | Add reward to catalog.                                                                              |
| 9   | `getRewards()`                               | Chef   | List active rewards.                                                                                |
| 10  | `updateReward(id, data)`                     | Chef   | Edit reward.                                                                                        |
| 11  | `deactivateReward(id)`                       | Chef   | Soft delete (is_active = false).                                                                    |
| 12  | `getLoyaltyOverview()`                       | Chef   | Dashboard stats: clients per tier, points outstanding, top clients.                                 |
| 13  | `getClientsApproachingRewards()`             | Chef   | Outreach opportunities: clients within 20% of earning a reward.                                     |
| 14  | `getMyLoyaltyStatus()`                       | Client | Client portal: own tier, balance, available rewards, next reward.                                   |

---

## Event Completion Integration

**File:** `lib/events/transitions.ts` — `completeEvent()`

When an event transitions to `completed`, `awardEventPoints(eventId)` is called automatically as a side effect. This is:

- **Non-blocking:** If loyalty award fails, event completion still succeeds.
- **Idempotent:** The `loyalty_points_awarded` flag on the event prevents double-awarding.
- **Autonomous:** No chef approval needed (Tier 1 in the approval hierarchy).

The function:

1. Calculates base points: `guest_count × points_per_guest`
2. Checks for large party bonus (8+ guests by default)
3. Checks for milestone bonuses (5th event: +50, 10th event: +100)
4. Creates loyalty_transaction records
5. Updates client balance, tier, and stats
6. Marks event as awarded

---

## UI Changes

### Chef Side

**New pages:**

- `/loyalty` — Program dashboard with tier breakdown, outreach opportunities, top clients, rewards catalog, recent awards, settings summary
- `/loyalty/rewards/new` — Create new reward form

**Updated pages:**

- `/clients/[id]` — New "Loyalty" section showing tier badge, points balance, progress bar to next tier, available rewards with redeem buttons, award bonus form, recent activity
- `/events/[id]` — Purple banner for completed events showing loyalty points awarded

**Navigation:**

- "Loyalty" added to main nav (Gift icon) between Clients and Finance

### Client Side

**Updated pages:**

- `/my-events` — Purple loyalty banner at top showing tier, points balance, next reward progress, and available reward count

---

## Default Rewards Catalog

Pre-populated when a chef's loyalty program initializes:

| Reward                         | Points | Type             |
| ------------------------------ | ------ | ---------------- |
| Complimentary appetizer course | 50     | free_course      |
| Complimentary dessert course   | 75     | free_course      |
| $25 off your next dinner       | 100    | discount_fixed   |
| 15% off dinner for two         | 150    | discount_percent |
| Chef's tasting menu experience | 200    | upgrade          |
| 50% off a dinner for two       | 250    | discount_percent |
| Free dinner for two            | 300    | free_dinner      |

---

## Default Configuration

| Setting               | Default        |
| --------------------- | -------------- |
| Points per guest      | 10             |
| Large party threshold | 8+ guests      |
| Large party bonus     | 20 points      |
| 5th event milestone   | +50 bonus      |
| 10th event milestone  | +100 bonus     |
| Bronze tier           | 0-199 points   |
| Silver tier           | 200-499 points |
| Gold tier             | 500-999 points |
| Platinum tier         | 1000+ points   |

---

## Type Safety

- 0 type errors in all loyalty-related files
- Pre-existing errors in `milestone-manager.tsx` and `menu-modifications.tsx` (unrelated Select component issue) block the full build — these should be fixed separately

---

## Files Created/Modified

### Created (9 files)

- `supabase/migrations/20260216000002_loyalty_program.sql`
- `lib/loyalty/actions.ts`
- `app/(chef)/loyalty/page.tsx`
- `app/(chef)/loyalty/reward-actions.tsx`
- `app/(chef)/loyalty/client-loyalty-actions.tsx`
- `app/(chef)/loyalty/rewards/new/page.tsx`
- `app/(chef)/loyalty/rewards/new/create-reward-form.tsx`
- `docs/PHASE_16_LOYALTY_PROGRAM.md`

### Modified (5 files)

- `lib/events/transitions.ts` — Auto-award on event completion
- `components/navigation/chef-nav.tsx` — Added Loyalty nav item
- `types/database.ts` — Added 3 tables, 3 enums, updated clients + events
- `app/(chef)/clients/[id]/page.tsx` — Added loyalty section
- `app/(chef)/events/[id]/page.tsx` — Added loyalty points display
- `app/(client)/my-events/page.tsx` — Added loyalty status banner
