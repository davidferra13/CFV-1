# Remy Animation System — Implementation Reference

> Completed: February 2026

## Overview

State-of-the-art 3-layer composited character animation system for Remy, the ChefFlow AI mascot. Works immediately with existing assets and auto-adopts new sprite sheets as they arrive from Gemini.

## Architecture: 3-Layer Compositing

```
┌──────────────────────────────────┐
│  Layer 3: EYES (overlay)         │  ← auto-blink + emotion overrides
│  Layer 2: MOUTH (sprite sheet)   │  ← existing lip-sync system (untouched)
│  Layer 1: BODY (base)            │  ← 11-state machine drives pose/animation
└──────────────────────────────────┘
         ↓ composited into ↓
    RemyAnimatedMascot component
         ↓ rendered by ↓
    RemyMascotButton (bottom-left of screen)
```

Each layer is independent — body can animate while mouth lip-syncs while eyes blink. No layer knows about the others.

## File Map

### New Files (6)

| File                                     | Purpose                                                    |
| ---------------------------------------- | ---------------------------------------------------------- |
| `lib/ai/remy-body-state.ts`              | 11-state body reducer, useBodyState hook, idle timeout     |
| `lib/ai/remy-eye-blink.ts`               | Auto-blink engine, 3-7s random interval, emotion overrides |
| `lib/ai/remy-sprite-manifests.ts`        | Sprite sheet registry (existing + pending assets)          |
| `lib/ai/remy-sprite-loader.ts`           | Asset preloader service                                    |
| `components/ai/remy-sprite-animator.tsx` | Generic sprite sheet player (CSS steps + JS)               |
| `components/ai/remy-animated-mascot.tsx` | 3-layer composited renderer                                |

### Modified Files (5)

| File                                   | Change                                                               |
| -------------------------------------- | -------------------------------------------------------------------- |
| `components/ai/remy-mascot-button.tsx` | Uses RemyAnimatedMascot, supports bodyState + legacy state           |
| `components/ai/remy-context.tsx`       | Added bodyState/dispatchBody/eyeState, useAutoBlink                  |
| `components/ai/remy-wrapper.tsx`       | Uses bodyState/eyeState instead of legacy mascotState                |
| `components/ai/remy-drawer.tsx`        | Dispatches RESPONSE_STARTED/FIRST_TOKEN/RESPONSE_ENDED/ERROR/SUCCESS |
| `tailwind.config.ts`                   | Added remy-breathe and remy-hat-wobble keyframes                     |
| `app/globals.css`                      | Added prefers-reduced-motion block, .remy-fallback CSS               |

### Untouched (by design)

- `remy-visemes.ts` — lip-sync viseme types, perfect as-is
- `use-remy-lip-sync.ts` — text-driven viseme queue, perfect as-is
- `remy-emotion.ts` — keyword-based emotion detection, perfect as-is
- `remy-talking-avatar.tsx` — sprite sheet lip-sync component, reused inside composited mascot

## Body State Machine

11 states with priority ordering (higher overrides lower):

| State       | Priority | Trigger Event                     | CSS Fallback  |
| ----------- | -------- | --------------------------------- | ------------- |
| sleeping    | 0        | IDLE_TIMEOUT (60s no interaction) | —             |
| idle        | 1        | Default, RESPONSE_ENDED           | CSS breathing |
| entrance    | 2        | First load                        | —             |
| exit        | 2        | DRAWER_CLOSED                     | —             |
| nudge       | 3        | NUDGE                             | wiggle        |
| wave        | 4        | DRAWER_OPENED                     | wiggle        |
| whisking    | 5        | WHISKING                          | —             |
| thinking    | 6        | RESPONSE_STARTED                  | —             |
| speaking    | 7        | FIRST_TOKEN                       | —             |
| celebrating | 8        | SUCCESS                           | hop           |
| error       | 9        | ERROR                             | wiggle        |

### Key Transitions

```
User opens drawer    → DRAWER_OPENED  → wave → (anim complete) → idle
User sends message   → RESPONSE_STARTED → thinking
First token arrives  → FIRST_TOKEN → speaking (lip-sync mouth layer activates)
Response complete    → RESPONSE_ENDED → idle
Response has tasks   → SUCCESS → celebrating → (anim complete) → idle
Error occurs         → ERROR → error → (anim complete or interact) → idle
60s idle             → IDLE_TIMEOUT → sleeping
Any interaction      → INTERACT → idle (wakes from sleep)
```

## Eye Blink System

- Random blink interval: 3-7 seconds
- Blink sequence: open → half (50ms) → closed (80ms) → half (50ms) → open = 180ms total
- Body state overrides: sleeping → closed, error → wide, celebrating → star
- Emotion hints: surprised → wide
- Respects `prefers-reduced-motion` (stays open, no blink)

## Sprite Sheet System

### Adding a New Asset

1. Drop the PNG in `public/images/remy/`
2. Open `lib/ai/remy-sprite-manifests.ts`
3. Find the pending manifest entry (e.g., `remy-body-wave`) and set `available: true`
4. Update the `path`, `cols`, `rows`, `frameCount` to match the actual sheet
5. Done — the system auto-uses it on the next render

### Current Registry

| Manifest            | Status        | Asset                                         |
| ------------------- | ------------- | --------------------------------------------- |
| remy-lipsync        | **Available** | 12 visemes × 5 emotions                       |
| remy-body-wave      | Pending       | Need 6-frame wave sheet from Gemini           |
| remy-body-celebrate | Pending       | Need 6-frame celebration sheet                |
| remy-body-error     | Pending       | Need 4-frame error/sad sheet                  |
| remy-body-think     | Pending       | Need 4-frame thinking sheet                   |
| remy-body-sleep     | Pending       | Need 4-frame sleeping sheet                   |
| remy-body-idle      | Pending       | Need 8-frame idle breathing sheet             |
| remy-body-walk      | Pending       | 5-frame walk sheet (exists as separate PNGs)  |
| remy-body-whisk     | Pending       | 4-frame whisk sheet (exists as separate PNGs) |
| remy-eyes           | Pending       | Eye states sheet (exists, needs processing)   |

## Accessibility

- `prefers-reduced-motion: reduce` → all animations stop, static frames shown
- `aria-live="polite"` region announces state changes ("Remy is thinking", "Remy is speaking")
- CSS-only `.remy-fallback` silhouette if mascot image fails to load
- All animation classes disabled via `@media (prefers-reduced-motion: reduce)` in globals.css

## Backward Compatibility

- `setMascotState('thinking')` still works — bridges to `dispatchBody({ type: 'RESPONSE_STARTED' })`
- `mascotState` still available in context — derived from `bodyState`
- `state` prop on RemyMascotButton still works — mapped via `legacyToBodyState()`
- Legacy components don't need immediate migration

## CSS Animations (no new art needed)

- `remy-breathe`: 4s ease-in-out infinite — subtle scaleY(1.015) scaleX(0.995)
- `remy-hat-wobble`: 4.5s ease-in-out infinite — ±0.8deg rotation offset from breathe
- Both applied via Tailwind `animate-remy-breathe` / `animate-remy-hat-wobble`
