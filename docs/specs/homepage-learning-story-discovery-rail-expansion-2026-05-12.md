# Spec: Homepage Learning and Story Discovery Rail Expansion

> **Status:** implemented
> **Queue date:** 2026-05-12
> **Requested date label:** 5/12/26
> **Priority:** P2 after core conversion rails are stable
> **Scope:** learning and story discovery only
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

Learning/story discovery makes the product feel deeper, but it should not distract from booking paths or invent editorial content that does not exist.

Intent:

- Surface cuisine stories, chef stories, ingredient origins, seasonal explainers, and technique context.
- Keep story modules public-safe and source-backed.
- Avoid generated filler.

---

## What This Does

Create a rail for learning and story:

- regional food stories
- chef techniques
- ingredient origins
- why this cuisine matters
- seasonal explainers
- food traditions
- chef background
- menu story

---

## Story Classes

- **Cuisine context:** regional histories, traditions, lineage.
- **Chef story:** background, specialties, public profile narrative.
- **Ingredient story:** origin, season, producer/market context when public-safe.
- **Technique story:** method context, craft, approachable learning.
- **Seasonal story:** why now, peak windows, local season.
- **Menu story:** public menus/packages and the idea behind them.

---

## Homepage Modules

### Cuisine Stories

Examples:

- Why Sichuan?
- Regional deep dive
- Food traditions

### Chef Stories

Examples:

- Chef background
- Meet a local chef
- Signature style

### Ingredient Stories

Examples:

- Peak ingredient
- Ingredient origin
- Farmers market story

### Technique Stories

Examples:

- Live-fire cooking
- Fermentation explained
- Pastry craft

### Story Wildcard

Examples:

- Learn something delicious
- Story behind the dish
- Why this matters

---

## Metadata

Recommended fields:

- `id`
- `title`
- `storyClass`
- `sourceType`
- `sourceId`
- `publicSafe`
- `sourceBacked`
- `relatedCuisine`
- `relatedIngredient`
- `relatedTechnique`
- `relatedChefId`
- `coverageScore`
- `defaultRoute`

---

## Slot Model

Example:

- Regional Food Stories
- Meet a Local Chef
- Ingredient Origins
- Seasonal Explainer
- Chef Technique
- Learn Something Delicious

Rules:

- Do not create empty editorial pages.
- Do not generate unsourced cultural claims.
- Prefer public chef/profile/menu content already present.
- Keep story items secondary to conversion rails.

---

## Routing Rules

- Route to real public story, profile, cuisine, ingredient, `/eat`, or chef destinations.
- No private operational data.
- No private recipes, menus, costs, client records, quotes, invoices, or event IDs.
- No automatic record creation.

---

## Acceptance Criteria

- Rail supports cuisine, chef, ingredient, technique, seasonal, and menu story classes.
- Story items are public-safe and source-backed.
- Tests cover routing, source gating, cultural-claim fallback, dedupe, hidden/dismissed behavior, and no fake editorial destinations.

---

## Out Of Scope

- AI-generated article publishing.
- CMS implementation.
- Booking/inquiry write-path changes.
