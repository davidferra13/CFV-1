# ECS Gap: Chef Portal Error Boundaries

> Source: ECS Scorecard 2026-04-27 | User Type: Chef (85/100) | Dimension: Error Honesty (16/20)

## Problem
Only 27 error.tsx files for 94 chef portal sections (~29% coverage). Most sections have no dedicated error boundary, falling through to the root error handler.

## Spec
Create error.tsx files for all chef portal sections that lack them. Each should:
1. Import `reportClientBoundaryError` and call it in useEffect
2. Display error digest ID for support
3. Show "Try Again" button (calls reset())
4. Show "Go to Dashboard" escape hatch link
5. Detect chunk loading errors and offer auto-recovery

## Files to Create
Glob `app/(chef)/*/page.tsx`, check sibling `error.tsx` exists. Create for every section missing one. Expected: ~67 new files.

## Pattern
Copy from `app/(chef)/events/error.tsx` or `app/(chef)/dashboard/error.tsx` as template. Each error.tsx is a `'use client'` component with identical structure, only the escape hatch link text varies.

## Acceptance
- Every `app/(chef)/*/` directory has an error.tsx
- All use reportClientBoundaryError
- All have retry + escape hatch
- No em dashes
