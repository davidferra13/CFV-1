# Spec: Homepage Occasion and Mood Discovery Rail Expansion

> **Status:** implemented
> **Queue date:** 2026-05-12
> **Requested date label:** 5/12/26
> **Priority:** P2 after `homepage-discovery-rail-completion-2026-05-12.md`
> **Scope:** occasion and mood discovery only
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

This spec expands the homepage rail section for occasions and moods. It should help users start from why they are eating or hosting, not only what they want to eat.

Intent:

- Support real social occasions and emotional food moods.
- Keep event-like items distinct from casual cravings.
- Preserve context into planning, chef discovery, inquiry, or booking only through existing user-controlled paths.
- Avoid fake event creation from homepage clicks.

---

## What This Does

Create an occasion/mood rail for entry points like date night, birthday dinner, game day, sick day, rainy day, comfort food, impress someone, family dinner, work celebration, and big group gathering.

---

## Occasion / Mood Classes

- **Personal moods:** comfort food, cozy, adventurous, light, celebratory.
- **Small social occasions:** date night, dinner with friends, family dinner.
- **Milestones:** birthday, anniversary, graduation, engagement.
- **Calendar-adjacent occasions:** game day, holiday dinner, weekend brunch.
- **Care situations:** sick day, new parent meal, sympathy meal.
- **Professional occasions:** team lunch, client dinner, office party.
- **High-intent hosting:** private dinner, tasting menu, party, catered gathering.

---

## Homepage Modules

### Everyday Moods

Examples:

- Comfort food
- Cozy dinner
- Light and fresh
- Adventurous
- Something impressive

Purpose: let users start emotionally.

### Social Plans

Examples:

- Date night
- Dinner with friends
- Family dinner
- Birthday dinner
- Weekend brunch

Purpose: bridge to meal planning and chef discovery.

### Big Moments

Examples:

- Anniversary
- Graduation
- Engagement dinner
- Holiday table
- Celebration dinner

Purpose: support higher-value planning moments.

### Care / Support

Examples:

- Sick day
- New parent meals
- Sympathy meal
- Recovery meals

Purpose: support human-context meals without over-medicalizing.

### Work / Group

Examples:

- Team lunch
- Client dinner
- Office celebration
- Retreat meal

Purpose: bridge business/group occasions into chef and catering discovery.

### Surprise Mood

Examples:

- "Cook outside your comfort zone"
- "Make it cozy"
- "Impress someone"
- "Unexpected celebration"

Purpose: create emotional discovery without chaos.

---

## Full Destination

Preferred route:

- `/eat` with occasion/mood context.

Required capabilities:

- Browse occasions.
- Browse moods.
- Combine with cuisine, meal type, dietary needs, location, budget, headcount, and date window.
- Preserve occasion context into planning, chef discovery, inquiry, or booking only through explicit user actions.

---

## Metadata

Recommended fields:

- `name`
- `slug`
- `occasionClass`
- `moodTags`
- `planningHorizon`
- `groupSizeFit`
- `budgetSensitivity`
- `chefServiceFit`
- `seasonalRelevance`
- `coverageScore`
- `popularityScore`
- `familiarityScore`
- `noveltyScore`
- `relatedOccasions`
- `defaultRoute`
- `defaultQuery`

Suggested `occasionClass` values:

- `mood`
- `small_social`
- `milestone`
- `calendar`
- `care`
- `work`
- `hosting`

---

## Slot Model

Example composition:

- 2 everyday moods
- 2 social occasions
- 1 milestone
- 1 work/group item
- 1 care/support item when appropriate
- 1 spontaneous mood bridge
- 1 "Explore occasions" item

Example output:

- Comfort Food
- Date Night
- Birthday Dinner
- Dinner With Friends
- Team Lunch
- Sick Day Meals
- Impress Someone
- Explore Occasions

Rules:

- Do not over-index on sad/care occasions unless user intent suggests it.
- Keep at least one casual mood and one hosting/social item visible.
- Do not create or imply event records from browsing.
- Prefer contextually relevant items by date/time but avoid being creepy.

---

## Controlled Spontaneity

Good examples:

- Friday evening: "Date night."
- Rainy day signal if available: "Cozy dinner."
- After birthday browsing: "Celebration dinner."

Bad examples:

- Overly sensitive assumptions about personal circumstances.
- Creating an event from a click.
- Showing only high-pressure expensive occasions.

---

## Routing Rules

- Route to real public destinations only.
- Preserve occasion/mood context as query/filter state.
- No placeholder pages.
- No automatic booking, inquiry, event, group, or planning creation.
- No private operational data.

---

## Acceptance Criteria

- Homepage can surface occasion/mood entry points without a giant list.
- Mood, social, milestone, calendar, care, work, and hosting classes are modeled.
- Context can move into `/eat`, `/chefs`, planning, inquiry, or booking only through explicit user-controlled actions.
- Slot logic balances casual and high-intent items.
- Tests cover routing, class balance, dedupe, hidden/dismissed behavior, sensitivity rules, and empty-result handling.

---

## Out Of Scope

- Event creation.
- Planning shortlist implementation.
- Booking/inquiry write-path changes.
- Calendar integrations.
