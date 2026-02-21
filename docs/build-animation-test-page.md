# Animation Test Page

## What Was Built

An admin-only test page at `/admin/animations` that lets you fire any of the 30 holiday or 28 milestone animations on demand by clicking a button. No date faking, no localStorage hacks, no DevTools required.

## Files Created / Modified

| File                                    | Action                                                    |
| --------------------------------------- | --------------------------------------------------------- |
| `app/(admin)/admin/animations/page.tsx` | New — the test page                                       |
| `components/admin/admin-sidebar.tsx`    | Modified — added "Animations" nav item with Sparkles icon |

## How It Works

The page is fully self-contained (`'use client'`). It imports the animation config data from the existing files but renders its own animation layer — it does not touch `HolidayOverlay` or `MilestoneOverlay`, which continue working normally in the layouts.

### Animation rendering

Uses the same 6-type CSS keyframe system as the real overlays, but with an `at-` prefix on keyframe names to avoid any collision:

| Prefix       | Type    | Example                              |
| ------------ | ------- | ------------------------------------ |
| `at-fall`    | falling | Shamrocks, snow, bats                |
| `at-rise`    | rising  | Hearts, petals, dollar signs         |
| `at-burst`   | burst   | Confetti, fireworks                  |
| `at-walk`    | walk    | Turkey, football, champagne glass    |
| `at-pulse`   | pulse   | Christmas Eve glow, Good Friday dark |
| `at-sticker` | sticker | MLK Day dove, Labor Day hammer       |

April Fools gets its own special two-phase renderer (fake error box → clown joke), same as the real overlay.

### Milestone label banner

When a milestone button is clicked, the pill-shaped label banner (`🏆 100 Clients!`) appears below the animation — exactly as it does in production.

### State management

- `active` — the currently selected config (or last played)
- `playing` — whether the animation layer is mounted
- `animKey` — incremented on each trigger to remount `AnimLayer` and restart from zero
- Clicking any button mid-animation immediately clears the old one and starts the new one

### "Now playing" indicator

A small dot + text near the top of the page shows which animation is active (green dot = playing, grey dot = last played).

## Navigation

"Animations" appears at the bottom of the admin sidebar with the Sparkles icon.

## What's Covered

- **30 holidays** — all from `OVERLAY_CONFIGS` + `EXTRA_HOLIDAYS`
- **28 milestones** — grouped into Clients, Events, Revenue, Business Birthdays
- **All 6 animation types** represented across both sections
- **April Fools** special case included
- **Milestone label banner** included for all milestone animations
