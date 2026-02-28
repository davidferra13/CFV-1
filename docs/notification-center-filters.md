# Notification Center with Filters

**Date:** 2026-02-28
**Feature:** Notification Center — Filter Bar & Date Grouping

---

## What Changed

### 1. Notification Panel (Bell Dropdown) — Filter Bar

**File:** `components/notifications/notification-panel.tsx`

Added a filter bar between the header and the notification list:

- **Category filter chips:** "All", "Inquiry", "Event", "Payment", "Chat", "System" — rounded-full pills in a flex-wrap row.
- **Unread toggle:** An "Unread" button with `EyeOff` icon, pushed to the right with `ml-auto`.
- **Client-side filtering:** Both filters apply via `useMemo` over the already-fetched 30 notifications. No extra server calls needed since the panel fetches a fixed batch on mount.
- **Active state:** Active chip/toggle gets `bg-brand-600 text-white`; inactive gets `bg-stone-800 text-stone-400 hover:bg-stone-700`.
- **Empty state:** Shows "No matching notifications" when filters exclude everything, vs "You're all caught up" when there truly are none.

### 2. Notifications Page — Date Grouping & Unread Filter

**File:** `app/(chef)/notifications/notification-list-client.tsx`

Enhanced the existing full notifications page:

- **Date grouping:** Notifications are grouped into "Today", "Yesterday", "This Week", "Older" sections with sticky header labels. Uses deterministic date math (no AI).
- **Unread toggle:** Added alongside existing category filter tabs. When "Unread" is active with no category filter, it uses the dedicated `getUnreadNotifications()` server action for efficient server-side filtering. When combined with a category filter, client-side filtering is applied on top.
- **Chat tab added:** The "Chat" category tab was missing from the filter row — now included.
- **Filter pills restyled:** Changed from `rounded-lg` to `rounded-full` for visual consistency with the panel.
- **Empty state:** Smart messaging that combines the active filter context (e.g., "No unread Inquiries notifications").

### 3. Loading Skeleton

**File:** `app/(chef)/notifications/loading.tsx` (new)

Simple loading skeleton using `ListPageSkeleton` with 8 rows, matching the pattern used across all other ChefFlow list pages.

---

## Architecture Notes

- **Panel filtering is client-side only.** The panel already fetches 30 notifications on mount. Filtering happens in `useMemo` — no additional server calls, instant response.
- **Page filtering is hybrid.** Category filter uses server-side `getNotificationsByCategory()`. Unread-only (no category) uses server-side `getUnreadNotifications()`. Unread + category uses server-side category fetch with client-side unread filtering. This avoids needing a new combined server action.
- **Date grouping uses deterministic math.** `getDateGroup()` compares notification timestamps to today/yesterday/week-ago boundaries. No AI involved — formula over AI per project rules.
- **No database changes.** All filtering uses existing queries and client-side logic.

---

## Files Modified

| File                                                    | Change                                                                   |
| ------------------------------------------------------- | ------------------------------------------------------------------------ |
| `components/notifications/notification-panel.tsx`       | Added filter bar (category chips + unread toggle), client-side filtering |
| `app/(chef)/notifications/notification-list-client.tsx` | Added date grouping, unread toggle, Chat tab, rounded-full pills         |
| `app/(chef)/notifications/loading.tsx`                  | New — loading skeleton                                                   |
| `docs/notification-center-filters.md`                   | New — this document                                                      |
