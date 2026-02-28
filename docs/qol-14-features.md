# Chef Portal — 14 Quality-of-Life Features

**Date:** 2026-02-28
**Branch:** `feature/risk-gap-closure`

## Overview

14 quality-of-life improvements to the chef portal, many leveraging existing infrastructure that just needed wiring.

---

## Features Implemented

### F1: Breadcrumb Bar

- **Files:** `components/navigation/breadcrumb-bar.tsx`
- **Wired in:** `components/navigation/chef-main-content.tsx`
- Parses `usePathname()` into clickable segments with 35+ known labels
- UUID detection maps to entity type (Event, Client, etc.)
- Mobile: truncates to last 2 segments with `...` prefix

### F2: Quick Create in Cmd+K

- **Modified:** `components/search/global-search.tsx`
- "Quick Actions" section appears when query is empty or matches "new"/"create"
- 6 items: New Event, Client, Quote, Inquiry, Expense, Recipe
- Each navigates directly to the creation route

### F3: Recently Visited Sidebar

- **Files:** `hooks/use-recent-pages.ts`, `components/navigation/recent-pages-section.tsx`
- **Wired in:** `components/navigation/chef-nav.tsx`
- Tracks last 8 visited pages in localStorage
- Collapsible section with relative timestamps and clear button

### F4: Dashboard Section Collapse

- **Files:** `hooks/use-collapsed-widgets.ts`, `components/dashboard/collapsible-widget.tsx`, `components/dashboard/dashboard-collapse-controls.tsx`
- **Modified:** `app/(chef)/dashboard/page.tsx`
- Each widget section has collapse/expand chevron
- CSS `grid-template-rows: 0fr/1fr` for smooth animation
- "Collapse All"/"Expand All" button, state persisted to localStorage

### F5: Inline Form Validation

- **Files:** `lib/validation/form-rules.ts`, `hooks/use-field-validation.ts`
- Lightweight validation (no zod) with rules: required, email, phone, positiveNumber, date
- Validates on blur, integrates with existing Input `error` prop

### F6: Mobile Card Layout

- **Files:** `hooks/use-media-query.ts`, `components/ui/responsive-table.tsx`
- Generic wrapper: table on desktop, stacked cards on mobile
- SSR-safe via `useMediaQuery` hook (defaults to `false` during SSR)

### F7: Bulk Actions on Lists

- **Files:** `lib/events/bulk-actions.ts`, `lib/clients/bulk-actions.ts`, `lib/inquiries/bulk-actions.ts`, `components/events/events-bulk-table.tsx`, `components/inquiries/inquiries-bulk-table.tsx`
- **Modified:** `app/(chef)/events/page.tsx`, `app/(chef)/clients/clients-table.tsx`, `app/(chef)/inquiries/page.tsx`
- Wires existing `BulkSelectTable` component into list pages
- Events: Archive, Delete Drafts | Clients: Archive | Inquiries: Decline, Archive

### F8: Loading Skeleton Dark Theme Fix

- **Modified:** 15 `loading.tsx` files across the app
- Fixed `bg-stone-200` → `bg-stone-700` and `divide-stone-100` → `divide-stone-800`
- Skeletons now match the dark theme consistently

### F9: Queue Snooze

- **Files:** `hooks/use-queue-snooze.ts`, `components/queue/snooze-popover.tsx`
- localStorage-based snooze: 1h, 4h, Tomorrow, Next Week
- Auto-cleans expired snoozes, shows snoozed count

### F10: Quick Expense Capture

- **Files:** `components/expenses/quick-expense-modal.tsx`, `components/expenses/quick-expense-trigger.tsx`
- **Wired in:** `components/navigation/chef-main-content.tsx`
- Mobile FAB (bottom-right) + Ctrl+Shift+E keyboard shortcut
- Minimal form: Amount, Category, Payment Method, Vendor, Date, Description
- Stays open for rapid entry after save

### F11: Notification Center Filters

- **Modified:** `components/notifications/notification-panel.tsx`, `app/(chef)/notifications/notification-list-client.tsx`
- **Created:** `app/(chef)/notifications/loading.tsx`
- Category filter chips and unread toggle in dropdown panel
- Full page: date grouping (Today/Yesterday/This Week/Older)

### F12: Drag-to-Reschedule Calendar

- **Files:** `components/calendar/draggable-event.tsx`, `components/calendar/droppable-day-cell.tsx`, `lib/calendar/reschedule-action.ts`
- **Modified:** `app/(chef)/calendar/availability-calendar-client.tsx`
- @dnd-kit integration with MouseSensor + TouchSensor
- Restricted to draft/proposed/accepted events only
- Optimistic UI with rollback on failure

### F13: Draft Save Indicator

- **Files:** `components/ui/draft-save-indicator.tsx`
- Floating badge: "Saving..." → "Draft saved" with auto-hide
- Works with existing `useDurableDraft` hook

### F14: Undo on Destructive Actions

- **Files:** `hooks/use-deferred-action.ts`
- Delays destructive actions by 5s with undo toast via existing `showUndoToast`
- Cancels if user clicks Undo, executes after timeout

---

## Additional Fixes

- **Pre-existing PrintButton error** in `app/(chef)/stations/[id]/clipboard/print/page.tsx` — fixed by creating `print-button.tsx` client component
- **TypeScript errors** in new code: `EventStatus` type cast in events-bulk-table, null guard for `usePathname()` in breadcrumb-bar

## Infrastructure Leveraged

| Existing Component   | Feature                                              |
| -------------------- | ---------------------------------------------------- |
| `BulkSelectTable`    | F7 — just needed wiring                              |
| `showUndoToast`      | F14 — 13-line helper, already working                |
| `useDurableDraft`    | F13 — already in event form                          |
| Skeleton components  | F8 — full library existed, just dark theme fix       |
| `@dnd-kit` packages  | F12 — already installed                              |
| Input `error` prop   | F5 — already supported, just needed validation layer |
| `QUICK_CREATE_ITEMS` | F2 — defined in chef-nav, added to search            |
