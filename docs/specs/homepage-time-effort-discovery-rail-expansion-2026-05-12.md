# Spec: Homepage Time and Effort Discovery Rail Expansion

> **Status:** pending future implementation
> **Queue date:** 2026-05-12
> **Requested date label:** 5/12/26
> **Priority:** P2 after `homepage-discovery-rail-completion-2026-05-12.md`
> **Scope:** time and effort discovery only
> **Implementation note:** Do not implement during the queue-recording pass. This item is for a later build agent.

## Timeline

| Event                                 | Date       | Agent/Session       | Commit |
| ------------------------------------- | ---------- | ------------------- | ------ |
| Queued for future implementation      | 2026-05-12 | Codex queue session |        |
| Status: pending future implementation | 2026-05-12 | Codex queue session |        |

---

## Developer Notes

The developer asked to fully expand each homepage discovery rail section. This spec covers time and effort.

Intent:

- Let users start from "how much time/energy do I have?"
- Keep homepage options practical and scannable.
- Distinguish quick cooking, low-effort hosting, and chef-service planning.
- Add occasional useful surprise without undermining intent.
- Keep this queued for future implementation only.

---

## What This Does

Create a discovery rail for time, urgency, complexity, and effort. This includes fast meals, low-cleanup formats, make-ahead plans, slow projects, weekend cooking, and high-touch chef experiences.

---

## Time / Effort Dimensions

- **Clock time:** 15 minutes, 30 minutes, under 1 hour, all-day project.
- **Planning horizon:** tonight, tomorrow, this weekend, next week.
- **Hands-on effort:** no-cook, low prep, one-pan, make-ahead.
- **Cleanup effort:** minimal cleanup, sheet pan, one pot.
- **Skill level:** beginner-friendly, confident cook, weekend project.
- **Service complexity:** simple drop-off, family-style, plated dinner, tasting menu.

---

## Homepage Modules

### Fast Decisions

Examples:

- Dinner tonight
- 15-minute ideas
- 30-minute meals
- Quick lunch

Purpose: capture urgent intent.

### Low Effort

Examples:

- No-cook
- One-pan
- Minimal cleanup
- Low-prep dinner
- Make-ahead

Purpose: help users who want fewer steps.

### Planning Ahead

Examples:

- Meal prep for next week
- Weekend dinner
- Party prep
- Holiday make-ahead

Purpose: bridge into planning and chef discovery.

### High-Touch Projects

Examples:

- Weekend project
- Tasting menu
- Slow braise
- Fermentation project
- Multi-course dinner

Purpose: give ambitious users a path without making quick users work harder.

### Service-Effort Fit

Examples:

- Chef handles everything
- Drop-off catering
- Family-style service
- Minimal host effort

Purpose: connect effort relief to ChefFlow's service value.

### Surprise Effort Bridge

Examples:

- "Make tonight easier"
- "Try one-pan"
- "Plan ahead for Sunday"
- "Weekend project pick"

Purpose: controlled suggestions based on time and user history.

---

## Full Destination

Preferred route:

- `/eat` with time/effort filters and preserved context.

Required capabilities:

- Browse by clock time.
- Browse by effort level.
- Browse by cleanup level.
- Browse by planning horizon.
- Combine with cuisine, meal type, dietary needs, location, budget, and group size.
- Route chef-service effort-relief items to real chef discovery or public chef pages only when supported.

---

## Metadata

Recommended fields:

- `name`
- `slug`
- `timeMinutesMin`
- `timeMinutesMax`
- `planningHorizon`
- `effortLevel`
- `cleanupLevel`
- `skillLevel`
- `hostEffort`
- `serviceFormat`
- `coverageScore`
- `popularityScore`
- `urgencyScore`
- `noveltyScore`
- `relatedTimeEffortItems`
- `defaultRoute`
- `defaultQuery`

Suggested values:

- `effortLevel`: `very_low`, `low`, `moderate`, `high`, `project`
- `cleanupLevel`: `minimal`, `standard`, `heavy`, `chef_handles`
- `planningHorizon`: `now`, `tonight`, `tomorrow`, `weekend`, `next_week`, `future`

---

## Slot Model

Example composition:

- 2 urgent/fast items
- 2 low-effort items
- 1 planning-ahead item
- 1 service-effort item
- 1 ambitious/project item
- 1 spontaneous bridge
- 1 "Explore time and effort" item

Example output:

- Dinner Tonight
- 30-Minute Meals
- One-Pan
- Minimal Cleanup
- Meal Prep Next Week
- Chef Handles Everything
- Weekend Project
- Explore Time & Effort

Rules:

- Bias by local time but avoid total personalization lock-in.
- Keep fast and low-effort options prominent on mobile.
- Do not send fast items to slow or complex destinations.
- Keep service-effort claims honest.

---

## Controlled Spontaneity

Good examples:

- At 5 PM: "Make tonight easier."
- On Friday: "Weekend project pick."
- After repeated low-effort clicks: "Try make-ahead meal prep."

Bad examples:

- Suggesting a multi-day project to someone who selected 15 minutes.
- Claiming a chef handles everything when the service format is not known.
- Repeating a dismissed urgent item.

---

## Routing Rules

- Route to real `/eat`, `/chefs`, `/nearby`, or public chef/profile destinations only.
- Preserve time and effort query context.
- No placeholder routes.
- No automatic booking, inquiry, event, group, or planning creation.
- No private operational data.

---

## Acceptance Criteria

- Homepage can surface time/effort entry points without a giant list.
- Clock time, effort, cleanup, planning horizon, skill level, and service-effort are modeled distinctly.
- Slot logic adapts to time of day without becoming repetitive.
- Spontaneous items are contextual and coverage-gated.
- Tests cover routing, time bias, dedupe, hidden/dismissed behavior, effort consistency, and empty-result behavior.

---

## Out Of Scope

- Recipe timer implementation.
- Booking/inquiry write-path changes.
- Cuisine, meal type, diet, ingredient, occasion, seasonal, or technique implementation outside time/effort bridging.
