# Spec: Homepage Group Size Discovery Rail Expansion

> **Status:** implemented
> **Queue date:** 2026-05-12
> **Requested date label:** 5/12/26
> **Priority:** P2 after `homepage-discovery-rail-completion-2026-05-12.md`
> **Scope:** group size discovery only
> **Implementation note:** Do not implement during the queue-recording pass. This item is for a later build agent.

## Timeline

| Event                                 | Date       | Agent/Session       | Commit |
| ------------------------------------- | ---------- | ------------------- | ------ |
| Queued for future implementation      | 2026-05-12 | Codex queue session |        |
| Status: pending future implementation | 2026-05-12 | Codex queue session |        |
| Implemented in production             | 2026-05-13 | Build agent         |        |
| Status: implemented                   | 2026-05-14 | Housekeeping        |        |

---

## Developer Notes

Group size is a conversion-critical discovery dimension because it changes service format, budget, chef fit, and planning needs.

Intent:

- Let users start from headcount.
- Keep group size distinct from occasion and service format.
- Preserve headcount context without creating events.

---

## What This Does

Create a rail for group-size discovery:

- dinner for two
- small group
- family meal
- 10-20 guests
- big party
- corporate group
- drop-off for a crowd
- intimate tasting

---

## Group Size Classes

- **Solo / couple:** 1-2 people.
- **Small group:** 3-6 people.
- **Family / household:** 4-8 people.
- **Dinner party:** 6-12 people.
- **Medium event:** 10-25 people.
- **Large event:** 25+ people.
- **Corporate / institutional:** teams, offices, retreats.

---

## Homepage Modules

### Intimate

Examples:

- Dinner for two
- Date night for two
- Intimate tasting

### Household

Examples:

- Family meal
- Meal prep for the week
- Kid-friendly group

### Dinner Party

Examples:

- Small dinner party
- 10-12 guests
- Friends over

### Large Group

Examples:

- Big party
- Catering for a crowd
- Corporate group

### Group Size Wildcard

Examples:

- Make it family-style
- Feed a crowd
- Small group pick

---

## Metadata

Recommended fields:

- `name`
- `slug`
- `minGuests`
- `maxGuests`
- `groupClass`
- `serviceFormatFit`
- `budgetFit`
- `occasionFit`
- `chefCoverageScore`
- `coverageScore`
- `defaultRoute`
- `defaultQuery`

---

## Slot Model

Example:

- Dinner for Two
- Family Meal
- Small Dinner Party
- 10-20 Guests
- Feed a Crowd
- Corporate Lunch
- Explore by Group Size

Rules:

- Do not imply capacity unless downstream chef/service data supports it.
- Preserve headcount as intent, not an event record.
- Keep mobile labels short.

---

## Routing Rules

- Route to real public destinations with headcount query context.
- No automatic event, booking, inquiry, quote, group, or planning creation.
- No private event or quote data exposure.

---

## Acceptance Criteria

- Rail supports couple, small group, household, dinner party, medium, large, and corporate group classes.
- Headcount context is preserved into deeper discovery.
- Tests cover routing, capacity gating, dedupe, hidden/dismissed behavior, and no record creation.

---

## Out Of Scope

- Capacity scheduling engine changes.
- Quote calculation changes.
- Event creation.
