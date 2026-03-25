# Client Portal Production-Readiness Review

**Date:** 2026-03-18
**Scope:** All files in `app/(client)/`, `app/(public)/hub/`, `components/hub/`, `components/client/`, `components/navigation/client-nav.tsx`, `lib/hub/`, `lib/clients/client-profile-actions.ts`, `lib/events/client-actions.ts`

---

## Executive Summary

The Client Portal is well-architected and largely production-ready. Auth checks are consistent (`requireClient()` on every page/action), financial data is derived (not stored), error handling covers most paths, and the dark-themed UI is responsive. The issues below are real gaps, not theoretical risks. They are ordered by severity.

---

## PRIORITY 1: Fix Before Deploy (Blockers)

### 1.1 Modals Have Zero Accessibility

**Files:** `accept-proposal-button.tsx`, `cancel-event-button.tsx`, `quote-response-buttons.tsx`, `reward-card.tsx`, `raffle-game-modal.tsx`

Every confirmation modal in the portal is a plain `<div>` with no accessibility attributes:

- No `role="dialog"` or `aria-modal="true"`
- No `aria-labelledby` pointing to the modal title
- No Escape key handler (only `raffle-game-modal.tsx` has one)
- No focus trap (focus can tab behind the modal to invisible elements)
- No focus restoration when the modal closes

**Impact:** Screen reader users cannot identify modals. Keyboard users can interact with hidden content behind the overlay. This is a WCAG 2.1 Level A failure (4.1.2 Name, Role, Value).

**Fix:** Create a shared `<ConfirmModal>` component (or use an existing dialog primitive if one exists) that handles `role="dialog"`, `aria-modal`, `aria-labelledby`, escape key, focus trap, and focus restore. Replace all 5+ inline modal implementations.

---

### 1.2 N+1 Query in Hub Unread Counts

**File:** `lib/hub/notification-actions.ts:44-79`

`getHubUnreadCounts()` runs a `for` loop over every group membership, issuing a separate PostgreSQL query for each to count unread messages, then another query to get group info. For a user in 10 groups, that is 20 sequential DB round-trips per page load.

**Impact:** Slow page load for active hub users. Will degrade linearly as users join more groups.

**Fix:** Replace with a single query using a join or a database function (RPC). Something like:

```sql
SELECT g.id, g.name, g.emoji, g.group_token,
       COUNT(m.id) FILTER (WHERE m.created_at > gm.last_read_at) AS unread_count
FROM hub_group_members gm
JOIN hub_groups g ON g.id = gm.group_id
LEFT JOIN hub_messages m ON m.group_id = gm.group_id AND m.deleted_at IS NULL
WHERE gm.profile_id = $1
GROUP BY g.id, g.name, g.emoji, g.group_token
HAVING COUNT(m.id) FILTER (WHERE m.created_at > gm.last_read_at) > 0
```

---

### 1.3 Event Detail Page Has Too Many Sequential Queries

**File:** `app/(client)/my-events/[id]/page.tsx:71-122`

`EventDetailPage` makes:

- 1 query for the event
- 1 query for menus
- 1 query for ledger entries
- 1 query for financial summary
- 1 query for transitions
- 1 query for photo count
- 1 query for contract
- 1 query for review count
- 8 queries for sharing/RSVP data (via `Promise.all`)
- Then conditionally 1 more for circle token
- Then conditionally 3 more for review/photos

That is 15-18 sequential + parallel DB queries for a single page load. The `getClientEventById` function (lines 67-150 of `client-actions.ts`) alone does 7 sequential queries.

**Fix:** Consolidate `getClientEventById` into fewer queries. The event, menus, ledger entries, financial summary, transitions, photo count, contract, and review count could be fetched in 2-3 parallel queries. The sharing data is already parallelized, which is good.

---

## PRIORITY 2: Should Fix (Quality Issues)

### 2.1 My Hub Page Silently Swallows Errors as Defaults

**File:** `app/(client)/my-hub/page.tsx:20-25`

```tsx
const [groups, friends, pendingRequests, totalUnread] = await Promise.all([
  getClientHubGroups(),
  getMyFriends().catch(() => []),
  getPendingFriendRequests().catch(() => []),
  getHubTotalUnreadCount(profileToken).catch(() => 0),
])
```

If `getMyFriends()` fails, the UI shows "0 Circle Members" (Zero Hallucination violation, Law 2). The user sees a zero that looks like real data. The first call (`getClientHubGroups()`) has no catch, so it would crash the page, which is actually better behavior.

**Fix:** Catch errors but render an error indicator for the affected section, not a silent zero. For example: show "Unable to load circle members" if friends fetch fails.

---

### 2.2 `as any` Used Extensively for Type Gaps

**Files:** 8 files, 41 total occurrences in `app/(client)/`

Especially heavy in `my-events/[id]/page.tsx` (22 occurrences). Examples:

- `(event as any).menu_approval_status`
- `(activeShare as any).require_join_approval`
- `communicationLogs as any[]`

**Impact:** TypeScript safety is bypassed. If a column is renamed or removed in a migration, these will crash at runtime with no compile-time warning.

**Fix:** Extend the `getClientEventById` return type to include `menu_approval_status`, `menu_approval_updated_at`, `pre_event_checklist_confirmed_at`. The event select already uses `*` which returns them; only the TypeScript type is incomplete.

---

### 2.3 Mobile Bottom Nav Shows All Items (Crowded on Small Screens)

**File:** `components/navigation/client-nav.tsx:342-366`

The mobile bottom tab bar renders all 8 nav items in a single row. On a 320px-wide screen with 8 items, each item gets ~40px. The labels are 10px font but some (`My Inquiries`, `Messages`) are long enough to overlap.

**Fix:** Either limit the bottom bar to 5 key items (Events, Messages, Hub, Rewards, More) or use a "More" overflow menu for secondary items.

---

### 2.4 No Unsaved Changes Warning on Profile Form

**File:** `app/(client)/my-profile/client-profile-form.tsx`

The profile form has ~20 fields. If a user fills out several fields and navigates away, all changes are silently lost. No `beforeunload` handler, no dirty-state tracking.

**Fix:** Add a `useEffect` with `window.addEventListener('beforeunload', handler)` when form state differs from initial props.

---

### 2.5 Survey Form Lacks Error Boundary Around Server Call

**File:** `app/(client)/survey/[token]/survey-form.tsx:67`

```tsx
const result = await submitSurveyResponse({...})
```

This is a direct `await` (not inside `startTransition`) and has no `try/catch`. If the server action throws (network error, timeout), the component will crash and the user loses all their input.

**Fix:** Wrap in try/catch, show the error, preserve user input.

---

### 2.6 Contract Body Rendered as `<pre>` Instead of Markdown

**File:** `app/(client)/my-events/[id]/contract/contract-signing-client.tsx:106`

```tsx
<pre className="whitespace-pre-wrap font-sans text-sm text-stone-200 leading-relaxed">
  {bodyMarkdown}
</pre>
```

Markdown headings, bold text, lists, and links are rendered as plain text. A legal contract with `## Section 3: Payment Terms` will show the literal `##` characters.

**Fix:** Use a Markdown renderer (the project likely already has one for other features). Even basic `react-markdown` would handle headings, bold, and lists.

---

## PRIORITY 3: Nice to Have (Polish)

### 3.1 NPS Score Button Styling Bug

**File:** `app/(client)/survey/[token]/survey-form.tsx:124-128`

The selected NPS button uses `bg-stone-900 text-white border-stone-900` which is nearly identical to the unselected state (`bg-stone-900 text-stone-300 border-stone-700`). On the dark theme, users can barely tell which number they selected.

**Fix:** Use `bg-brand-600 text-white border-brand-600` for the selected state.

---

### 3.2 Inconsistent Error Display Patterns

Across the portal, errors are shown via:

- `<Alert variant="error">` (profile, events, notifications)
- `<p className="text-sm text-red-600">` (contract signing)
- `<div className="rounded-lg bg-red-950...">` (survey)

This creates visual inconsistency. Users see different-looking error messages on different pages.

**Fix:** Standardize on `<Alert variant="error">` everywhere.

---

### 3.3 "Go Home" Link in not-found.tsx Goes to `/` Instead of `/my-events`

**File:** `app/(client)/not-found.tsx:8`

The client portal 404 page links to `/` (the public landing page). A logged-in client seeing a 404 should be directed back to `/my-events` (their dashboard).

**Fix:** Change `href="/"` to `href="/my-events"`.

---

### 3.4 Missing `loading.tsx` for Several Sub-pages

These pages lack loading states and will show nothing during navigation:

- `my-events/[id]/contract/`
- `my-events/[id]/pre-event-checklist/`
- `my-events/[id]/countdown/`
- `my-events/[id]/event-summary/`
- `my-events/[id]/invoice/`
- `my-events/[id]/payment-plan/`
- `my-events/history/`
- `my-hub/create/`
- `my-hub/friends/`
- `my-hub/share-chef/`
- `my-hub/notifications/`

**Fix:** Add skeleton loading states for critical paths (payment, contract signing).

---

### 3.5 Rewards Page Tier Badge Colors Use `text-amber-800` on `bg-amber-900`

**File:** `app/(client)/my-rewards/page.tsx:31-35`

```tsx
bronze: 'bg-amber-900 text-amber-800',
gold: 'bg-yellow-900 text-yellow-800',
platinum: 'bg-indigo-900 text-indigo-800',
```

Dark text on dark background. Contrast ratio is far below WCAG AA (4.5:1).

**Fix:** Use lighter text colors: `text-amber-200`, `text-yellow-200`, `text-indigo-200`.

---

### 3.6 Hardcoded Brand Color in Hub Components

**Files:** `hub-group-view.tsx:168`, `circles-inbox.tsx:65`

```tsx
className =
  'rounded-lg bg-[#e88f47] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#d07e3a]'
```

Hardcoded hex values instead of using `bg-brand-500` / `bg-brand-600`. If the brand color changes, these won't update.

**Fix:** Use Tailwind brand classes.

---

### 3.7 Book Now Page Passes `primaryColor="#1c1917"` (stone-950)

**File:** `app/(client)/book-now/page.tsx:28`

The inquiry form is being passed a near-black primary color. On the dark client portal background, this will make form elements invisible or hard to see.

**Fix:** Verify the form renders correctly with this color on the dark background. Consider passing the brand color instead.

---

## Security Assessment

### Passing (No Issues Found)

- **Auth:** Every page calls `requireClient()`. Every server action calls `requireClient()` before any DB operation.
- **Tenant scoping:** All queries scope by `user.entityId` (client ID). No cross-tenant data exposure found.
- **No XSS vectors:** No `dangerouslySetInnerHTML` in client portal. No raw HTML rendering.
- **No `@ts-nocheck` files** in the client portal.
- **Input validation:** Zod schemas validate all mutation inputs (profile updates, meal requests, survey responses).
- **Financial data:** Derived from `event_financial_summary` view and immutable `ledger_entries`, never stored as a mutable column.
- **Non-blocking side effects:** Notifications and chef alerts are properly wrapped in try/catch.

### Minor Concern

- **`createServerClient()` used without type parameters** in several places (cast as `any`). This doesn't create a security risk but removes type safety for query results.

---

## Performance Assessment

### Issues Identified

1. **N+1 in hub notification counts** (Priority 1.2 above)
2. **15-18 queries per event detail page** (Priority 1.3 above)
3. **`getClientEvents()` fetches all events then filters client-side** (not severe since clients typically have <50 events, but could paginate for efficiency)
4. **`getMyMealCollaborationData()` has `limit(1000)` on served dish history** which is reasonable now but could be large for recurring clients over years

### Passing

- `Promise.all` used effectively for parallel fetches on most pages
- No unnecessary `use client` on pages that should be server components
- Hub group card list is server-rendered (good)
- Spending page delegates to a client component for interactivity but fetches server-side

---

## Summary of Recommendations

| #    | Issue                                                        | Priority | Effort |
| ---- | ------------------------------------------------------------ | -------- | ------ |
| 1.1  | Modal accessibility (role, focus trap, escape)               | P1       | Medium |
| 1.2  | N+1 hub unread query                                         | P1       | Medium |
| 1.3  | Event detail page query consolidation                        | P1       | Large  |
| 2.1  | Silent error swallowing on hub page                          | P2       | Small  |
| 2.2  | `as any` type gaps                                           | P2       | Medium |
| 2.3  | Crowded mobile bottom nav                                    | P2       | Small  |
| 2.4  | No unsaved changes warning on profile                        | P2       | Small  |
| 2.5  | Survey form missing try/catch                                | P2       | Small  |
| 2.6  | Contract body rendered as plain text                         | P2       | Small  |
| 2.7  | Hub poll vote: empty catch, no rollback on optimistic update | P2       | Small  |
| 2.8  | Photo upload error silently swallowed                        | P2       | Small  |
| 2.9  | Mute toggle fails silently (empty catch)                     | P2       | Small  |
| 2.10 | Close poll error silently ignored                            | P2       | Small  |
| 3.1  | NPS button selection visibility                              | P3       | Tiny   |
| 3.2  | Inconsistent error display                                   | P3       | Small  |
| 3.3  | 404 links to wrong page                                      | P3       | Tiny   |
| 3.4  | Missing loading states                                       | P3       | Small  |
| 3.5  | Tier badge contrast                                          | P3       | Tiny   |
| 3.6  | Hardcoded brand colors                                       | P3       | Tiny   |
| 3.7  | Book Now primary color on dark bg                            | P3       | Tiny   |

**Overall verdict:** The portal is solid for a beta launch. The P1 items (accessibility and performance) should be addressed before a full production release to paying customers. The codebase follows project conventions consistently, auth is tight, and the UI is cohesive.
