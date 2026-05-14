# Spec: Homepage Chef-Led Discovery Rail Expansion

> **Status:** implemented
> **Queue date:** 2026-05-12
> **Requested date label:** 5/12/26
> **Priority:** P2 after `homepage-discovery-rail-completion-2026-05-12.md`
> **Scope:** chef-led discovery only
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

This spec covers the chef-led rail expansion that turns discovery from abstract categories into real people users can remember, save, revisit, and book.

Intent:

- Surface saved, nearby, new, available, specialty, and story-rich chefs.
- Keep public chef pages as canonical proof.
- Never expose private operational data.
- Avoid fake chef cards or placeholder proof.

---

## What This Does

Create a homepage rail layer for chef-led discovery:

- saved chefs
- new chefs
- highly reviewed chefs
- near you
- available soon
- chef specialties
- chef stories
- chef worth remembering
- chefs similar to one you saved
- chefs with public menu/package proof

---

## Chef-Led Classes

- **Saved / remembered:** saved chefs, recently viewed chefs, pinned chefs.
- **Nearby:** chefs in current city, service area, or region.
- **Available:** chefs with real public availability or accepting-inquiries status.
- **Specialty:** cuisine, service type, dietary confidence, or event fit.
- **Proof-rich:** public reviews, public menus, profile completeness, press/story.
- **New / fresh:** newly added or recently updated profiles.
- **Similar:** related to saved, clicked, or long-dwell chefs.

---

## Homepage Modules

### Saved Chefs

Examples:

- Saved chefs
- Chefs you viewed
- Pick up where you left off

Purpose: make the rail personal and durable.

### Nearby Chefs

Examples:

- Near you
- In your city
- Local favorites
- Nearby chefs for this weekend

Purpose: make discovery actionable by geography.

### Specialty Chefs

Examples:

- Great for private dinners
- Vegan-friendly chefs
- Modern Italian specialists
- Tasting menu chefs

Purpose: connect chef identity to user intent.

### Proof-Rich Chefs

Examples:

- Highly reviewed
- Recently booked
- Public menu spotlight
- Repeat-client favorite

Purpose: reduce uncertainty.

### Fresh / New Chefs

Examples:

- New to ChefFlow
- Recently updated profiles
- New menus to explore

Purpose: keep discovery fresh without randomization.

### Chef Wildcard

Examples:

- Chef worth remembering
- Hidden local chef
- Chef outside your usual

Purpose: controlled people-led spontaneity.

---

## Metadata

Recommended fields:

- `chefId`
- `publicSlug`
- `displayName`
- `city`
- `serviceAreas`
- `specialties`
- `cuisineTags`
- `serviceFormats`
- `acceptingInquiries`
- `availabilitySignal`
- `reviewScore`
- `reviewCount`
- `savedByViewer`
- `recentlyViewedByViewer`
- `publicProofScore`
- `profileCompletenessScore`
- `coverageScore`
- `defaultRoute`

---

## Slot Model

Example composition:

- 1 saved/recent chef item
- 2 nearby chef items
- 1 specialty chef item
- 1 proof-rich chef item
- 1 new/fresh chef item
- 1 chef wildcard
- 1 "Explore chefs" item

Rules:

- Do not show private or unpublished chefs.
- Do not show fake availability.
- Prefer chefs with public proof.
- Degrade cleanly when location or saved-chef data is unavailable.

---

## Routing Rules

- Chef items route to public chef profiles or real public directory filters.
- Saved/recent items must respect auth/anonymous storage contracts.
- No automatic booking, inquiry, event, group, or planning creation.
- No private recipes, menus, costs, client data, quotes, invoices, or event IDs.

---

## Acceptance Criteria

- Chef-led rail can surface saved, nearby, specialty, proof-rich, fresh, and wildcard chef items.
- Public chef profile remains canonical detail destination.
- No private or fake chef proof is shown.
- Tests cover routing, public visibility, saved/recent behavior, location fallback, proof gating, dedupe, and hidden/dismissed behavior.

---

## Out Of Scope

- Chef onboarding.
- Review collection.
- Availability write paths.
- Booking/inquiry write-path changes.
