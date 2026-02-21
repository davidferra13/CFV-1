# Business Milestone Animations

## What Was Built

The same fun, non-invasive CSS animation system as the holiday overlay — but for chef business milestones. When a chef crosses a threshold (first client, 10th event, $10K revenue, 1-year anniversary, etc.) a whimsical celebration animation plays automatically the next time they load any page in the chef portal. Includes a bold label banner so the chef knows exactly what they achieved. Replayable via a button in the bottom-right corner.

## Files Created / Modified

| File                                  | Action                                             |
| ------------------------------------- | -------------------------------------------------- |
| `lib/milestones/stats-action.ts`      | New — lightweight server action (3 count queries)  |
| `lib/milestones/milestone-defs.ts`    | New — all milestone thresholds + animation configs |
| `components/ui/milestone-overlay.tsx` | New — the overlay component with queue logic       |
| `app/(chef)/layout.tsx`               | Modified — added `<MilestoneOverlay />`            |

## How It Works

### Detection Flow

1. `MilestoneOverlay` mounts in the chef layout (auth guaranteed — middleware + layout gate ensure only authenticated chefs reach this)
2. On mount: calls `getChefMilestoneStats()` — runs 3 fast Supabase count queries in parallel
3. Compares counts against all `MILESTONE_DEFS` thresholds
4. Reads `localStorage['cf_milestones_seen']` — array of already-celebrated milestone IDs
5. Diffs: any crossed threshold NOT in seen list = new milestone to celebrate
6. Queues new milestones, animates one at a time with a 2.8s gap between
7. After each animation completes, saves milestone ID to `cf_milestones_seen`

### Seen Tracking (localStorage)

Key: `cf_milestones_seen`
Value: JSON array of string IDs, e.g. `["client_1","event_5","revenue_100000"]`

To reset (for testing): `localStorage.removeItem('cf_milestones_seen')` in browser DevTools.

### Animation Types

Reuses the same 6-type CSS animation system from `holiday-overlay.tsx`:

| Type      | Used for                                        |
| --------- | ----------------------------------------------- |
| `burst`   | Most milestones — particles explode from center |
| `rising`  | First event (plates), first $1K (dollar signs)  |
| `walk`    | 10 clients (champagne glass walks across)       |
| `sticker` | 1-year business birthday (cake bounces in)      |

### Label Banner

Every milestone shows a pill-shaped label below the animation:

```
🏆 100 Clients!
```

Animates in with a bounce, holds, then fades — so the chef always knows what milestone fired.

## Milestone Thresholds

### Clients

| Milestone    | Threshold | Animation              |
| ------------ | --------- | ---------------------- |
| `client_1`   | 1         | 🎉 Confetti burst      |
| `client_5`   | 5         | 🌟 Gold stars burst    |
| `client_10`  | 10        | 🥂 Champagne walk      |
| `client_25`  | 25        | 🎊 Multi-color burst   |
| `client_50`  | 50        | 🎆 Fireworks           |
| `client_100` | 100       | 🏆 Trophy + gold burst |
| `client_250` | 250       | 👑 Crown + max burst   |

### Completed Events

| Milestone   | Threshold | Animation             |
| ----------- | --------- | --------------------- |
| `event_1`   | 1         | 🍽️ Plates rising      |
| `event_5`   | 5         | ⭐ Stars burst        |
| `event_10`  | 10        | 🎉 Confetti           |
| `event_25`  | 25        | 🎊 Big burst          |
| `event_50`  | 50        | 🎆 Fireworks          |
| `event_100` | 100       | 🏆 Trophy + max burst |
| `event_250` | 250       | 🌟 Gold stars max     |

### Lifetime Revenue

| Milestone          | Threshold | Animation              |
| ------------------ | --------- | ---------------------- |
| `revenue_100000`   | $1,000    | 💵 Dollar signs rising |
| `revenue_500000`   | $5,000    | 💰 Gold coins burst    |
| `revenue_1000000`  | $10,000   | 🎉 Confetti            |
| `revenue_2500000`  | $25,000   | 🎊 Big burst           |
| `revenue_5000000`  | $50,000   | 🎆 Fireworks           |
| `revenue_10000000` | $100,000  | 🏆 Trophy + gold burst |
| `revenue_25000000` | $250,000  | 👑 Crown + max burst   |

### Business Birthdays (anniversary day only)

| Milestone | Threshold | Animation            |
| --------- | --------- | -------------------- |
| `bday_1`  | 1 year    | 🎂 Cake sticker      |
| `bday_2`  | 2 years   | 🎊 Confetti          |
| `bday_3`  | 3 years   | 🎆 Fireworks         |
| `bday_5`  | 5 years   | 👑 Crown + max burst |

Birthday milestones only fire on the **exact calendar anniversary day** (same month + day as `chef.created_at`). They ARE re-shown each year since localStorage doesn't expire — the business birthday milestone ID (`bday_1`) is the same each year, meaning once seen it won't fire again. To celebrate each year, you'd change the ID to include the year (e.g. `bday_1_2027`). Current implementation treats birthday as a one-time celebration.

## Adding a New Milestone

1. Add an entry to `MILESTONE_DEFS` in `lib/milestones/milestone-defs.ts`
2. Set exactly one of: `clientThreshold`, `eventThreshold`, `revenueThreshold`, or `businessYears`
3. No other files need to change

## Testing

**Quick test in browser:**

1. Open DevTools → Application → Local Storage → delete `cf_milestones_seen`
2. Reload any chef portal page
3. If your account has crossed any threshold, the animation fires

**Force a specific milestone:**
Temporarily patch `getChefMilestoneStats()` in `lib/milestones/stats-action.ts` to return hardcoded stats:

```ts
return {
  clientCount: 100,
  completedEventCount: 50,
  lifetimeRevenueCents: 10_000_000,
  chefCreatedAt: new Date().toISOString(),
}
```

**Queue test:**
Return stats crossing 3+ thresholds → confirm animations play one at a time with ~2.8s gap.
