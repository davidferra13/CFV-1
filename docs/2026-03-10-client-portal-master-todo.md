# Client Portal Master TODO

Last updated: 2026-03-10

## Closed In This Pass

- `/client/[token]` is now explicitly public in route policy and middleware coverage.
- `/survey/[token]` now lives at `app/survey/[token]` instead of under the authenticated client layout.
- The public token portal is now view-only and no longer points visitors into authenticated `/my-*` flows.
- Public token routes are covered by unit tests and wired into the unauthenticated Playwright project.
- `My Orders` was removed from client navigation and the dead `/my-orders` route was deleted.
- The dead `/my-cannabis` client route was deleted.
- The dead `/my-reservations` route was deleted, and the unused reservation portal action/types were removed.
- Fake zero/default fallback behavior was removed from client spending and payment-plan flows.
- Stale route references were removed from screenshot and middleware coverage.

## Remaining P0

- Rebuild reservations on a real client-safe access model before reintroducing them.
- Replace email/full-name matching in feedback and related portal lookups with stable ID-based joins.
- Add a seeded valid client portal token to Playwright so the valid-token path is exercised, not just invalid-token behavior.

## Remaining P1

- Decide whether `/my-loyalty` and `/my-rewards` are distinct products or duplicate surface, then merge or clarify.
- Audit other client loaders that still collapse query failures into empty-state UI, especially hub and feedback-adjacent reads.
- Finish doc cleanup in older historical notes that still mention removed routes or pre-fix survey placement.
