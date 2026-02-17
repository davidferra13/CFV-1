# Hardcoded Personal Data Cleanup

## Summary

Removed all hardcoded personal information from the codebase so that when deployed, other chefs will see a clean, generic platform -- not one pre-filled with a specific person's data.

## What Changed

### 1. Wake Time Fields -- Removed Entirely

**Files:** `lib/scheduling/types.ts`, `components/settings/preferences-form.tsx`, `lib/chef/actions.ts`, `lib/scheduling/timeline.ts`

- Removed `wake_time_earliest` and `wake_time_latest` from the `ChefPreferences` interface
- Removed from `DEFAULT_PREFERENCES` object
- Removed from validation schema in `UpdatePreferencesSchema`
- Removed from the query return mapping in `getChefPreferences()`
- Removed the UI fields (time inputs) from the Settings form
- Removed the wake-time-based warnings from `generateTimeline()` (the "wake up" timeline item itself remains -- it's computed from working backwards, not from preferences)

**Why:** These were personal scheduling habits, not a platform feature. The timeline engine still computes a suggested wake time based on the day's work -- it just no longer compares it against personal preference boundaries.

### 2. Hardcoded Placeholders -- Replaced with Generic Text

**Files:** `components/settings/preferences-form.tsx`, `components/events/shopping-substitutions.tsx`, `components/import/smart-import-hub.tsx`, `components/inquiries/inquiry-form.tsx`

All form placeholder text was using real personal data:
- "Market Basket" -> "Store name"
- "One Stop Liquor" -> "Store name"
- "123 Main St, Haverhill, MA" -> "Store address"
- "Haverhill" -> "City"
- "01830" -> "ZIP"
- "MA" default state -> empty string (null)
- Real client names (Michel, Kelly, Evan, Lindsay, Murr/Mary) in import examples -> generic example names (John, Sarah, Jane, Tom)
- Real city names (Haverhill, Wellesley, Needham) -> removed from examples
- "Diane sauce" recipe reference -> "Pan sauce" (generic)

### 3. Default State Removed

**File:** `lib/scheduling/types.ts`

- `DEFAULT_PREFERENCES.home_state` changed from `'MA'` to `null`
- Form now defaults to empty string instead of 'MA'

### 4. Agent Brain Identity Parameterized

**Files:** `lib/ai/agent-brain.ts`, `lib/ai/gemini-service.ts`, `lib/ai/correspondence.ts`, `docs/agent-brain/01-BRAND_VOICE.md`

The AI correspondence engine was hardcoded to write as "David Ferragamo" with sign-offs as "David". Every chef using the platform would have gotten emails signed as the wrong person.

**Changes:**
- Added `ChefIdentity` type: `{ fullName: string; firstName: string }`
- `getAgentBrainForState()` now accepts a `ChefIdentity` parameter
- `extractBrandVoiceRules()` injects the chef's name at runtime
- `extractEmailFirewallRules()` uses the chef's first name for sign-off validation
- `getDepthInstruction()` uses the chef's first name for sign-off examples
- `generateACEDraft()` accepts `chefName` in params, builds system instruction dynamically
- `draftChefResponse()` accepts optional `chefName` param
- `draftResponseForInquiry()` fetches chef's `display_name` (falling back to `business_name`) from the DB
- `draftSimpleResponse()` fetches chef's name from DB
- `draftPostEventFollowUp()` fetches chef's name and uses it for sign-off
- `01-BRAND_VOICE.md` updated to be a template (replaced "David" with `[First Name]`)

**Identity resolution:** `display_name ?? business_name ?? 'Chef'`, with first name derived by splitting on space.

### 5. AI Prompt Examples Cleaned

**File:** `lib/ai/parse-brain-dump.ts`

- Replaced "Michel lives in Haverhill" example with generic "John lives nearby" in the AI prompt

## What Was NOT Changed

- **Database columns:** `wake_time_earliest` and `wake_time_latest` still exist in the `chef_preferences` table. The columns are simply unused by the application now. No migration was created because CLAUDE.md rules require explicit approval before any column removal, and leaving unused nullable columns is safe.
- **Code comments with example names** in TypeScript type definitions (e.g., `// e.g., "David Ferragamo"` in type docs) -- these are developer documentation, not user-facing.
- **Documentation files** in `docs/` that reference the business as examples -- these are internal architecture docs, not deployed to users.

## Architecture Impact

The agent-brain system now follows a clean injection pattern:
1. Chef signs up with a `business_name`
2. Chef optionally sets a `display_name` in their Network Profile
3. When AI drafts are generated, the chef's identity is fetched from DB and injected into all prompts
4. The brand voice template in `docs/agent-brain/` serves as the default style guide -- identity is never baked in

This means every chef gets emails drafted in their own name, with their own sign-off, from day one.
