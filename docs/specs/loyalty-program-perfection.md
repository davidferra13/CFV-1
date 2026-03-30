# Roadmap: Loyalty Program Perfection (The Domino Effect System)

> **Type:** Roadmap (not a buildable spec - see phase specs below)
> **Created:** 2026-03-29
> **Phase specs:**
>
> - `loyalty-phase1-visibility-and-perks.md` (P1, ready)
> - `loyalty-phase2-auto-referral-guest-milestones.md` (P2, draft)
> - Phase 3: Engagement loops (not yet specced, needs research)

---

## What This Does (Plain English)

Transforms ChefFlow's existing loyalty system from a functional backend into a best-in-class retention engine that creates "domino effects" (snowballing engagement loops where every client interaction earns something, every reward motivates the next booking, and every guest at the table becomes a new participant). The system makes clients feel like they're constantly earning, saving money, and part of something exclusive and fun, while driving more bookings and revenue for the chef. Adds a top-level "Rewards" tab to the Action Bar for instant chef access.

---

## Why It Matters

The loyalty infrastructure is already built (points, tiers, rewards, raffles, vouchers, auto-award, backfill). But it's buried in navigation, the domino/snowball loops aren't fully wired, and the client experience doesn't create the addictive "open the app to see what I've earned" behavior that McDonald's, Starbucks, and Chick-fil-A have perfected. A chef's loyalty program is the #1 driver of repeat bookings. Every returning client is a client the chef didn't have to market to. This is the highest-ROI feature in the entire platform.

---

## Philosophy: Services, Not Cash

A chef doesn't give away money. A chef gives away **time, skill, and experience**. This is the foundational principle of the entire system.

### Why This Works Better Than Cash Rewards

| Reward Type                                                   | Cost to Chef         | Perceived Value to Client | ROI Ratio |
| ------------------------------------------------------------- | -------------------- | ------------------------- | --------- |
| Experience upgrade (tasting menu, wine pairing, kitchen tour) | ~$0 (just time)      | $50-150                   | Infinite  |
| Free course (amuse-bouche, dessert, appetizer)                | $5-15 in ingredients | $30-60                    | 4-6x      |
| Priority access (holiday booking, seasonal menus first)       | $0                   | High (exclusivity)        | Infinite  |
| Fixed discount ($25 off)                                      | $25                  | $25                       | 1:1       |
| Percentage discount (10% off)                                 | 10% of revenue       | 10% of bill               | 1:1       |

**Hierarchy of reward value (best to worst for the chef):**

1. Experience upgrades (highest perceived value, lowest real cost)
2. Free courses (moderate cost, high perceived value)
3. Priority/access perks (zero cost, high perceived value)
4. Fixed discounts (predictable cost, moderate perceived value)
5. Percentage discounts (unpredictable cost, lowest ROI per dollar spent)

The chef should default to experience-based rewards. Discounts are fine as high-milestone aspirational rewards (like the 50% off after 10 guests served example) because they drive bookings. But the everyday reward catalog should lean heavily on courses, upgrades, and access.

---

## The Domino Effect (Snowball Engagement Loops)

This is the core innovation. Every action a client takes should cascade into more engagement, more bookings, and more new clients. Here's how the dominos fall:

### Loop 1: The Booking Snowball

```
Client books dinner (2 guests)
  -> Earns 20 points (10/guest)
  -> Sees progress bar: "30 more points to Free Dessert Course!"
  -> Books again (4 guests this time, invites friends)
  -> Earns 40 points, crosses threshold
  -> Unlocks Free Dessert Course reward
  -> Redeems it at next dinner
  -> Chef delivers amazing dessert course
  -> Client tells friends -> referral points
  -> Friends sign up -> welcome points for friends
  -> Friends book their own dinner -> cycle repeats
```

### Loop 2: The Dinner Table Snowball

```
Host books dinner for 6 people
  -> Host earns points for 6 guests served
  -> At the table, chef encourages everyone to join ChefFlow
  -> 5 guests sign up via Dinner Circle / host invitation
  -> Host earns referral points for each signup (5 x 100 = 500 pts!)
  -> Each new signup gets welcome bonus (25 pts each)
  -> New clients see they already have points
  -> New clients browse reward catalog: "Only 175 more points to my first reward"
  -> New clients book their own dinner
  -> Original host is now approaching Platinum tier
```

### Loop 3: The Milestone Anticipation

```
Client has hired chef 4 times (8 guests total)
  -> Client sees: "2 more guests to 10-guest milestone!"
  -> Milestone reward: 50% off next dinner
  -> Client KNOWS this is coming
  -> Client plans 5th dinner specifically to hit milestone
  -> Client might invite extra friend to cross threshold faster
  -> Uses 50% off discount on 6th dinner (bigger party, tries premium menu)
  -> Discovers tasting menu experience
  -> Books tasting menu at full price next time because they loved it
```

### Loop 4: The RSVP Multiplier

```
Host creates event, sends invitations
  -> Each guest who RSVPs = points for the host
  -> Host actively follows up with guests to get RSVPs
  -> Higher RSVP rate = better planning for chef
  -> Chef benefits from accurate headcount
  -> Host benefits from points
  -> Guests who RSVP get prompted to create accounts
  -> New accounts = welcome points = new loyalty members
```

---

## Current State Assessment

### What's Built and Working

| Feature                                                                       | Status | Location                                   |
| ----------------------------------------------------------------------------- | ------ | ------------------------------------------ |
| Points engine (earn, redeem, bonus, adjustment, expired)                      | Built  | `lib/loyalty/actions.ts`                   |
| Three program modes (full/lite/off)                                           | Built  | `loyalty_config.program_mode`              |
| Three earn modes (per_guest/per_dollar/per_event)                             | Built  | `loyalty_config.earn_mode`                 |
| Four tiers (Bronze/Silver/Gold/Platinum)                                      | Built  | Configurable thresholds                    |
| Five reward types (discount_fixed/percent, free_course, free_dinner, upgrade) | Built  | `loyalty_rewards` table                    |
| Welcome points (auto on signup)                                               | Built  | `lib/loyalty/auto-award.ts`                |
| Referral points (manual reference value)                                      | Built  | Settings only, not auto                    |
| Large party bonus                                                             | Built  | Configurable threshold + points            |
| Milestone bonuses (Nth dinner = bonus points)                                 | Built  | Dynamic list in settings                   |
| Monthly raffles with snake game                                               | Built  | `app/(chef)/loyalty/raffle/`               |
| Vouchers and gift cards                                                       | Built  | `lib/loyalty/voucher-actions.ts`           |
| Reward redemption + delivery tracking                                         | Built  | `loyalty_reward_redemptions` table         |
| Client rewards page                                                           | Built  | `app/(client)/my-rewards/page.tsx`         |
| Chef loyalty dashboard                                                        | Built  | `app/(chef)/loyalty/page.tsx`              |
| Settings form (full config)                                                   | Built  | `app/(chef)/loyalty/settings/`             |
| Learn/guide pages                                                             | Built  | `app/(chef)/loyalty/learn/`                |
| Backfill for historical events                                                | Built  | `backfill-button.tsx`                      |
| Invoice adjustments (loyalty discounts)                                       | Built  | `lib/loyalty/invoice-adjustments.ts`       |
| Commerce promotions (separate system)                                         | Built  | `lib/commerce/promotion-engine.ts`         |
| Approaching milestones (chef dashboard)                                       | Built  | Outreach Opportunities panel               |
| Points activity log (client view)                                             | Built  | My Rewards page                            |
| How to Earn panel (client view)                                               | Built  | `components/loyalty/how-to-earn-panel.tsx` |

### What's Missing or Needs Improvement

| Gap                                                                                                     | Impact                                            | Priority |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------- | -------- |
| **No Action Bar shortcut** - Loyalty buried in All Features > Clients                                   | Chef forgets loyalty exists                       | P0       |
| **Referral points not automatic** - Settings says "reference value for manual referral awards"          | Biggest domino (new client acquisition) is manual | P0       |
| **No RSVP-based points** - RSVPs don't trigger any loyalty action                                       | Missing Loop 4 entirely                           | P1       |
| **No "guests served" milestone tracking** - Milestones only count events, not cumulative guests         | Can't do "every 10 guests" domino                 | P1       |
| **No client-facing progress nudges** - Client sees balance but no "you're X away from Y" push           | Missing anticipation psychology                   | P1       |
| **No "Deal of the Month" / rotating promotions** - Commerce promos exist but aren't surfaced to clients | Missing McDonald's "open app for today's deal"    | P2       |
| **Tier perks are just badges** - No tangible difference between tiers                                   | Tiers feel like theater, not value                | P1       |
| **No Dinner Circle integration** - Dinner Circle exists but doesn't feed loyalty                        | Missing Loop 2 entirely                           | P1       |
| **No email/notification for approaching milestones** - Chef sees it, client doesn't                     | Client can't anticipate their next reward         | P1       |
| **Promotion visibility to clients** - Commerce promotions are chef-side only                            | Clients never see deals                           | P2       |

---

## Improvement Plan (Phased)

### Phase 1: Access and Visibility (Quick Wins)

**1A. Add "Rewards" to Action Bar**

Add a new entry to `actionBarItems` in `nav-config.tsx`, positioned right after "Store Prices":

```ts
{ href: '/loyalty', label: 'Rewards', icon: Gift },
```

This makes loyalty a daily-driver shortcut. The chef sees it every time they open the sidebar.

**1B. Client Progress Nudges**

On the client's My Rewards page, add a prominent "Next Reward" card at the top:

```
┌─────────────────────────────────────────┐
│  You're 30 points away from:            │
│  ★ Free Dessert Course (150 pts)        │
│  ████████████░░░ 80%                    │
│                                         │
│  Book your next dinner to get there!    │
└─────────────────────────────────────────┘
```

This card shows:

- The closest reachable reward
- Exact points needed
- Visual progress bar
- A call-to-action that drives booking behavior

**1C. Tier Perks Definition**

Add a `tier_perks` JSONB column to `loyalty_config` that lets chefs define what each tier unlocks:

| Tier     | Example Perks (Chef Configurable)                                          |
| -------- | -------------------------------------------------------------------------- |
| Bronze   | Standard service                                                           |
| Silver   | Complimentary amuse-bouche at every event                                  |
| Gold     | Priority holiday booking + amuse-bouche + recipe card for favorite dish    |
| Platinum | All Gold perks + annual tasting menu experience + custom menu consultation |

These perks display on both the chef dashboard and the client rewards page so both sides know what tier membership means.

---

### Phase 2: Automatic Domino Triggers

**2A. Automatic Referral Points**

Currently referral points are "manual reference value." Change this:

- When a new client signs up and their `referred_by` field (or invitation source) traces back to an existing client, auto-award referral points to the referrer
- Award happens when the referred client completes their first event (not just on signup, to prevent gaming)
- This is the single highest-value automation because it turns every happy client into a recruiter

**2B. Guest-Based Milestones**

Current milestones track "Nth dinner completed." Add a parallel system for cumulative guests served:

- "Every 10 guests served" milestone (configurable threshold)
- Separate from event-count milestones
- The couple who books 5 dinners for 2 guests each hits 10 guests served
- This drives the exact domino described: "one more dinner and I hit my milestone"

**2C. RSVP Points**

When a client's event has RSVPs:

- Host earns X points per confirmed RSVP (configurable, default 5)
- This incentivizes hosts to follow up with guests, get accurate headcounts
- Chef benefits from better planning
- Guests who RSVP get prompted to create accounts (feeding the signup loop)

**2D. Dinner Circle Integration**

When guests sign up through a Dinner Circle or host invitation:

- Host earns referral bonus for each new signup
- New signups earn welcome bonus
- If new signups book their own event, host earns a "network bonus" (smaller, e.g. 25 pts)
- Creates the table-to-table snowball

---

### Phase 3: Anticipation and Engagement

**3A. Approaching Milestone Notifications**

When a client is within 20% of their next milestone or reward threshold:

- Email notification: "You're 2 dinners away from earning a free dessert course!"
- In-app banner on their dashboard
- Chef also sees this in Outreach Opportunities (already built) and can personally reach out

**3B. Deal of the Month**

Create a simple "Featured Offer" system:

- Chef sets one active promotion per month (or period)
- Appears on the client dashboard, rewards page, and optionally in emails
- Can be a loyalty bonus ("Double points this month!"), a promotional discount, or a seasonal special
- Different from the reward catalog (which is always-on). This is time-limited urgency.

**3C. Post-Event Engagement Points**

After an event completes:

- Client who leaves a review/testimonial: bonus points
- Client who shares photos: bonus points
- Client who rates the experience: bonus points
- Each action is small (10-25 pts) but creates multiple touchpoints after the dinner
- Keeps the client engaged between bookings

---

### Phase 4: The Full Ecosystem (Future)

These are documented for the roadmap but not part of this build:

- **Seasonal point multipliers** (2x points during slow months to drive bookings)
- **Birthday/anniversary auto-rewards** (surprise free course on client's birthday)
- **Loyalty leaderboard** (anonymous, gamified, opt-in)
- **Points gifting** (client can gift points to another client)
- **Corporate/group loyalty** (company books events, all attendees earn)
- **Partnership rewards** (redeem points for partner services: sommelier, florist, photographer)

---

## Universal Rules of Thumb (Hardcoded Principles)

These are permanent rules that apply to the loyalty system forever:

1. **Earning must be automatic and invisible.** Client never has to "scan a card" or "activate" anything. Event completes, points appear. Signup happens, welcome bonus appears. Period.

2. **The first reward must be reachable fast.** If the cheapest reward costs 200 points and a typical dinner earns 20 points, that's 10 dinners. Too long. The first reward should be reachable in 2-3 events. Consider a "Starter Reward" at 50-75 points.

3. **Show the number everywhere.** Points balance on the client dashboard, in event confirmations, on invoices, in emails. The number is the hook.

4. **Never punish.** Points don't expire (or have very long expiry, 2+ years). Tiers never demote. A client who takes 6 months off comes back to find their points waiting. This builds trust.

5. **Referrals are king.** A new client is worth 10x a repeat visit in lifetime value. The referral bonus should be the single most lucrative action a client can take. 100 points for a referral vs 10 points per guest. That ratio is correct.

6. **Rewards should cost the chef less than they're worth to the client.** A free dessert costs $8 in ingredients but the client perceives $40+ of value. That's a 5x return on generosity. A 10% discount costs exactly 10% and the client perceives exactly 10%. Always prefer experience-based rewards.

7. **Create anticipation, not just accumulation.** The client should always know what they're working toward. "You're 30 points from a Free Dessert Course" is infinitely more motivating than "You have 120 points."

8. **Every interaction should earn something.** Signup, booking, RSVP, review, referral, milestone. The client should feel like everything they do is noticed and rewarded. Not creepy tracking; generous acknowledgment.

9. **Make it fun.** The raffle snake game is a great example. Loyalty shouldn't feel like accounting. It should feel like a game where you keep leveling up.

10. **The chef controls everything.** Every rate, threshold, reward, and perk is configurable. The system provides smart defaults, but the chef's business is unique and the system must adapt to it.

---

## Comparison: How Top Programs Do It

### McDonald's MyRewards

- **Earn:** 100 pts per $1 spent (automatic)
- **Redeem:** 4 tiers of rewards (1,500 / 3,000 / 4,500 / 6,000 pts)
- **Deals:** Daily app-exclusive deals (independent of points)
- **No tiers.** Everyone is equal. Pure accumulation.
- **Key insight:** Two reasons to open the app: deals (instant value) and points (accumulated value)

### Starbucks Rewards

- **Earn:** 1 Star per $1 (2 Stars if prepaid via Starbucks card)
- **Redeem:** 25-400 Stars for rewards (customization add-on → full meal)
- **Tiers:** Green (basic) → Gold (300 Stars/year, free birthday drink, personalized offers)
- **Key insight:** Prepaid card creates sunk cost, doubles earn rate, locks in spending

### Chick-fil-A One

- **Earn:** 10 pts per $1 spent
- **Tiers:** Member → Silver → Red → Signature (based on annual spend)
- **Key insight:** Higher tiers unlock better redemption rates (same points, better rewards). Signature members get surprise rewards from the operator.

### Sweetgreen Rewards

- **Earn:** $1 = 1 point, $9 earned = 1 reward (a discount on a bowl)
- **No tiers.** Simple accumulation.
- **Key insight:** Extremely simple. Low barrier. Fast first reward.

### What ChefFlow Takes From Each

| From        | Lesson                            | ChefFlow Application                                      |
| ----------- | --------------------------------- | --------------------------------------------------------- |
| McDonald's  | Deals + Points = two hooks        | Featured Offer (time-limited) + Points (always-on)        |
| McDonald's  | Instant value on app open         | Client dashboard shows available rewards + current deal   |
| Starbucks   | Tier recognition changes behavior | Tier perks must be tangible (not just badges)             |
| Chick-fil-A | Surprise rewards build love       | Chef can manually award bonus points with a personal note |
| Sweetgreen  | Fast first reward                 | Starter reward at 50-75 points (reachable in 1-2 events)  |
| All of them | Automatic earning                 | Event completion = auto points. No manual steps.          |

---

## Files to Modify

| File                                                    | What to Change                                                             |
| ------------------------------------------------------- | -------------------------------------------------------------------------- |
| `components/navigation/nav-config.tsx`                  | Add "Rewards" entry to `actionBarItems` after Store Prices                 |
| `app/(client)/my-rewards/page.tsx`                      | Add "Next Reward" progress card at top, improve layout                     |
| `app/(chef)/loyalty/page.tsx`                           | Add tier perks display, improve outreach opportunities                     |
| `app/(chef)/loyalty/settings/loyalty-settings-form.tsx` | Add tier perks configuration, guest milestone settings, RSVP points toggle |
| `lib/loyalty/actions.ts`                                | Add guest-based milestone checking, tier perks CRUD                        |
| `lib/loyalty/auto-award.ts`                             | Add automatic referral point awarding                                      |
| `lib/loyalty/redemption-actions.ts`                     | Ensure redemption flow handles all reward types cleanly                    |
| `components/loyalty/how-to-earn-panel.tsx`              | Update to reflect new earning methods (RSVP, referrals, reviews)           |

## Files to Create

| File                                         | Purpose                                                              |
| -------------------------------------------- | -------------------------------------------------------------------- |
| `lib/loyalty/domino-triggers.ts`             | RSVP points, Dinner Circle integration, post-event engagement points |
| `lib/loyalty/milestone-guests.ts`            | Guest-count milestone tracking (parallel to event-count milestones)  |
| `lib/loyalty/featured-offer.ts`              | "Deal of the Month" server actions (create, get active, deactivate)  |
| `components/loyalty/next-reward-card.tsx`    | Client-facing "You're X points from Y" progress card                 |
| `components/loyalty/tier-perks-display.tsx`  | Displays what each tier unlocks (used on both chef and client pages) |
| `components/loyalty/featured-offer-card.tsx` | Client-facing "This month's deal" card                               |
| `app/(chef)/loyalty/offers/page.tsx`         | Chef page for managing featured offers / deal of the month           |

---

## Database Changes

### New Columns on Existing Tables

```sql
-- Tier perks configuration (what each tier unlocks)
ALTER TABLE loyalty_config
  ADD COLUMN IF NOT EXISTS tier_perks jsonb DEFAULT '{}';

-- Guest-based milestone configuration
ALTER TABLE loyalty_config
  ADD COLUMN IF NOT EXISTS guest_milestones jsonb DEFAULT '[]';

-- RSVP points configuration
ALTER TABLE loyalty_config
  ADD COLUMN IF NOT EXISTS rsvp_points integer DEFAULT 0;

-- Post-event engagement points
ALTER TABLE loyalty_config
  ADD COLUMN IF NOT EXISTS review_points integer DEFAULT 0;
ALTER TABLE loyalty_config
  ADD COLUMN IF NOT EXISTS photo_share_points integer DEFAULT 0;

-- Track cumulative guests served per client (for guest milestones)
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS loyalty_guests_served integer DEFAULT 0;
```

### New Tables

```sql
-- Featured offers (Deal of the Month)
CREATE TABLE IF NOT EXISTS loyalty_featured_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  offer_type text NOT NULL CHECK (offer_type IN ('double_points', 'bonus_points', 'discount', 'free_reward', 'custom')),
  -- For double_points: multiplier stored in value_number
  -- For bonus_points: flat bonus in value_number
  -- For discount: percent or cents in value_number + value_type
  value_number numeric,
  value_type text CHECK (value_type IN ('percent', 'cents', 'multiplier', NULL)),
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_featured_offers_tenant_active
  ON loyalty_featured_offers(tenant_id, is_active) WHERE is_active = true;
```

### Migration Notes

- Migration filename must be checked against existing files in `database/migrations/` (timestamp collision rule)
- All changes are additive. No existing columns or tables are modified or dropped.
- `tier_perks` JSONB format: `{ "bronze": [], "silver": ["Complimentary amuse-bouche"], "gold": ["Priority booking", "Recipe card"], "platinum": ["Annual tasting experience"] }`
- `guest_milestones` JSONB format: `[{ "guests": 10, "bonus": 200 }, { "guests": 50, "bonus": 500 }]`

---

## Implementation Order

1. **Phase 1A:** Action Bar shortcut (5 min, immediate win)
2. **Phase 1B:** Next Reward progress card on client page
3. **Phase 1C:** Tier perks configuration + display
4. **Phase 2A:** Automatic referral points
5. **Phase 2B:** Guest-based milestones
6. **Phase 2C:** RSVP points
7. **Phase 2D:** Dinner Circle integration
8. **Phase 3A:** Approaching milestone notifications
9. **Phase 3B:** Featured Offer / Deal of the Month
10. **Phase 3C:** Post-event engagement points

Each phase can be built and shipped independently. Phase 1 creates immediate visible improvement. Phase 2 wires the domino triggers. Phase 3 adds the engagement psychology.

---

## Success Criteria

When this is done, the following must be true:

1. A chef opens the sidebar and sees "Rewards" in the Action Bar (not buried in All Features)
2. A client logs in and immediately sees their points balance, next reward progress, and any active deals
3. Every completed event automatically awards points (already works)
4. Every new client referred by an existing client automatically earns the referrer points
5. Every RSVP to a host's event earns the host points
6. Clients approaching milestones get notified (in-app and email)
7. Tiers unlock tangible perks that are visible to both chef and client
8. The chef can set a "Deal of the Month" that clients see on their dashboard
9. The system creates natural anticipation: clients always know what they're working toward
10. Every interaction feels rewarding without feeling tracked or creepy

---

## Out of Scope

- Seasonal point multipliers (Phase 4, future spec)
- Birthday/anniversary auto-rewards (Phase 4)
- Points gifting between clients (Phase 4)
- Corporate/group loyalty programs (Phase 4)
- Partnership rewards with external vendors (Phase 4)
- Loyalty leaderboard beyond raffle (Phase 4)
- Mobile push notifications (requires PWA work, separate spec)

---

## Notes for Builder Agent

- The loyalty engine (`lib/loyalty/actions.ts`) is ~60KB and comprehensive. Read it fully before making changes.
- `loyalty_transactions` is append-only with immutability triggers. Never try to UPDATE or DELETE rows.
- Points on the `clients` table (`loyalty_points`) is a denormalized balance for fast reads. The source of truth is `SUM(points)` from `loyalty_transactions`.
- The commerce promotion system (`lib/commerce/promotion-engine.ts`) is separate from loyalty. Featured Offers should use the loyalty system, not the commerce system.
- When adding the Action Bar entry, use the `Gift` icon (already imported in nav-config.tsx from lucide-react).
- The Dinner Circle system exists at `/circles`. Check `app/(chef)/circles/` for integration points.
- Test everything with the agent account. The loyalty system requires a chef with `loyalty_config` set up, so ensure the agent's tenant has an active loyalty program.
- Follow the reward hierarchy: default new reward templates to experience-based rewards (free course, upgrade) rather than discounts.
