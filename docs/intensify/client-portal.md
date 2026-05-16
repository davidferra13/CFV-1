# Intensify: client-portal

## Run 2026-05-16

STATUS: fresh
DEPTH: normal

SURFACED:

- PRODUCTION BUG: Two parallel token systems (portal_access_token_hash vs hub_groups.group_token). Lifecycle/cadence emails produce URLs portal cannot resolve. Confirmed 404 path.
- confidence-cadence defines portalContent (headline, countdown, menu, checklist) per lifecycle point but portal UI never renders it
- getLifecycleTimeline and getLifecycleProgressForClient exported but never called from portal; portal uses hardcoded stage mapping
- track-visit route uses requireClient (session auth) but token-portal clients have no session; route is unreachable
- CIL and client-portal are mutually blind (no signal flows either direction)
- cadence-scheduler and client-notifications manually query hub_groups.group_token instead of using createClientPortalLinkForClient

ACTED ON:

- Move 1: Token unification. Migrated client-notifications.ts and cadence-scheduler.ts from hub_groups.group_token to createClientPortalLinkForClient. Portal URLs in lifecycle/cadence emails now resolve correctly.

SKIPPED:

- Rail Prominence (#4): BLOCKED on dependency
- Client Intelligence Ledger (#5): BLOCKED on dependency
- Event UI Polish (#8): premature - structural wiring must land first
- Financial summary re-query: low-yield optimization

NEXT TRIGGER: After token unification lands and email->portal flows verified end-to-end
