# ECS Gap: Client Event Detail Error Boundary

> Source: ECS Scorecard 2026-04-27 | User Type: Client (91/100) | Dimension: Error Honesty (18/20)

## Problem
`app/(client)/my-events/[id]/error.tsx` is bare-bones: no error reporting, no digest display, no navigation links beyond "Try again". The root client error boundary is polished but this sub-page one is not.

## Spec
Upgrade `app/(client)/my-events/[id]/error.tsx` to match the root client error boundary pattern:
1. Call `reportClientBoundaryError(error)` in useEffect
2. Display error.digest if available
3. Add "Try Again" button (reset())
4. Add "Go to My Events" link as escape hatch
5. Add chunk error detection with auto-recovery

## Reference
Copy pattern from `app/(client)/error.tsx` (the polished root boundary).

## Acceptance
- Error boundary reports errors
- Shows digest ID
- Has retry + escape hatch
- Chunk error recovery works
