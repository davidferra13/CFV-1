# Spec: Homepage Discovery and Spontaneity Rail Expansion

> **Status:** pending future implementation
> **Queue date:** 2026-05-12
> **Requested date label:** 5/12/26
> **Priority:** P2 after all core rail dimensions have stable contracts
> **Scope:** explicit discovery, novelty, and spontaneity system only
> **Implementation note:** Do not implement during the queue-recording pass. This item is for a later build agent.

## Timeline

| Event                                 | Date       | Agent/Session       | Commit |
| ------------------------------------- | ---------- | ------------------- | ------ |
| Queued for future implementation      | 2026-05-12 | Codex queue session |        |
| Status: pending future implementation | 2026-05-12 | Codex queue session |        |

---

## Developer Notes

The developer explicitly wants spontaneity "from time to time" while avoiding impractical rails. This spec covers the cross-cutting spontaneity system that can inject novelty across cuisine, meal type, diet, time/effort, ingredients, occasions, seasonal picks, and techniques.

Intent:

- Add surprise without chaos.
- Make novelty feel intentional and useful.
- Prevent the homepage from becoming random.
- Respect user constraints, dismissals, and coverage.
- Keep this queued for future implementation only.

---

## What This Does

Create a controlled spontaneity layer for homepage discovery. This layer decides when and how to show wildcard items such as:

- Surprise me
- Today's hidden cuisine
- Ingredient roulette
- Cook from somewhere new
- Unexpected pairing
- Regional deep dive
- Something outside your usual
- Peak right now
- Weekend project pick
- Chef's choice

This is not a replacement for the normal rails. It is a small, governed injection system.

---

## Spontaneity Principles

- Surprise should occupy a small percentage of the visible rail, not the whole rail.
- Surprise must be coverage-gated.
- Surprise must respect hard constraints.
- Surprise should use bridge logic from known preferences.
- Surprise should learn from hides, ignores, clicks, saves, and long dwells.
- Surprise should degrade to "Explore" when confidence is low.

Target feel:

> "Oh, interesting."

Not:

> "Why is this here?"

---

## Discovery Modes

### Bridge Novelty

Suggest something adjacent to a known preference.

Examples:

- Likes Thai -> suggest Lao.
- Likes Mexican -> suggest Oaxacan.
- Likes brunch -> suggest pastry-forward brunch.
- Likes grilling -> suggest live fire.

### Random But Reasonable

Choose from a constrained pool with enough coverage and no known conflict.

Examples:

- Hidden gem cuisine with chef coverage.
- Seasonal ingredient with strong public content.
- Technique with beginner-friendly route.

### Seasonal Surprise

Use date, season, and freshness.

Examples:

- Peak tomatoes.
- Long weekend grilling.
- Winter soup pick.

### Challenge Mode

A slightly bolder suggestion for users who engage with novelty.

Examples:

- Cook outside your comfort zone.
- Regional deep dive.
- Weekend project.

### Recovery / Re-Engagement

Use recent abandoned or saved signals.

Examples:

- Pick up where you left off.
- Another way into Thai.
- Similar to the chef you saved.

---

## Wildcard Inventory

Wildcard items should be typed so they can obey downstream contracts.

Suggested types:

- `cuisine_wildcard`
- `meal_type_wildcard`
- `constraint_bridge`
- `time_effort_wildcard`
- `ingredient_wildcard`
- `occasion_mood_wildcard`
- `seasonal_wildcard`
- `technique_wildcard`
- `chef_wildcard`
- `route_explore_wildcard`

Each wildcard must declare:

- what dimension it belongs to
- why it is being shown
- what constraints it respects
- what route it lands on
- what fallback should render if coverage is weak

---

## Frequency Rules

Recommended behavior:

- Show at most 1-2 wildcard items per homepage rail group.
- Use explicit "Surprise me" as the safest always-available option.
- Passive wildcard injection should be roughly 10-20% of eligible sessions.
- Increase novelty only after the user clicks/saves novelty items.
- Decrease novelty after hides, quick backs, or repeated ignores.
- Never show a hidden wildcard again in the same session.

---

## Constraint Rules

Wildcards must respect:

- hard dietary/allergy constraints
- hidden/dismissed items
- unsupported routes
- sparse public coverage
- location limitations when relevant
- age/legal constraints if future categories ever require them
- private-data boundaries

Wildcards must not:

- imply safety certification
- create records
- expose private data
- route to fake pages
- override explicit filters

---

## Metadata

Recommended fields:

- `id`
- `label`
- `wildcardType`
- `sourceDimension`
- `noveltyScore`
- `confidenceScore`
- `coverageScore`
- `constraintCompatibility`
- `reasonCode`
- `fallbackRoute`
- `defaultRoute`
- `defaultQuery`
- `expiresAt`
- `dismissalKey`
- `cooldownDays`

Suggested `reasonCode` values:

- `adjacent_to_preference`
- `seasonal_peak`
- `recently_viewed_related`
- `saved_related`
- `underexplored_catalog`
- `high_coverage_hidden_gem`
- `explicit_surprise_request`

---

## UX Requirements

- Keep labels short.
- Do not explain algorithm mechanics in public copy.
- Optional public copy can be simple: "Because you like Thai" or "Peak right now."
- Dev/admin-only debug can expose score reasons, but never public production copy.
- Dismiss/undo should work where the rail supports feedback controls.
- Wildcards should never steal keyboard focus from duplicate marquee clones.

---

## Routing Rules

- Every wildcard routes to a real public destination.
- Fallbacks must be real destinations.
- Wildcards preserve context as query/filter state.
- No automatic booking, inquiry, event, group, or planning creation.
- No private recipes, menus, costs, inventory, vendor, client, quote, invoice, or event data.

---

## Acceptance Criteria

- A controlled spontaneity layer exists as a typed system, not ad hoc random picks.
- Wildcards are frequency-limited, coverage-gated, and constraint-aware.
- Dismissed wildcard items respect cooldowns.
- Bridge novelty works from known preferences.
- Explicit "Surprise me" can be offered without making the whole rail random.
- Tests cover frequency limits, coverage gating, hard constraint filtering, dismissal cooldowns, routing, fallback behavior, reason codes, and no-private-data boundaries.

---

## Out Of Scope

- Implementing every individual dimension rail.
- Generative AI content creation.
- Automatic planning, inquiry, booking, group, or event creation.
- Public algorithm debug explanations.
