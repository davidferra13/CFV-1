# Product Tour & Onboarding System

Built March 2026. Provides role-based welcome modals, guided product tours with spotlight effects, persistent onboarding checklists, contextual tooltips, and empty state guides across all three portals (chef, client, staff).

## Architecture

```
Database (product_tour_progress)
  |
  v
Server Actions (lib/onboarding/tour-actions.ts)
  |
  v
Tour Config (lib/onboarding/tour-config.ts)  -- step definitions per role
  |
  v
TourProvider (components/onboarding/tour-provider.tsx)  -- React context
  |
  +-- WelcomeModal      -- first-login role-specific welcome
  +-- TourChecklist      -- floating persistent checklist (bottom-right)
  +-- TourSpotlight      -- step-by-step guided tour with element highlighting
  +-- TourTooltip        -- contextual tooltips on individual elements
  +-- EmptyStateGuide    -- replaces blank pages with guidance + CTA
  +-- ReplayTourButton   -- settings page button to restart the tour
```

## Database

**Table:** `product_tour_progress` (migration `20260330000066`)

| Column                 | Type        | Purpose                               |
| ---------------------- | ----------- | ------------------------------------- |
| auth_user_id           | UUID        | FK to auth.users, UNIQUE              |
| role                   | TEXT        | chef, client, or staff                |
| completed_steps        | TEXT[]      | Array of step IDs                     |
| welcome_seen_at        | TIMESTAMPTZ | When welcome modal was dismissed      |
| checklist_dismissed_at | TIMESTAMPTZ | When checklist was permanently hidden |
| tour_dismissed_at      | TIMESTAMPTZ | When guided tour was skipped          |

RLS: Users can only read/write their own row.

## Files Created

| File                                                           | Purpose                                                                |
| -------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `supabase/migrations/20260330000066_product_tour_progress.sql` | Database migration                                                     |
| `lib/onboarding/tour-config.ts`                                | Step definitions for chef (7 steps), client (5 steps), staff (4 steps) |
| `lib/onboarding/tour-actions.ts`                               | Server actions: get/complete/dismiss/reset progress                    |
| `components/onboarding/tour-provider.tsx`                      | React context provider with auto-complete on route visits              |
| `components/onboarding/tour-shell.tsx`                         | Assembles provider + all tour UI components                            |
| `components/onboarding/welcome-modal.tsx`                      | Role-specific first-login welcome screen                               |
| `components/onboarding/tour-checklist.tsx`                     | Floating persistent checklist with progress bar                        |
| `components/onboarding/tour-spotlight.tsx`                     | Step-by-step guided tour with SVG spotlight cutout                     |
| `components/onboarding/tour-tooltip.tsx`                       | Contextual tooltips for individual elements                            |
| `components/onboarding/empty-state-guide.tsx`                  | Reusable empty state with icon, description, CTA                       |
| `components/onboarding/replay-tour-button.tsx`                 | Settings button to reset and replay the tour                           |
| `components/onboarding/chef-tour-wrapper.tsx`                  | Server component wrapper for chef layout                               |
| `components/onboarding/client-tour-wrapper.tsx`                | Server component wrapper for client layout                             |
| `components/onboarding/staff-tour-wrapper.tsx`                 | Server component wrapper for staff layout                              |

## Files Modified

| File                                    | Change                                               |
| --------------------------------------- | ---------------------------------------------------- |
| `app/(chef)/layout.tsx`                 | Added ChefTourWrapper around children                |
| `app/(client)/layout.tsx`               | Added ClientTourWrapper around children              |
| `app/(staff)/layout.tsx`                | Added StaffTourWrapper around children               |
| `app/(chef)/events/page.tsx`            | Added `data-tour="create-event"` to New Event button |
| `app/(chef)/clients/page.tsx`           | Added `data-tour="add-client"` to Add Client button  |
| `app/(chef)/recipes/recipes-client.tsx` | Added `data-tour="add-recipe"` to New Recipe button  |
| `app/(chef)/settings/page.tsx`          | Added ReplayTourButton in Sample Data section        |

## How It Works

### Flow for a New User

1. **First login** - TourProvider detects no `welcome_seen_at`, shows WelcomeModal
2. **User clicks "Take the Tour"** - Welcome dismissed, guided tour starts at first incomplete step
3. **OR clicks "Skip"** - Welcome dismissed, floating checklist appears (bottom-right corner)
4. **Guided tour** - Spotlight highlights target elements, tooltip shows step info, next/prev/skip controls
5. **Auto-complete** - Route-based steps auto-complete when user visits the relevant page
6. **Manual complete** - Clicking a checklist item navigates to the route and marks it complete
7. **All complete** - Checklist and tour UI disappear permanently
8. **Replay** - Settings > Sample Data & Tour > Replay Tour resets all progress

### Auto-Complete (Zero Friction)

Steps with `autoComplete: true` and `completionCheck.type: 'route_visited'` are automatically marked complete when the user navigates to the matching route. This means:

- Chef visits `/dashboard` - "Your Dashboard" step auto-completes
- Client visits `/my-events` - "Your Events" step auto-completes
- Staff visits `/staff-schedule` - "Your Schedule" step auto-completes

No extra clicks needed. Just using the app completes the onboarding.

### Adding Tour Steps to New Features

1. Add a `TourStep` entry to the relevant role config in `lib/onboarding/tour-config.ts`
2. If the step targets a specific element, add `data-tour="step-name"` to the element
3. Set `target: '[data-tour="step-name"]'` in the step config
4. For auto-complete on route visit, set `autoComplete: true` + `completionCheck`

### Using EmptyStateGuide on Pages

```tsx
import { EmptyStateGuide } from '@/components/onboarding/empty-state-guide'
import { CalendarDays } from '@/components/ui/icons'

// When no events exist
if (events.length === 0) {
  return (
    <EmptyStateGuide
      icon={CalendarDays}
      title="No events yet"
      description="Create your first event to start managing bookings, menus, and payments."
      ctaLabel="Create Event"
      ctaHref="/events/new"
    />
  )
}
```

### Using TourTooltip on Elements

```tsx
import { TourTooltip } from '@/components/onboarding/tour-tooltip'

;<TourTooltip
  stepId="chef.create_event"
  title="Create Your First Event"
  description="Events are the core of ChefFlow."
  placement="bottom"
>
  <Button>+ New Event</Button>
</TourTooltip>
```

## Onboarding Steps by Role

### Chef (7 steps)

1. Dashboard - auto-complete on visit
2. Create first event - manual
3. Add a client - manual
4. Send a quote - manual
5. Add a recipe - manual
6. Set up payments - manual
7. Explore calendar - auto-complete on visit

### Client (5 steps)

1. Your events - auto-complete on visit
2. Review a quote - auto-complete on visit
3. Make a payment - manual
4. Loyalty rewards - auto-complete on visit
5. Update profile - auto-complete on visit

### Staff (4 steps)

1. Dashboard - auto-complete on visit
2. View schedule - auto-complete on visit
3. Check tasks - auto-complete on visit
4. Browse recipes - auto-complete on visit

## Design Decisions

- **No external library** - Built from scratch with React context + CSS. Zero bundle impact from onboarding libraries. The spotlight uses an SVG mask for the cutout effect.
- **Server-side progress** - Stored in Supabase, not localStorage. Progress persists across devices and browsers.
- **Optimistic updates** - UI updates instantly, server sync happens in background via `startTransition`. Failures are non-blocking (logged, not thrown).
- **Fail-open** - If tour progress fetch fails, the system shows the welcome modal (better to re-show than to hide onboarding from a new user).
- **Non-intrusive** - Checklist is collapsible and dismissible. Tour can be skipped at any step. Welcome modal has a clear "skip" option.
- **Role-based from the start** - Each role has its own config, steps, welcome copy, and activation milestones.

## Research Reference

See `docs/onboarding-research.md` for the full research that informed this system, including best-in-class examples, metric targets, mobile patterns, and library comparisons.
