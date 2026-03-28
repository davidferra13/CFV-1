# Mobile UX Bugfixes - Follow-Up Document

**Date:** 2026-03-28
**Spec:** `docs/specs/mobile-ux-bugfixes.md`

---

## What Changed

6 mobile bugs fixed across onboarding components and mobile navigation. All changes are CSS/layout and client-side JS only. No database changes, no server action changes, no new dependencies.

### Files Modified

| File                                                  | Lines Changed | Summary                                                                           |
| ----------------------------------------------------- | ------------- | --------------------------------------------------------------------------------- |
| `components/onboarding/tour-spotlight.tsx`            | ~30           | Dynamic tooltip width, scroll-aware viewport clamping, mobile placement fallbacks |
| `components/dashboard/onboarding-reminder-banner.tsx` | ~25           | Stacked layout with absolute-positioned dismiss                                   |
| `components/onboarding/onboarding-banner.tsx`         | ~5            | Responsive flex direction (col on mobile, row on sm+)                             |
| `components/onboarding/welcome-modal.tsx`             | ~6            | Reduced padding and title size on mobile                                          |
| `components/navigation/chef-mobile-nav.tsx`           | ~30           | Moved 4 icons from header to slide-out menu                                       |
| `components/onboarding/onboarding-wizard.tsx`         | ~35           | Added horizontal step circles for mobile progress                                 |

### Files Created

| File                               | Summary                                            |
| ---------------------------------- | -------------------------------------------------- |
| `docs/specs/mobile-ux-bugfixes.md` | Full spec documenting all 6 bugs with before/after |

---

## How It Connects

- **Tour spotlight** is rendered by `components/onboarding/tour-provider.tsx` which is mounted in the chef layout. The tooltip positioning logic is self-contained; no other components reference the hardcoded width.
- **Onboarding banner** and **reminder banner** are rendered on the dashboard page. Layout changes are isolated to their own components.
- **Welcome modal** is mounted via `chef-tour-wrapper.tsx` in the layout. Padding changes are internal only.
- **Mobile nav** changes affect the header and slide-out menu. The icons were moved, not removed. All functionality is preserved; just relocated for better touch ergonomics.
- **Wizard step indicator** references `WIZARD_STEPS` and `progress` state already available in the component. No new data fetching.

---

## Risk Assessment

**Low risk.** All changes are presentational (CSS classes, layout structure, JS viewport calculations). No server actions modified, no data flow changes, no auth changes. The mobile nav icon relocation is the highest-risk change since it affects navigation UX, but all icons remain accessible in the slide-out menu.

---

## Remaining Mobile Work (Future Specs)

1. **General mobile performance** - investigate lag/jank sources (bundle size, hydration, re-renders)
2. **Mobile form field audit** - ensure all form inputs across key pages have proper sizing, spacing, and `inputMode` attributes
3. **Touch target audit** - ensure all interactive elements meet 44px minimum
4. **Bottom sheet pattern** - consider replacing modals with bottom sheets on mobile for more natural interaction
5. **Responsive table audit** - data tables on events, recipes, expenses pages may need horizontal scroll or card layout on mobile
