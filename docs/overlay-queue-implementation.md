# Overlay Queue Implementation

**Date:** 2026-03-25
**Branch:** feature/frontend-redesign-v2

## Problem

The app had 7 independent auto-appearing overlays, each managing its own timer and visibility state with zero awareness of each other. This caused stacking, competing z-indexes, and an overall experience that felt like the app was talking over the user.

## What Changed

### Removed (3 components deleted)

| Component              | Why removed                                                                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CelebrationModal`     | Patronizing. The user just completed the action; they don't need a modal telling them what they just did. Zero imports in the codebase (dead code).                 |
| `TourTooltip`          | Duplicate of TourSpotlight guidance. Zero imports in the codebase (dead code).                                                                                      |
| `PushPermissionPrompt` | Custom banner that preceded the browser's native permission prompt, creating a double-prompt. Replaced with contextual inline banner inside the notification panel. |

### Added

**Overlay Queue** (`lib/overlay/overlay-queue.tsx`)

Central coordination system ensuring only one overlay renders at a time. Components register with the queue and declare when they're "ready" to show. The queue picks the highest-priority ready overlay (lowest number wins).

Priority assignments:

| Overlay          | Priority | Notes                                         |
| ---------------- | -------- | --------------------------------------------- |
| `welcome`        | 0        | First-login welcome screen, blocks everything |
| `tour-spotlight` | 1        | Active guided tour step                       |
| `tour-checklist` | 2        | Floating progress checklist                   |
| `feedback-nudge` | 10       | Idle-triggered corner card                    |

Sonner toasts and inline UI (notification panel, banners) do NOT participate in the queue.

**How to add a new overlay:**

```tsx
import { useOverlaySlot } from '@/lib/overlay/overlay-queue'

function MyOverlay() {
  const ready = /* your condition */
  const { visible } = useOverlaySlot('my-overlay', 5, ready)

  if (!visible) return null
  return <div>...</div>
}
```

The component must be rendered inside an `<OverlayQueueProvider>`. The provider currently wraps the tour shell in `components/onboarding/tour-shell.tsx`.

### Changed

**FeedbackNudge**: Rewritten from full-screen modal to slide-in corner card (`components/feedback/feedback-nudge-card.tsx`).

- No longer uses a full-screen `bg-black/40` backdrop
- Uses `requestIdleCallback` (with `setTimeout` fallback for Safari) instead of a flat 5s timer
- Waits for at least one user interaction (click/keydown) before starting the idle timer
- 15-second minimum floor before appearing
- Participates in overlay queue at priority 10
- Slides in from bottom-right, dismissible with X or "Skip"

**Push notification prompt**: Moved from standalone `PushPermissionPrompt` component to inline banner inside `NotificationPanel` (`components/notifications/notification-panel.tsx`).

- Shows at the top of the notification dropdown when push state is `'default'`
- Contextual: appears where the user already manages notifications
- Dismissible with "Not now" (persisted to localStorage key `chefflow:push-panel-dismissed`)
- One prompt instead of two (no custom banner before the browser's native prompt)

## Files Changed

| File                                                  | Change                                                                               |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `lib/overlay/overlay-queue.tsx`                       | **New** - Queue context + `useOverlaySlot` hook                                      |
| `components/onboarding/tour-shell.tsx`                | Wrapped in `OverlayQueueProvider`                                                    |
| `components/onboarding/welcome-modal.tsx`             | Added `useOverlaySlot('welcome', 0, ...)`                                            |
| `components/onboarding/tour-spotlight.tsx`            | Added `useOverlaySlot('tour-spotlight', 1, ...)`                                     |
| `components/onboarding/tour-checklist.tsx`            | Added `useOverlaySlot('tour-checklist', 2, ...)`                                     |
| `components/feedback/feedback-nudge-card.tsx`         | **New** - Replaces `feedback-nudge-modal.tsx`                                        |
| `components/feedback/feedback-nudge-modal.tsx`        | **Deleted**                                                                          |
| `components/notifications/notification-panel.tsx`     | Added `PushSubscribeBanner` inline component                                         |
| `components/notifications/push-permission-prompt.tsx` | **Deleted**                                                                          |
| `components/onboarding/celebration-modal.tsx`         | **Deleted**                                                                          |
| `components/onboarding/tour-tooltip.tsx`              | **Deleted**                                                                          |
| `app/(chef)/layout.tsx`                               | Removed `PushPermissionPrompt`, swapped `FeedbackNudgeModal` for `FeedbackNudgeCard` |

## Before / After

**Before:** 7 auto-appearing overlays, no coordination, full-screen modals for low-stakes asks, 5s timers regardless of user state.

**After:** 4 queued overlays (never stack), contextual push prompt inside notification panel, idle-detected feedback card in corner, 3 dead components removed.
