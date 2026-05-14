# Spec: Homepage Experience Level and Vibe Discovery Rail Expansion

> **Status:** pending future implementation
> **Queue date:** 2026-05-12
> **Requested date label:** 5/12/26
> **Priority:** P2 after `homepage-discovery-rail-completion-2026-05-12.md`
> **Scope:** experience level and vibe discovery only
> **Implementation note:** Do not implement during the queue-recording pass. This item is for a later build agent.

## Timeline

| Event                                 | Date       | Agent/Session       | Commit |
| ------------------------------------- | ---------- | ------------------- | ------ |
| Queued for future implementation      | 2026-05-12 | Codex queue session |        |
| Status: pending future implementation | 2026-05-12 | Codex queue session |        |

---

## Developer Notes

Vibe helps users express the kind of experience they want when they do not know the cuisine, chef, or format yet.

Intent:

- Support casual, elevated, fine dining, cozy, adventurous, romantic, impressive, relaxed, family-style, and celebration-worthy discovery.
- Keep vibe labels tasteful and short.
- Avoid vague marketing routes.

---

## What This Does

Create a rail for experience level and vibe:

- casual
- elevated
- fine dining
- family-style
- cozy
- adventurous
- romantic
- celebration-worthy
- impressive but relaxed
- low-key

---

## Vibe Classes

- **Casual:** relaxed, low-key, easygoing.
- **Elevated:** polished, premium, special.
- **Fine dining:** tasting menu, plated, chef's table.
- **Cozy:** comfort, warm, intimate.
- **Adventurous:** new cuisines, bold flavors, surprise.
- **Romantic:** date night, anniversary, intimate dinner.
- **Group-friendly:** family-style, relaxed hosting.

---

## Homepage Modules

### Familiar Vibes

Examples:

- Casual
- Cozy
- Family-style

### Elevated Vibes

Examples:

- Elevated
- Fine dining
- Celebration-worthy

### Emotional Vibes

Examples:

- Romantic
- Adventurous
- Impressive but relaxed

### Vibe Wildcard

Examples:

- Outside your usual
- Make it cozy
- Go elevated

---

## Metadata

Recommended fields:

- `name`
- `slug`
- `vibeClass`
- `experienceLevel`
- `serviceFormatFit`
- `occasionFit`
- `cuisineFit`
- `priceFit`
- `coverageScore`
- `noveltyScore`
- `defaultRoute`
- `defaultQuery`

---

## Slot Model

Example:

- Casual
- Cozy
- Romantic
- Adventurous
- Elevated
- Family-Style
- Impressive but Relaxed
- Explore Vibes

Rules:

- Avoid vague labels that do not map to filters/results.
- Keep a balance of casual and elevated.
- Do not over-index on premium vibes.

---

## Routing Rules

- Route to real public destinations with vibe context.
- No placeholder pages.
- No automatic booking, inquiry, event, group, or planning creation.
- No private operational data.

---

## Acceptance Criteria

- Rail supports casual, elevated, fine dining, cozy, adventurous, romantic, and group-friendly vibes.
- Vibe items map to real public discovery contexts.
- Tests cover routing, balance, dedupe, hidden/dismissed behavior, coverage gating, and no vague/fake destinations.

---

## Out Of Scope

- Brand copy overhaul.
- Booking/inquiry write-path changes.
