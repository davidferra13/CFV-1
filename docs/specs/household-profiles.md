# Spec: Household Member Profiles

> **Status:** verified
> **Priority:** P1 (next up)
> **Depends on:** none
> **Estimated complexity:** medium (5-6 files)
> **Created:** 2026-03-29
> **Built by:** Claude Code session 2026-03-29

---

## What This Does (Plain English)

A circle member can declare household members (partner, children, house manager, assistant) with individual dietary restrictions and allergies for each person. The chef sees a consolidated "Household Dietary Summary" that lists every person in the household and their specific needs. When planning meals, the chef knows that "Mom is gluten-free, the 8-year-old is allergic to tree nuts, Dad eats everything." This is critical for safety (allergies) and quality (personalized meals).

---

## Why It Matters

Ultra-high-net-worth families have multiple people eating. Each person has different dietary needs. A single "allergies" field per circle member isn't enough. The chef needs per-person tracking to avoid serving tree nuts to a kid with an allergy. This is a food safety issue, not a nice-to-have.

---

## Files to Create

| File                                                           | Purpose                                                                   |
| -------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `components/hub/household-editor.tsx`                          | Inline editor for adding/editing household members within the hub profile |
| `lib/hub/household-actions.ts`                                 | Server actions: CRUD for household members                                |
| `database/migrations/20260401000125_hub_household_members.sql` | New table for household member profiles                                   |

---

## Files to Modify

| File                                    | What to Change                                                       |
| --------------------------------------- | -------------------------------------------------------------------- |
| `components/hub/hub-member-list.tsx`    | Show household members under each circle member, with dietary badges |
| `components/hub/hub-profile-editor.tsx` | Add "My Household" section with link to household editor             |
| `lib/hub/types.ts`                      | Add `HouseholdMember` type                                           |

---

## Database Changes

### New Tables

```sql
CREATE TABLE hub_household_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES hub_guest_profiles(id) ON DELETE CASCADE,

  -- Identity
  display_name TEXT NOT NULL,
  relationship TEXT NOT NULL CHECK (relationship IN (
    'partner', 'spouse', 'child', 'parent', 'sibling',
    'assistant', 'house_manager', 'nanny', 'other'
  )),
  age_group TEXT CHECK (age_group IN ('infant', 'toddler', 'child', 'teen', 'adult')),

  -- Dietary (same structure as hub_guest_profiles)
  dietary_restrictions TEXT[] NOT NULL DEFAULT '{}',
  allergies TEXT[] NOT NULL DEFAULT '{}',
  dislikes TEXT[] NOT NULL DEFAULT '{}',
  favorites TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,                             -- "picky eater", "only eats plain pasta"

  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hub_household_profile ON hub_household_members(profile_id);
```

### Migration Notes

- Timestamp `20260401000125` follows `20260401000124`
- Additive only
- No changes to existing tables

---

## Data Model

**HouseholdMember** belongs to a `hub_guest_profile` (the circle member who declared them). Each household member has their own dietary restrictions, allergies, dislikes, and favorites. The chef sees all household members across all circle members when viewing the Members tab.

**Dietary consolidation:** The chef can view a "full household dietary summary" that aggregates all allergies across all household members in the circle. If anyone in the household is allergic to peanuts, it shows prominently.

---

## Server Actions

| Action                             | Auth          | Input                                                                                                         | Output                                                                         | Side Effects |
| ---------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------ |
| `getHouseholdMembers(input)`       | None (public) | `{ profileId }`                                                                                               | `HouseholdMember[]`                                                            | None         |
| `getCircleHouseholdSummary(input)` | None (public) | `{ groupId }`                                                                                                 | `{ members: HouseholdMember[], allAllergies: string[], allDietary: string[] }` | None         |
| `addHouseholdMember(input)`        | Profile token | `{ profileToken, displayName, relationship, ageGroup?, dietary?, allergies?, dislikes?, favorites?, notes? }` | `{ success, member?, error? }`                                                 | None         |
| `updateHouseholdMember(input)`     | Profile token | `{ memberId, profileToken, ...fields }`                                                                       | `{ success, error? }`                                                          | None         |
| `removeHouseholdMember(input)`     | Profile token | `{ memberId, profileToken }`                                                                                  | `{ success, error? }`                                                          | None         |

---

## UI / Component Spec

### Household Editor (in profile settings)

Below the existing dietary preferences section in the hub profile editor:

**"My Household" section:**

- List of existing household members (name, relationship badge, dietary tags)
- "+ Add household member" button
- Each member has an edit/delete icon
- Add/edit form: name input, relationship dropdown, age group dropdown (optional), dietary multi-select, allergies multi-select, dislikes text input, favorites text input, notes text input

### Members Tab Enhancement

In the existing Members tab, under each circle member's card:

- If they have household members, show a collapsible "Household (N)" section
- Each household member shows: name, relationship badge, and colored dietary/allergy pills
- Allergies shown in amber/red for visibility

### Chef View: Dietary Summary

At the top of the Members tab (visible to chef/admin only):

- "Household Dietary Summary" card
- Lists ALL allergies across all circle members and their households (deduplicated, sorted)
- Lists ALL dietary restrictions (deduplicated)
- This is the chef's one-stop reference when planning meals

### States

- **Loading:** Skeleton cards
- **Empty:** "No household members added yet. Add family members so the chef knows everyone's dietary needs."
- **Error:** "Could not load household info" with retry
- **Populated:** List of household member cards with dietary info

---

## Edge Cases and Error Handling

| Scenario                         | Correct Behavior                                                         |
| -------------------------------- | ------------------------------------------------------------------------ |
| Server action fails              | Rollback optimistic update, toast error                                  |
| Duplicate names                  | Allowed (two kids named "Jr" is valid)                                   |
| No dietary info provided         | Member saved without dietary data (all arrays empty)                     |
| Profile has no household members | "My Household" section shows add prompt, Members tab shows nothing extra |
| Very long notes                  | Truncate display at 150 chars with "more" expand                         |

---

## Verification Steps

1. Open a dinner circle as a family member
2. Go to profile editor, find "My Household" section
3. Add a household member (e.g., "Emma, child, allergic to tree nuts")
4. Verify it appears in the profile editor
5. Navigate to Members tab - verify household member shows under your name
6. As chef, verify the Dietary Summary card at top of Members tab includes "tree nuts" allergy
7. Add a second household member with different dietary restrictions
8. Verify Dietary Summary aggregates both
9. Edit a household member, verify changes persist
10. Delete a household member, verify it's removed
11. Screenshot the Members tab with household members visible

---

## Out of Scope

- Household members as separate login accounts (they're data records, not users)
- Per-household-member meal feedback (feedback is per circle member, not per household member)
- Importing household data from client records (manual entry for now)
- Household meal preferences influencing menu suggestions

---

## Notes for Builder Agent

- Follow the `hub-notes-board.tsx` pattern for the inline CRUD editor
- Allergy badges should use amber/red styling to stand out (food safety is critical)
- The dietary summary at the top of Members tab should be attention-grabbing: use a card with a subtle warning border if any allergies exist
- The relationship dropdown values match common household structures for high-net-worth families (assistant, house_manager, nanny are intentional)
- Keep the household editor in the profile section, not a separate page
