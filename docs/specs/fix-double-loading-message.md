# Spec: Fix Double "Loading Your Workspace" Message on Login

> **Status:** verified (absorbed into global-loading-feedback.md Phase 3)
> **Priority:** P1 (next up)
> **Depends on:** absorbed into `global-loading-feedback.md` Phase 3 (build that spec instead, this one is redundant)
> **Estimated complexity:** small (2-3 files)
> **Created:** 2026-03-28
> **Built by:** Claude Code (2026-03-28)

---

## What This Does (Plain English)

When a chef signs in, they currently see a stuttering sequence of nearly identical messages: "Opening your workspace..." on the sign-in page, then "Loading your workspace..." on the chef portal skeleton, then "Loading your dashboard..." on the dashboard skeleton. The first two say essentially the same thing back to back and it looks unpolished. This spec fixes the message flow so each stage feels like a distinct, purposeful step in the login experience.

---

## Why It Matters

First impressions. The login-to-dashboard transition is the first thing every user sees every session. A repeated loading message makes the app feel janky and unfinished. This is a small copy/UX fix with outsized impact on perceived quality.

---

## Files to Modify

| File                              | What to Change                                                                                                                                                   |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/auth/signin/page.tsx`        | Change the `'redirecting'` stage message from "Opening your workspace..." to something distinct (see below)                                                      |
| `app/(chef)/loading.tsx`          | Change the first message from "Loading your workspace..." to something that doesn't overlap with the sign-in redirect message or the dashboard-specific messages |
| `lib/loading/loading-registry.ts` | Update the `nav-dashboard` entry messages if needed to avoid overlap with the portal-level loader                                                                |

---

## Database Changes

None.

---

## The Problem (Exact Message Sequence)

When a chef logs in, they see these messages in rapid succession:

1. **Sign-in page** (`signin/page.tsx:57`, `SignInProgress` component): `"Opening your workspace..."`
2. **Chef portal skeleton** (`(chef)/loading.tsx:12`, `ContextLoader` with override messages): `"Loading your workspace..."`
3. **Dashboard skeleton** (`dashboard/loading.tsx:16`, `ContextLoader` with `nav-dashboard` context): `"Loading your dashboard..."` / `"Pulling today's schedule..."` / `"Gathering your business snapshot..."`

Messages 1 and 2 are nearly identical ("Opening your workspace" vs "Loading your workspace"). The user sees them within 1-2 seconds of each other. It looks like the app stuttered.

---

## The Fix

Make each stage's message clearly distinct so the sequence feels intentional:

### Stage 1: Sign-in page redirect (after auth succeeds, before navigation)

**Current:** `"Opening your workspace..."`
**New:** `"Signed in successfully"`

Rationale: This is a confirmation, not a loading state. The auth already succeeded. A brief "success" moment before the page swap feels clean. Keep the spinner so the user knows navigation is happening.

### Stage 2: Chef portal skeleton (layout-level loading.tsx)

**Current messages:** `["Loading your workspace...", "Preparing your dashboard...", "Pulling today's schedule..."]`
**New messages:** `["Setting up your workspace...", "Loading your tools...", "Almost ready..."]`

Rationale: This is the layout hydrating (nav, sidebar, session). The messages should reflect that it's assembling the workspace shell, not loading specific content. Also removes "Preparing your dashboard..." and "Pulling today's schedule..." since those belong to the dashboard-specific loader (stage 3), not the portal-level loader.

### Stage 3: Dashboard skeleton (unchanged)

**Keep as-is:** `["Loading your dashboard...", "Pulling today's schedule...", "Gathering your business snapshot..."]`

These are dashboard-specific and won't overlap with the new stage 1/2 messages.

---

## UI / Component Spec

### Sign-in page change (`signin/page.tsx`)

In the `SignInProgress` component (line 46-62), change the redirecting message:

```tsx
// Before
{
  stage === 'authenticating' ? 'Signing you in...' : 'Opening your workspace...'
}

// After
{
  stage === 'authenticating' ? 'Signing you in...' : 'Signed in successfully'
}
```

### Chef portal loading change (`(chef)/loading.tsx`)

Replace the hardcoded message overrides (lines 11-15):

```tsx
// Before
messages={[
  'Loading your workspace...',
  'Preparing your dashboard...',
  "Pulling today's schedule...",
]}

// After
messages={[
  'Setting up your workspace...',
  'Loading your tools...',
  'Almost ready...',
]}
```

### Loading registry (`loading-registry.ts`)

The `nav-dashboard` entry (lines 46-57) stays as-is. Its messages are already dashboard-specific and don't overlap with the new portal-level messages.

---

## Edge Cases and Error Handling

| Scenario                                | Correct Behavior                                                                                                                                                              |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sign-in fails                           | Error shown on sign-in page, never reaches stages 2/3. No change needed.                                                                                                      |
| Very fast login (all stages flash by)   | Messages are still distinct even if shown briefly. "Signed in successfully" -> "Setting up your workspace..." -> "Loading your dashboard..." reads as a coherent progression. |
| Non-dashboard redirect (e.g. `/events`) | Stage 2 still shows "Setting up your workspace...". Stage 3 shows event-specific messages from the events `loading.tsx`. No overlap.                                          |
| Client portal login                     | Only stage 1 changes. Client portal has its own loading states.                                                                                                               |

---

## Verification Steps

1. Sign in with agent account at `/auth/signin`
2. Watch the full transition from sign-in to dashboard
3. Verify: no two consecutive messages say essentially the same thing
4. Verify: the sequence reads as a clear progression (confirmed -> workspace setup -> dashboard content)
5. Screenshot each stage if possible (they're fast, but Playwright can slow it down)
6. Sign out and sign in again to confirm consistency
7. Navigate away from dashboard and back to verify the dashboard loading skeleton still shows appropriate messages

---

## Out of Scope

- Redesigning the loading skeleton layouts (just changing copy)
- Adding new loading animations or transitions
- Changing the `ContextLoader` component behavior
- Modifying the loading registry structure

---

## Notes for Builder Agent

- The sign-in page uses `window.location.href` for hard navigation (not `router.push`), so there's a real page load between stage 1 and stage 2. The sign-in page's "Signed in successfully" will show briefly before the browser navigates away.
- The `(chef)/loading.tsx` file passes `messages` as a prop override to `ContextLoader`, bypassing the registry. This is intentional since it's the portal-level catch-all, not a specific page.
- The `ContextLoader` rotates messages every 4.5s (`useRotatingMessage` hook). The first message in the array is what the user sees initially, so make it the best one.
- Don't touch `dashboard/loading.tsx` since its messages are already good and distinct.
