# Consolidated Build: Scheduling Calendar

**Priority rank:** 4 of 14
**Personas affected:** 3 (Jordan Hale (Cannabis Culinary Director, Multi-Event/Multi-Chef), Leo Varga, Noah Kessler)
**Average severity:** HIGH

## The Pattern

3 persona(s) surfaced 3 related gaps in scheduling calendar. The common thread: ChefFlow lacks native support for this category of operations, forcing manual workarounds.

## Individual Gaps (deduplicated)

1. **Compliance evidence is fragmented across multiple screens** - from Jordan Hale (Cannabis Culinary Director, Multi-Event/Multi-Chef) - MEDIUM
   Why it matters: legal defensibility depends on one coherent chain from intake → dosing decisions → execution → outcome logs. Current state: compliance tracker + cannabis ledger + events + RSVPs exist,...
2. **No explicit offline-first guarantee for mission-critical workflows** - from Leo Varga - HIGH
   What's missing: reliable local access to inventory, preferences, plans, menus, and task timelines during disconnected work. File to change first: `app/(chef)/dashboard/page.tsx` and the PWA/offline sh...
3. **No multi-store route and split-cart optimizer** - from Noah Kessler - HIGH
   Missing: recommendation for best combination of stores to minimize spend while meeting availability constraints and travel time. File to change first: procurement views in `app/(chef)/vendors/` and ev...

## Recommended Build Scope

A single consolidated build addressing all scheduling calendar gaps should cover:

- Compliance evidence is fragmented across multiple screens
- No explicit offline-first guarantee for mission-critical workflows
- No multi-store route and split-cart optimizer

## Existing Build Tasks

No existing build tasks found for this category.

## Acceptance Criteria (merged from all personas)

1. Jordan Hale (Cannabis Culinary Director, Multi-Event/Multi-Chef): Compliance evidence is fragmented across multiple screens is addressed
2. Leo Varga: No explicit offline-first guarantee for mission-critical workflows is addressed
3. Noah Kessler: No multi-store route and split-cart optimizer is addressed
