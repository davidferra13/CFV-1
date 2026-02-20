# Chef Onboarding Wizard (T1.2)

## What changed

### New files

- `app/(chef)/onboarding/page.tsx` — Server Component entry point for the `/onboarding` route
- `components/onboarding/onboarding-wizard.tsx` — `'use client'` multi-step wizard (5 steps)

### Modified files

- `lib/chef/profile-actions.ts` — two new server actions appended
- `middleware.ts` — `/onboarding` added to `chefPaths`

---

## Why

New chefs signing up have no handholding after the auth flow completes. Without an onboarding sequence they land on the dashboard with a blank slate and no obvious next action. The wizard guides them through the minimum viable setup in one sitting:

1. Declare their business identity (name, cuisine style, price range)
2. Optionally add their first client or import from CSV
3. Choose a service contract template
4. Opt in to browser push notifications
5. Review a summary and land on the dashboard

---

## How it connects

### Route protection

`/onboarding` is added to `chefPaths` in `middleware.ts`. The middleware enforces that only authenticated users with the `chef` role can reach this path — clients are redirected to `/my-events` and unauthenticated users go to `/auth/signin`.

### Completion gate

`app/(chef)/onboarding/page.tsx` is a Server Component that calls `getOnboardingStatus()` on load. If `onboarding_completed_at` is already set on the chef's row, it immediately redirects to `/dashboard`. This prevents a completed wizard from being replayed.

### Server actions

Two new functions are appended to `lib/chef/profile-actions.ts`:

```ts
markOnboardingComplete()
// Sets onboarding_completed_at = now() on the chefs row for the current user.
// Called from the wizard's Step 5 "Go to Dashboard" button via useTransition.

getOnboardingStatus(): Promise<boolean>
// Returns true if onboarding_completed_at is non-null.
// Called server-side from the page component.
```

Both follow the existing patterns in the file: `requireChef()` for auth/tenant isolation, `createServerClient()` for the Supabase client, and `(supabase as any)` to avoid generated-type friction on columns that may not yet be in `types/database.ts`.

### Wizard state

All wizard state is local React state in `OnboardingWizard`. Nothing is persisted to the database mid-wizard — only completion is written (via `markOnboardingComplete`) when the chef clicks "Go to Dashboard" on step 5. This keeps the wizard lightweight and avoids partial-state debris in the DB if the chef abandons mid-flow.

### Notification opt-in

Step 4 calls `Notification.requestPermission()` directly in the browser. No server-side persistence is done here — the push subscription setup (if any) is handled by the existing `components/notifications/push-permission-prompt.tsx` system. The wizard only surfaces the browser permission prompt.

---

## Database dependency

`markOnboardingComplete` writes to `chefs.onboarding_completed_at`. This column must exist on the `chefs` table. If it does not yet exist, the `update()` call will silently succeed (Supabase ignores unknown columns in `update()` payloads) or return a column-not-found error that is caught gracefully by the page's `.catch(() => false)` on `getOnboardingStatus`. A migration adding this column should be applied before this feature is active in production.

---

## UI conventions followed

- `Button` variants: `primary`, `secondary`, `ghost` only (no `outline`, `default`, `warning`)
- `Card`, `CardContent` from `components/ui/card.tsx`
- Dynamic progress bar width uses `style={{ width: \`${pct}%\` }}` — the established pattern across 25+ components in this codebase (e.g. `close-out-wizard.tsx`, `goal-progress-bar.tsx`)
- No `react-markdown` usage — raw `<pre className="whitespace-pre-wrap">` for the contract preview
- `useTransition` + `router.push` for the final navigation to avoid blocking the UI during the server action call

---

## Linking to the dashboard

The wizard is reachable at `/onboarding`. The `OnboardingAccelerator` component on the dashboard (referenced in the task spec) should link to this route for chefs who have not yet completed onboarding. That wiring is a separate task.
