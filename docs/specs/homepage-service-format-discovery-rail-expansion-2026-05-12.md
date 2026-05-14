# Spec: Homepage Service Format Discovery Rail Expansion

> **Status:** pending future implementation
> **Queue date:** 2026-05-12
> **Requested date label:** 5/12/26
> **Priority:** P2 after `homepage-discovery-rail-completion-2026-05-12.md`
> **Scope:** service format discovery only
> **Implementation note:** Do not implement during the queue-recording pass. This item is for a later build agent.

## Timeline

| Event                                 | Date       | Agent/Session       | Commit |
| ------------------------------------- | ---------- | ------------------- | ------ |
| Queued for future implementation      | 2026-05-12 | Codex queue session |        |
| Status: pending future implementation | 2026-05-12 | Codex queue session |        |

---

## Developer Notes

Service format is one of the strongest conversion rails because it maps user intent to what a chef can actually offer.

Intent:

- Let users browse by how food is delivered or served.
- Keep service format distinct from meal type and occasion.
- Preserve format context into `/eat`, `/chefs`, public chef pages, inquiry, or booking only through explicit user actions.

---

## What This Does

Create a rail for service formats:

- private dinner
- meal prep
- catering
- cooking class
- drop-off
- family-style
- plated service
- tasting menu
- cocktail party
- buffet
- grazing table
- chef's table

---

## Format Classes

- **In-home service:** private dinner, plated, family-style, tasting menu.
- **Prepared service:** meal prep, drop-off, freezer meals.
- **Group service:** catering, buffet, cocktail bites, grazing table.
- **Education / experience:** cooking class, demo, chef's table.
- **Low-host-effort:** chef handles everything, drop-off, minimal cleanup.

---

## Homepage Modules

### High-Intent Formats

Examples:

- Private dinner
- Tasting menu
- Family-style

### Practical Formats

Examples:

- Meal prep
- Drop-off catering
- Freezer meals

### Group Formats

Examples:

- Catering
- Cocktail party
- Grazing table
- Buffet

### Experience Formats

Examples:

- Cooking class
- Chef's table
- Live demo

### Format Wildcard

Examples:

- Try a grazing table
- Make it family-style
- Chef's choice format

---

## Metadata

Recommended fields:

- `name`
- `slug`
- `formatClass`
- `hostEffort`
- `groupSizeFit`
- `planningHorizon`
- `chefServiceRequired`
- `compatibleMealTypes`
- `compatibleOccasions`
- `coverageScore`
- `priceFit`
- `defaultRoute`
- `defaultQuery`

---

## Slot Model

Example:

- Private Dinner
- Meal Prep
- Drop-Off Catering
- Family-Style
- Cocktail Bites
- Cooking Class
- Try a Grazing Table
- Explore Service Formats

Rules:

- Do not mix service format with cuisine labels.
- Do not claim a format is available unless downstream coverage supports it.
- Keep one practical and one high-intent format visible.

---

## Routing Rules

- Route to real `/eat`, `/chefs`, `/nearby`, or public chef pages.
- Preserve service format as query/filter context.
- No automatic booking, inquiry, event, group, or planning creation.
- No private operational data.

---

## Acceptance Criteria

- Rail supports in-home, prepared, group, education, and low-host-effort formats.
- Every format routes to real public destinations.
- Tests cover routing, format class balance, coverage gating, dedupe, hidden/dismissed behavior, and no record creation.

---

## Out Of Scope

- New service fulfillment workflows.
- Booking/inquiry write-path changes.
- Chef availability management.
