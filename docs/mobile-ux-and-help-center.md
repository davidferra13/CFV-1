# Mobile UX + Help Center — Build Notes

**Branch:** `fix/grade-improvements`
**Date:** 2026-02-20
**Files created:** 7

---

## What was built

### 1. DOP Mobile View (`components/scheduling/dop-mobile-view.tsx`)

A full-screen, step-by-step mobile UI for the Day-Of Protocol checklist. Key design decisions:

**Architecture adaptation:** The spec assumed a flat DB table of tasks (`dop_task_completions`), but the real system generates tasks computationally in `lib/scheduling/dop.ts` from event flags and preferences. `dop_task_completions` stores only _manual confirmation keys_ (task_keys for tasks the system can't auto-detect). The component was built to match the real architecture.

- `flattenDOPSchedule()` flattens a `DOPSchedule` into an ordered list, skipping `not_applicable` phases
- Distinguishes between auto-complete tasks (event flags — read-only) and manually-toggleable tasks (uses `toggleDOPTaskCompletion`)
- Optimistic UI: updates local `Set<string>` of manual keys immediately, reverts on server error
- Large touch targets throughout; "Mark Complete" button is full-width at 5rem height
- Progress bar in header shows completedCount / totalCount with percentage
- Bottom panel shows all tasks as a scrollable list for direct navigation; tap to jump to any step
- Compressed timeline warning shown if `schedule.isCompressed` is true

**Props interface:**

```ts
interface DopMobileViewProps {
  eventId: string
  schedule: DOPSchedule
  manualCompletionKeys: Set<string>
  eventTitle: string
  serveTime: string
}
```

---

### 2. DOP Mobile Page (`app/(chef)/events/[id]/dop/mobile/page.tsx`)

Server component that fetches the computed DOP schedule and manual completion keys in parallel, then renders `DopMobileView`. The page skips the chef layout shell intentionally — the mobile view occupies the full viewport.

Graceful fallback if `getEventDOPSchedule` returns null (e.g., event missing a date).

Route: `/events/[id]/dop/mobile`

---

### 3. Quick Capture FAB (`components/mobile/quick-capture.tsx`)

Floating action button visible only on mobile (`sm:hidden`). Two actions:

**Capture Receipt** — triggers `<input type="file" capture="environment">` to open the native camera app. The image is not uploaded automatically; a toast tells the chef to finish logging it from the full Expenses page. (Full upload flow would require a storage bucket integration.)

**Quick Expense** — bottom-sheet modal with amount (numeric keyboard) and description. Calls `createExpense` from `lib/expenses/actions` with defaults:

- `category: 'other'`
- `payment_method: 'card'`
- `expense_date: today`
- `is_business: true`

The spec originally called for a `createQuickExpense` wrapper, but `createExpense` from the existing actions file handles this cleanly with the required schema. A note in the modal explains the defaults so the chef knows to edit from the Expenses page if needed.

Backdrop tap and Cancel button both dismiss the modal. Enter key in either input submits.

---

### 4. Offline Banner (`components/ui/offline-banner.tsx`)

Listens to `window.addEventListener('online' | 'offline')` and renders a fixed-top banner. Returns `null` when online and outside the 3-second reconnection window, so there is zero DOM impact in the normal case.

Usage — add to chef layout or root layout:

```tsx
import { OfflineBanner } from '@/components/ui/offline-banner'
// ...
;<OfflineBanner />
```

---

### 5. Help Center

Three files:

**`app/(chef)/help/page.tsx`** — index with search bar and six category cards. Static content, auth-gated with `requireChef()`. No DB queries.

**`app/(chef)/help/[slug]/page.tsx`** — article page. Renders `HELP_CONTENT[slug]` using `<pre className="whitespace-pre-wrap">` per project convention (no react-markdown). Falls back gracefully for unknown slugs. `generateMetadata` sets page titles dynamically.

**`components/help/help-search.tsx`** — client component. Filters `HELP_ARTICLES` array client-side as the user types. Dropdown appears after 2 characters. Empty-state message shown when query matches nothing. No API call.

Supported slugs: `events`, `clients`, `finance`, `culinary`, `settings`, `onboarding`

Route: `/help` and `/help/[slug]`

---

## What was NOT modified

The existing `lib/scheduling/dop-completions.ts` was intentionally left unchanged. It already contains the correct `getDOPManualCompletions` and `toggleDOPTaskCompletion` functions with the right signatures. The spec asked for `getDopTasksForEvent` and `toggleDopTaskCompletion` (camelCase variant), but those would have duplicated the existing logic with incompatible assumptions about the DB schema.

---

## Integration checklist

These components are created but not yet wired into the chef layout or event detail pages. To complete integration:

- [ ] Add `<OfflineBanner />` to `app/(chef)/layout.tsx` (or root layout)
- [ ] Add `<QuickCapture />` to `app/(chef)/layout.tsx`
- [ ] Add a "DOP Mobile" link to the event detail page schedule tab (link to `/events/[id]/dop/mobile`)
- [ ] Add "Help" to the chef sidebar navigation (`components/admin/admin-sidebar.tsx` or equivalent chef nav)

---

## TypeScript

`npx tsc --noEmit --skipLibCheck` shows zero errors in the new files. Pre-existing errors in other files are unrelated to this build.
