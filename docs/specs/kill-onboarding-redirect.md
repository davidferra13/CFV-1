# Spec: Kill Onboarding Redirect Gate

> **Status:** verified
> **Priority:** P0 (blocking)
> **Depends on:** none
> **Estimated complexity:** small (1-2 files)
> **Created:** 2026-03-29
> **Built by:** Claude Code (2026-03-29)

---

## What This Does (Plain English)

Removes the forced redirect that traps users on the onboarding page. After this change, any authenticated chef can navigate freely to any page in the app, regardless of whether they've completed onboarding. The onboarding page still exists and is still accessible, but it becomes opt-in (a gentle banner/nudge on the dashboard), never a wall.

The archetype selector gate is also removed as a full-page blocker. If a chef hasn't picked an archetype, the app works normally with a sensible default.

---

## Why It Matters

The redirect is blocking the developer from testing any page. It's also blocking new users from exploring the app before committing to a full setup flow. It has been "fixed" multiple times and keeps coming back because the gate lives in the root layout. This spec removes it permanently.

---

## Files to Create

None.

---

## Files to Modify

| File                    | What to Change                                                                                                                        |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(chef)/layout.tsx` | Remove onboarding redirect gate, archetype selector gate, and all now-unused imports/variables. Details in "Notes for Builder Agent." |
| `CLAUDE.md`             | Add permanent rule #7 to Implementation Patterns banning onboarding gates in the chef layout.                                         |

### Files explicitly NOT modified (builder: do not touch these)

| File                                          | Why it stays untouched                                                                                                                                               |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/chef/profile-actions.ts`                 | `getOnboardingStatus()` stays exported. The banner uses its own equivalent (`getOnboardingDismissalState()`), but this function is harmless and may be useful later. |
| `components/onboarding/onboarding-banner.tsx` | The dashboard banner is the gentle, non-blocking nudge that replaces the forced gate. It has its own independent DB check.                                           |
| `app/(chef)/onboarding/page.tsx`              | The onboarding page stays. It's now opt-in, not forced.                                                                                                              |
| `components/onboarding/onboarding-wizard.tsx` | The wizard stays. No changes.                                                                                                                                        |
| `lib/onboarding/onboarding-actions.ts`        | All server actions stay. No changes.                                                                                                                                 |
| `lib/onboarding/progress-actions.ts`          | Progress tracking stays. No changes.                                                                                                                                 |
| `middleware.ts`                               | No onboarding logic exists here. Don't add any.                                                                                                                      |
| Any migration file                            | No schema changes.                                                                                                                                                   |

---

## Database Changes

None.

---

## Data Model

No changes. The `onboarding_completed_at`, `onboarding_banner_dismissed_at`, and `onboarding_reminders_dismissed` columns on the `chefs` table remain. They're still used by the banner component on the dashboard.

---

## Server Actions

No new server actions. No changes to existing ones. `getOnboardingStatus()` stays exported for the banner to use.

---

## UI / Component Spec

### What Changes

**Before:** Navigating to `/dashboard` (or any chef page) checks onboarding status server-side. If incomplete, hard redirect to `/onboarding`. User is trapped.

**After:** Navigating to `/dashboard` (or any chef page) works immediately. No server-side onboarding check in the layout. The dashboard still shows the onboarding banner if setup is incomplete, gently suggesting the user finish setup. User can dismiss it and keep working.

### Archetype Selector

**Before:** Full-page blocker component returned from the layout. Can't see anything until you pick.

**After:** Removed from the layout entirely. If no archetype is set, the app works normally. The archetype can still be set from `/settings` or from the onboarding page voluntarily. Non-admin chefs without an archetype just get default behavior (no archetype-specific customization, which is fine).

### States

- **No onboarding done:** App loads normally. Dashboard shows the onboarding banner suggesting setup. User can click into onboarding or ignore it.
- **Onboarding partially done:** Same as above. Banner shows progress.
- **Onboarding complete:** Banner is hidden. Normal app experience.

---

## Edge Cases and Error Handling

| Scenario                                           | Correct Behavior                                                    |
| -------------------------------------------------- | ------------------------------------------------------------------- |
| Brand new chef, zero setup                         | App loads. Dashboard shows onboarding banner. All pages accessible. |
| Chef has no archetype                              | App loads normally with default behavior. No blocker.               |
| Chef navigates to `/onboarding` voluntarily        | Onboarding wizard/hub loads as before. No changes to that page.     |
| `getOnboardingStatus()` errors on dashboard banner | Banner fails open (hides itself). Already implemented.              |

---

## Verification Steps

1. Sign in with agent account
2. If possible, clear `onboarding_completed_at` and `onboarding_banner_dismissed_at` on the agent's chef row to simulate a new user
3. Navigate to `/dashboard` - verify it loads WITHOUT redirecting to `/onboarding`
4. Navigate to `/events`, `/clients`, `/recipes` - verify all load normally
5. Navigate to `/onboarding` manually - verify it still works
6. Verify the onboarding banner appears on the dashboard (gentle nudge, not a wall)
7. Screenshot results

---

## Out of Scope

- Not removing the onboarding page itself (it stays, just opt-in)
- Not removing the onboarding banner on the dashboard (it stays as a gentle nudge)
- Not changing the onboarding wizard flow or steps
- Not changing how onboarding progress is saved
- Not removing any database columns

---

## Connected Systems (Context for Builder)

This spec touches the chef portal's root layout, which wraps every page a chef sees. Understanding what connects to it prevents accidental damage.

| System                          | Relationship to this spec                                                                                                                                                                                                | Impact                                                                    |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| **Auth (`requireChef()`)**      | Stays. Line 73 of layout. This is the real gate (role-based auth). Not touched.                                                                                                                                          | None                                                                      |
| **Dashboard onboarding banner** | Independent. Uses `getOnboardingDismissalState()` (not `getOnboardingStatus()`). Queries the same DB columns through a different code path.                                                                              | None. Banner keeps working as the gentle nudge.                           |
| **Onboarding wizard + hub**     | Independent. `app/(chef)/onboarding/page.tsx` still renders. Users reach it voluntarily.                                                                                                                                 | None. Page keeps working.                                                 |
| **Archetype system**            | `getDashboardPrimaryAction(archetype)` in `lib/archetypes/ui-copy.ts` already handles `null` archetype gracefully (returns default "New Event" action). No page in the JSX return block reads archetype from the layout. | None. Null archetype = default behavior everywhere.                       |
| **Stripe Connect callback**     | `app/api/stripe/connect/callback/route.ts` redirects to `/onboarding?step=4&stripe_return=true` after Stripe setup. This is a legitimate user-initiated flow, not a gate.                                                | None. Still works.                                                        |
| **Middleware**                  | Sets `x-pathname` header (used by the gates being removed). Has zero onboarding logic itself.                                                                                                                            | `x-pathname` is still set but no longer consumed by the layout. Harmless. |
| **Promise.all in layout**       | Currently fetches 6 values in parallel. After this spec, fetches 5 (drops `getCachedChefArchetype`). The other 5 are unaffected.                                                                                         | One fewer DB call per page load. Faster.                                  |

---

## Notes for Builder Agent

**This is a surgical deletion.** The fix is removing code from `app/(chef)/layout.tsx` and adding a rule to `CLAUDE.md`. Do not add new logic, new flags, new checks, or new bypass mechanisms. The correct fix is: delete the gate, not add a way around it.

### Step-by-step changes to `app/(chef)/layout.tsx`

Work top-to-bottom. Use exact string matching, not line numbers (line numbers shift as you delete).

**Step 1: Remove unused imports.** Find and delete these exact lines:

```typescript
import { headers } from 'next/headers'
```

```typescript
import { getOnboardingStatus } from '@/lib/chef/profile-actions'
```

```typescript
import { ArchetypeSelector } from '@/components/onboarding/archetype-selector'
```

And in the multi-import from `layout-data-cache`, remove ONLY `getCachedChefArchetype`. Change:

```typescript
import {
  getCachedCannabisAccess,
  getCachedChefArchetype,
  getCachedDeletionStatus,
  getCachedIsAdmin,
} from '@/lib/chef/layout-data-cache'
```

To:

```typescript
import {
  getCachedCannabisAccess,
  getCachedDeletionStatus,
  getCachedIsAdmin,
} from '@/lib/chef/layout-data-cache'
```

**Step 2: Delete the onboarding redirect gate.** Find and delete this exact block (including the comments above it):

```typescript
// Onboarding gate - redirect new chefs to wizard before they can access any page.
// x-pathname is set by middleware so we can check the current path server-side
// without an additional round-trip or breaking the App Router server component model.
const pathname = headers().get('x-pathname') ?? ''
if (!pathname.startsWith('/onboarding') && !pathname.startsWith('/settings')) {
  const onboardingComplete = await getOnboardingStatus().catch(() => true) // fail open
  if (!onboardingComplete) {
    redirect('/onboarding?reason=setup_required')
  }
}
```

**Step 3: Clean up the Promise.all.** Remove exactly two things: (a) `chefArchetype,` from the destructured array, and (b) the two lines `// Archetype - cached 60s...` + `getCachedChefArchetype(...)` from the call array. Also update the comment on the line above (`// Parallelized...`) from "All 6 use" to "All 5 use". Change:

```typescript
  const [
    layoutData,
    announcement,
    _unusedCannabisTier,
    userIsAdmin,
    chefArchetype,
    deletionStatus,
  ] = await Promise.all([
    // Cached for 60s - slug and nav prefs change rarely, keyed per chef
    getChefLayoutData(user.entityId),
    // Platform announcement (non-fatal - fail open)
    getAnnouncement().catch(() => null),
    // Cannabis tier check - kept in Promise.all to avoid reindexing, but unused (cannabis is admin-only now)
    getCachedCannabisAccess(user.id).catch(() => false),
    // Admin check - cached 60s against persisted platform_admins access
    getCachedIsAdmin(user.id).catch(() => false),
    // Archetype - cached 60s, null means chef hasn't picked one yet (show selector)
    getCachedChefArchetype(user.entityId).catch(() => null),
    // Deletion status - cached 60s, non-fatal, fail closed (no banner)
    getCachedDeletionStatus(user.entityId).catch(() => ({
```

To:

```typescript
  const [
    layoutData,
    announcement,
    _unusedCannabisTier,
    userIsAdmin,
    deletionStatus,
  ] = await Promise.all([
    // Cached for 60s - slug and nav prefs change rarely, keyed per chef
    getChefLayoutData(user.entityId),
    // Platform announcement (non-fatal - fail open)
    getAnnouncement().catch(() => null),
    // Cannabis tier check - kept in Promise.all to avoid reindexing, but unused (cannabis is admin-only now)
    getCachedCannabisAccess(user.id).catch(() => false),
    // Admin check - cached 60s against persisted platform_admins access
    getCachedIsAdmin(user.id).catch(() => false),
    // Deletion status - cached 60s, non-fatal, fail closed (no banner)
    getCachedDeletionStatus(user.entityId).catch(() => ({
```

**Step 4: Delete the archetype selector gate.** Find and delete this exact block (including comments):

```typescript
  // Archetype gate - new chefs pick their persona before seeing the portal.
  // Admins skip this (they have full access and don't need a preset).
  // Also skip on settings pages so they can manually configure if needed.
  if (
    !chefArchetype &&
    !userIsAdmin &&
    !pathname.startsWith('/settings') &&
    !pathname.startsWith('/onboarding')
  ) {
    return <ArchetypeSelector />
  }
```

**Step 5: Verify the `redirect` import.** After removing the onboarding gate, check if `redirect` from `next/navigation` is still used elsewhere in the file. It IS still used on line 75 (`redirect('/auth/signin?portal=chef')`), so keep the import.

**Step 6: Update CLAUDE.md.** Add this rule to the "Implementation Patterns" section, after the existing pattern #6 (Monetization Model):

```markdown
### 7. No Forced Onboarding Gates in Chef Layout (PERMANENT)

**Never add a redirect gate or full-page blocker to `app/(chef)/layout.tsx` that prevents navigation based on onboarding status, archetype selection, or profile completeness.** Onboarding is opt-in, never forced.

- No `redirect('/onboarding')` in the layout. Ever.
- No full-page component returns (like `<ArchetypeSelector />`) that replace the normal page render.
- The onboarding banner on the dashboard is the ONLY nudge. It is dismissable and non-blocking.
- Users must be able to freely navigate the entire app immediately after authentication.
- This rule exists because the forced redirect was added, "fixed," and re-added multiple times. It trapped users (including the developer) on the onboarding page and made the app unusable.
```

### Post-build verification

After all changes, the layout function should flow like this:

```
requireChef() -> if fails, redirect to signin
                -> Promise.all (5 parallel cached calls: layoutData, announcement, cannabis, isAdmin, deletionStatus)
                -> render full page with sidebar, nav, content, Remy, etc.
```

No gates. No blockers. Auth check, data fetch, render. That's it.

### What the builder must NOT do

- Do NOT add any replacement gating logic (soft redirect, "once per session" check, feature flag, env var toggle)
- Do NOT touch any file other than `app/(chef)/layout.tsx` and `CLAUDE.md`
- Do NOT remove `getOnboardingStatus()` from `lib/chef/profile-actions.ts`
- Do NOT touch the onboarding page, wizard, banner, or any onboarding server actions
- Do NOT touch middleware.ts
- Do NOT add comments like `// removed onboarding gate` or `// previously checked archetype here`. Just delete cleanly.
