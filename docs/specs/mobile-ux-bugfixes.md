# Spec: Mobile UX Bugfixes (Onboarding + Navigation)

> **Status:** verified
> **Priority:** P1 (next up)
> **Depends on:** none
> **Estimated complexity:** medium (6 files)
> **Created:** 2026-03-28
> **Built by:** planner agent session

---

## What This Does (Plain English)

Fixes 6 mobile bugs that make the app feel broken on phones: the onboarding tour tooltip overflows small screens, banners don't stack properly, the welcome modal wastes space with oversized padding, the mobile header crams 8 icons into a tiny bar, and the setup wizard shows zero progress context on mobile. After these fixes, onboarding flows and daily navigation work correctly on phones 320px and wider.

---

## Why It Matters

The developer identified mobile as "buggy and laggy" with onboarding being the worst offender. New users hitting the onboarding flow on a phone see broken tooltips, cramped layouts, and no sense of where they are in the process. This kills first impressions and makes the app feel unfinished.

---

## Files to Create

| File                                  | Purpose                                                             |
| ------------------------------------- | ------------------------------------------------------------------- |
| `docs/mobile-ux-bugfixes-followup.md` | Follow-up document explaining all changes and remaining mobile work |

---

## Files to Modify

| File                                                  | What Changed                                                                                                                                                    |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/onboarding/tour-spotlight.tsx`            | Dynamic tooltip width (capped to viewport), left/right placement falls back to bottom on narrow screens, vertical viewport clamping                             |
| `components/dashboard/onboarding-reminder-banner.tsx` | Stacked layout: dismiss button top-right, text full-width, CTA below                                                                                            |
| `components/onboarding/onboarding-banner.tsx`         | `flex-col` on mobile, `sm:flex-row` on wider. Added `min-w-0` to prevent text overflow                                                                          |
| `components/onboarding/welcome-modal.tsx`             | Reduced padding on mobile (`px-5 py-8` vs `px-8 py-10`), smaller title text                                                                                     |
| `components/navigation/chef-mobile-nav.tsx`           | Header: removed OllamaStatus, ActivityDot, ThemeToggle, Remy from top bar. Increased gap to `gap-1`. Moved relocated icons into slide-out menu header           |
| `components/onboarding/onboarding-wizard.tsx`         | Mobile step indicator: horizontal numbered circles showing done/skipped/current state, tappable to jump between steps. Reduced content padding on small screens |

---

## Database Changes

None.

---

## Bug-by-Bug Detail

### Bug 1: Tour Spotlight Tooltip (CRITICAL)

**Before:** Tooltip hardcoded to 320px. On phones < 340px, it overflows. Left/right placement pushes off-screen on narrow devices. No vertical bottom clamp (tooltip disappears below fold on short screens). Estimated tooltip height was wrong (160px, actual ~180px).

**After:**

- `tooltipWidth = Math.min(320, window.innerWidth - 24)` adapts to screen
- Left/right placement falls back to bottom on screens < 480px
- Vertical clamp is scroll-aware: `Math.max(scrollTop + edgePad, Math.min(top, scrollTop + viewport.h - estimatedTooltipHeight - edgePad))`
- Edge padding reduced from 16px to 12px for more usable space

### Bug 2: Onboarding Reminder Banner

**Before:** Three elements in a single flex row (text + button + dismiss). On phones < 360px, text gets crushed between the button and dismiss icon, wrapping awkwardly.

**After:** Dismiss button absolutely positioned top-right. Text gets full width with `pr-6` clearance. CTA button sits below as `inline-block`. Clean stack at any width.

### Bug 3: Onboarding Banner

**Before:** `flex items-center gap-4` forces text and "Continue Setup" button side by side. On narrow screens the text area gets squeezed and the progress bar's `max-w-xs` takes full width awkwardly.

**After:** `flex-col gap-3 sm:flex-row sm:items-center sm:gap-4`. Stacks vertically on mobile, side by side on 640px+. Button uses `self-start` to align left when stacked. Added `min-w-0` on text container to prevent overflow.

### Bug 4: Welcome Modal Padding

**Before:** `px-8 py-10` header, `px-8` content, `px-8 pb-8` actions. On a 320px phone, 64px of horizontal padding leaves only 256px for content, plus the outer `p-4` container adds another 32px.

**After:** `px-5 py-8 sm:px-8 sm:py-10` for header, `px-5 py-5 sm:px-8 sm:py-6` for content, `px-5 pb-6 sm:px-8 sm:pb-8` for actions. Title scales: `text-xl sm:text-2xl`. Saves 24px horizontal space on small screens.

### Bug 5: Mobile Header Icon Clutter

**Before:** 8 interactive elements crammed into the header at `gap-0.5` (2px spacing): OllamaStatus, OfflineIndicator, ActivityDot, GlobalSearch, Remy, ThemeToggle, NotificationBell, Menu. Touch targets overlap on 360px screens.

**After:** Header keeps only 4 items: OfflineIndicator (status-critical), GlobalSearch, NotificationBell, Menu. Increased gap to `gap-1` (4px). OllamaStatus, ActivityDot, ThemeToggle, and Remy button moved to slide-out menu header where they have room to breathe.

### Bug 6: Wizard Mobile Step Indicator

**Before:** Mobile users only see "Step X of 6" in the progress bar and a bare uppercase step title. No overview of which steps are done, skipped, or upcoming. No way to navigate between steps on mobile.

**After:** Horizontal row of 6 numbered circles: orange for current, green checkmark for done, muted for pending/skipped. Each circle is tappable to jump to that step. Step title centered below. Matches the sidebar's information density in a compact mobile form.

---

## Edge Cases and Error Handling

| Scenario                                         | Correct Behavior                                                                                                             |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Screen width < 320px (rare)                      | Tooltip fills available width minus 24px padding. Layout still readable                                                      |
| Tour spotlight target doesn't exist              | Tooltip centers on screen (existing behavior, unchanged)                                                                     |
| Target near bottom of viewport, placement=bottom | Tooltip clamped upward to stay visible. May overlap target (pre-existing limitation; full fix would require auto-flip logic) |
| Scrolled page with tour active                   | Vertical clamp uses `scrollY` offset so tooltip stays within visible viewport, not absolute page top                         |
| All wizard steps complete on mobile              | Completion screen renders correctly (unchanged)                                                                              |
| Offline indicator active + narrow header         | Only 4 items in header, OfflineIndicator is always visible                                                                   |

---

## Verification Steps

1. Sign in with agent account on a 375px viewport (iPhone SE)
2. Navigate to `/onboarding`, verify mobile step circles render and are tappable
3. Complete a step, verify green checkmark appears in the circle
4. If tour is active, verify tooltip fits within viewport at all placements
5. Navigate to `/dashboard`, verify onboarding banner stacks text above button
6. Verify reminder banner (if shown) has dismiss in top-right corner
7. Verify mobile header has only 4 icons (offline, search, bell, menu)
8. Open slide-out menu, verify Remy/Theme/Ollama/Activity icons are in menu header
9. Resize viewport to 320px, verify no horizontal overflow on any onboarding component

---

## Out of Scope

- General mobile performance/lag (separate investigation needed)
- Mobile form field optimization across all pages (future spec)
- Touch target size audit across all components (future spec)
- PWA-specific mobile bugs
- Bottom sheet patterns for modals (would require component library changes)

---

## Notes for Builder Agent

- The `MobileBottomTabBar` is actually positioned at the TOP (below the header), not the bottom. The CSS class `pb-mobile-nav` is 0px. Don't add bottom padding for a non-existent bottom bar.
- The `QuickCapture` FAB at `bottom-6 right-4` is fine since there's no bottom nav bar to overlap.
- All breakpoints use Tailwind defaults: `sm:` = 640px, `lg:` = 1024px. The mobile/desktop split happens at `lg:`.
- **Must update `docs/app-complete-audit.md`** after building: the mobile header section (icons present), the onboarding wizard section (mobile step indicator added), and the slide-out menu section (relocated icons) all changed.
- The linter auto-applied some improvements (e.g., `dismissing` guard on reminder banner, `Promise.all` in wizard skip). These are intentional; do not revert.
