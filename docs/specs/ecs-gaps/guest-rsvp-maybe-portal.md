# ECS Gap: Guest Portal RSVP "Maybe" Status

> Source: ECS Scorecard 2026-04-27 | User Type: Guest (85/100) | Dimension: Feature Depth (18/20)

## Problem
RSVP "maybe" status exists on the share page but NOT on the guest portal (portal-client.tsx only has yes/no). Asymmetric experience.

## Spec
1. Read `app/(public)/event/[eventId]/guest/[secureToken]/portal-client.tsx`
2. Find the RSVP section (currently yes/no buttons)
3. Add "Maybe" as a third option matching the share page pattern
4. Use the same server action and database values

## Acceptance
- Guest portal shows three RSVP options: Yes, Maybe, No
- "Maybe" uses the same enum value as the share page
- Visual styling matches the other two buttons
