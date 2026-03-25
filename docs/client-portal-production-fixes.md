# Client Portal Production Fixes

Implementation log for all fixes identified in the Client Portal Production Review.

## P1 Fixes (Blockers)

### P1.1: Accessible Confirmation Modals

**Files changed:**

- `components/ui/confirm-modal.tsx` - Rewrote to wrap `AccessibleDialog` (focus trap, escape key, aria attributes, scroll lock, focus restoration)
- `app/(client)/my-events/[id]/accept-proposal-button.tsx` - Replaced inline modal with `<ConfirmModal>`
- `app/(client)/my-events/[id]/cancel-event-button.tsx` - Replaced inline modal, added `children` prop for textarea, `confirmDisabled`, `maxWidth`
- `app/(client)/my-quotes/[id]/quote-response-buttons.tsx` - Replaced 2 inline modals (accept + reject)
- `app/(client)/my-rewards/reward-card.tsx` - Replaced inline modal for reward redemption

### P1.2: N+1 Hub Unread Query

**File:** `lib/hub/notification-actions.ts`

- Eliminated sequential loop that ran 2N queries (one count + one group info per membership)
- Now fetches group info via join in the membership query
- Runs all unread count queries in parallel via `Promise.all`
- Result: from O(2N) sequential queries to 2 queries + N parallel counts

### P1.3: Event Detail Page Query Consolidation

**File:** `lib/events/client-actions.ts`

- `getClientEventById()` had 7 sequential PostgreSQL queries after the main event fetch
- Wrapped all 7 in `Promise.all` for parallel execution
- Same data, same result shape, significantly faster page loads

## P2 Fixes (Quality)

### P2.1: Hub Page Silent Error Swallowing

**File:** `app/(client)/my-hub/page.tsx`

- Replaced `.catch(() => [])` / `.catch(() => 0)` with `Promise.allSettled`
- Added `hasLoadError` flag that shows a warning Alert when any fetch fails
- Users now see "Some data could not be loaded" instead of silent zeros

### P2.3: Crowded Mobile Bottom Nav

**File:** `components/navigation/client-nav.tsx`

- Mobile bottom tab bar showed all 8 nav items (too small to tap on narrow screens)
- Limited to first 5 items: Events, Inquiries, Quotes, Messages, Hub
- Remaining items (Rewards, Spending, Profile) accessible via hamburger slide-out menu

### P2.4: Unsaved Changes Warning on Profile Form

**File:** `app/(client)/my-profile/client-profile-form.tsx`

- Added dirty-state tracking: compares current form state against initial props via JSON serialization
- Added `beforeunload` event handler that triggers browser's "unsaved changes" dialog when form is dirty
- Prevents accidental data loss when navigating away mid-edit

### P2.5: Survey Form Try/Catch

**File:** `app/(client)/survey/[token]/survey-form.tsx`

- Wrapped `submitSurveyResponse()` call in try/catch/finally
- If server action throws, user sees error message instead of blank crash
- Moved `setLoading(false)` to `finally` block for guaranteed cleanup

### P2.6: Contract Body Markdown Rendering

**File:** `app/(client)/my-events/[id]/contract/contract-signing-client.tsx`

- Replaced `<pre>` tag with `<ReactMarkdown remarkPlugins={[remarkGfm]}>`
- Added Tailwind `prose prose-invert` classes for proper heading, list, and table rendering
- Contracts with headings, bold text, and lists now render correctly

### P2.7-2.10: Empty Catch Blocks in Hub Components

**Files:**

- `components/hub/hub-poll-card.tsx` - 2 empty catches now show `toast.error()`
- `components/hub/hub-photo-gallery.tsx` - Upload catch now shows toast; delete catch has rollback + toast
- `components/hub/hub-quick-actions.tsx` - 4 empty catches replaced with `handleError()` that shows inline error message

## P3 Fixes (Polish)

### P3.1: NPS Button Selected State

**File:** `app/(client)/survey/[token]/survey-form.tsx`

- Fixed selected NPS button: was `bg-stone-900 border-stone-900` (invisible), now `bg-brand-600 border-brand-600`

### P3.2: Standardized Error Display

**Files:**

- `app/(client)/survey/[token]/survey-form.tsx` - Custom error div replaced with `<Alert variant="error">`
- `app/(client)/my-events/[id]/contract/contract-signing-client.tsx` - Bare `<p>` replaced with `<Alert variant="error">`

### P3.3: 404 Page Navigation

**File:** `app/(client)/not-found.tsx`

- Changed redirect link from `/` (landing page) to `/my-events` (client dashboard)

### P3.5: Tier Badge Contrast

**File:** `app/(client)/my-rewards/page.tsx`

- Fixed low-contrast tier badge text colors on dark backgrounds
- `text-amber-800` to `text-amber-200`, `text-yellow-800` to `text-yellow-200`, `text-indigo-800` to `text-indigo-200`

### P3.6: Hardcoded Brand Colors

**Files:**

- `app/(client)/my-events/[id]/page.tsx` - `bg-[#e88f47]` to `bg-brand-500`
- `components/hub/circles-inbox.tsx` - 6 instances of `#e88f47`/`#d07e3a` replaced with `brand-500`/`brand-600`/`brand-500` tokens

### P3.4: Loading Skeletons

**New files:**

- `app/(client)/my-events/[id]/contract/loading.tsx`
- `app/(client)/my-events/[id]/pre-event-checklist/loading.tsx`
- `app/(client)/my-events/[id]/countdown/loading.tsx`

## Summary

| Priority      | Issues | Fixed  |
| ------------- | ------ | ------ |
| P1 (Blockers) | 3      | 3      |
| P2 (Quality)  | 10     | 10     |
| P3 (Polish)   | 7      | 7      |
| **Total**     | **20** | **20** |
