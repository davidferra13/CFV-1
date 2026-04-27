# ECS Gap: Chef Network Opportunity Board

> Source: ECS Scorecard 2026-04-27 | User Type: Chef Network Peers (86/100) | Dimension: Feature Depth (18/20)

## Problem
Opportunities are embedded in social feed posts but have no standalone browsable/filterable page. Chefs can't easily find available gigs.

## Spec
1. Create `app/(chef)/network/opportunities/page.tsx`
2. List all opportunity posts with: role title, compensation, duration, location, status, posted by
3. Filter by: role type, compensation range, duration, location/region
4. Sort by: newest, compensation, urgency
5. Express interest button per opportunity (uses existing `expressInterestInOpportunity` action)
6. Link from network nav and Collab tab

## Data Source
Read `lib/network/opportunity-actions.ts` for existing actions and schema.

## Acceptance
- Standalone browsable page at /network/opportunities
- Filterable and sortable
- Express interest works
- Linked from network navigation
