# ChefFlow Loyalty & Rewards — The Bible

> **This is the master reference for the entire loyalty and rewards program.**
> Every rule, every point trigger, every redemption path, and every design
> decision is documented here. If it isn't in this document, it isn't official.

---

## 1. Core Philosophy

The loyalty program exists for one reason: **to encourage repeat business**.

Every mechanic is designed so that a client who is close to a milestone feels
motivated to book their next dinner rather than waiting. A client who has
already redeemed a reward should feel excited to earn more.

**Three rules that never bend:**

1. **Rewards are acts of service — never cash.** A chef cannot issue a cash
   payout through the loyalty program. All rewards are service-denominated:
   a free course, a discount applied to a booking, an upgrade. The chef's
   wallet is never at risk from the points program alone.

2. **Tiers never go down.** A client's tier is computed from their lifetime
   earned points. Redeeming rewards deducts from the spendable balance but
   never from the tier calculation. A Gold member stays Gold regardless of
   how many rewards they redeem.

3. **Automated points need zero chef involvement.** The things that happen
   automatically (welcome bonus, event completion points, milestone bonuses)
   fire and are recorded without the chef having to do anything. The chef's
   irreducible contribution is the quality of the work — not administering a
   points spreadsheet.

---

## 2. Point System Architecture

### 2a. What a Point Is

A point is a unit of loyalty credit. Points have no cash value and cannot
be converted to money by the client or the chef. They exist only within the
ChefFlow loyalty program.

**All points are tracked in the `loyalty_transactions` table.** This table is
immutable — rows are never updated or deleted. It is the ledger of record for
every point movement in the system.

### 2b. Point Types (transaction types)

| Type | Description | Examples |
|---|---|---|
| `earned` | Base points from a completed event | 10 pts × 8 guests = 80 pts |
| `bonus` | Automatic bonus on top of base earn | Milestone bonus, large party, welcome |
| `redeemed` | Points spent on a reward (stored negative) | -100 pts for "$25 off" |
| `adjustment` | Manual correction by chef | Correcting a data entry error |
| `expired` | Reserved for future expiry implementation | Not currently in use |

### 2c. Spendable Balance vs. Lifetime Earned

- **Spendable balance** (`clients.loyalty_points`) — the live balance after all
  earns, bonuses, and redemptions. This is what a client can redeem right now.
- **Lifetime earned** — the sum of all `earned` + `bonus` transactions only
  (never counts redemptions). This is used **exclusively** for tier calculation.
- Because tiers use lifetime earned, they never decrease when a client redeems
  a reward.

---

## 3. Master Dictionary: Every Way to Earn Points

This is the complete, exhaustive list of all point-earning mechanisms. Each
entry states: the trigger, who detects it, whether it is automatic or manual,
and the default point value.

---

### 3.1 Welcome Bonus ⭐ AUTOMATIC

| Field | Value |
|---|---|
| **Trigger** | Client completes an invitation-based signup |
| **Who detects** | System — fires inside `signUpClient()` immediately |
| **Chef action required** | None |
| **Default points** | 25 pts (configurable in Loyalty Settings) |
| **Idempotency** | `clients.has_received_welcome_points` flag prevents double-award |
| **Conditions** | Client must be joining via a chef's invitation link. Standalone signups with no tenant receive this when they first activate a chef relationship. |
| **Transaction type** | `bonus` |
| **Description recorded** | "Welcome bonus — thanks for joining!" |

**Design intent:** The client should arrive at their first `/my-rewards` page
and already have points waiting for them. This immediately makes the program
feel valuable without any additional effort.

---

### 3.2 Base Event Points ⭐ AUTOMATIC

| Field | Value |
|---|---|
| **Trigger** | Chef marks event as `completed` |
| **Who detects** | System — `completeEvent()` calls `awardEventPoints()` automatically |
| **Chef action required** | None (fires as a side effect of completing the event) |
| **Default points** | `points_per_guest × guest_count` (default: 10 pts/guest) |
| **Idempotency** | `events.loyalty_points_awarded` flag prevents double-award |
| **Conditions** | Event must be in `completed` status. Loyalty program must be active. |
| **Transaction type** | `earned` |
| **Description recorded** | "{N} guests × {pts} pts/guest" |

**Example:** A dinner for 8 guests at 10 pts/guest → 80 points awarded.

**Design intent:** Points scale with event size. Clients who host larger parties
earn more, and chefs who serve larger parties see more loyal clients. This also
incentivises clients to bring more guests.

---

### 3.3 Large Party Bonus ⭐ AUTOMATIC

| Field | Value |
|---|---|
| **Trigger** | Same as base event points, evaluated at same time |
| **Who detects** | System — inside `awardEventPoints()` |
| **Chef action required** | None |
| **Default points** | Configurable (default: +50 pts when ≥ 10 guests) |
| **Conditions** | `guest_count >= bonus_large_party_threshold` AND program active |
| **Transaction type** | `bonus` |
| **Description recorded** | "Large party bonus ({N}+ guests)" |

**Design intent:** Clients hosting larger parties deserve extra recognition.
This also gives chefs a mechanical incentive to encourage larger bookings.

---

### 3.4 Milestone Bonuses ⭐ AUTOMATIC

| Field | Value |
|---|---|
| **Trigger** | Same event completion — evaluated against `total_events_completed` |
| **Who detects** | System — inside `awardEventPoints()`, evaluated for each milestone |
| **Chef action required** | None |
| **Default milestones** | Configurable JSON array on `loyalty_config.milestone_bonuses` |
| **Example defaults** | 5th event: +50 pts · 10th event: +100 pts · 25th event: +200 pts |
| **Conditions** | `currentEventsCompleted === milestone.events` (exact match) |
| **Transaction type** | `bonus` |
| **Description recorded** | "Milestone bonus: {N}th event completed!" |

**Design intent:** This is the "10th dinner" mechanic. A client on their 9th
dinner knows exactly what they get when they book the 10th. After the 10th,
they see the 25th on the horizon. The milestone system creates a perpetual
forward pull.

**How to configure milestones:**
Go to Loyalty Settings → Program Settings → Milestone Bonuses. Add rows like:
- Events: 5, Bonus: 50 pts → client gets +50 on their 5th event
- Events: 10, Bonus: 100 pts → client gets +100 on their 10th event
- Events: 20, Bonus: 150 pts
- Events: 50, Bonus: 500 pts → platinum milestone

---

### 3.5 Manual Bonus Points (Chef-awarded) ⭐ MANUAL — CHEF APPROVAL IMPLIED

| Field | Value |
|---|---|
| **Trigger** | Chef clicks "Award Bonus Points" on a client profile |
| **Who detects** | Chef initiates — system records |
| **Chef action required** | Yes — chef enters amount and reason |
| **Amount** | Chef-specified; any positive integer |
| **Conditions** | Loyalty program must be active; chef must be authenticated |
| **Transaction type** | `bonus` |
| **Description recorded** | Chef-entered reason (e.g., "Referral: introduced Sarah") |

**Use cases:**
- Referral: client introduced a new client who booked
- Exceptional circumstances: event ran long, chef wants to show appreciation
- Birthday or anniversary recognition
- Correcting a miscalculated award from a previous event

**Important:** The chef should write a clear description every time. This
description appears in the client's transaction history and they will see it.

---

### 3.6 Referral Points (Manual, via Bonus Points)

The referral program is currently **manual**. A referral is not automatically
detected. When a client refers a friend and that friend books an event, the
chef awards bonus points using the `awardBonusPoints()` action with a note
like "Referral bonus: [friend's name] booked".

The default referral point value is stored in `loyalty_config.referral_points`
(default: 100 pts) as a reference number for chefs to use consistently. It is
not automatically applied.

**Future:** An automated referral tracking system is planned but not yet built.
When built, it will use a unique referral link per client and auto-award when
the referred client's first event completes.

---

### 3.7 Adjustment (Chef correction)

| Field | Value |
|---|---|
| **Trigger** | Chef issues via bonus points or a future admin tool |
| **Who detects** | Chef initiates |
| **Amount** | Positive (to add) — for deductions the chef contacts support |
| **Transaction type** | `adjustment` (or `bonus` if using the current bonus UI) |
| **When to use** | Correcting errors, e.g., wrong guest count on a past event |

---

## 4. Tier System

Tiers represent a client's cumulative relationship with the chef. They unlock
social recognition and can be used by the chef to target outreach (e.g.,
"Thank your Gold members with a personal note").

### 4a. Tier Thresholds (default, all configurable)

| Tier | Lifetime Points Required | Default Range |
|---|---|---|
| 🥉 Bronze | 0+ | 0–199 |
| 🥈 Silver | 200+ | 200–499 |
| 🥇 Gold | 500+ | 500–999 |
| 💎 Platinum | 1,000+ | 1,000+ |

### 4b. Tier Calculation Rules

1. Tier is computed from **lifetime earned** (sum of all `earned` + `bonus`
   transactions for this client in this tenant).
2. Tier is recalculated every time points are awarded or adjusted.
3. Tier **can only increase**, never decrease — even after redemptions.
4. Tier is stored in `clients.loyalty_tier` for fast lookup.
5. Chef can configure thresholds in Loyalty Settings.

### 4c. What Tiers Do (currently)

- Displayed on the client's `/my-rewards` page with a progress bar
- Displayed on the chef's client list and loyalty dashboard
- Used by chef for outreach filtering (approaching tier-upgrade notifications)
- Visible to the chef on the client profile page

**Future tiers could unlock:** tier-exclusive rewards, priority booking access,
or exclusive menu items. These are not yet implemented.

---

## 5. Rewards Catalog

### 5a. What a Reward Is

A reward is a service that the chef commits to deliver when a client redeems
enough points. Rewards are **never cash**. They are:

| Reward Type | What It Means |
|---|---|
| `free_course` | Chef adds a bonus course (appetizer, dessert, etc.) to the meal |
| `free_dinner` | Complimentary full dinner (covers service; client pays ingredients) |
| `discount_fixed` | A fixed dollar amount off the next booking |
| `discount_percent` | A percentage off the next booking |
| `upgrade` | Chef's choice upgrade — elevated presentation, extra courses, etc. |

### 5b. Default Reward Catalog (seeded on first use)

| Reward | Type | Points |
|---|---|---|
| Complimentary appetizer course | free_course | 50 pts |
| Complimentary dessert course | free_course | 75 pts |
| $25 off your next dinner | discount_fixed | 100 pts |
| 15% off dinner for two | discount_percent | 150 pts |
| Chef's tasting menu experience | upgrade | 200 pts |
| 50% off a dinner for two | discount_percent | 250 pts |
| Free dinner for two | free_dinner | 300 pts |

These are starting points. The chef can add, edit, and remove rewards at any
time from the Loyalty Dashboard → Rewards Catalog.

### 5c. Reward Design Rules

- Every reward must be achievable. If `points_per_guest = 10` and the cheapest
  reward is 50 pts, a client with a 5-person dinner earns it immediately.
- Rewards should ladder — the next tier of reward should always be visible and
  feel attainable.
- Rewards should be things the chef is actually comfortable delivering. A "free
  dinner for two" at 300 points means roughly 30 guests served — that's a real
  relationship, and the chef has already earned the revenue to absorb the cost.

---

## 6. How Redemption Works

### 6a. Client-Initiated Redemption

1. Client visits `/my-rewards` and sees rewards they can afford (green).
2. Client clicks "Redeem" → sees a confirmation modal that shows the exact
   point cost and what they will receive.
3. Client confirms → `clientRedeemReward()` fires:
   - Points deducted from `clients.loyalty_points` immediately
   - Redemption transaction inserted into `loyalty_transactions`
   - Pending delivery record created in `loyalty_reward_redemptions`
   - Chef is notified: "A client has redeemed [reward name]"
4. Client sees the reward appear in "Pending Rewards" with status `pending`.
5. At the next event, the chef delivers the reward and marks it as delivered
   from the Loyalty Dashboard → Pending Deliveries.
6. The pending reward updates to `delivered`. Client sees this on their page.

### 6b. Chef-Initiated Redemption

Chef can redeem rewards on behalf of a client from the client profile page.
This is used when:
- Chef wants to apply a reward to a specific event
- Client requested a redemption via phone/message
- Chef is comping a service proactively

The mechanic is identical — points deducted, delivery record created.

### 6c. What "Pending Delivery" Means

When a reward is redeemed (by either party), a row is created in
`loyalty_reward_redemptions` with `delivery_status = 'pending'`.

This table is the chef's **delivery queue** — it tells them what they have
promised to a client and haven't yet delivered. It appears prominently at the
top of the Loyalty Dashboard so it is impossible to miss.

The chef marks a delivery as done by clicking "Mark Delivered" and optionally
notes which event it was honoured at.

### 6d. Delivery Status Lifecycle

```
pending → delivered   (chef marks as honoured)
pending → cancelled   (both parties agreed to void; points NOT restored)
```

Points are only restored if the chef additionally uses "Award Bonus Points"
as a separate action. Cancelled deliveries are an administrative void, not a
refund.

---

## 7. Vouchers & Gift Cards (Separate System)

Gift cards and vouchers are **financially separate** from the points program.
They are tracked in `client_incentives` and `incentive_redemptions`, not in
`loyalty_transactions`.

Key distinctions:

| Feature | Points | Gift Cards / Vouchers |
|---|---|---|
| Source | Earned through service | Purchased with cash or issued by chef |
| Value | No cash value | Real dollar value (gift cards) or discount (vouchers) |
| Redemption | Service rewards | Applied to event invoice via code |
| Ledger | loyalty_transactions (no financial write) | ledger_entries (financial write) |
| RPC | n/a | `redeem_incentive()` (atomic) |

Clients can see both on `/my-rewards` — points in the upper section, gift
cards/vouchers in the lower section.

---

## 8. Program Configuration (Chef Controls)

All settings live in `loyalty_config` — one row per chef/tenant. Accessed via
**Loyalty Dashboard → Program Settings**.

| Setting | Default | What It Controls |
|---|---|---|
| `is_active` | true | Master switch. When false, no points are awarded for new events |
| `points_per_guest` | 10 | Base earn rate per guest served at a completed event |
| `welcome_points` | 25 | Bonus given when a new client joins via invitation |
| `bonus_large_party_threshold` | 10 | Guest count that triggers the large party bonus |
| `bonus_large_party_points` | 50 | Points added for hitting the large party threshold |
| `milestone_bonuses` | JSON | Array of `{events, bonus}` objects for milestone rewards |
| `referral_points` | 100 | Reference value for manual referral bonuses (not auto-applied) |
| `tier_silver_min` | 200 | Lifetime points needed for Silver |
| `tier_gold_min` | 500 | Lifetime points needed for Gold |
| `tier_platinum_min` | 1000 | Lifetime points needed for Platinum |

---

## 9. Chef Workflow: Day-to-Day Operations

### Things that happen automatically (chef does nothing)

- ✅ Welcome points awarded when invited client signs up
- ✅ Base event points awarded when chef marks event completed
- ✅ Large party bonus evaluated and awarded at event completion
- ✅ Milestone bonuses evaluated and awarded at event completion
- ✅ Client tier recalculated at every point award
- ✅ Chef notified when a client redeems a reward

### Things the chef must do

- ☑️ Mark an event as `completed` (this triggers all automatic awards)
- ☑️ Award manual bonus points for referrals and special recognition
- ☑️ Mark pending reward deliveries as "delivered" after honouring them
- ☑️ Manage the rewards catalog (add/edit/remove rewards)
- ☑️ Configure program settings (points per guest, milestones, tiers)

### Outreach opportunities (chef-initiated, system surfaces them)

The Loyalty Dashboard surfaces two outreach lists:

1. **Approaching Tier Upgrades** — clients within 20% of the next tier. A
   personal note from the chef ("You're almost Gold!") often converts to a
   booking.

2. **Approaching Rewards** — clients within 20% of unlocking their next
   reward. Remind them how close they are and watch the calendar fill.

---

## 10. Client Transparency

Clients see the following on `/my-rewards`:

1. **Their tier badge** with a progress bar showing how far to the next tier.
2. **Spendable point balance** and total events/guests served.
3. **"Available to Redeem"** — rewards they can afford right now (highlighted
   in green).
4. **"All Rewards"** — the full catalog, with "Need N more points" shown for
   rewards out of reach.
5. **"Pending Rewards"** — rewards they have redeemed but not yet received
   (amber badge showing `pending` or `delivered`).
6. **Gift Cards & Vouchers** — separate section for code-based incentives.
7. **"How to Earn Points"** — explicit explanation of every earning mechanism,
   config-driven so it always reflects the chef's actual settings.
8. **"Recent Transactions"** — immutable history of every point movement,
   with date and description.

**No hidden rules. No surprises.** The client should always know exactly why
they have the points they have and what they need to do to earn more.

---

## 11. Data Architecture Quick Reference

| Table | Purpose |
|---|---|
| `loyalty_config` | One row per chef — all program settings |
| `loyalty_transactions` | Immutable point ledger (earned, redeemed, bonus, adjustment) |
| `loyalty_rewards` | Reward catalog (soft-deletable with `is_active`) |
| `loyalty_reward_redemptions` | Pending delivery queue — what rewards need to be honoured |
| `clients.loyalty_points` | Live spendable balance (updated on every transaction) |
| `clients.loyalty_tier` | Current tier (recalculated on every award) |
| `clients.total_events_completed` | Cumulative events — used for milestone checks |
| `clients.total_guests_served` | Cumulative guests — informational |
| `clients.has_received_welcome_points` | Idempotency guard for welcome bonus |
| `client_incentives` | Gift cards & vouchers (separate from points) |
| `incentive_redemptions` | Atomic audit trail for gift card/voucher usage |

---

## 12. Key Code Locations

| What | File |
|---|---|
| All loyalty config/reward/award actions (chef) | `lib/loyalty/actions.ts` |
| Client-initiated reward redemption | `lib/loyalty/client-loyalty-actions.ts` |
| Welcome points + delivery tracking | `lib/loyalty/auto-award.ts` |
| Voucher/gift card management | `lib/loyalty/voucher-actions.ts` |
| Code validation + atomic redemption | `lib/loyalty/redemption-actions.ts` |
| Gift card purchase via Stripe | `lib/loyalty/gift-card-purchase-actions.ts` |
| Auto-award hook in event FSM | `lib/events/transitions.ts` → `completeEvent()` |
| Welcome points hook in auth | `lib/auth/actions.ts` → `signUpClient()` |
| Chef loyalty dashboard | `app/(chef)/loyalty/page.tsx` |
| Client rewards portal | `app/(client)/my-rewards/page.tsx` |
| Pending deliveries UI (chef) | `components/loyalty/pending-deliveries-panel.tsx` |
| How-to-earn explanation (client) | `components/loyalty/how-to-earn-panel.tsx` |
| Schema: loyalty foundation | `supabase/migrations/20260216000002_loyalty_program.sql` |
| Schema: vouchers & gift cards | `supabase/migrations/20260224000015_vouchers_and_gift_cards.sql` |
| Schema: gift card redemption | `supabase/migrations/20260227000001_gift_card_redemption_and_purchase.sql` |
| Schema: welcome points + delivery | `supabase/migrations/20260305000001_loyalty_welcome_and_delivery.sql` |

---

## 13. What Is Not Yet Built

| Feature | Status | Notes |
|---|---|---|
| Automated referral tracking | ❌ Not built | Manual bonus via chef is the workaround |
| Points expiration | ❌ Not built | `expired` transaction type exists; no cron job yet |
| Tier-exclusive rewards | ❌ Not built | Tier is visible but not yet a gate on rewards |
| Loyalty leaderboard (client-facing) | ❌ Not built | Top clients visible to chef only |
| Birthday auto-bonus | ❌ Not built | Requires birthday field on client profile |
| SMS notifications for point awards | ❌ Not built | Email + in-app only |
| Points earned chart | ❌ Not built | Transaction history only; no visualization |

---

## 14. Frequently Asked Questions

**Q: Do points ever expire?**
A: Not currently. The `expired` transaction type is reserved for a future
   cron-based expiry system. Until it is built, points do not expire.

**Q: What happens if the chef pauses the program?**
A: Setting `is_active = false` stops new points from being awarded. Existing
   balances, transactions, and pending deliveries are preserved. Reactivating
   resumes normal operation.

**Q: Can a client have a negative point balance?**
A: No. The `clientRedeemReward()` action checks for sufficient balance before
   deducting. A redemption will fail with an error if the client lacks points.

**Q: Can the chef take points away?**
A: There is no "deduct points" button. The `adjustment` transaction type exists
   in the schema for this purpose, but there is intentionally no UI for it to
   prevent accidental deductions. If a correction is genuinely needed, it should
   be done carefully and the client should be informed.

**Q: What happens if `awardEventPoints` fails?**
A: The failure is caught and logged but does not roll back the event completion.
   The chef is not notified automatically — the `loyalty_points_awarded` flag
   on the event will remain `false`, which a future retry mechanism could use
   to reprocess. For now, the chef can use "Award Bonus Points" as a manual
   workaround for any missed awards.

**Q: Does redeeming a reward affect the client's tier?**
A: No. Tier is calculated from lifetime earned points only. Redemptions deduct
   from the spendable balance but are invisible to the tier calculation.

**Q: Can a client redeem a reward without an upcoming event?**
A: Yes. The reward enters the `pending` delivery queue. It stays there until
   the chef marks it as delivered at whatever future event they honour it at.

---

*Last updated: 2026-03-05*
*Owner: ChefFlow platform team*
*Status: Complete and production-ready*
