# Menu Sheet Revision — SOP Alignment

## Date

February 19, 2026

## What Changed

`lib/documents/generate-execution-sheet.ts` was updated to align with the canonical "HOW I MAKE A MENU SHEET" SOP document (Printed Sheet #2 — Service Execution Sheet).

---

## Why It Changed

The existing execution sheet implemented a functional but structurally incorrect version of the chef's canonical process. Specifically:

- The header used a generic `SERVICE EXECUTION SHEET` title instead of the chef's actual naming convention (`MENU — [Client Name]`)
- The header lacked the event address, which is critical on-site reference information
- The BOH section incorrectly split components into "on-site" vs. "pre-made" groups — that split belongs to the Prep Sheet (Sheet #1), not the Menu Sheet
- The FOH section was labeled "MENU" rather than "FRONT OF HOUSE"
- Dietary flags appeared only as a global warning box, not inline on affected components as the SOP requires

---

## What the Menu Sheet Is

The Service Execution Sheet is the single page taped to the counter at the client's house during service. It serves two simultaneous purposes:

- **Front of House (top half):** The dish as the client sees it — clean, appetizing, no technical notes, no counts, no flags. Reference for the chef to remember the "story" of each course.
- **Back of House (bottom half):** The production reality — every component numbered per course, with inline dietary flags, execution notes, and a total component count. This is what the chef actually works from during service.

---

## Changes Made

### Data Fetch (`fetchExecutionSheetData`)

Added three new fields from the `events` table:

- `location_address` — street address
- `location_city` — city
- `location_state` — state

Added `allergen_flags` from the `dishes` table. These are used for course-level dietary flag inference: if a dish carries an allergen flag that overlaps with the event's confirmed allergies, that course's header is flagged.

The `ExecutionSheetData` type was updated accordingly to expose:

- `event.location_address / location_city / location_state`
- `courses[].dishAllergenFlags`

No database migrations required — all fields already exist in the schema.

### Rendering (`renderExecutionSheet`)

**Header:**

- Title changed to `MENU — [Client Name]`
- Detail bar now reads: `[N] Guests | Day of Week, Month D, Year | Street, City, State | Arrive [time] | Serve [time]`
- Address is omitted gracefully if not set on the event

**FOH Section:**

- Relabeled from `MENU` → `FRONT OF HOUSE`
- Each course shows: `Course [N]: [course_name]` header, then the `dish.description` in italic below
- If no description is set, auto-derives from component names joined with `,` as a clean fallback

**Dietary Warnings:**

- Global allergy `warningBox()` retained — still safety-critical and prominent
- Dietary restrictions text line retained
- Block positioned between FOH and BOH (unchanged from before)

**BOH Section:**

- Relabeled from `EXECUTION PLAN` → `BACK OF HOUSE — COMPONENT BREAKDOWN`
- **Removed the on-site / pre-made split.** All components are now listed together in sort_order, numbered sequentially within each course
- `is_make_ahead` items are still annotated with `[pre-made]` tag inline, rather than being separated into a different group
- Execution notes appear in parentheses after the component name
- Allergen flag inference: if `course.dishAllergenFlags ∩ allAllergies` is non-empty, the conflict appears once on the course header

**Summary line:**

- Added after all courses: `[N] TOTAL COMPONENTS | Allergies: ... | Dietary: ...`
- Provides the complete dietary summary the SOP requires at the bottom of the BOH section

**Font scaling:**

- Thresholds adjusted for the larger content footprint (FOH + BOH together):
  - `> 20 components` → 0.85×
  - `> 30 components` → 0.75×
  - `> 40 components` → 0.70×

---

## Bug Fixes Applied During Review

### 1. Footer hidden when arrival_time is null

The original guard `if (event.arrival_time)` caused the entire footer — including the serve time — to disappear when no arrival time was set. Serve time is required on every event and must always render. Fixed to always show serve time; arrival time is conditionally prepended.

### 2. Allergen flag incorrectly repeated on every component

The initial implementation stamped `⚠ CONTAINS [ALLERGEN]` on every individual component in a course that had an allergen conflict. Since allergen data in the current schema lives at the **dish level** (not the component level), flagging every component (including the ribeye steak for a nut allergy) created false and confusing information. Fixed: the allergen flag now appears once on the **course header line** where it is honest about the data granularity and still impossible to miss.

Future enhancement: add `allergen_flags` to the `components` table for precise per-ingredient flagging.

---

## What Was NOT Changed

| File                                        | Status                                              |
| ------------------------------------------- | --------------------------------------------------- |
| `generate-front-of-house-menu.ts`           | Untouched — separate elegant client-facing document |
| `generate-prep-sheet.ts`                    | Untouched — still owns the at-home / on-site split  |
| `lib/documents/actions.ts`                  | Untouched — readiness checks unchanged              |
| `app/api/documents/[eventId]/route.ts`      | Untouched — API unchanged                           |
| `components/documents/document-section.tsx` | Untouched — UI unchanged                            |

---

## How It Connects to the System

### Document Chain Position

The Menu Sheet (Execution Sheet) is Sheet #2 in the printed document chain:

```text
Sheet #1 — Prep Sheet       (at-home tasks + on-site execution split)
Sheet #2 — Execution Sheet  (THIS DOCUMENT — Menu Sheet taped to counter)
Sheet #3 — Non-Negotiables  (permanent checklist + event-specific items)
```

The Execution Sheet is generated from:

- `events` table: date, guest count, address, times, dietary/allergy arrays
- `clients` table: name, dietary/allergy arrays
- `menus → dishes → components` hierarchy: course structure, dish names, descriptions, allergen flags, component names

### Dietary Flag Flow

Allergen flags propagate bottom-up through the data model:

```text
ingredients.allergen_flags
    → computed via get_recipe_allergen_flags()
    → dishes.allergen_flags (set by chef when building the dish)
    → rendered on the affected course header in the Execution Sheet
    → summarized in the bottom dietary summary line
```

The course-level flag is an inference from dish-level allergen data. A future enhancement could add `allergen_flags` directly to the `components` table for precise per-ingredient flagging, but the dish-level inference is a safe and conservative V1 approach.

### FOH Description Authoring

The FOH section on the execution sheet displays `dish.description`. Chefs should write this as the client-facing course description when building the menu:

> "Seared Ribeye — Sherry Jus, Slow-Cooked Stuffed Cabbage with Root Vegetable Puree, Crunchy Herb Topping"

If no description is authored, the system auto-generates one from component names joined with commas. This is a readable fallback but not as polished as a hand-written description.

---

## Verification

1. Open an event with a menu (≥2 courses, ≥3 components per course)
2. Event Documents section → Execution Sheet → "View PDF"
3. Check:
   - Title: `MENU — [Client Name]`
   - Detail bar includes guest count, full date with day of week, address (if set), arrive/serve times
   - FOH: clean descriptions, no counts, no flags
   - BOH: all components numbered per course (no on-site/pre-made split)
   - Allergen conflict: if event has allergies matching a dish's `allergen_flags` → `⚠ CONTAINS [X]` appears on the course header
   - Summary line: total component count + dietary summary
   - One page, readable
