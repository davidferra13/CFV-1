# Holiday Overlay Animations

## What Was Built

A sitewide, non-invasive holiday animation overlay for ChefFlow. On any of the 30 holidays in the ChefFlow holiday list, a brief CSS animation plays automatically when a page loads. A small replay button (bottom-right corner) lets users replay it as many times as they want. No sound. Never blocks UI interaction.

## Files Created / Modified

| File                                | Action                                               |
| ----------------------------------- | ---------------------------------------------------- |
| `lib/holidays/overlay-configs.ts`   | New — animation config for all 30 holidays           |
| `components/ui/holiday-overlay.tsx` | New — the overlay component                          |
| `app/layout.tsx`                    | Modified — added `<HolidayOverlay />` to root layout |

## How It Works

### Date Detection

On mount (client-side only), `HolidayOverlay` calls `detectTodayHoliday()`:

1. Iterates `HOLIDAYS` from `lib/holidays/constants.ts`
2. Calls `getHolidayDate(holiday, year)` from `lib/holidays/upcoming.ts` for each
3. If today matches, looks up that key in `OVERLAY_CONFIGS`
4. Falls through to `EXTRA_HOLIDAYS` for holidays not in `constants.ts`

### Animation System (6 types)

| Type      | Used for                                        | Mechanism                                |
| --------- | ----------------------------------------------- | ---------------------------------------- |
| `falling` | Snow, shamrocks, bats, leaves, beads            | Particles drift top → bottom             |
| `rising`  | Hearts, flower petals                           | Particles float bottom → top             |
| `burst`   | Confetti, fireworks, stars                      | Particles explode from screen center     |
| `walk`    | Turkey, football, Father's Day tie, Easter eggs | Emoji walks left → right                 |
| `pulse`   | Christmas Eve (warm glow), Good Friday (dark)   | Full-screen overlay fades in/out         |
| `sticker` | Election Day, Labor Day, MLK Day, etc.          | Emoji bounces in at center, holds, fades |

All animations are pure CSS keyframes injected via a `<style>` tag. No animation library required.

### Special Cases

- **April Fools** (`april_fools`): Shows a fake `ERROR: Chef not found 😱` box for 2s, then it vanishes and `🤡 April Fools!` bounces in.
- **Christmas Eve** (`christmas_eve`): Warm golden radial gradient pulses around the screen edges.
- **Easter** (`easter`): 5 eggs (`🐣`) walk across at randomized vertical positions and speeds.

### Replayability

The animation layer is a keyed React component. Clicking replay increments `animKey`, which remounts the `AnimationLayer` and re-runs everything from the start. The replay button stays visible all day once a holiday is detected.

### Pointer Events

The animation container (`fixed inset-0 z-[9999]`) has `pointer-events: none` — it never intercepts clicks, scrolls, or keyboard events. The replay button uses `pointer-events: auto` explicitly.

## Holiday → Config Mapping

### From `lib/holidays/constants.ts` (OVERLAY_CONFIGS)

| Key               | Label             | Animation                         |
| ----------------- | ----------------- | --------------------------------- |
| `new_years_day`   | New Year's Day    | Burst (multi-color confetti)      |
| `lunar_new_year`  | Lunar New Year    | Falling (red envelopes)           |
| `super_bowl`      | Super Bowl Sunday | Walk (football)                   |
| `galentines_day`  | Galentine's Day   | Rising (purple hearts)            |
| `valentines_day`  | Valentine's Day   | Rising (hearts)                   |
| `mardi_gras`      | Mardi Gras        | Falling (purple/green/gold beads) |
| `st_patricks_day` | St. Patrick's Day | Falling (shamrocks)               |
| `easter`          | Easter            | Walk (5 eggs)                     |
| `cinco_de_mayo`   | Cinco de Mayo     | Burst (red/white/green confetti)  |
| `mothers_day`     | Mother's Day      | Rising (pink petals)              |
| `memorial_day`    | Memorial Day      | Falling (red/white/blue stars)    |
| `fathers_day`     | Father's Day      | Walk (tie)                        |
| `juneteenth`      | Juneteenth        | Burst (red/black/green confetti)  |
| `fourth_of_july`  | Independence Day  | Burst (fireworks)                 |
| `labor_day`       | Labor Day         | Sticker (⚒️)                      |
| `halloween`       | Halloween         | Falling (bats)                    |
| `thanksgiving`    | Thanksgiving      | Walk (turkey)                     |
| `hanukkah`        | Hanukkah          | Falling (blue/gold stars)         |
| `christmas_eve`   | Christmas Eve     | Pulse (warm golden glow)          |
| `christmas_day`   | Christmas         | Falling (snow)                    |
| `new_years_eve`   | New Year's Eve    | Burst (max confetti)              |

### Extra Holidays (EXTRA_HOLIDAYS — date computed inline)

| Key                | Date                                     | Animation                      |
| ------------------ | ---------------------------------------- | ------------------------------ |
| `mlk_day`          | 3rd Monday of January                    | Sticker (🕊️)                   |
| `groundhog_day`    | February 2                               | Walk (🐾)                      |
| `presidents_day`   | 3rd Monday of February                   | Burst (patriotic stars)        |
| `april_fools`      | April 1                                  | Sticker (fake error → 🤡 joke) |
| `good_friday`      | Friday before Easter                     | Pulse (dark)                   |
| `earth_day`        | April 22                                 | Falling (green leaves)         |
| `columbus_day`     | 2nd Monday of October                    | Sticker (🧭)                   |
| `election_day`     | 1st Tuesday after 1st Monday in November | Sticker (🗳️)                   |
| `veterans_day`     | November 11                              | Falling (red poppy petals)     |
| `thanksgiving_eve` | Wednesday before Thanksgiving            | Sticker (🍺)                   |

## Adding a New Holiday

1. If the holiday is already in `lib/holidays/constants.ts`, add an entry to `OVERLAY_CONFIGS` in `lib/holidays/overlay-configs.ts` with the matching key.
2. If it's not in `constants.ts`, add an `ExtraHoliday` entry to `EXTRA_HOLIDAYS` with a `getDate` function.
3. No other files need to change.

## Testing a Specific Holiday

To test a holiday on a non-holiday day: temporarily modify `detectTodayHoliday()` in `components/ui/holiday-overlay.tsx` to return a hardcoded config, or change your system clock.

```ts
// Temporary test — revert after testing
function detectTodayHoliday(): ActiveConfig | null {
  return { key: 'christmas_day', ...OVERLAY_CONFIGS['christmas_day'] }
}
```

## Architecture Notes

- The overlay lives in `app/layout.tsx` → runs on every page, sitewide.
- `HolidayOverlay` is `'use client'` — SSR renders nothing (config is null until `useEffect` runs).
- No external animation library needed — 6 CSS keyframes handle all 30 holidays.
- No localStorage — no "seen today" tracking. Plays on every page load + replay button.
- Particles are generated with `useRef` on first render, stable across re-renders.
