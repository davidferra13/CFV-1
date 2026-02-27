# Monthly Raffle Feature

## Overview

Monthly raffle system where clients earn entries by playing a game (Snake), with an anonymous leaderboard and provably fair automated drawing. Three ways to win each month: random draw (luck), top scorer (skill), and most dedicated (consistency).

## How It Works

1. **Chef creates a raffle** — sets a main prize + optional bonus prizes for top scorer and most dedicated
2. **Clients play Snake** — adapted from Chef Arcade's Snake game, accessed from the Rewards page
3. **1 entry per day** — each game play earns 1 raffle entry (daily limit enforced at DB level). Unlimited replays to improve leaderboard score
4. **Anonymous leaderboard** — clients see food emoji aliases (🍕 Player, 🌮 Player), never real names
5. **Three winners per month:**
   - 🎲 **Random Draw** — one entry picked at random from all entries (equal odds)
   - 🏆 **Top Scorer** — highest single game score of the month (deterministic)
   - 🔥 **Most Dedicated** — most days played during the month (deterministic)
6. **Automated draw** — cron runs on the 1st of each month, picks all three winners
7. **Provably fair** — cryptographic seed published in a draw receipt visible to all participants

## Architecture

### Database

- **Base migration:** `supabase/migrations/20260328000009_monthly_raffle.sql`
- **Multi-winner migration:** `supabase/migrations/20260328000011_raffle_multi_winner.sql`
- **Tables:** `raffle_rounds` (one per month per chef), `raffle_entries` (one per client per day per round)
- **Enums:** `raffle_round_status` (active/drawing/completed/cancelled), `raffle_entry_source` (pan_catch/scratch_card/bonus)
- **Constraints:** `UNIQUE (round_id, client_id, entry_date)` — enforces daily limit at DB level, race-condition-proof

### Multi-Winner Columns (on `raffle_rounds`)

| Category       | Prize Column           | Winner Columns                                                                        |
| -------------- | ---------------------- | ------------------------------------------------------------------------------------- |
| Random Draw    | `prize_random_draw`    | `winner_client_id`, `winner_alias`, `winner_entry_id`                                 |
| Top Scorer     | `prize_top_scorer`     | `top_scorer_client_id`, `top_scorer_alias`, `top_scorer_entry_id`, `top_scorer_score` |
| Most Dedicated | `prize_most_dedicated` | `most_dedicated_client_id`, `most_dedicated_alias`, `most_dedicated_entry_count`      |

Each category has its own delivery tracking: `prize_*_delivered` (boolean) + `prize_*_delivered_at` (timestamp).

### Server Actions

- **File:** `lib/raffle/actions.ts`
- **Chef actions:** `createRaffleRound`, `updateRaffleRound`, `getRaffleRounds`, `getRaffleRoundDetail`, `markPrizeDelivered(roundId, category)`
- **Client actions:** `getActiveRaffle`, `submitRaffleEntry`
- **System actions:** `drawRaffleWinner` (used by cron — draws all 3 categories)

### Client Portal (Rewards Page)

- **Raffle section:** `app/(client)/my-rewards/raffle-section.tsx` — card with all prize categories, entry count, play button
- **Game modal:** `app/(client)/my-rewards/raffle-game-modal.tsx` — adapted Chef Snake in a modal overlay
- **Leaderboard:** `app/(client)/my-rewards/raffle-leaderboard.tsx` — anonymous top 10 with emoji aliases
- **Draw receipt:** `app/(client)/my-rewards/raffle-draw-receipt.tsx` — multi-winner receipt with per-category results

### Chef Admin

- **Raffle hub:** `app/(chef)/loyalty/raffle/page.tsx` — create rounds (with optional bonus prizes), view past raffles with multi-winner results
- **Round detail:** `app/(chef)/loyalty/raffle/[id]/page.tsx` — per-category winner cards with delivery buttons, leaderboard (with real names + winner badges)
- **Create form:** `app/(chef)/loyalty/raffle/create-raffle-form.tsx` — main prize + collapsible bonus prize fields
- **Actions:** `app/(chef)/loyalty/raffle/raffle-round-actions.tsx` — cancel round, per-category mark delivered

### Cron Job

- **Endpoint:** `app/api/scheduled/raffle-draw/route.ts`
- **Schedule:** `5 0 1 * *` (00:05 UTC on the 1st of each month)
- **Logic:** Finds all active rounds with expired `month_end`, draws all 3 winner categories for each

## Three Ways to Win

| Category          | How to Win                      | Tie-break                                     | Prize                         |
| ----------------- | ------------------------------- | --------------------------------------------- | ----------------------------- |
| 🎲 Random Draw    | Every entry has equal odds      | N/A (cryptographic random)                    | Required — chef must set this |
| 🏆 Top Scorer     | Highest single game score       | Earliest entry date, then earliest created_at | Optional — chef can skip      |
| 🔥 Most Dedicated | Most days played (most entries) | Highest best score, then earliest first entry | Optional — chef can skip      |

- One person can win multiple categories (e.g., top scorer + random draw)
- If a bonus prize is not set, that category is hidden from clients and not awarded
- Same person winning multiple categories gets a single grouped notification listing all wins

## Anonymous Identity System

Each client gets a random food emoji alias per round:

- Pool of 30 food emojis (🍕, 🌮, 🍣, etc.)
- Assigned on first entry, consistent for the entire month
- Clients see "You" next to their own alias
- New alias each month (prevents long-term tracking)
- Chef sees real names on their admin view

## Anti-Rigging: Provably Fair Draw

- Draw is fully automated (cron job, no manual selection)
- Uses `crypto.randomBytes(32)` for cryptographic randomness
- Draw receipt shows: seed, total entries, participants, all winner aliases
- `status = 'drawing'` intermediate state prevents race conditions
- Draw receipt visible to all participants with an expandable seed detail
- Top scorer and most dedicated are deterministic (no randomness needed)

## Notifications

| Action                | Recipient | When                                                         |
| --------------------- | --------- | ------------------------------------------------------------ |
| `raffle_entry_earned` | Client    | After earning an entry                                       |
| `raffle_winner`       | Client    | When drawn as any category winner (grouped if multiple wins) |
| `raffle_new_round`    | Clients   | When chef creates a round (optional)                         |
| `raffle_drawn_chef`   | Chef      | After draw completes                                         |

## Pro Gating

- Registered as `raffle` in `lib/billing/pro-features.ts` (category: loyalty)
- Chef admin pages should use `<UpgradeGate featureSlug="raffle">`
- Client-facing: no gating needed (no round = no card shown)

## Key Files

| File                                                         | Purpose                                         |
| ------------------------------------------------------------ | ----------------------------------------------- |
| `supabase/migrations/20260328000009_monthly_raffle.sql`      | Base database schema                            |
| `supabase/migrations/20260328000011_raffle_multi_winner.sql` | Multi-winner columns                            |
| `lib/raffle/constants.ts`                                    | Game config, emoji pool, winner category labels |
| `lib/raffle/actions.ts`                                      | Server actions + types                          |
| `app/(client)/my-rewards/raffle-section.tsx`                 | Client raffle card                              |
| `app/(client)/my-rewards/raffle-game-modal.tsx`              | Snake game modal                                |
| `app/(client)/my-rewards/raffle-leaderboard.tsx`             | Anonymous leaderboard                           |
| `app/(client)/my-rewards/raffle-draw-receipt.tsx`            | Multi-winner draw receipt                       |
| `app/(chef)/loyalty/raffle/page.tsx`                         | Chef admin hub                                  |
| `app/(chef)/loyalty/raffle/[id]/page.tsx`                    | Round detail page                               |
| `app/(chef)/loyalty/raffle/create-raffle-form.tsx`           | Create form with bonus prizes                   |
| `app/(chef)/loyalty/raffle/raffle-round-actions.tsx`         | Per-category delivery actions                   |
| `app/api/scheduled/raffle-draw/route.ts`                     | Monthly cron job                                |
| `vercel.json`                                                | Cron schedule entry                             |
| `lib/notifications/types.ts`                                 | Raffle notification types                       |
| `lib/billing/pro-features.ts`                                | Pro feature registry                            |
