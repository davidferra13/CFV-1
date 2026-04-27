# ECS Gap: Public Directory Surface Consolidation

> Source: ECS Scorecard 2026-04-27 | User Type: Public Visitor (89/100) | Dimension: Flow Continuity (18/20)

## Problem
Two parallel directory surfaces (/chefs and /nearby) with different implementations confuse visitors about the canonical browse path.

## Spec
Evaluate and consolidate:
1. Read both `app/(public)/chefs/page.tsx` and `app/(public)/nearby/page.tsx`
2. Determine which is more complete (likely /nearby based on the audit)
3. Option A: Redirect /chefs to /nearby (simple, clean)
4. Option B: Make /chefs a filtered view of the same data source as /nearby
5. Ensure all cross-links point to the canonical directory

## Acceptance
- One canonical directory surface
- No confusion about which to use
- All internal links updated
- SEO: proper redirects if consolidating
