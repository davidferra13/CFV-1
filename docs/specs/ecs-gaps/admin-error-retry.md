# ECS Gap: Admin Error State Retry Buttons

> Source: ECS Scorecard 2026-04-27 | User Type: Admin (83/100) | Dimension: Error Honesty (17/20)

## Problem
Most admin error states have no retry button. Admin must manually refresh pages on data load failure.

## Spec
1. Find all admin pages using ErrorState or error display patterns
2. Add a "Retry" button that calls `router.refresh()` or re-fetches data
3. Priority pages: /admin/system, /admin/pulse, /admin/analytics, /admin/financials, /admin/reconciliation

## Pattern
```tsx
<button onClick={() => router.refresh()} className="mt-2 px-4 py-2 bg-stone-700 rounded text-sm">
  Retry
</button>
```

## Acceptance
- Every admin error state has a retry action
- Retry refreshes the data without full page reload where possible
- Consistent styling across all admin pages
