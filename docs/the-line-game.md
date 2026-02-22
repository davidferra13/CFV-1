# The Line — Kitchen Rush Game

**Date:** 2026-02-22
**Branch:** `feature/risk-gap-closure`
**Status:** Complete

---

## What Was Built

A kitchen line simulator game for the ChefFlow Arcade — "The Line." The chef manages four cooking stations (Grill, Saute, Prep, Oven), handles incoming ticket orders, and tries to survive an escalating dinner rush. Remy serves as the expo caller with real kitchen lingo callouts.

## Files Created

| File                                 | Purpose                                                                |
| ------------------------------------ | ---------------------------------------------------------------------- |
| `app/(chef)/games/the-line/page.tsx` | Main game — single `'use client'` canvas-based game                    |
| `lib/games/line-actions.ts`          | Server action — fetches chef's recipes + upcoming events for Prep Mode |

## Files Modified

| File                        | Change                                                     |
| --------------------------- | ---------------------------------------------------------- |
| `app/(chef)/games/page.tsx` | Added "The Line" card as the first entry in the games grid |

## Game Mechanics

### Core Loop

1. Tickets slide in on a rail with 2-4 food items
2. Tap a ticket item to send it to the correct station (auto-routed by type)
3. A circular ring timer fills around the food as it cooks (gray -> yellow -> GREEN -> orange -> red)
4. Tap the station during the green window to pull the item
5. Complete all items on a ticket to serve it
6. Tickets keep coming faster until you crash

### Stations

- **Grill** (4s cook) — Proteins: Ribeye, Chicken, Salmon, Lamb Chop
- **Saute** (3s cook) — Risotto, Pasta, Stir Fry, Bearnaise
- **Prep** (2s cook) — Caesar, Bruschetta, Ceviche, Charcuterie
- **Oven** (5s cook) — Sourdough, Creme Brulee, Root Veg, Tart Tatin

### Scoring

- Perfect pull (center of green): 100 pts
- Good pull (anywhere in green): 50 pts
- Overcooked pull (orange): 25 pts
- Undercooked pull (yellow): 0 pts, item goes back
- Burnt (red): Strike! Item destroyed
- Ticket bonus: +50 per completed ticket
- All-perfect ticket: 2x multiplier
- Streak multipliers: 2x at 3, 3x at 5, 4x at 8 consecutive perfects

### Difficulty Escalation

| Rush Level | Score Threshold | Ticket Interval | Items |
| ---------- | --------------- | --------------- | ----- |
| Soft Open  | 0               | 6s              | 2     |
| Dinner     | 300             | 4.5s            | 2-3   |
| Rush       | 800             | 3.5s            | 3     |
| Slammed    | 1500            | 2.5s            | 3-4   |
| Weeded     | 2500            | 2s              | 4     |

### Game Over

- 3 strikes (burnt items) OR 5+ pending tickets (overwhelmed)

## Remy Integration

Remy is the expo caller. Callouts include:

- Order announcements ("Order in!", "Ordering!")
- Performance feedback ("HEARD! Beautiful.", "That's raw, chef.")
- Urgency warnings ("We're getting weeded!", "Pick it up!")
- Post-game rating: Dishwasher / Prep Cook / Line Cook / Sous Chef / Chef de Cuisine

## Prep Mode (Easter Egg)

When a chef has upcoming confirmed/paid events with menus, a subtle button appears below "Rush Mode" showing the event name and date. Tapping it loads their actual recipes as ticket items. Same gameplay, same fun — but personalized. If the menu has fewer than 8 items, the pool is backfilled with random dishes.

## Visual Features

- Canvas-based (480x640) with responsive scaling
- Circular cook timer rings with color phase transitions
- Particle system: sparkle bursts on perfect pulls, smoke on burns, confetti on ticket completion
- Flying arc animations when items move from rail to stations
- Steam wisps drifting above active stations
- Warm ambient glow behind cooking stations
- Dark kitchen aesthetic (#1a1a2e) with subtle tile grid pattern
- Remy callout toasts with slide-in/fade-out animation
- Streak fire indicator with scaling

## Controls

- **Mobile:** Tap ticket items to assign, tap stations to pull
- **Desktop:** Click + keyboard shortcuts (Q/W/A/S to pull, E to auto-assign, 1-4 for stations)
- **Restart:** SPACE or tap when game is over

## Architecture

- Single-file `'use client'` component following Galaga pattern
- `useRef` for mutable game state (performance)
- `requestAnimationFrame` loop at 60fps
- `useState` for HUD display only
- Canvas touch/click hit-testing for mobile support
- localStorage for high scores (`chefflow-line-hi`)
