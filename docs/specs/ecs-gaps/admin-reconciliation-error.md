# ECS Gap: Admin Reconciliation Error Handling

> Source: ECS Scorecard 2026-04-27 | User Type: Admin (83/100) | Dimension: Error Honesty (17/20)

## Problem
Reconciliation page has no try/catch around data fetch. Relies on thrown error hitting the error boundary.

## Spec
1. Read `app/(admin)/admin/reconciliation/page.tsx`
2. Wrap data fetching in try/catch
3. On failure, show inline error with retry button (don't throw to error boundary)
4. Match the Promise.allSettled pattern used in other admin pages (analytics, financials)

## Acceptance
- Reconciliation page handles fetch errors gracefully
- Shows inline error with retry, not a full error boundary page
- Consistent with other admin pages
