# State Reliability Audit (2026-03-09)

## Summary

Comprehensive audit of state persistence, consistency, and recoverability across ChefFlow.
Seven categories audited, five fixes applied.

## Changes Made

### 1. startTransition Rollback Audit

**Files changed:**

- `components/marketplace/take-a-chef-capture-tool.tsx` - Added try/catch around `saveTakeAChefPageCapture` server action inside startTransition. Previously, thrown exceptions (network errors, 500s) were silently swallowed.
- `components/events/menu-library-picker.tsx` - Added try/catch around fire-and-forget `markPreferencesViewed` call.

**579 files with startTransition were audited.** Only 1 high-risk violation found (take-a-chef capture tool). The codebase is well-handled overall.

### 2. Form Draft Recovery (beforeunload)

**Files changed:**

- `components/booking/booking-flow.tsx` - Added `beforeunload` warning when user has entered data (steps: details, confirm, or formData populated). Prevents accidental tab close losing 16+ form fields across a multi-step wizard.
- `components/aar/aar-form.tsx` - Added full `useUnsavedChangesGuard` integration with dirty detection. Intercepts navigation (links, back button, tab close) when form has unsaved changes. Shows "Leave without saving?" dialog on Cancel button.

### 3. Activity Page Filters (URL Params)

**File changed:** `app/(chef)/activity/activity-page-client.tsx`

Migrated 5 filter states from `useState` (lost on refresh) to URL search params (bookmarkable, shareable, persistent):

- `viewMode` -> `?view=retrace`
- `activeTab` -> `?tab=client`
- `activeDomain` -> `?domain=financial`
- `actorFilter` -> `?actor=chef`
- `timeRange` -> `?range=30`

Default values produce clean URLs (no params). The API endpoint already accepted all these params, so no backend changes needed.

### 4. Remy Drawer Width Persistence

**File changed:** `components/ai/remy-drawer.tsx`

Switched from `sessionStorage` (lost when tab closes) to `localStorage` (persists across sessions). Two-line change: read and write.

### 5. Modal Last-Used Memory

**Files changed:**

- `components/expenses/quick-expense-modal.tsx` - Remembers last-used expense category and payment method across sessions via localStorage. On successful save, stores preferences. On reset, keeps category/payment (clears amount, vendor, description, date).
- `components/dashboard/my-dashboard/widget-picker-modal.tsx` - Remembers last-used widget category filter via localStorage. Restores on next open.

## No Work Needed (Already Good)

- **Cache invalidation** - All gaps were fixed in the March 2026 infrastructure audit. No new gaps found.
- **Calendar view mode** - Already fully persisted to localStorage.
- **Toggle switches** - All have proper server actions with rollback (business mode, availability, notifications).
- **Sidebar collapse** - Already persisted to localStorage.
- **Tour completion** - Database-backed, working correctly.

## Categories Audited

| Category        | Status       | Notes                                        |
| --------------- | ------------ | -------------------------------------------- |
| Persistence     | Fixed        | Activity filters, modal memory, drawer width |
| Durability      | Fixed        | beforeunload on booking flow and AAR form    |
| Consistency     | Fixed        | startTransition rollback gaps closed         |
| Cache coherence | Already good | March 2026 audit covered all gaps            |
| Sync            | Already good | Realtime subscriptions in place              |
