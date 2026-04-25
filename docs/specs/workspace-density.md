# Workspace Density: Adaptive Workspace Configuration

**Status:** Ready to build
**Priority:** P0 (user acquisition blocker)
**Risk level:** LOW (additive migration, no existing behavior changes for current users)

---

## Problem

ChefFlow's first-login experience presents full complexity regardless of who the user is. A chef who manages 6 bookings via phone and notes sees the same 15-widget dashboard, 15-item create dropdown, and 8-step onboarding wizard as a tech-savvy caterer running a 20-person operation.

Anti-tech users (estimated 40% of working chefs) abandon the app within 90 seconds because the interface signals "learning curve" before delivering any value.

## Solution

Add `workspace_density` as a first-class user attribute, resolved at signup via a single question, that controls surface complexity across the entire app. Three density levels: `minimal`, `standard`, `power`.

Current users default to `standard` (no behavior change). New users pick their density on first login. The system grows with the chef through behavioral graduation.

---

## Architecture

### New column

Add `workspace_density` to `chef_preferences` table:

```sql
ALTER TABLE chef_preferences
ADD COLUMN workspace_density TEXT NOT NULL DEFAULT 'standard';

ALTER TABLE chef_preferences
ADD CONSTRAINT chef_preferences_workspace_density_check
CHECK (workspace_density IN ('minimal', 'standard', 'power'));
```

### Data flow

```
signup -> intent question -> workspace_density saved to chef_preferences
                                    |
                                    v
                        resolveChefShellBudget() reads it
                        dashboard reads it
                        progressive disclosure reads it
                        create dropdown reads it
```

### What each density controls

| Surface                       | minimal                                              | standard                                  | power                                 |
| ----------------------------- | ---------------------------------------------------- | ----------------------------------------- | ------------------------------------- |
| Dashboard sections            | 3 (schedule, quick notes, getting started OR events) | Current behavior (progressive disclosure) | Current + secondary insights expanded |
| Shell: Remy chat              | OFF                                                  | ON                                        | ON                                    |
| Shell: feedback nudge         | OFF                                                  | ON                                        | ON                                    |
| Shell: market research banner | OFF                                                  | ON                                        | ON                                    |
| Shell: quick capture FAB      | ON                                                   | ON                                        | ON                                    |
| Shell: live alerts            | OFF                                                  | ON                                        | ON                                    |
| Create dropdown items         | 4 (Event, Client, Menu, Expense)                     | Current 15                                | Current 15                            |
| Nav starter groups            | 3 (events, clients, culinary)                        | 4 (current STARTER_NAV_GROUPS)            | All enabled modules                   |
| Onboarding                    | SKIP wizard entirely                                 | Current progressive onboarding            | Full 8-step wizard                    |
| Form fields                   | Required-only + "More details" expander              | Current                                   | All visible                           |

---

## Build Units (4 isolated tasks)

### Unit 1: Migration + Data Layer

**What:** Add `workspace_density` column to `chef_preferences`. Create getter/setter server actions.

**Files to create:**

- `database/migrations/20260425000020_workspace_density.sql`

**Files to modify:**

- `lib/chef/preferences-actions.ts` (add getter + setter)

**Migration SQL (exact):**

```sql
-- Add workspace density column for adaptive UI complexity
ALTER TABLE chef_preferences
ADD COLUMN workspace_density TEXT NOT NULL DEFAULT 'standard';

ALTER TABLE chef_preferences
ADD CONSTRAINT chef_preferences_workspace_density_check
CHECK (workspace_density IN ('minimal', 'standard', 'power'));

COMMENT ON COLUMN chef_preferences.workspace_density IS
  'Controls UI complexity: minimal (anti-tech users), standard (default), power (show everything)';
```

**Server action additions in `lib/chef/preferences-actions.ts`:**

Add these two exported functions:

```typescript
export async function getWorkspaceDensity(): Promise<'minimal' | 'standard' | 'power'> {
  const user = await requireChef()
  const db: any = createServerClient()
  const { data } = await db
    .from('chef_preferences')
    .select('workspace_density')
    .eq('chef_id', user.entityId)
    .single()
  return (data?.workspace_density as 'minimal' | 'standard' | 'power') ?? 'standard'
}

export async function setWorkspaceDensity(
  density: 'minimal' | 'standard' | 'power'
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const valid = ['minimal', 'standard', 'power']
  if (!valid.includes(density)) {
    return { success: false, error: 'Invalid density value' }
  }
  const { error } = await db
    .from('chef_preferences')
    .update({ workspace_density: density, updated_at: new Date().toISOString() })
    .eq('chef_id', user.entityId)
  if (error) {
    console.error('[setWorkspaceDensity] failed:', error)
    return { success: false, error: 'Failed to update workspace density' }
  }
  revalidatePath('/dashboard')
  revalidatePath('/settings')
  return { success: true }
}
```

**DO NOT:**

- Touch any other table
- Modify schema.ts (it is auto-generated)
- Drop or rename anything
- Run `drizzle-kit push`

**Verify:** Run the migration SQL manually or confirm the file is syntactically valid SQL.

---

### Unit 2: Intent Question Page

**What:** New route `/welcome` shown on first login when `workspace_density` has never been explicitly set. Full-screen, one question, three choices. Sets density and redirects to dashboard.

**Files to create:**

- `app/(chef)/welcome/page.tsx` (server component)
- `app/(chef)/welcome/intent-picker.tsx` (client component)

**Files to modify:**

- `app/(chef)/layout.tsx` (add redirect logic)

**Page design (`app/(chef)/welcome/page.tsx`):**

```typescript
import { requireChef } from '@/lib/auth/get-user'
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/db/server'
import { IntentPicker } from './intent-picker'

export const metadata = { title: 'Welcome' }

export default async function WelcomePage() {
  const user = await requireChef()
  // If density was already explicitly set, skip
  const db: any = createServerClient()
  const { data } = await db
    .from('chef_preferences')
    .select('workspace_density')
    .eq('chef_id', user.entityId)
    .single()

  // We rely on the layout redirect to send new users here.
  // If they somehow land here after choosing, send them home.
  if (data?.workspace_density && data.workspace_density !== 'standard') {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-xl w-full text-center space-y-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-display text-stone-100 tracking-tight">
            How do you run your business?
          </h1>
          <p className="text-stone-400 mt-3 text-lg">
            This sets up your workspace. You can always change it later in Settings.
          </p>
        </div>
        <IntentPicker />
      </div>
    </div>
  )
}
```

**Client component (`app/(chef)/welcome/intent-picker.tsx`):**

```typescript
'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { setWorkspaceDensity } from '@/lib/chef/preferences-actions'

const OPTIONS = [
  {
    density: 'minimal' as const,
    title: 'Keep it simple',
    description: 'Phone, notes, calculator. I just need the basics.',
    icon: '📱',
  },
  {
    density: 'standard' as const,
    title: 'Getting organized',
    description: 'Some spreadsheets, some apps. Ready to level up.',
    icon: '📋',
  },
  {
    density: 'power' as const,
    title: 'Give me everything',
    description: 'I already use business software. Show me all the tools.',
    icon: '🚀',
  },
]

export function IntentPicker() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handlePick(density: 'minimal' | 'standard' | 'power') {
    startTransition(async () => {
      try {
        const result = await setWorkspaceDensity(density)
        if (result.success) {
          router.push('/dashboard')
        }
      } catch {
        // If it fails, still go to dashboard (non-blocking)
        router.push('/dashboard')
      }
    })
  }

  return (
    <div className="grid gap-4">
      {OPTIONS.map((option) => (
        <button
          key={option.density}
          onClick={() => handlePick(option.density)}
          disabled={isPending}
          className="w-full text-left rounded-2xl border border-stone-700 bg-stone-900/60 px-6 py-5 hover:border-stone-500 hover:bg-stone-800/80 transition-all disabled:opacity-50 group"
        >
          <div className="flex items-start gap-4">
            <span className="text-2xl mt-0.5">{option.icon}</span>
            <div>
              <div className="text-lg font-medium text-stone-100 group-hover:text-white">
                {option.title}
              </div>
              <div className="text-sm text-stone-400 mt-1">{option.description}</div>
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}
```

**Layout redirect logic (add to `app/(chef)/layout.tsx`):**

Inside the `ChefLayout` function, AFTER the existing `requireChef()` call and BEFORE the return JSX, add:

```typescript
// Workspace density intent question - redirect brand-new chefs to /welcome
// IMPORTANT: Only redirect to /welcome, never block navigation (rule 7 in CLAUDE.md)
if (pathname !== '/welcome' && pathname !== '/api/e2e/auth') {
  const { data: prefData } = await db
    .from('chef_preferences')
    .select('workspace_density, archetype')
    .eq('chef_id', user.entityId)
    .single()

  // Only redirect if: no preferences row exists OR density is still default AND no archetype set
  // This means existing users (who have an archetype from onboarding) are never redirected
  const isFirstTimeEver =
    !prefData || (!prefData.archetype && prefData.workspace_density === 'standard')
  if (isFirstTimeEver) {
    redirect('/welcome')
  }
}
```

**CRITICAL RULES:**

- The `/welcome` page shell budget must hide sidebar and mobile nav (add to `resolveChefShellBudget` like the immersive editor pattern)
- The redirect MUST NOT affect existing users. The `!prefData.archetype` check ensures anyone who already went through onboarding is excluded.
- This is NOT a forced onboarding gate (rule 7). It is a ONE-TIME redirect for brand-new users only. The welcome page has no "required" fields; picking any option immediately proceeds.
- If the layout already has a `db` / `createServerClient()` call, reuse it. Do NOT add a second database client.

**DO NOT:**

- Add any steps or fields beyond the three choices shown above
- Add skip/dismiss buttons (every option is valid, just pick one)
- Modify the existing onboarding wizard or onboarding banner
- Add loading spinners or complex transitions
- Use Remy or AI on this page

**Verify:** Sign out, create a new test account, confirm you land on `/welcome` with three options. Pick one. Confirm you reach dashboard. Refresh. Confirm you do NOT see `/welcome` again.

---

### Unit 3: Density-Aware Dashboard

**What:** The dashboard (`app/(chef)/dashboard/page.tsx`) reads `workspace_density` and renders fewer sections for `minimal` users.

**Files to modify:**

- `app/(chef)/dashboard/page.tsx`

**Approach:** In the `ChefDashboard` function (line ~1484), fetch workspace density alongside the existing parallel data fetches. Then use it to conditionally render sections.

**Step 1:** Add import at top of file:

```typescript
import { getWorkspaceDensity } from '@/lib/chef/preferences-actions'
```

**Step 2:** Add to the `Promise.all` block at line ~1493:

```typescript
const [
  archetype,
  onboardingProgress,
  remyAlerts,
  profileGated,
  presence,
  supportStatus,
  userIsPrivileged,
  workspaceDensity, // ADD THIS
] = await Promise.all([
  safe('archetype', () => getCachedChefArchetype(user.entityId), null),
  safe('onboardingProgress', () => getOnboardingProgress(), null),
  safe('remyAlerts', () => getActiveAlerts(10), []),
  // ... existing calls ...
  safe('workspaceDensity', getWorkspaceDensity, 'standard' as const), // ADD THIS
])
```

**Step 3:** Add a boolean for minimal checks:

```typescript
const isMinimalDensity = workspaceDensity === 'minimal'
```

**Step 4:** Wrap sections in density checks. For `minimal` density, HIDE these sections by wrapping them in `{!isMinimalDensity && (...)}`:

- `PulseSummary` (line ~1603)
- `DecisionQueueSection` (line ~1609)
- `ResolveNextCard` (line ~1615)
- `LifecycleActionLayerSection` (line ~1625)
- `RelationshipActionLayerSection` (line ~1631)
- `OnboardingBanner` (line ~1638)
- `OnboardingChecklistWidget` (line ~1656)
- `RemyAlertsWidget` (line ~1662)
- `RestaurantMetricsSection` (line ~1673)
- `CompletionSummaryWidgetServer` (line ~1699)
- `NetworkActivitySection` (line ~1708)
- `DinnerCirclesSection` (line ~1717)
- The focus grid with PriorityQueue + PostEventActions + Touchpoints (lines ~1728-1751)
- `SmartSuggestions` + `MetricsStrip` section (lines ~1756-1770)
- `DashboardSecondaryInsights` (line ~1785) - already gated by `simplifyForNewChef`, add `&& !isMinimalDensity`

**KEEP visible for `minimal` density:**

- Greeting header + action buttons (lines ~1549-1601)
- "Today & This Week" ScheduleCards section (lines ~1684-1693)
- `QuickNotesSection` (lines ~1775-1779)
- `GettingStartedSection` (line ~1659) - keep existing `simplifyForNewChef` gate

**Result:** A `minimal` density chef sees: greeting, today's schedule, and quick notes. Three sections. Clean.

**DO NOT:**

- Restructure the dashboard layout or component hierarchy
- Move, rename, or delete any existing components
- Change any data fetching logic
- Modify any component files (only the dashboard page.tsx)
- Remove any Suspense boundaries or error boundaries
- Change behavior for `standard` or `power` density (they stay exactly as-is)

**Verify:** Set a test user's `workspace_density` to `'minimal'` in the database. Load dashboard. Confirm only greeting + schedule + quick notes appear. Set back to `'standard'`. Confirm full dashboard returns.

---

### Unit 4: Density-Aware Shell Budget

**What:** `resolveChefShellBudget()` in `lib/interface/surface-governance.ts` reads workspace density to control chrome visibility.

**Files to modify:**

- `lib/interface/surface-governance.ts`
- `app/(chef)/layout.tsx` (pass density to shell budget)

**Problem:** `resolveChefShellBudget()` currently takes only `pathname`. It needs to also know density. But density requires a DB call, which is async, and this function is sync.

**Solution:** Add a new function `resolveChefShellBudgetWithDensity(pathname, density)` that extends the base function. The layout already does a DB call; it passes density into the new function.

**In `lib/interface/surface-governance.ts`, add after the existing `resolveChefShellBudget` function:**

```typescript
export type WorkspaceDensity = 'minimal' | 'standard' | 'power'

export function resolveChefShellBudgetWithDensity(
  pathname: string,
  density: WorkspaceDensity
): ChefShellBudget {
  const base = resolveChefShellBudget(pathname)

  if (density === 'minimal') {
    return {
      ...base,
      showMarketResearchBanner: false,
      showFeedbackNudge: false,
      showRemy: false,
      showLiveAlerts: false,
    }
  }

  // For /welcome page, hide all chrome
  if (pathname === '/welcome') {
    return {
      ...base,
      showDesktopSidebar: false,
      showMobileNav: false,
      showBreadcrumbBar: false,
      showQuickExpenseTrigger: false,
      showRemy: false,
      showQuickCapture: false,
      showLiveAlerts: false,
      showMarketResearchBanner: false,
      showFeedbackNudge: false,
      contentWidth: 'full',
    }
  }

  return base
}
```

**In `app/(chef)/layout.tsx`:**

1. Change the import from `resolveChefShellBudget` to also include `resolveChefShellBudgetWithDensity`:

```typescript
import {
  resolveChefShellBudget,
  resolveChefShellBudgetWithDensity,
  type WorkspaceDensity,
} from '@/lib/interface/surface-governance'
```

2. After the preferences query added in Unit 2, use the density-aware version:

```typescript
const density = (prefData?.workspace_density as WorkspaceDensity) ?? 'standard'
const shellBudget = resolveChefShellBudgetWithDensity(pathname, density)
```

Replace the existing `const shellBudget = resolveChefShellBudget(pathname)` line with this.

**DO NOT:**

- Modify the existing `resolveChefShellBudget` function (other code may call it directly)
- Remove any existing shell budget properties
- Change behavior for `standard` or `power` density
- Add async logic to the governance file

**Verify:** Set test user density to `'minimal'`. Navigate the app. Confirm: no Remy chat widget, no feedback nudge, no live alerts, no market research banner. Sidebar and mobile nav still visible. Set to `'standard'`. Confirm Remy and all chrome returns.

---

## Out of Scope (Phase 2, not this build)

- Density-aware create dropdown (filter to 4 items for minimal)
- Density-aware forms (hide optional fields behind "More details")
- Density-aware nav groups (reduce starter groups for minimal)
- Behavioral graduation ("You're managing 10+ events. Want more tools?")
- Settings UI to change density after initial selection

These are all valuable but each is isolated and can ship independently after the core 4 units land.

---

## Testing Checklist

- [ ] New user with no chef_preferences row is redirected to /welcome
- [ ] Existing user with archetype set is NOT redirected to /welcome
- [ ] Picking "Keep it simple" sets workspace_density = 'minimal' and redirects to dashboard
- [ ] Picking "Getting organized" sets workspace_density = 'standard'
- [ ] Picking "Give me everything" sets workspace_density = 'power'
- [ ] minimal dashboard shows only: greeting, schedule, quick notes
- [ ] standard dashboard shows current full dashboard (no regression)
- [ ] minimal shell hides Remy, feedback nudge, live alerts, market research
- [ ] /welcome page has no sidebar or mobile nav
- [ ] Refreshing after picking density does NOT show /welcome again
- [ ] TypeScript compiles with no errors (`npx tsc --noEmit --skipLibCheck`)
