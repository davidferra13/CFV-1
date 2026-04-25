# Codex Task: Guest Preference Profile Enhancement

**Status:** ready-to-build
**Scope:** 1 migration, 1 type file, 1 server action file, 1 UI component
**Risk:** LOW (additive columns, no existing behavior changes)
**Dependencies:** None

---

## Problem

The `hub_guest_profiles` table (the identity record for Dinner Circle members) only stores `known_allergies TEXT[]` and `known_dietary TEXT[]`. The `clients` table has rich preference data (dislikes, spice_tolerance, favorite_cuisines, favorite_dishes). When a guest joins a Dinner Circle, their preferences don't travel with them across events or chefs. The profile view's Dietary tab only shows allergies and dietary restrictions.

## What to Build

Add 4 preference columns to `hub_guest_profiles`, update the TypeScript type, update the server action, and wire them into the existing profile view Dietary tab.

---

## Task 1: Migration

**File to create:** `database/migrations/20260425000010_guest_preference_columns.sql`

**Exact SQL:**

```sql
-- Add guest preference columns to hub_guest_profiles
-- These mirror the richer client preference model for portable guest identity

ALTER TABLE hub_guest_profiles
  ADD COLUMN IF NOT EXISTS dislikes TEXT[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS favorites TEXT[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS spice_tolerance TEXT DEFAULT NULL
    CHECK (spice_tolerance IS NULL OR spice_tolerance IN ('mild', 'medium', 'hot', 'extra_hot')),
  ADD COLUMN IF NOT EXISTS cuisine_preferences TEXT[] DEFAULT NULL;

COMMENT ON COLUMN hub_guest_profiles.dislikes IS 'Ingredients or foods the guest dislikes (not allergies)';
COMMENT ON COLUMN hub_guest_profiles.favorites IS 'Ingredients or foods the guest loves';
COMMENT ON COLUMN hub_guest_profiles.spice_tolerance IS 'Spice preference: mild, medium, hot, extra_hot';
COMMENT ON COLUMN hub_guest_profiles.cuisine_preferences IS 'Preferred cuisine types (e.g. Italian, Japanese, Mexican)';
```

**Rules:**

- Do NOT modify any existing columns
- Do NOT add NOT NULL constraints (all nullable, NULL = never answered)
- Do NOT add default values other than NULL

---

## Task 2: TypeScript Type Update

**File to edit:** `lib/hub/types.ts`

**Find the `HubGuestProfile` interface (starts around line 7).** Add 4 new optional fields after `known_dietary`:

```typescript
export interface HubGuestProfile {
  id: string
  email: string | null
  email_normalized: string | null
  display_name: string
  avatar_url: string | null
  bio: string | null
  profile_token: string
  auth_user_id: string | null
  client_id: string | null
  known_allergies: string[] | null
  known_dietary: string[] | null
  // NEW preference fields
  dislikes: string[] | null
  favorites: string[] | null
  spice_tolerance: 'mild' | 'medium' | 'hot' | 'extra_hot' | null
  cuisine_preferences: string[] | null
  notifications_enabled: boolean
  referred_by_profile_id?: string | null
  first_group_id?: string | null
  upgraded_to_client_at?: string | null
  created_at: string
  updated_at: string
}
```

**Rules:**

- Keep all existing fields exactly as they are
- Only add the 4 new fields between `known_dietary` and `notifications_enabled`
- The `spice_tolerance` field must be a union type, not just `string`

---

## Task 3: Server Action Update

**File to edit:** `lib/hub/profile-actions.ts`

Find the `updateProfile` function. It currently accepts `known_allergies` and `known_dietary` in its update payload. Add the 4 new fields to the accepted payload.

**What to change:**

1. Find where `updateProfile` builds its update object (the `.update({...})` call). Add the 4 new fields to it, following the same pattern as existing fields.

2. The function should accept these additional optional fields in its input:
   - `dislikes?: string[] | null`
   - `favorites?: string[] | null`
   - `spice_tolerance?: string | null`
   - `cuisine_preferences?: string[] | null`

3. Only include each field in the DB update if it was explicitly provided in the input (not undefined). Follow the same conditional inclusion pattern used for `known_allergies`.

**Rules:**

- Do NOT change the function signature for existing fields
- Do NOT add Zod validation for these fields (keep it consistent with existing pattern in this file)
- Do NOT modify the `getOrCreateProfile` function
- The update must be tenant-safe (use the existing `.eq('id', ...)` pattern already in the function)

---

## Task 4: Profile View UI Update

**File to edit:** `app/(public)/hub/me/[profileToken]/profile-view.tsx`

Find the `dietary` tab content (the section that renders when `activeTab === 'dietary'`). Currently it shows two pill groups: allergies (red) and dietary restrictions (amber).

**Add 4 new sections below the existing two, in this order:**

1. **Dislikes** (orange-600 pills) - shows `profile.dislikes` array
2. **Favorites** (emerald-600 pills) - shows `profile.favorites` array
3. **Spice Tolerance** (single text display, not pills) - shows `profile.spice_tolerance` with labels: `mild` = "Mild", `medium` = "Medium", `hot` = "Hot", `extra_hot` = "Extra Hot"
4. **Cuisine Preferences** (blue-600 pills) - shows `profile.cuisine_preferences` array

**For editing mode:** Add corresponding input fields in the dietary edit form. Follow the same pattern as the existing allergy/dietary text inputs:

- `dislikes`: textarea, comma-separated, placeholder "e.g. cilantro, blue cheese, liver"
- `favorites`: textarea, comma-separated, placeholder "e.g. truffle, wagyu, fresh pasta"
- `spice_tolerance`: 4-button radio group (Mild / Medium / Hot / Extra Hot)
- `cuisine_preferences`: textarea, comma-separated, placeholder "e.g. Italian, Japanese, French"

**State management:** Add `useState` hooks for each new field, initialized from `profile.dislikes?.join(', ')` etc. On save, split comma-separated strings into arrays (same pattern as existing allergy handling) and pass to `updateProfile`.

**Display rules:**

- If a field is null or empty array, show "Not specified" in stone-500 text
- If spice_tolerance is null, show "Not specified"
- Each section has a label in text-xs font-medium text-stone-400 uppercase tracking-wide

**Rules:**

- Do NOT remove or modify any existing UI elements
- Do NOT change the tab structure
- Do NOT touch the "dinners" or "groups" tabs
- Match the existing dark stone theme (bg-stone-950, text-stone-100, etc.)
- All new sections go BELOW the existing allergy and dietary sections

---

## What NOT to Do

- Do NOT modify the join form (`join-form.tsx`). Keep join friction minimal.
- Do NOT create any new files beyond the migration
- Do NOT modify any other tables
- Do NOT add any API routes
- Do NOT run `drizzle-kit push` or apply the migration
- Do NOT modify `database/schema.ts` (it is auto-generated)
- Do NOT use em dashes anywhere

---

## Verification

After making changes:

1. Run `npx tsc --noEmit --skipLibCheck` and fix any type errors
2. Confirm the migration file has a timestamp higher than `20260425000009`
3. Confirm `HubGuestProfile` type has exactly 4 new fields
4. Confirm `updateProfile` accepts the 4 new fields
5. Confirm profile-view.tsx compiles without errors
