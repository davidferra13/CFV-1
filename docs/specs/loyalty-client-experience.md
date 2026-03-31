# Spec: Loyalty Client Experience Layer

> **Status:** verified
> **Priority:** P1 (next up)
> **Depends on:** loyalty-trigger-expansion.md (triggers must exist before quest board can show them)
> **Estimated complexity:** medium (3-8 files)
> **Created:** 2026-03-30
> **Built by:** Claude Code (2026-03-30)

---

## What This Does (Plain English)

Today, when a client earns loyalty points, they see a small generic toast notification. The My Rewards page is comprehensive but static (server-rendered, no real-time updates, no celebration). After this spec is built: point awards trigger a branded celebration toast with animation, tier upgrades trigger a full-screen confetti moment, the How-to-Earn panel becomes an interactive quest board showing completed vs uncompleted one-time actions, the My Rewards page updates in real-time via SSE when points are awarded, and Rewards appears in the mobile tab bar so clients can reach it without the hamburger menu.

---

## Why It Matters

A loyalty program that nobody notices is a loyalty program that doesn't work. The infrastructure is solid (points, tiers, rewards, raffle, milestones). But the experience layer is what turns points-on-a-screen into dopamine. A celebration when you earn, a visual checklist of ways to earn more, real-time balance updates, and one-tap mobile access are the difference between a program clients forget about and one they actively engage with.

---

## Files to Create

| File                                               | Purpose                                                                                                                                         |
| -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/loyalty/loyalty-celebration-toast.tsx` | Branded celebration toast for point awards and tier upgrades (replaces generic notification toast for loyalty events)                           |
| `components/loyalty/loyalty-live-balance.tsx`      | Client component that subscribes to SSE loyalty channel and shows real-time point balance with animated counter                                 |
| `components/loyalty/earning-quest-board.tsx`       | Interactive quest board replacing the static How-to-Earn panel for clients: shows one-time triggers as completable achievements with checkmarks |

---

## Files to Modify

| File                                       | What to Change                                                                                                                                                             |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(client)/my-rewards/page.tsx`         | Replace static points balance with `LoyaltyLiveBalance` component. Replace `HowToEarnPanel` with `EarningQuestBoard`. Import celebration toast provider                    |
| `components/loyalty/how-to-earn-panel.tsx` | No changes (still used on chef side and as fallback). The quest board wraps/extends it for the client view                                                                 |
| `components/navigation/client-nav.tsx`     | Add `mobileTab: true` to the Rewards nav item (line 40) so it appears in the mobile bottom tab bar                                                                         |
| `lib/loyalty/actions.ts`                   | Add `getClientTriggerCompletionStatus()` helper that returns which one-time and per-event triggers the current client has already earned (reads idempotency guard columns) |

---

## Database Changes

None. All data needed already exists (idempotency guard booleans on `clients` and `events` tables from the trigger expansion migration, plus `loyalty_transactions` for history).

---

## Data Model

### Trigger Completion Status (New Read-Only Query)

```typescript
type TriggerCompletionStatus = {
  triggerKey: string
  label: string
  description: string
  points: number
  completed: boolean // Has this client earned this trigger?
  category: TriggerCategory
  frequency: TriggerFrequency
}
```

`getClientTriggerCompletionStatus()` reads:

- `clients.loyalty_profile_complete_awarded` and `clients.loyalty_fun_qa_awarded` for one-time triggers
- The most recent event's guard columns for per-event triggers (to show "earned on last event" vs not)
- `trigger_config` from `loyalty_config` to determine which triggers are enabled and their point values

Only returns triggers that are ENABLED in the chef's config. Disabled triggers don't appear on the quest board.

---

## Server Actions

### New: `getClientTriggerCompletionStatus()` (read-only, in `lib/loyalty/actions.ts`)

| Action                               | Auth              | Input | Output                      | Side Effects     |
| ------------------------------------ | ----------------- | ----- | --------------------------- | ---------------- |
| `getClientTriggerCompletionStatus()` | `requireClient()` | none  | `TriggerCompletionStatus[]` | none (read-only) |

**Flow:**

1. Get client's `tenant_id` from session
2. Fetch `loyalty_config.trigger_config` for the tenant
3. Merge with registry defaults to get enabled triggers and point values
4. Fetch client row to check one-time guard columns
5. Fetch client's most recent completed event to check per-event guard columns
6. For per-action triggers (rsvp_collected, meal_feedback, hub_group, friend_invited): check if client has ANY `loyalty_transactions` with matching description pattern
7. Return array of `TriggerCompletionStatus` objects

---

## UI / Component Spec

### 1. Celebration Toast (`loyalty-celebration-toast.tsx`)

**What it replaces:** The generic notification toast that currently fires for `points_awarded` and `tier_upgraded` events.

**Points Awarded Toast:**

- Branded card (brand-500 left border, dark bg)
- Star icon (animated pulse, 1 cycle)
- Title: "+{points} points earned!" in bold brand color
- Subtitle: description from the trigger (e.g., "Review submitted", "Profile completed")
- Balance line: "Balance: {newBalance} pts" in smaller text
- Auto-dismisses after 5 seconds
- Clicking navigates to `/my-rewards`

**Tier Upgrade Toast:**

- Full-width branded card (gold/brand gradient border)
- Trophy icon (animated bounce, 2 cycles)
- Title: "You reached {tier} tier!" in bold
- Subtitle: "Congratulations! New perks unlocked."
- CSS confetti animation (lightweight, no external library): 20-30 small colored squares/circles that fall from the top of the toast card for 2 seconds
- Auto-dismisses after 8 seconds (longer to enjoy the moment)
- Clicking navigates to `/my-rewards`

**Implementation approach:**

- Client component that listens to the existing notification system
- Intercepts `points_awarded` and `tier_upgraded` notification actions
- Renders the branded toast INSTEAD OF the generic one
- Uses CSS animations only (no canvas, no external confetti library)
- Falls back to generic toast if component fails to load

### 2. Live Balance (`loyalty-live-balance.tsx`)

**What it replaces:** The static `{status.pointsBalance.toLocaleString()} points` text on the My Rewards page (line 200).

**Behavior:**

- Client component that receives initial balance as prop (from server render)
- Subscribes to SSE channel `loyalty` for the client's tenant
- When a `points_awarded` or `trigger_awarded` event arrives for this client:
  - Animates the number counting up from old balance to new balance (300ms, easeOut)
  - Brief green flash on the number (150ms)
- When a `points_deducted` event arrives:
  - Animates counting down (300ms)
  - Brief amber flash (150ms)
- Falls back to static display if SSE connection fails (no error shown, just no animation)

**SSE subscription:**

- Uses existing `useSSE()` hook from `lib/realtime/sse-client.ts`
- Channel: `loyalty`
- Filters events by `clientId` matching current user

### 3. Earning Quest Board (`earning-quest-board.tsx`)

**What it replaces:** The `HowToEarnPanel` on the client's My Rewards page only. Chef-side How-to-Earn usage is unchanged.

**Layout:**

- Card with header: "Ways to Earn" and subtitle: "Complete actions to earn bonus points"
- Two sections:
  - **Achievements** (one-time triggers): profile_completed, fun_qa_completed
  - **Bonus Actions** (per-event/per-action triggers): all other enabled triggers

**Achievement Row (one-time):**

- Completed: green checkmark icon, label with strikethrough, points shown as "Earned"
- Not completed: empty circle icon, label in normal text, points shown as "+{N} pts", subtle call-to-action text (e.g., "Complete your profile to earn 15 pts")

**Bonus Action Row (repeatable):**

- Label + point value + frequency hint ("per event" / "every time")
- No completion state (these are repeatable)
- Grouped by category with small category headers

**States:**

- **Loading:** Skeleton rows (same count as trigger registry)
- **Error:** Falls back to standard `HowToEarnPanel` (never shows error to client)
- **No triggers enabled:** Falls back to standard `HowToEarnPanel`
- **Populated:** Full quest board with completion states

**Data source:** Calls `getClientTriggerCompletionStatus()` on mount.

### 4. Mobile Tab Bar Addition

**Current state:** `client-nav.tsx` line 40 has Rewards without `mobileTab: true`:

```typescript
{ href: '/my-rewards', label: 'Rewards', icon: Gift },
```

**After:** Add `mobileTab: true`:

```typescript
{ href: '/my-rewards', label: 'Rewards', icon: Gift, mobileTab: true },
```

This puts Rewards in the mobile bottom tab bar alongside Bookings, Messages, Friends & Groups, and Profile. Five tabs total. The Gift icon is already imported (line 12).

---

## Edge Cases and Error Handling

| Scenario                                                        | Correct Behavior                                                                                        |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| SSE connection fails or disconnects                             | Live balance falls back to static display. No error shown to client.                                    |
| Celebration toast component fails to load                       | Generic notification toast fires as today (graceful degradation)                                        |
| `getClientTriggerCompletionStatus()` fails                      | Quest board falls back to standard `HowToEarnPanel`                                                     |
| Chef has no triggers enabled (trigger expansion not configured) | Quest board shows only the existing earn modes (per_guest/per_dollar/per_event). No empty state.        |
| Trigger expansion spec not yet built                            | Quest board simply has no trigger data and shows the existing `HowToEarnPanel` content only             |
| Client is on lite mode (tiers only, no points)                  | No quest board, no live balance, no celebration toast for points. Tier upgrade celebration still fires. |
| Multiple point awards arrive in rapid succession via SSE        | Queue animations, don't skip them. Each one plays in sequence (300ms each).                             |
| Confetti CSS animation on low-end device                        | Use `prefers-reduced-motion` media query to skip confetti and use a simple highlight instead            |

---

## Verification Steps

1. Sign in as chef with agent account
2. Enable loyalty program in full mode with at least 3 triggers enabled
3. Sign in as client
4. Navigate to `/my-rewards` on desktop
5. Verify: quest board shows one-time triggers with incomplete state
6. Verify: live balance shows current points
7. Complete a trigger action (e.g., submit a review)
8. Verify: celebration toast appears with branded styling and animation
9. Verify: live balance animates from old value to new value
10. Verify: quest board shows the one-time trigger as completed (if applicable)
11. Open mobile viewport (or real device)
12. Verify: Rewards tab appears in bottom tab bar (5 tabs total)
13. Tap Rewards, verify page loads correctly
14. If enough points accumulated for tier upgrade, verify confetti celebration
15. Test with `prefers-reduced-motion` enabled, verify confetti is skipped
16. Screenshot all results

---

## Out of Scope

- Streak tracking and streak bonuses (separate spec, needs new DB tables)
- Push notifications for point awards (separate spec, needs service worker)
- Leaderboard or competitive elements between clients (separate spec)
- Gamification badges/achievements beyond the quest board (separate spec)
- Points history chart/graph visualization (nice-to-have, not this spec)
- Sound effects on celebration (no audio)

---

## Notes for Builder Agent

- **The quest board depends on the trigger expansion spec being built first.** If building before triggers exist, the quest board should gracefully fall back to the existing `HowToEarnPanel`. Use optional chaining and existence checks on trigger data.
- **CSS confetti only.** Do NOT install `canvas-confetti`, `react-confetti`, or any external library. Use CSS `@keyframes` with absolutely positioned `<span>` elements. 20-30 elements, random sizes (4-8px), random colors from the brand palette, falling animation over 2 seconds, then removed from DOM.
- **The live balance component must not break SSR.** It receives `initialBalance` as a prop from the server-rendered page. The SSE subscription happens in `useEffect`. If SSE never connects, the component shows `initialBalance` forever (which is correct, just not animated).
- **Mobile tab bar change is one line.** Add `mobileTab: true` to the Rewards nav item in `client-nav.tsx` line 40. That's it. The tab bar rendering logic already handles the `mobileTab` flag.
- **Celebration toast intercepts, not replaces.** The generic notification system still creates the notification record and shows it in the notification bell. The celebration toast is an ADDITIONAL visual layer that fires for loyalty events specifically. It does not suppress the notification record.
- **`prefers-reduced-motion` is mandatory** for the confetti and counter animations. Use `window.matchMedia('(prefers-reduced-motion: reduce)')` and skip animations entirely if true.
- **Test with both full and lite program modes.** Lite mode has tiers but no points. The quest board and live balance should not render in lite mode. Only the tier upgrade celebration applies.
