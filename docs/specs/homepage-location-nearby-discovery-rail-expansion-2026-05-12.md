# Spec: Homepage Location and Nearby Discovery Rail Expansion

> **Status:** pending future implementation
> **Queue date:** 2026-05-12
> **Requested date label:** 5/12/26
> **Priority:** P2 after `homepage-discovery-rail-completion-2026-05-12.md`
> **Scope:** location and near-me discovery only
> **Implementation note:** Do not implement during the queue-recording pass. This item is for a later build agent.

## Timeline

| Event                                 | Date       | Agent/Session       | Commit |
| ------------------------------------- | ---------- | ------------------- | ------ |
| Queued for future implementation      | 2026-05-12 | Codex queue session |        |
| Status: pending future implementation | 2026-05-12 | Codex queue session |        |

---

## Developer Notes

Location makes discovery actionable. This rail should use location carefully, with clear permission and fallback behavior.

Intent:

- Surface nearby chefs, local picks, and city/region discovery.
- Avoid brittle geolocation assumptions.
- Provide useful fallback when location is unknown.

---

## What This Does

Create a rail for location-led discovery:

- near me
- in your city
- local favorites
- neighborhood picks
- weekend nearby
- local chefs
- local seasonal picks
- nearby private dinners

---

## Location Classes

- **Explicit location:** user entered city/address/zip.
- **Permission location:** browser geolocation with consent.
- **Account location:** authenticated saved location.
- **Session location:** recent search location.
- **Fallback geography:** popular cities, service regions, national browse.

---

## Homepage Modules

### Near Me

Examples:

- Near me
- Nearby chefs
- Available nearby

### City / Region

Examples:

- In Boston
- In your city
- Local favorites
- Regional specialists

### Local Timely

Examples:

- This weekend nearby
- Farmers market nearby
- Seasonal local picks

### Location Wildcard

Examples:

- Hidden local chef
- Neighborhood pick
- Explore nearby

---

## Metadata

Recommended fields:

- `name`
- `slug`
- `locationSource`
- `city`
- `state`
- `region`
- `lat`
- `lng`
- `radiusMiles`
- `confidenceScore`
- `coverageScore`
- `privacyLevel`
- `defaultRoute`
- `defaultQuery`

---

## Slot Model

Example:

- Near Me
- Local Favorites
- Private Dinner Nearby
- This Weekend Nearby
- Neighborhood Pick
- Explore Your Area

Rules:

- Do not require geolocation to make the rail useful.
- Make user-entered location stronger than inferred location.
- Avoid showing exact location details unless user provided them.
- Degrade to city/region/national browse when location is unavailable.

---

## Routing Rules

- Route to `/nearby`, `/chefs`, `/eat`, or public chef pages only when real.
- Preserve location query context.
- No private address display.
- No automatic booking, inquiry, event, group, or planning creation.

---

## Acceptance Criteria

- Rail supports near-me, city, region, local-timely, and fallback discovery.
- Location source and confidence are explicit in code.
- Tests cover geolocation fallback, entered-location precedence, privacy boundaries, routing, dedupe, and empty-result handling.

---

## Out Of Scope

- New geocoder integration unless already available.
- Address storage changes.
- Delivery radius enforcement changes.
