# Discovery Rail Layer 2: Motion and Feel

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace basic auto-scroll with physics-based motion driven by `resolveDiscoveryRailMotionContract()`. Add micro-interactions, entrance choreography, and mobile swipe gestures.

**Architecture:** Wire the existing `DiscoveryRailMotionContract` system from `control-rail-contracts.ts` into `cuisine-marquee.tsx`. Extract motion logic into a focused hook. Add CSS keyframes for all micro-interactions. Implement a gesture recognizer for mobile swipe-to-save/dismiss.

**Tech Stack:** Next.js (Client Components), CSS custom properties + keyframes, `requestAnimationFrame` for physics, Pointer Events API for gesture recognition, `navigator.vibrate` for haptic feedback.

**Spec:** `docs/superpowers/specs/2026-05-14-discovery-rail-massive-overhaul-design.md` (Layer 2, Builds 2.1-2.4)

---

## File Map

### New Files

| File                                           | Responsibility                                                                             |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `lib/discovery/use-discovery-motion.ts`        | React hook wrapping `resolveDiscoveryRailMotionContract()` with RAF-based scroll physics   |
| `lib/discovery/swipe-gesture.ts`               | Gesture recognizer: direction, velocity, threshold detection for mobile swipe interactions |
| `tests/unit/discovery-motion-contract.test.ts` | Motion contract resolution tests (all 4 modes, reduced motion, velocity thresholds)        |
| `tests/unit/swipe-gesture.test.ts`             | Gesture recognizer unit tests (direction, velocity, threshold filtering)                   |

### Modified Files

| File                                               | Changes                                                                                                  |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `app/(public)/_components/cuisine-marquee.tsx`     | Replace sine-wave scroller with motion contract, wire entrance choreography, add mobile gesture handlers |
| `app/globals.css`                                  | Add keyframe definitions for micro-interactions, entrance choreography, card animations                  |
| `components/discovery/discovery-card.tsx`          | Add hover/press/select animation states, tilt transform during swipe                                     |
| `components/discovery/discovery-card-feedback.tsx` | Add spring-in on hover, bounce on click animations                                                       |
| `components/discovery/discovery-row.tsx`           | Wire motion hook to scroll container, add entrance stagger delay per card                                |

---

## Task 1: Motion Contract Hook

**Files:**

- Create: `tests/unit/discovery-motion-contract.test.ts`
- Create: `lib/discovery/use-discovery-motion.ts`

This task tests the existing `resolveDiscoveryRailMotionContract()` function from `control-rail-contracts.ts` and wraps it in a React hook that drives RAF-based scrolling.

- [ ] **Step 1: Write failing test for motion contract resolution**

Create `tests/unit/discovery-motion-contract.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import {
  resolveDiscoveryRailMotionContract,
  type DiscoveryRailMotionControl,
  type DiscoveryRailMotionContract,
} from '@/lib/discovery/control-rail-contracts'

describe('resolveDiscoveryRailMotionContract', () => {
  it('passive mode disables all motion', () => {
    const result = resolveDiscoveryRailMotionContract({ control: 'passive' })
    expect(result.control).toBe('passive')
    expect(result.preservesMomentum).toBe(false)
    expect(result.rolling).toBe(false)
    expect(result.autoStopMs).toBeNull()
    expect(result.animation).toBe('none')
    expect(result.rowStopMode).toBe('none')
  })

  it('flick mode with slow velocity does not preserve momentum', () => {
    const result = resolveDiscoveryRailMotionContract({
      control: 'flick',
      pointerVelocityPxPerMs: 0.3,
    })
    expect(result.control).toBe('flick')
    expect(result.preservesMomentum).toBe(false)
    expect(result.autoStopMs).toBeNull()
    expect(result.protectsActivation).toBe(false)
  })

  it('flick mode with fast velocity enables momentum and 900ms auto-stop', () => {
    const result = resolveDiscoveryRailMotionContract({
      control: 'flick',
      pointerVelocityPxPerMs: 1.5,
    })
    expect(result.preservesMomentum).toBe(true)
    expect(result.autoStopMs).toBe(900)
    expect(result.protectsActivation).toBe(true)
    expect(result.animation).toBe('momentum')
  })

  it('flick mode with reduced motion suppresses animation', () => {
    const result = resolveDiscoveryRailMotionContract({
      control: 'flick',
      pointerVelocityPxPerMs: 2.0,
      reducedMotion: true,
    })
    expect(result.animation).toBe('none')
  })

  it('dice mode uses staggered row stops at 1400ms', () => {
    const result = resolveDiscoveryRailMotionContract({ control: 'dice' })
    expect(result.control).toBe('dice')
    expect(result.autoStopMs).toBe(1400)
    expect(result.rowStopMode).toBe('staggered')
    expect(result.shouldResetScrollStart).toBe(true)
    expect(result.animation).toBe('short_roll')
  })

  it('dice mode with reduced motion uses instant offset', () => {
    const result = resolveDiscoveryRailMotionContract({
      control: 'dice',
      reducedMotion: true,
    })
    expect(result.autoStopMs).toBe(0)
    expect(result.animation).toBe('instant_offset')
  })

  it('lever mode uses manual top-to-bottom cascade at 4500ms', () => {
    const result = resolveDiscoveryRailMotionContract({ control: 'lever' })
    expect(result.control).toBe('lever')
    expect(result.autoStopMs).toBe(4500)
    expect(result.rowStopMode).toBe('manual_top_to_bottom')
    expect(result.protectsActivation).toBe(true)
  })

  it('velocity threshold is 0.8 px/ms for fast flick', () => {
    const slow = resolveDiscoveryRailMotionContract({
      control: 'flick',
      pointerVelocityPxPerMs: 0.79,
    })
    const fast = resolveDiscoveryRailMotionContract({
      control: 'flick',
      pointerVelocityPxPerMs: 0.8,
    })
    expect(slow.preservesMomentum).toBe(false)
    expect(fast.preservesMomentum).toBe(true)
  })
})
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx vitest run tests/unit/discovery-motion-contract.test.ts`
Expected: All 8 tests PASS (these test existing code in `control-rail-contracts.ts`).

- [ ] **Step 3: Create the motion hook**

Create `lib/discovery/use-discovery-motion.ts`:

```typescript
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  resolveDiscoveryRailMotionContract,
  type DiscoveryRailMotionControl,
  type DiscoveryRailMotionContract,
} from '@/lib/discovery/control-rail-contracts'

export type DiscoveryMotionState = {
  contract: DiscoveryRailMotionContract
  activeControl: DiscoveryRailMotionControl
  isScrolling: boolean
  velocityPxPerMs: number
}

type MotionConfig = {
  defaultControl?: DiscoveryRailMotionControl
  decayFactor?: number
  maxVelocityPxPerFrame?: number
  reducedMotion?: boolean
}

const DEFAULT_DECAY = 0.94
const MAX_VELOCITY = 3.2

export function useDiscoveryMotion(config: MotionConfig = {}) {
  const {
    defaultControl = 'flick',
    decayFactor = DEFAULT_DECAY,
    maxVelocityPxPerFrame = MAX_VELOCITY,
  } = config

  const reducedMotion = useReducedMotion(config.reducedMotion)
  const [activeControl, setActiveControl] = useState<DiscoveryRailMotionControl>(
    reducedMotion ? 'passive' : defaultControl
  )
  const velocityRef = useRef(0)
  const isScrollingRef = useRef(false)
  const rafRef = useRef<number | null>(null)
  const scrollRefs = useRef<(HTMLDivElement | null)[]>([])

  const contract = resolveDiscoveryRailMotionContract({
    control: reducedMotion ? 'passive' : activeControl,
    reducedMotion,
    pointerVelocityPxPerMs: velocityRef.current,
  })

  const registerRow = useCallback((index: number, el: HTMLDivElement | null) => {
    scrollRefs.current[index] = el
  }, [])

  const startMomentumScroll = useCallback(
    (initialVelocity: number) => {
      if (contract.animation === 'none') return
      velocityRef.current =
        Math.min(Math.abs(initialVelocity), maxVelocityPxPerFrame) * Math.sign(initialVelocity)
      isScrollingRef.current = true

      const animate = () => {
        if (Math.abs(velocityRef.current) < 0.1) {
          isScrollingRef.current = false
          velocityRef.current = 0
          return
        }

        scrollRefs.current.forEach((el) => {
          if (el) el.scrollLeft += velocityRef.current
        })

        velocityRef.current *= decayFactor
        rafRef.current = requestAnimationFrame(animate)
      }

      rafRef.current = requestAnimationFrame(animate)
    },
    [contract.animation, decayFactor, maxVelocityPxPerFrame]
  )

  const stopScroll = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    velocityRef.current = 0
    isScrollingRef.current = false
  }, [])

  const triggerDice = useCallback(() => {
    if (contract.control !== 'dice') return
    const staggerMs = contract.autoStopMs ?? 1400

    scrollRefs.current.forEach((el, index) => {
      if (!el) return
      const offset = Math.floor(Math.random() * el.scrollWidth * 0.3)
      setTimeout(() => {
        el.scrollTo({ left: offset, behavior: reducedMotion ? 'instant' : 'smooth' })
      }, index * staggerMs)
    })
  }, [contract, reducedMotion])

  const triggerLever = useCallback(() => {
    if (contract.control !== 'lever') return
    const cascadeMs = contract.autoStopMs ?? 4500
    const perRowMs = cascadeMs / Math.max(scrollRefs.current.length, 1)

    scrollRefs.current.forEach((el, index) => {
      if (!el) return
      const offset = Math.floor(Math.random() * el.scrollWidth * 0.4)
      setTimeout(() => {
        el.scrollTo({ left: offset, behavior: reducedMotion ? 'instant' : 'smooth' })
      }, index * perRowMs)
    })
  }, [contract, reducedMotion])

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return {
    contract,
    activeControl,
    setActiveControl,
    registerRow,
    startMomentumScroll,
    stopScroll,
    triggerDice,
    triggerLever,
    reducedMotion,
    isScrolling: isScrollingRef.current,
  }
}

function useReducedMotion(override?: boolean): boolean {
  const [reduced, setReduced] = useState(override ?? false)

  useEffect(() => {
    if (override !== undefined) return
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [override])

  return reduced
}
```

- [ ] **Step 4: Commit**

```bash
git add tests/unit/discovery-motion-contract.test.ts lib/discovery/use-discovery-motion.ts
git commit -m "feat(discovery): add motion contract tests and useDiscoveryMotion hook"
```

---

## Task 2: Micro-Interaction Keyframes

**Files:**

- Modify: `app/globals.css`
- Modify: `components/discovery/discovery-card.tsx`
- Modify: `components/discovery/discovery-card-feedback.tsx`

This task adds CSS keyframes for card hover/press/select states and feedback button animations.

- [ ] **Step 1: Read current discovery keyframes in globals.css**

Read `app/globals.css` lines 1017-1499 to check for existing keyframe definitions in the discovery section.

- [ ] **Step 2: Add micro-interaction keyframes to globals.css**

Add this block to the discovery section in `app/globals.css`:

```css
/* -- Discovery Micro-Interactions -- */

/* Card select border pulse */
@keyframes discovery-pulse-taste {
  0%,
  100% {
    box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.3);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.5);
  }
}
@keyframes discovery-pulse-occasion {
  0%,
  100% {
    box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.3);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.5);
  }
}
@keyframes discovery-pulse-picks {
  0%,
  100% {
    box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.3);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.5);
  }
}

.discovery-card-selected-taste {
  animation: discovery-pulse-taste 1.5s ease-in-out infinite;
}
.discovery-card-selected-occasion {
  animation: discovery-pulse-occasion 1.5s ease-in-out infinite;
}
.discovery-card-selected-picks {
  animation: discovery-pulse-picks 1.5s ease-in-out infinite;
}

/* Feedback button spring-in */
@keyframes discovery-spring-in {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  60% {
    transform: scale(1.15);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

/* Feedback button bounce on click */
@keyframes discovery-bounce {
  0% {
    transform: scale(1);
  }
  30% {
    transform: scale(0.8);
  }
  60% {
    transform: scale(1.12);
  }
  100% {
    transform: scale(1);
  }
}

/* Love confetti burst */
@keyframes discovery-confetti {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.6);
    opacity: 0.6;
  }
  100% {
    transform: scale(2);
    opacity: 0;
  }
}

.discovery-feedback-btn {
  animation: discovery-spring-in 200ms ease-out both;
}

.discovery-feedback-btn:active {
  animation: discovery-bounce 250ms ease-out;
}

.discovery-love-burst::after {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(244, 63, 94, 0.4) 0%, transparent 70%);
  animation: discovery-confetti 400ms ease-out forwards;
  pointer-events: none;
}

/* Pause/play morph */
@keyframes discovery-icon-morph {
  0% {
    transform: scale(1) rotate(0deg);
  }
  50% {
    transform: scale(0.8) rotate(90deg);
  }
  100% {
    transform: scale(1) rotate(180deg);
  }
}

.discovery-morph-icon {
  transition: transform 200ms ease-out;
}

/* Row label dot pulse on content update */
@keyframes discovery-dot-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.6;
  }
  50% {
    transform: scale(1.5);
    opacity: 1;
  }
}

.discovery-dot-updating {
  animation: discovery-dot-pulse 600ms ease-in-out;
}

/* Filter token slide-in */
@keyframes discovery-token-slide-in {
  0% {
    transform: translateX(-12px) scale(0.9);
    opacity: 0;
  }
  100% {
    transform: translateX(0) scale(1);
    opacity: 1;
  }
}

/* Filter token shrink-out */
@keyframes discovery-token-shrink-out {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(0.8);
    opacity: 0;
  }
}

.discovery-token-enter {
  animation: discovery-token-slide-in 200ms ease-out both;
}

.discovery-token-exit {
  animation: discovery-token-shrink-out 150ms ease-in both;
}

/* Reduced motion: disable all discovery animations */
@media (prefers-reduced-motion: reduce) {
  .discovery-card-selected-taste,
  .discovery-card-selected-occasion,
  .discovery-card-selected-picks,
  .discovery-feedback-btn,
  .discovery-love-burst::after,
  .discovery-morph-icon,
  .discovery-dot-updating,
  .discovery-token-enter,
  .discovery-token-exit {
    animation: none !important;
    transition: none !important;
  }

  .discovery-card-base:hover {
    transform: none;
  }

  .discovery-card-base:active {
    transform: none;
  }
}
```

- [ ] **Step 3: Update DiscoveryCard with select animation class**

In `components/discovery/discovery-card.tsx`, add select animation classes. Add a mapping constant:

```typescript
const LANE_SELECT_CLASS: Record<HomepageDiscoveryLane, string> = {
  taste: 'discovery-card-selected-taste',
  occasion: 'discovery-card-selected-occasion',
  chefflow_picks: 'discovery-card-selected-picks',
}
```

In the `DiscoveryCard` component, replace the `selectedBorder` logic:

Change:

```typescript
const selectedBorder = isSelected ? 'ring-2 ring-amber-400/60' : ''
```

to:

```typescript
const selectedClass = isSelected ? LANE_SELECT_CLASS[lane] : ''
```

And update the `className` on the `<Link>` to use `selectedClass` instead of `selectedBorder`.

- [ ] **Step 4: Update DiscoveryCardFeedback with animation classes**

In `components/discovery/discovery-card-feedback.tsx`, add the `discovery-feedback-btn` class to each button and add a `relative` class to the love button for the confetti burst:

For each `<button>`, add `discovery-feedback-btn` to the className string.

For the love button specifically, add a state-driven confetti class:

```tsx
const [showBurst, setShowBurst] = useState(false)
```

On the love button's onClick:

```tsx
onClick={(e) => {
  e.preventDefault()
  e.stopPropagation()
  setShowBurst(true)
  setTimeout(() => setShowBurst(false), 400)
  onLove()
}}
className={`discovery-feedback-btn relative flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white/70 hover:text-rose-400 hover:bg-black/80 transition-colors ${showBurst ? 'discovery-love-burst' : ''}`}
```

- [ ] **Step 5: Verify no class name conflicts**

Run: `grep -r "discovery-pulse-taste\|discovery-spring-in\|discovery-bounce\|discovery-confetti" app/ components/ lib/ --include="*.tsx" --include="*.ts" --include="*.css" -l`

Expected: Only `app/globals.css` and the modified component files match.

- [ ] **Step 6: Commit**

```bash
git add app/globals.css components/discovery/discovery-card.tsx components/discovery/discovery-card-feedback.tsx
git commit -m "feat(discovery): add micro-interaction keyframes and card animation states"
```

---

## Task 3: Entrance Choreography

**Files:**

- Modify: `app/globals.css`
- Modify: `components/discovery/discovery-row.tsx`
- Modify: `app/(public)/_components/cuisine-marquee.tsx`

This task replaces the current staggered slide-in with a richer entrance sequence.

- [ ] **Step 1: Add entrance choreography keyframes to globals.css**

Add to the discovery section in `app/globals.css`:

```css
/* -- Discovery Entrance Choreography -- */

/* Container backdrop-blur grow */
@keyframes discovery-container-enter {
  0% {
    opacity: 0;
    backdrop-filter: blur(0px);
    -webkit-backdrop-filter: blur(0px);
  }
  100% {
    opacity: 1;
    backdrop-filter: blur(40px);
    -webkit-backdrop-filter: blur(40px);
  }
}

.discovery-container-entering {
  animation: discovery-container-enter 200ms ease-out both;
}

/* Card cascade from left with upward float */
@keyframes discovery-card-cascade {
  0% {
    opacity: 0;
    transform: translateX(-16px) translateY(8px);
  }
  100% {
    opacity: 1;
    transform: translateX(0) translateY(0);
  }
}

.discovery-card-cascading {
  animation: discovery-card-cascade 300ms ease-out both;
}

/* First card spotlight glow */
@keyframes discovery-spotlight {
  0% {
    box-shadow: 0 0 0 0 rgba(245, 158, 11, 0);
  }
  50% {
    box-shadow: 0 0 20px 4px rgba(245, 158, 11, 0.3);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(245, 158, 11, 0);
  }
}

.discovery-card-spotlight {
  animation: discovery-spotlight 800ms ease-in-out 300ms both;
}

/* Lane label typewriter cursor */
@keyframes discovery-typewriter-cursor {
  0%,
  100% {
    border-right-color: transparent;
  }
  50% {
    border-right-color: rgba(255, 255, 255, 0.5);
  }
}

.discovery-label-typewriter {
  overflow: hidden;
  white-space: nowrap;
  border-right: 2px solid transparent;
  animation: discovery-typewriter-cursor 400ms step-end 3;
}

/* Mobile: simplified instant appear */
@media (max-width: 767px) {
  .discovery-card-cascading {
    animation: none;
    opacity: 1;
    transform: none;
  }

  .discovery-container-entering {
    animation-duration: 100ms;
  }
}

@media (prefers-reduced-motion: reduce) {
  .discovery-container-entering,
  .discovery-card-cascading,
  .discovery-card-spotlight,
  .discovery-label-typewriter {
    animation: none !important;
    opacity: 1;
    transform: none;
  }
}
```

- [ ] **Step 2: Add entrance stagger to DiscoveryRow**

In `components/discovery/discovery-row.tsx`, add an `entranceStaggerMs` prop to `DiscoveryRowProps`:

```typescript
entranceStaggerMs?: number
```

On each card wrapper `<div>` in the `loopedItems.map()`, add a cascade animation delay:

```tsx
<div
  key={key}
  role="listitem"
  className="flex-shrink-0 discovery-card-cascading"
  style={{
    animationDelay: entranceStaggerMs
      ? `${(i % items.length) * (entranceStaggerMs)}ms`
      : undefined,
  }}
>
```

Add the spotlight class to the first card (index 0):

```tsx
className={`flex-shrink-0 discovery-card-cascading ${i === 0 ? 'discovery-card-spotlight' : ''}`}
```

- [ ] **Step 3: Wire entrance container animation in cuisine-marquee.tsx**

In `app/(public)/_components/cuisine-marquee.tsx`, find the outermost discovery container `<div>` and add the `discovery-container-entering` class. This is the container that wraps all three lanes.

The entrance stagger per card should be 40ms:

```tsx
<DiscoveryRow entranceStaggerMs={40} ... />
```

- [ ] **Step 4: Commit**

```bash
git add app/globals.css components/discovery/discovery-row.tsx app/(public)/_components/cuisine-marquee.tsx
git commit -m "feat(discovery): add entrance choreography with cascade and spotlight"
```

---

## Task 4: Swipe Gestures (Mobile)

**Files:**

- Create: `tests/unit/swipe-gesture.test.ts`
- Create: `lib/discovery/swipe-gesture.ts`
- Modify: `components/discovery/discovery-card.tsx`
- Modify: `app/(public)/_components/cuisine-marquee.tsx`

This task adds a gesture recognizer for mobile swipe-to-save and swipe-to-dismiss.

- [ ] **Step 1: Write failing test for swipe gesture recognizer**

Create `tests/unit/swipe-gesture.test.ts`:

```typescript
import { describe, expect, it } from 'vitest'
import {
  recognizeSwipeGesture,
  type SwipeGestureInput,
  type SwipeGestureResult,
} from '@/lib/discovery/swipe-gesture'

function makeInput(overrides: Partial<SwipeGestureInput>): SwipeGestureInput {
  return {
    startX: 100,
    startY: 200,
    endX: 100,
    endY: 200,
    startTime: 0,
    endTime: 100,
    ...overrides,
  }
}

describe('recognizeSwipeGesture', () => {
  it('detects upward swipe as save when velocity exceeds threshold', () => {
    const result = recognizeSwipeGesture(
      makeInput({
        startY: 200,
        endY: 130,
        startTime: 0,
        endTime: 100,
      })
    )
    expect(result.direction).toBe('up')
    expect(result.action).toBe('save')
    expect(result.recognized).toBe(true)
  })

  it('detects downward swipe as dismiss when velocity exceeds threshold', () => {
    const result = recognizeSwipeGesture(
      makeInput({
        startY: 100,
        endY: 170,
        startTime: 0,
        endTime: 100,
      })
    )
    expect(result.direction).toBe('down')
    expect(result.action).toBe('dismiss')
    expect(result.recognized).toBe(true)
  })

  it('rejects slow swipes below velocity threshold (0.5 px/ms)', () => {
    const result = recognizeSwipeGesture(
      makeInput({
        startY: 200,
        endY: 170,
        startTime: 0,
        endTime: 1000,
      })
    )
    expect(result.recognized).toBe(false)
  })

  it('rejects horizontal swipes (not vertical)', () => {
    const result = recognizeSwipeGesture(
      makeInput({
        startX: 100,
        endX: 200,
        startY: 200,
        endY: 205,
        startTime: 0,
        endTime: 50,
      })
    )
    expect(result.recognized).toBe(false)
  })

  it('calculates tilt angle capped at 3 degrees', () => {
    const result = recognizeSwipeGesture(
      makeInput({
        startY: 200,
        endY: 100,
        startTime: 0,
        endTime: 50,
      })
    )
    expect(result.tiltDegrees).toBeLessThanOrEqual(3)
    expect(result.tiltDegrees).toBeGreaterThan(0)
  })

  it('reports velocity in px/ms', () => {
    const result = recognizeSwipeGesture(
      makeInput({
        startY: 200,
        endY: 100,
        startTime: 0,
        endTime: 100,
      })
    )
    expect(result.velocityPxPerMs).toBe(1)
  })

  it('returns no action for zero-distance swipe', () => {
    const result = recognizeSwipeGesture(
      makeInput({
        startY: 200,
        endY: 200,
      })
    )
    expect(result.recognized).toBe(false)
    expect(result.action).toBe('none')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/swipe-gesture.test.ts`
Expected: FAIL -- module not found.

- [ ] **Step 3: Implement swipe-gesture.ts**

Create `lib/discovery/swipe-gesture.ts`:

```typescript
export type SwipeDirection = 'up' | 'down' | 'left' | 'right' | 'none'
export type SwipeAction = 'save' | 'dismiss' | 'none'

export type SwipeGestureInput = {
  startX: number
  startY: number
  endX: number
  endY: number
  startTime: number
  endTime: number
}

export type SwipeGestureResult = {
  direction: SwipeDirection
  action: SwipeAction
  recognized: boolean
  velocityPxPerMs: number
  tiltDegrees: number
  deltaX: number
  deltaY: number
}

const VELOCITY_THRESHOLD_PX_PER_MS = 0.5
const MIN_DISTANCE_PX = 20
const MAX_TILT_DEGREES = 3

export function recognizeSwipeGesture(input: SwipeGestureInput): SwipeGestureResult {
  const deltaX = input.endX - input.startX
  const deltaY = input.endY - input.startY
  const absDX = Math.abs(deltaX)
  const absDY = Math.abs(deltaY)
  const elapsed = Math.max(input.endTime - input.startTime, 1)

  // Must be primarily vertical and exceed minimum distance
  if (absDY < MIN_DISTANCE_PX || absDX > absDY) {
    return {
      direction: 'none',
      action: 'none',
      recognized: false,
      velocityPxPerMs: 0,
      tiltDegrees: 0,
      deltaX,
      deltaY,
    }
  }

  const velocityPxPerMs = absDY / elapsed
  const direction: SwipeDirection = deltaY < 0 ? 'up' : 'down'

  if (velocityPxPerMs < VELOCITY_THRESHOLD_PX_PER_MS) {
    return {
      direction,
      action: 'none',
      recognized: false,
      velocityPxPerMs,
      tiltDegrees: 0,
      deltaX,
      deltaY,
    }
  }

  const rawTilt = Math.min(absDY / 30, MAX_TILT_DEGREES)
  const tiltDegrees = Math.round(rawTilt * 100) / 100
  const action: SwipeAction = direction === 'up' ? 'save' : 'dismiss'

  return {
    direction,
    action,
    recognized: true,
    velocityPxPerMs,
    tiltDegrees,
    deltaX,
    deltaY,
  }
}

/**
 * Calculate CSS transform for card tilt during active swipe.
 * Returns a rotate transform string capped at MAX_TILT_DEGREES.
 */
export function getSwipeTiltTransform(deltaY: number, deltaX: number): string {
  if (Math.abs(deltaY) < 5) return 'none'
  const tiltDirection = deltaX > 0 ? 1 : -1
  const tiltAmount = Math.min(Math.abs(deltaY) / 30, MAX_TILT_DEGREES)
  return `rotate(${tiltDirection * tiltAmount}deg)`
}

/**
 * Trigger haptic feedback if supported.
 */
export function triggerHaptic(durationMs = 10): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(durationMs)
    } catch {
      // Haptic not supported, silently ignore
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/unit/swipe-gesture.test.ts`
Expected: All 7 tests PASS.

- [ ] **Step 5: Add swipe tilt CSS to globals.css**

Add to the discovery section in `app/globals.css`:

```css
/* Swipe tilt transition */
.discovery-card-swiping {
  transition: transform 50ms ease-out;
  will-change: transform;
}

/* Swipe save animation (upward fade) */
@keyframes discovery-swipe-save {
  0% {
    transform: translateY(0);
    opacity: 1;
  }
  100% {
    transform: translateY(-40px);
    opacity: 0;
  }
}

/* Swipe dismiss animation (downward fade) */
@keyframes discovery-swipe-dismiss {
  0% {
    transform: translateY(0);
    opacity: 1;
  }
  100% {
    transform: translateY(40px);
    opacity: 0;
  }
}

.discovery-card-swipe-save {
  animation: discovery-swipe-save 300ms ease-out forwards;
}

.discovery-card-swipe-dismiss {
  animation: discovery-swipe-dismiss 300ms ease-out forwards;
}

@media (prefers-reduced-motion: reduce) {
  .discovery-card-swiping,
  .discovery-card-swipe-save,
  .discovery-card-swipe-dismiss {
    animation: none !important;
    transition: none !important;
  }
}
```

- [ ] **Step 6: Wire swipe gesture to DiscoveryCard**

In `components/discovery/discovery-card.tsx`, add optional swipe props to `DiscoveryCardProps`:

```typescript
onSwipeSave?: () => void
onSwipeDismiss?: () => void
```

Add pointer event handlers to the `<Link>` for tracking swipe start/end, using `recognizeSwipeGesture()` and `getSwipeTiltTransform()` from `@/lib/discovery/swipe-gesture`. On recognized gesture, call `triggerHaptic()` and invoke the corresponding callback.

The card should add `discovery-card-swiping` class during active pointer tracking and apply the tilt transform via inline style.

- [ ] **Step 7: Wire swipe callbacks in cuisine-marquee.tsx**

In `app/(public)/_components/cuisine-marquee.tsx`, pass `onSwipeSave` and `onSwipeDismiss` through the DiscoveryRow/DiscoveryCard chain. Wire:

- `onSwipeSave`: calls `trackDiscoveryInteraction('save', item, context)` and `showDiscoveryLoveToast(item)`
- `onSwipeDismiss`: calls `trackDiscoveryInteraction('hide', item, context)` and `showDiscoveryHideToast(item, undoCallback)`

- [ ] **Step 8: Commit**

```bash
git add tests/unit/swipe-gesture.test.ts lib/discovery/swipe-gesture.ts app/globals.css components/discovery/discovery-card.tsx app/(public)/_components/cuisine-marquee.tsx
git commit -m "feat(discovery): add mobile swipe gestures with save/dismiss and haptic feedback"
```

---

## Task 5: Health Check

- [ ] **Step 1: Run TypeScript check**

Run: `npx tsc --noEmit --skipLibCheck`
Expected: Exit 0. No type errors from new files.

- [ ] **Step 2: Run all Layer 2 tests**

Run: `npx vitest run tests/unit/discovery-motion-contract.test.ts tests/unit/swipe-gesture.test.ts`
Expected: All tests PASS.

- [ ] **Step 3: Run build**

Run: `npx next build --no-lint`
Expected: Build succeeds.

- [ ] **Step 4: Commit any fixes**

If any health check failed, fix the issue and commit:

```bash
git add -A
git commit -m "fix(discovery): resolve Layer 2 health check issues"
```

---

## Summary

After completing all 5 tasks, you will have:

1. **Motion contract hook** -- `useDiscoveryMotion` wrapping `resolveDiscoveryRailMotionContract()` with RAF-based momentum scroll, dice (staggered), and lever (cascade) modes
2. **Micro-interaction keyframes** -- Card select pulse (lane-colored), feedback button spring-in/bounce, love confetti burst, filter token slide-in/shrink-out, pause/play morph, row dot pulse
3. **Entrance choreography** -- Container backdrop-blur grow, card cascade with 40ms stagger, first-card spotlight glow, lane label typewriter cursor, mobile simplified instant appear
4. **Swipe gestures** -- Gesture recognizer with direction/velocity/threshold detection, swipe-to-save (up), swipe-to-dismiss (down), card tilt during swipe (max 3 degrees), haptic feedback via `navigator.vibrate(10)`
5. **Reduced motion** -- All animations disabled via `prefers-reduced-motion` media query, passive motion mode forced

The motion contract system is now wired from `control-rail-contracts.ts` into the UI. The four motion modes (passive, flick, dice, lever) are available. Mobile gets snap-scroll with vertical swipe gestures. All animations respect `prefers-reduced-motion`.
