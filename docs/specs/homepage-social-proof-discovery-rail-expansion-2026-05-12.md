# Spec: Homepage Social Proof Discovery Rail Expansion

> **Status:** pending future implementation
> **Queue date:** 2026-05-12
> **Requested date label:** 5/12/26
> **Priority:** P2 after public proof sources are reliable
> **Scope:** social proof discovery only
> **Implementation note:** Do not implement during the queue-recording pass. This item is for a later build agent.

## Timeline

| Event                                 | Date       | Agent/Session       | Commit |
| ------------------------------------- | ---------- | ------------------- | ------ |
| Queued for future implementation      | 2026-05-12 | Codex queue session |        |
| Status: pending future implementation | 2026-05-12 | Codex queue session |        |

---

## Developer Notes

Social proof can help users trust discovery, but it must not fabricate popularity, bookings, reviews, or saves.

Intent:

- Surface real popularity and trust signals.
- Keep proof public-safe and honest.
- Avoid fake "trending" claims.

---

## What This Does

Create a rail for proof-led discovery:

- popular this week
- highly saved
- recently booked
- loved by families
- great for date night
- repeat-client favorites
- highly reviewed
- new public reviews

---

## Proof Classes

- **Engagement proof:** saved, clicked, viewed, long-dwelled.
- **Booking proof:** recently booked, repeat clients, inquiry volume.
- **Review proof:** rating, review count, public snippets.
- **Fit proof:** loved by families, great for date night, group-friendly.
- **Freshness proof:** new review, updated menu, newly listed.

---

## Homepage Modules

### Popularity

Examples:

- Popular this week
- Highly saved
- Most explored nearby

### Reviews

Examples:

- Highly reviewed
- New reviews
- Guest favorites

### Booking / Repeat

Examples:

- Recently booked
- Repeat-client favorite
- Fast response

### Fit Proof

Examples:

- Loved by families
- Great for date night
- Good for groups

---

## Metadata

Recommended fields:

- `name`
- `slug`
- `proofClass`
- `publicMetricName`
- `publicMetricValue`
- `timeWindow`
- `minimumThreshold`
- `sourceTable`
- `sourcePublicSafe`
- `confidenceScore`
- `coverageScore`
- `defaultRoute`
- `defaultQuery`

---

## Slot Model

Example:

- Popular This Week
- Highly Saved
- Highly Reviewed
- Great for Date Night
- Loved by Families
- Repeat Favorites
- Explore Trusted Picks

Rules:

- Do not show proof claims below thresholds.
- Do not expose low-count metrics that feel creepy or identifying.
- Do not fabricate trending/popular labels.
- Degrade to neutral copy when proof is insufficient.

---

## Routing Rules

- Route to real public destinations only.
- Public proof must be source-backed and safe.
- No private client data, event data, quotes, invoices, costs, internal notes, or private menus.
- No automatic record creation.

---

## Acceptance Criteria

- Rail supports engagement, booking, review, fit, and freshness proof classes.
- Every proof label is backed by public-safe data or suppressed.
- Tests cover thresholds, public-safety gating, routing, dedupe, hidden/dismissed behavior, and no fabricated claims.

---

## Out Of Scope

- Review collection.
- Analytics warehouse changes.
- Booking/inquiry write-path changes.
