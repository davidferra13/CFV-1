# Remy Animation System V2 — Code-Level Improvements

**Date:** 2026-02-27
**Status:** Complete (code). Art replacements pending separately.

---

## What Changed

### 1. requestAnimationFrame with Delta Timing

**File:** `components/ai/remy-sprite-animator.tsx`

Replaced `setTimeout` frame stepping with `requestAnimationFrame` + delta timing. This syncs frame advances to the display refresh rate, eliminating timing drift that caused inconsistent animation speed. The rAF loop tracks elapsed time per frame and only advances when the frame's duration has passed.

### 2. Per-Frame Duration Multipliers

**Files:** `lib/ai/remy-sprite-manifests.ts`, `components/ai/remy-sprite-animator.tsx`

Added optional `frameDurations: number[]` to `SpriteManifest`. Each entry is a multiplier on the base frame duration (1.0 = normal, >1.0 = held longer, <1.0 = quicker). Applied to:

- **Walk:** Contact poses held 1.2x, passing poses 0.8x, final settle 1.5x
- **Celebrate:** Anticipation squash 1.4x, fast launch 0.7x, apex held 1.6x, landing settle 1.8x
- **Spicy:** Reaction peak 1.5x, final hold 2.0x

This creates natural animation rhythm without needing different FPS values per frame.

### 3. Crossfade Transitions

**File:** `components/ai/remy-animated-mascot.tsx`

Body state transitions now crossfade over 180ms instead of hard-cutting. The `useCrossfade` hook tracks the outgoing state and renders it as a fading-out layer behind the incoming state. This smooths the visual pop between different static poses and sprite animations.

### 4. Anticipation/Follow-Through CSS Transforms

**File:** `tailwind.config.ts`

Upgraded CSS fallback animations with animation principles:

- **`mascot-wiggle`:** Now includes squash/stretch (scale 0.97→1.02) alongside rotation, with overshoot and settle. Uses brand spring easing (`cubic-bezier(0.16, 1, 0.3, 1)`).
- **`mascot-hop`:** Anticipation squash (scaleY 0.92, scaleX 1.06) before launch, overshoot at apex, landing squash, settle back to neutral. Uses brand bounce easing (`cubic-bezier(0.34, 1.56, 0.64, 1)`).
- **`remy-breathe`:** Asymmetric timing (40%/60% split instead of 50/50), subtle vertical lift accompanying the scale.
- **`remy-hat-wobble`:** 4-keyframe organic movement instead of 2-keyframe pendulum.

### 5. Smart State Preloading

**File:** `lib/ai/remy-sprite-loader.ts`

New `preloadAdjacentStates()` function. When entering a state, the system preloads sprites for the most likely next states after a 200ms delay (to not compete with the current load). Adjacency map:

- `idle` → preloads thinking, wave, whisk, sleep
- `thinking` → preloads speaking, idle
- `speaking` → preloads idle, celebrate
- etc.

### 6. will-change Optimization

**Files:** `components/ai/remy-sprite-animator.tsx`, `components/ai/remy-animated-mascot.tsx`

`will-change: background-position` is now applied via inline style only while `playing=true`, set to `auto` when stopped. This promotes the element to a compositor layer only during animation, freeing GPU memory at rest.

### 7. Debug Chat Commands

**File:** `components/ai/remy-drawer.tsx`

12 secret debug commands intercept in `handleSend` before hitting the API:

| Command          | Event Fired        |
| ---------------- | ------------------ |
| `remy wave`      | `DRAWER_OPENED`    |
| `remy think`     | `RESPONSE_STARTED` |
| `remy speak`     | `FIRST_TOKEN`      |
| `remy done`      | `RESPONSE_ENDED`   |
| `remy celebrate` | `SUCCESS`          |
| `remy error`     | `ERROR`            |
| `remy nudge`     | `NUDGE`            |
| `remy sleep`     | `IDLE_TIMEOUT`     |
| `remy wake`      | `INTERACT`         |
| `remy whisk`     | `WHISKING`         |
| `remy exit`      | `DRAWER_CLOSED`    |
| `remy idle`      | `INTERACT`         |

Each shows a debug confirmation message in the chat without making an API call.

---

## Known Art Issues (Deferred)

These are NOT code bugs — the animation system handles them correctly. They'll be resolved when new art is generated:

1. **Scale inconsistency:** Static poses (idle, sleeping, pondering, reassurance) are close-up head shots; walk/celebrate sprites are full-body. Causes visual size jumps on state transitions.
2. **Black backgrounds:** `remy-idle.png` and `remy-sleeping.png` have solid black backgrounds instead of transparency.
3. **Eye overlay alignment:** Positioned for close-up face scale; misaligns on full-body sprites.
4. **Lip-sync scale mismatch:** Lip-sync sprite sheet is head close-ups vs. full-body walk sprites.

**Fix:** Regenerate 6 assets at consistent full-body scale with transparent backgrounds. Zero code changes needed — drop the PNGs, the system auto-uses them.

---

## Files Modified

| File                                     | Change                                                            |
| ---------------------------------------- | ----------------------------------------------------------------- |
| `components/ai/remy-sprite-animator.tsx` | rAF + delta timing, variable frame durations, will-change         |
| `components/ai/remy-animated-mascot.tsx` | Crossfade transitions, smart preloading, extracted BodyLayer      |
| `components/ai/remy-drawer.tsx`          | Debug chat commands                                               |
| `lib/ai/remy-sprite-manifests.ts`        | `frameDurations` field, per-frame timing for walk/celebrate/spicy |
| `lib/ai/remy-sprite-loader.ts`           | `preloadAdjacentStates()` with adjacency map                      |
| `lib/ai/remy-body-state.ts`              | Updated cssDurationMs to match new animation durations            |
| `tailwind.config.ts`                     | Upgraded wiggle/hop/breathe/wobble keyframes + spring easing      |
