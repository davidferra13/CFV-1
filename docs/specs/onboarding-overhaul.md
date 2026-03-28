# Spec: Onboarding Overhaul

> **Status:** built
> **Priority:** P0 (blocking)
> **Depends on:** none
> **Estimated complexity:** large (9+ files)
> **Created:** 2026-03-27
> **Built by:** Claude Code (2026-03-27)

---

## What This Does (Plain English)

The onboarding wizard gets a complete overhaul: bugs fixed, new fields added, UX rethought. After this is built, a new chef signs up and sees a modern, non-invasive wizard that collects their profile photo (max 5MB), logo (max 2MB), food portfolio (up to 5 photos, max 5MB each), location (city, state, service radius), website, contact info (email, phone, optional social links), cuisine specialties (with custom "Other" input), and a public/private visibility toggle (defaulting to public). The wizard lets them freely jump between steps in any order. The "Continue" button always works. The crash is gone. The Connect Gmail wording is safe and non-invasive. Pricing setup is elevated to a prominent early step with flexible input for hourly rates, per-plate pricing, package deals, and minimum spend. Once all mandatory steps are finished, a completion flag is set and the onboarding is dismissed permanently. Incomplete optional sections get gentle, non-intrusive dashboard reminders (subtle banners, never modal pop-ups) that the chef can dismiss permanently. The whole thing feels quick, gets out of the way, and never nags.

---

## Why It Matters

The onboarding is the first thing every new chef sees. Right now it crashes, has a broken Continue button, nags endlessly, collects too little useful info (no photos, no location, no website, no pricing), and has wording that sounds invasive. Fixing this is the single highest-impact change for first impressions and chef retention.

---

## Issues Found (from screenshots + code review)

### BUG 1: Crash on /onboarding - "Cannot read properties of undefined (reading 'title')"

**Screenshot:** `CRASHED.png`
**Root cause:** The `OnboardingHub` component or a step component references a property on an object that is `undefined`. Likely the `WIZARD_STEPS[currentIndex]` access when `currentIndex` exceeds the array bounds, or the hub's `PHASES` array referencing progress data that doesn't exist yet.
**Fix:** Add null guards. If a step/phase is undefined, gracefully handle it instead of crashing.

### BUG 2: Continue button doesn't always work

**Screenshot:** `continue button doesnt always work.png` - shows Step 1 with "Mass" in Service Area, no Business Name filled, but Continue is clickable and presumably does nothing or errors silently.
**Root cause:** The `ProfileStep` form submits via `onComplete()` with no validation. The `handleSubmit` calls `onComplete({ businessName, cuisines, serviceArea, bio })` even when all fields are empty. But the `completeStep` server action may be silently failing or the optimistic update gets rolled back without user feedback.
**Fix:** Add client-side validation (at minimum: business name required). Show clear error states. Make the Continue button disabled until minimum fields are filled. Add a toast or inline error on failure.

### BUG 3: Onboarding banner never stays dismissed

**Screenshot:** Referenced in user's verbal description - "it keeps popping up even two weeks later"
**Root cause:** The `OnboardingBanner` uses `useState(false)` for `dismissed` - this resets on every page load/navigation. There is no persistence (no localStorage, no DB flag).
**Fix:** Persist dismissal. Two options:

- **Option A (recommended):** Store `onboarding_banner_dismissed_at` timestamp on the `chefs` table. Server-side check means it never even renders.
- **Option B:** Use `localStorage` key `onboarding_banner_dismissed`. Simpler but client-only.
  Go with Option A. Once a chef dismisses the banner, it stays dismissed until they explicitly visit `/onboarding` again.

### UX 4: "Other" cuisine has no text input

**Screenshot:** `Other(allow user to type and describe).png` - shows the cuisine pills with "Other" highlighted, but no way to type what "Other" means.
**Fix:** When "Other" is selected, show a text input below the pills: "What cuisines do you specialize in?" with placeholder "e.g. Ethiopian, Peruvian, Molecular Gastronomy". Store the custom text alongside the selected cuisines.

### UX 5: Steps should be freely navigable (not forced sequential)

**Screenshot:** `allow the user to freely pick the order in whicht he choose to onboard first but start on step 1.png` - sidebar shows steps 1-3 with user wanting to click any step freely.
**Current behavior:** The sidebar buttons already call `goToStep(i)` so clicking works. But the UX implies sequential flow (numbered 1-2-3, grayed out future steps).
**Fix:** Make it visually clear that all steps are clickable from the start. Remove the "disabled" visual treatment on future steps. Keep the numbering but let the user jump freely. Start on step 1 by default, but don't lock the others.

### UX 6: Connect Gmail wording is invasive / lawsuit risk

**Screenshot:** `change wording, dont want to be sued or sound invasive.png` - shows the Connect Gmail step with its current copy highlighted.
**Problem phrases:**

- "ChefFlow reads the notification emails your platforms already send you" - sounds like we're reading their email
- "All AI processing runs locally on the server" - confusing for non-technical users
  **Fix:** Rewrite to be permission-focused and non-threatening:
- Lead with what the USER gets, not what ChefFlow does
- Use "with your permission" language
- Simplify the privacy note
- Make it clear: opt-in, limited scope, revocable

---

## New Features to Add

### NEW 1: Profile Picture Upload (in onboarding + persisted to `chefs.profile_image_url`)

The `chefs` table already has `profile_image_url`. The settings profile form already has upload logic (`uploadChefProfileImage` in `lib/network/actions`). The onboarding profile step just needs to expose this.

**UI:** Circular avatar upload area at the top of the profile step. Click to select file, shows preview. Accepts JPEG, PNG, HEIC, WebP. Max 5MB. Highly recommended (not technically required, but visually encouraged with placeholder silhouette and "Add your photo" prompt).

### NEW 2: Logo Upload (in onboarding + persisted to `chefs.logo_url`)

The `chefs` table already has `logo_url`. The settings profile form already has upload logic (`uploadChefLogo` in `lib/chef/profile-actions`). The onboarding profile step needs to expose this.

**UI:** Rectangular logo upload area next to the avatar. Click to select file. Accepts SVG, PNG. Max 2MB. Optional. Shows "No logo? No problem." helper text.

### NEW 3: Food Portfolio Photos (in onboarding)

Chefs need a place to showcase their food. This ties into the existing `chef_directory_listings.portfolio_urls` column and the storage system.

**UI:** A grid upload area (similar to `recipe-photo-upload.tsx` pattern). "Show off your best work" with drag-and-drop or click-to-upload. Up to 5 photos, max 5MB each. Optional. Stored to local storage, URLs saved to chef's directory listing.

### NEW 4: Location (city, state)

The `chef_directory_listings` table already has `city`, `state`, `zip_code`, `service_radius_miles`. The onboarding just needs to collect this.

**UI:** Three fields in the profile step: City (text input), State (dropdown of US states + DC + "Other/International"), and Service Radius (optional, e.g. "30 miles"). Keep the freeform "Service Area" as a fallback description field below ("e.g. Greater Boston area"). This gives structured data for search while allowing chefs to describe their coverage in their own words.

### NEW 5: Website URL

The `chefs` table already has `website_url`. Just needs to be in the onboarding profile step.

**UI:** URL input field with placeholder "https://yourwebsite.com". Optional. Validated as URL format.

### NEW 6: Public/Private Account Toggle

Ties to `chef_preferences.network_discoverable` (chef-controlled opt-in). When public, the chef's profile is eligible for directory listing (pending admin approval). When private, they use ChefFlow as an internal ops tool only, visible only to clients they invite.

**UI:** Toggle switch at the bottom of the profile step: "Make my profile visible to potential clients" with a short explanation of each mode (public = searchable and bookable by anyone; private = invite-only, internal ops tool). Default: **public** (ON) to encourage engagement and discoverability. Chefs can toggle to private at any time from Settings.

### NEW 7: Cuisine Specialties Persisted to Chef Profile

Currently, the cuisine selections from onboarding are stored only in `onboarding_progress.data` (ephemeral). They need to be persisted to the `chef_directory_listings.cuisines` column (and create the listing row if it doesn't exist).

### NEW 8: Contact Information

Collect essential contact details during the profile step. Email is pre-filled from the auth account. Phone is optional. Optional social media links (Instagram, Facebook, TikTok) since many chefs market heavily on social. These persist to `chefs` table columns (phone already exists, social links may need new columns or JSONB).

**UI:** Below the website URL field: Phone (tel input, optional), and a collapsible "Social media links" section with fields for Instagram handle, Facebook URL, TikTok handle. All optional, clearly labeled.

### NEW 9: Pricing Setup Elevated

Every chef has a pricing structure. This should be a prominent step in the wizard (not buried as optional step 7 of 9). Move pricing to be step 2 or 3 in the wizard. The pricing step should support flexible input: hourly rates, per-plate pricing, package deals, minimum spend requirements. Chefs should be able to define multiple service tiers with their own pricing. If a full pricing form is too complex for onboarding, provide a simplified "quick pricing" form that captures the basics (base hourly rate, per-guest rate, minimum booking amount) and links to the full pricing page for detailed setup later.

### NEW 10: Menu Upload Preparation (NOT a wizard step)

This is NOT a wizard step. It is a brief informational note shown on the wizard completion screen (after all 5 steps are done/skipped). The note says: "Coming soon: upload menus, create custom menus, and send them to clients from your dashboard." No upload UI in onboarding itself. Menu management is a separate spec.

### NEW 11: Permanent Completion + Progressive Reminders

**Completion flag:** When all mandatory steps (profile with business name at minimum) are done, set `chefs.onboarding_completed_at` to `now()`. The onboarding wizard never shows again automatically after this.

**Progressive reminders for optional steps:** Incomplete optional sections (portfolio, pricing, Gmail, etc.) generate gentle dashboard reminders:

- Appear as a subtle, dismissible banner at the top of the dashboard (not a modal, not a popup)
- Each reminder is individually dismissible and stays dismissed
- Example: "Your pricing isn't set up yet. Clients won't know your rates." with a "Set up pricing" link and an X to dismiss
- Maximum 1 reminder shown at a time (rotate through incomplete items, don't stack)
- After 3 dismissals total, stop showing reminders entirely (respect the chef's choice)

---

## Revised Wizard Step Order

The current wizard has 3 required steps: Profile, Connect Gmail, First Event.

**New wizard structure (5 steps, all skippable, none truly "required" to use the app):**

| Step | Key             | Title            | What It Collects                                                                                                                                                                                       | Mandatory?                            |
| ---- | --------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| 1    | `profile`       | Your Profile     | Photo (5MB), logo (2MB), business name, cuisines (with Other input), location (city/state/radius), website URL, contact info (phone, social links), short bio, public/private toggle (default: public) | Business name required, rest optional |
| 2    | `portfolio`     | Your Food        | Up to 5 food portfolio photos (5MB each)                                                                                                                                                               | No                                    |
| 3    | `pricing`       | Your Pricing     | Quick pricing form: base hourly rate, per-guest rate, minimum booking, package deals. Links to full pricing page for detailed setup.                                                                   | No (but strongly encouraged)          |
| 4    | `connect_gmail` | Import Leads     | Gmail OAuth for auto-importing platform inquiries                                                                                                                                                      | No                                    |
| 5    | `first_event`   | Your First Event | Redirect to create an event                                                                                                                                                                            | No                                    |

**Key design principles:**

- **Core gate is minimal:** Only business name is truly required. Complete that and you can use ChefFlow. Everything else enhances your profile but doesn't block access.
- Profile is expanded with photos, location, website, contact info, visibility toggle
- Portfolio (food photos) is new step 2
- Pricing is elevated from optional step 7 to step 3 with flexible input (hourly, per-plate, packages, minimums)
- Gmail renamed to "Import Leads" and dropped from "required" to "recommended"
- First Event stays as the final step
- ALL steps are skippable. The wizard should feel helpful, not like a gate.
- Once the chef completes all steps OR skips through, `chefs.onboarding_completed_at` is set and the wizard never appears again automatically.
- Incomplete optional items get gentle, individually-dismissible dashboard reminders (max 1 at a time, stop entirely after 3 total dismissals).

**The hub (post-wizard) stays as-is** with its 5 phases (Profile, Clients, Loyalty, Recipes, Staff). These are deeper setup tasks for after the quick wizard.

---

## Files to Create

| File                                                             | Purpose                                                                                                                                         |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/onboarding/onboarding-steps/portfolio-step.tsx`      | New step 2: food photo uploads (up to 5, 5MB each)                                                                                              |
| `components/onboarding/onboarding-steps/pricing-step-wizard.tsx` | New step 3: quick pricing form (hourly, per-guest, minimum, packages) + link to full pricing page                                               |
| `components/dashboard/onboarding-reminder-banner.tsx`            | Gentle, dismissible dashboard reminder for incomplete optional steps (replaces current nagging banner)                                          |
| `database/migrations/XXXXXXXX_onboarding_overhaul.sql`           | Add `cuisine_specialties`, `onboarding_banner_dismissed_at`, `city`, `state`, `social_links`, `onboarding_reminders_dismissed` to `chefs` table |

---

## Files to Modify

| File                                                            | What to Change                                                                                                                                       |
| --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/onboarding/onboarding-constants.ts`                        | Redefine WIZARD_STEPS to new 5-step structure; update ONBOARDING_STEPS                                                                               |
| `components/onboarding/onboarding-wizard.tsx`                   | Support new step keys, render new step components, fix crash null guard, make steps freely navigable visually                                        |
| `components/onboarding/onboarding-steps/profile-step.tsx`       | Add photo upload, logo upload, location fields, website URL, public/private toggle, "Other" cuisine text input, persist to chefs + directory listing |
| `components/onboarding/onboarding-steps/connect-gmail-step.tsx` | Rewrite copy to be non-invasive and permission-focused                                                                                               |
| `components/onboarding/onboarding-banner.tsx`                   | Persist dismissal to DB via server action; check dismissal server-side                                                                               |
| `lib/onboarding/onboarding-actions.ts`                          | Add `dismissOnboardingBanner()` action; update `completeStep` to persist profile data to chefs table + directory listing                             |
| `lib/onboarding/progress-actions.ts`                            | Update progress computation if new steps change the math                                                                                             |
| `app/(chef)/onboarding/page.tsx`                                | Check banner dismissal; handle new step structure                                                                                                    |
| `components/dashboard/onboarding-checklist-widget.tsx`          | Respect banner dismissal                                                                                                                             |

---

## Database Changes

### New Columns on Existing Tables

```sql
-- Add fields to chefs table that are missing
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS cuisine_specialties text[] DEFAULT '{}';
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS onboarding_banner_dismissed_at timestamptz;
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}';
-- social_links shape: { instagram?: string, facebook?: string, tiktok?: string }
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS onboarding_reminders_dismissed int DEFAULT 0;
-- Tracks how many individual reminders the chef has dismissed. Stop showing at 3.

-- Ensure chef_directory_listings row gets created during onboarding
-- (table already exists with cuisines, city, state, is_published, profile_photo_url, portfolio_urls)
```

### Migration Notes

- Check `database/migrations/` for highest existing timestamp before creating migration file
- All changes are additive (ADD COLUMN IF NOT EXISTS)
- No DROP, no DELETE, no ALTER TYPE

---

## Data Model

**Profile data flow during onboarding:**

1. Chef fills out profile step -> data saved to:
   - `chefs.business_name` (required)
   - `chefs.display_name` (same as business_name if not separately set)
   - `chefs.profile_image_url` (uploaded photo, max 5MB)
   - `chefs.logo_url` (uploaded logo, max 2MB)
   - `chefs.website_url`
   - `chefs.phone` (already exists)
   - `chefs.bio`
   - `chefs.cuisine_specialties` (new column, text array)
   - `chefs.city` (new column)
   - `chefs.state` (new column)
   - `chefs.social_links` (new column, JSONB: `{ instagram?, facebook?, tiktok? }`)

2. Same data also synced to `chef_directory_listings` (upsert on `chef_id`):
   - `business_name`, `cuisines`, `city`, `state`, `profile_photo_url`, `website_url`

3. Same data also synced to `chef_marketplace_profiles` (upsert on `chef_id`):
   - `cuisine_types`, `service_area_city`, `service_area_state`, `hero_image_url`

4. Public/private toggle writes to `chef_preferences.network_discoverable` (upsert on `chef_id`):
   - Defaults to **true** (public)

5. Portfolio photos (step 2) saved to:
   - Local storage: `storage/portfolio/{chefId}/{filename}`
   - Up to 5 photos, max 5MB each
   - URLs saved to `chef_directory_listings.portfolio_urls`

6. `onboarding_progress` table tracks which steps are done (as before)

7. `chefs.onboarding_completed_at` is set when wizard finishes (all steps completed or skipped). Wizard never auto-shows again after this.

8. `chefs.onboarding_banner_dismissed_at` controls whether the old-style banner appears.

9. `chefs.onboarding_reminders_dismissed` (int) tracks how many gentle reminders the chef has dismissed. At 3, all reminders stop permanently.

---

## Server Actions

| Action                                   | Auth            | Input                                                                                                                                                          | Output                                | Side Effects                                                                                                                                                                                                                                |
| ---------------------------------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `completeProfileStep(data)`              | `requireChef()` | `{ businessName, cuisines, customCuisines?, city, state, serviceArea, bio, websiteUrl, phone?, socialLinks?, isPublic, profileImageFormData?, logoFormData? }` | `{ success, error? }`                 | Triple-write: updates `chefs` row, upserts `chef_directory_listings`, upserts `chef_marketplace_profiles`, upserts `chef_preferences.network_discoverable`. Auto-generates slug if null. Revalidates `/onboarding`, `/settings/my-profile`. |
| `uploadPortfolioPhotos(formData)`        | `requireChef()` | `FormData` with up to 5 image files (max 5MB each)                                                                                                             | `{ success, urls: string[], error? }` | Writes to local storage, updates `chef_directory_listings.portfolio_urls`                                                                                                                                                                   |
| `dismissOnboardingBanner()`              | `requireChef()` | none                                                                                                                                                           | `{ success }`                         | Sets `chefs.onboarding_banner_dismissed_at = now()`                                                                                                                                                                                         |
| `dismissOnboardingReminder(reminderKey)` | `requireChef()` | `{ key: string }`                                                                                                                                              | `{ success }`                         | Increments `chefs.onboarding_reminders_dismissed`. At 3, all reminders stop.                                                                                                                                                                |
| `completePricingStep(data)`              | `requireChef()` | `{ hourlyRate?, perGuestRate?, minimumBooking?, packages?: { name, priceCents }[] }` or `{ skipped: true }`                                                    | `{ success }`                         | Saves to pricing tables, marks step complete in `onboarding_progress`                                                                                                                                                                       |
| `completeOnboardingWizard()`             | `requireChef()` | none                                                                                                                                                           | `{ success }`                         | Sets `chefs.onboarding_completed_at = now()`. Called when chef finishes or skips through all steps.                                                                                                                                         |

---

## UI / Component Spec

### Profile Step (Expanded)

Layout (top to bottom):

1. **Photo row:** Circular avatar upload (left, max 5MB, placeholder silhouette with "Add your photo") + rectangular logo upload (right, max 2MB SVG/PNG, "No logo? No problem."), side by side
2. **Business Name** (text input, required, red asterisk. This is the only field that blocks Continue.)
3. **Cuisine Specialties** (pill selector, multi-select). When "Other" is selected, a text input appears below: "Describe your specialties" with placeholder "e.g. Ethiopian, Peruvian, Molecular Gastronomy"
4. **Location row:** City (text input) + State (dropdown, 50 states + DC + "Other/International") + Service Radius (optional number input, "miles")
5. **Service Area** (text input below location, optional, "e.g. Greater Boston area, North Shore")
6. **Website** (URL input, optional, placeholder "https://yourwebsite.com")
7. **Contact info:** Phone (tel input, optional, pre-formatted), collapsible "Social media" section with Instagram handle, Facebook URL, TikTok handle (all optional)
8. **Short Bio** (textarea)
9. **Public/Private toggle:** "Make my profile visible to potential clients" with explanation tooltip: "Public = searchable and bookable. Private = invite-only." Toggle switch, defaults **ON** (public).
10. **Continue / Skip buttons** (Continue validates business name only; skip bypasses all validation)

### Portfolio Step (New)

Layout:

1. Header: "Show off your best work"
2. Subtitle: "Upload photos of your dishes, events, or plating. Clients love seeing what you do."
3. Drop zone / click-to-upload grid (max 5 photos, 5MB each)
4. Each photo shows a thumbnail with X to remove
5. Continue / Skip buttons

### Pricing Step (New - Wizard Version)

Layout:

1. Header: "Set your pricing"
2. Subtitle: "Every chef prices differently. Set your base rates so clients know what to expect."
3. **Quick pricing form** (embedded, not a redirect):
   - Hourly rate (currency input, optional)
   - Per-guest rate (currency input, optional)
   - Minimum booking amount (currency input, optional)
   - Package deals: repeatable row with name + price (e.g. "Dinner Party for 8 - $800"). Add/remove rows.
   - "I have more complex pricing" link -> navigates to full `/settings/pricing` page
4. If the chef already has pricing configured, show "Your pricing is set up" with summary and an Edit button
5. Continue / Skip buttons
6. Helper text: "You can always update pricing later from your dashboard."

### Connect Gmail Step (Rewritten Copy)

New copy:

- **Header:** "Import leads automatically"
- **Subtitle:** "If you use platforms like Take a Chef, Bark, or Thumbtack, ChefFlow can pull in new inquiries for you automatically."
- **Platform list:** Same pills (Take a Chef, Private Chef Manager, Bark, Thumbtack, Yhangry, GigSalad, The Knot, Cozymeal)
- **How it works:** "With your permission, ChefFlow checks for booking notification emails from these platforms. Only platform notifications are read. Your personal emails are never accessed."
- **Privacy note:** "You can disconnect anytime from Settings. Your email data stays on your device and is never sent to third parties."
- **Button:** "Connect Gmail" / "Skip for now"
- **Footer:** "You can always connect later from Settings > Integrations."

### Wizard Navigation (Free-Order)

- All steps in the sidebar are always clickable (no grayed-out future steps)
- Current step highlighted with orange background
- Completed steps show green checkmark
- Skipped steps show a dash or subtle indicator
- Step numbers shown but don't imply forced order
- User starts on step 1 by default on first visit
- Progress bar shows X of 5 complete (counts completed, not skipped)

### Banner and Reminder System

**Old banner (replaced):**

- The current `OnboardingBanner` component is replaced with the new reminder system below.

**Wizard completion:**

- Once the chef finishes or skips through all 5 wizard steps, `onboarding_completed_at` is set. The wizard page redirects to dashboard. The wizard never auto-appears again.
- The chef can still manually visit `/onboarding` from Settings if they want to revisit.

**Progressive reminders (new):**

- After wizard completion, if optional steps are incomplete, show a single subtle banner on the dashboard.
- Format: "Your [pricing/portfolio/etc.] isn't set up yet. [Brief reason why it matters]." with a "Set it up" link and an X to dismiss.
- Only 1 reminder at a time (rotate through: pricing first, then portfolio, then Gmail).
- Each X dismiss increments `chefs.onboarding_reminders_dismissed`.
- At 3 total dismissals, all reminders stop permanently. The chef has spoken.
- Never a modal. Never a popup. Never blocks the dashboard.

---

## Edge Cases and Error Handling

| Scenario                                           | Correct Behavior                                                                                                                                                |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Photo upload fails                                 | Show toast "Photo upload failed, try again". Don't block step completion. Photo is optional.                                                                    |
| Chef has no logo                                   | "No logo? No problem." helper text. Field stays empty, no error.                                                                                                |
| "Other" cuisine selected but no text entered       | Allow it. Store "Other" in the array. The text is bonus context, not required.                                                                                  |
| Chef already completed old wizard (3 steps)        | New wizard checks if profile/gmail/first_event are done. If so, shows hub as before. New steps (portfolio, pricing) appear as suggestions in the hub or banner. |
| Directory listing doesn't exist yet                | Create it during `completeProfileStep` with defaults. Use UPSERT (INSERT ON CONFLICT UPDATE).                                                                   |
| Chef dismisses banner then wants onboarding back   | They can visit `/onboarding` directly or find it in Settings menu.                                                                                              |
| Continue button clicked with empty required fields | Button stays visually active but shows inline validation errors on submit ("Business name is required").                                                        |

---

## Verification Steps

1. Sign in with agent account
2. Reset onboarding progress (if needed) to test fresh wizard
3. Navigate to `/onboarding`
4. Verify: page loads without crash (fixes BUG 1)
5. Verify: all 5 steps visible in sidebar, all clickable (fixes UX 5)
6. Click step 3 (Pricing) before completing step 1 - verify it works (free order)
7. Go back to step 1 (Profile):
   - Leave business name empty, click Continue - verify inline validation error shows (fixes BUG 2)
   - Enter business name, select cuisines including "Other", verify text input appears
   - Upload a profile photo, verify preview shows
   - Upload a logo, verify preview shows
   - Enter city/state, website URL
   - Toggle public/private, verify completeness meter message
   - Click Continue - verify it saves (check `chefs`, `chef_directory_listings`, `chef_marketplace_profiles` tables)
8. Step 2 (Portfolio): upload 2 photos, verify grid shows, click Continue
9. Step 3 (Pricing): enter a per-guest rate and minimum booking, click Continue, verify `chef_pricing_config` row created
10. Step 4 (Connect Gmail): verify rewritten copy matches spec, no invasive language. Skip.
11. Step 5 (First Event): Skip - verify wizard shows completion screen and `onboarding_completed_at` is set
12. Navigate to `/onboarding` again - verify redirect to dashboard (wizard never auto-shows again)
13. On dashboard: verify a subtle reminder banner appears for incomplete optional items (e.g. portfolio)
14. Dismiss the reminder - refresh page - verify it stays dismissed
15. Dismiss 2 more reminders - verify all reminders stop permanently after 3 total
16. Screenshot final result

---

## Profile Completeness and Public Visibility

### The Problem

The public/private toggle in onboarding is not a simple on/off. Three systems gate public visibility:

1. `chef_preferences.network_discoverable` (chef-controlled, this is what the toggle sets)
2. `directory_approved` (admin-controlled, not touched by onboarding)
3. `slug` must be set (auto-generated from business name)

A chef can toggle "public" in onboarding, but they won't appear in the directory until approved. This is correct (prevents empty profiles from polluting the directory), but the UX must be honest about it.

### Existing Discovery Completeness Score

`lib/discovery/profile.ts` already computes an 8-point completeness score:

| Field         | What It Checks                                     |
| ------------- | -------------------------------------------------- |
| Cuisines      | `cuisine_types.length > 0`                         |
| Service types | `service_types.length > 0`                         |
| Price range   | `price_range` is set (budget/mid/premium/luxury)   |
| Location      | `service_area_city` OR `service_area_state` is set |
| Guest count   | `min_guest_count` OR `max_guest_count` is set      |
| Tagline       | `highlight_text` is set                            |
| Hero image    | `hero_image_url` is set                            |
| Availability  | `next_available_date` is set                       |

Score = completed / 8 (0% to 100%).

### Minimum Bar for Public Listing (Proposed)

A profile should meet **at least 5 of 8** discovery criteria before it can appear in the public directory. This prevents empty shells from showing up while not being so strict that it blocks chefs who are still building out their profiles.

**Hard requirements (must have all 3):**

1. Business name
2. Profile photo OR hero image (visual identity is non-negotiable for a public listing)
3. At least 1 cuisine type

**Soft requirements (need at least 2 of 5):** 4. Service types defined 5. Price range set 6. Location (city or state) 7. Tagline/highlight text 8. Availability date

### How Onboarding Communicates This

The public/private toggle should show a **completeness meter** next to it:

- If the chef toggles ON and their profile is < 5/8 complete: show an inline message: "Your profile will become visible once you complete a few more details. Here's what's missing:" with a checklist of the missing items, each linking to the relevant field on the page or step.
- If the chef toggles ON and their profile is >= 5/8: "Your profile will be submitted for review. You'll be notified when it's live." (because `directory_approved` is admin-controlled)
- If the chef toggles OFF: "Your profile is private. Only clients you invite can see it."

This is honest. It doesn't fake success. It tells the chef exactly what they need to do and sets correct expectations about the approval step.

### Three Overlapping Profile Systems (Builder Must Know This)

The codebase has three data sources that merge for public display:

1. **`chefs` table** (legacy): `profile_image_url`, `logo_url`, `tagline`, `bio`, `website_url`
2. **`chef_directory_listings`** (older): `cuisines`, `city`, `state`, `profile_photo_url`, `portfolio_urls`, `is_published`
3. **`chef_marketplace_profiles`** (newest, canonical for discovery): `cuisine_types`, `service_types`, `price_range`, `service_area_city/state/zip`, `hero_image_url`, `highlight_text`, `accepting_inquiries`, `next_available_date`

Directory queries merge all three with priority: **marketplace > listing > legacy**.

**Onboarding must write to all three** to ensure data appears correctly everywhere:

- Profile photo -> `chefs.profile_image_url` + `chef_marketplace_profiles.hero_image_url` + `chef_directory_listings.profile_photo_url`
- Cuisines -> `chefs.cuisine_specialties` + `chef_marketplace_profiles.cuisine_types` + `chef_directory_listings.cuisines`
- Location -> `chefs.city/state` + `chef_marketplace_profiles.service_area_city/state` + `chef_directory_listings.city/state`
- And so on for all overlapping fields.

This is ugly but necessary until the three systems are consolidated (separate spec).

### Who Maintains the Completeness Criteria

The 8-point discovery score in `lib/discovery/profile.ts` is the source of truth. If criteria change, they change there. Onboarding reads from that score to show the completeness meter. The admin approval workflow (separate from onboarding) uses the same score to prioritize review.

---

## Out of Scope

- Full menu management / menu sending / menu builder (separate spec). This spec only adds an informational note during onboarding ("You'll be able to upload and send menus from your dashboard") and an optional document upload for existing menus (PDF/images stored as documents for later organization).
- Full pricing page redesign (this spec adds a quick pricing form to the wizard; the full pricing page is separate). The existing `chef_pricing_config` table is very detailed (couples/group/weekly/specialty rates, premiums, holiday tiers, add-on catalog). The onboarding quick form writes a simplified subset; full pricing management is a separate spec.
- Profile completeness enforcement and admin approval workflow (separate spec). This spec collects the data and shows the completeness meter; the rules for when a profile actually goes live in the directory are governed separately.
- Consolidation of the three overlapping profile systems (`chefs`, `chef_directory_listings`, `chef_marketplace_profiles`) into one canonical source. This spec writes to all three for compatibility; consolidation is a separate effort.
- Client onboarding form changes (separate from chef onboarding)
- Hub redesign (the 5-phase post-wizard hub stays as-is)
- Mobile-specific layout (responsive is fine, dedicated mobile redesign is separate)
- Onboarding analytics / tracking

---

## Prerequisites and Dependencies

Before a builder starts, these must be true:

1. **`chef_marketplace_profiles` table may not exist in the database.** No `CREATE TABLE` migration was found. Code references it but wraps calls in try/catch that silently fails with "marketplace migrations not applied." The onboarding migration MUST include a `CREATE TABLE IF NOT EXISTS chef_marketplace_profiles` with the full schema (see types/database.ts for columns) if it doesn't already exist. Alternatively, the builder can skip marketplace writes and rely on the fallback, but this means onboarding data won't show in discovery until the chef manually updates their public profile later. **Recommended: create the table in the migration.**

2. **`app/(chef)/onboarding/page.tsx` gateway logic must be updated** to check `chefs.onboarding_completed_at` FIRST. Currently it only checks `onboarding_progress` rows. If `onboarding_completed_at` is set, redirect to dashboard immediately. Don't even render the wizard or hub.

3. **No rows exist in `chef_directory_listings` or `chef_marketplace_profiles` for new accounts.** All writes MUST use `INSERT ... ON CONFLICT (chef_id) DO UPDATE SET ...` (upsert). Never use bare UPDATE or bare INSERT.

4. **`chef_preferences` row may not exist for new accounts.** The public/private toggle reads/writes `chef_preferences.network_discoverable`. If no row exists, treat the default as `true` (public). Create the row on first write if needed (upsert on `chef_id`).

5. **Pricing settings page is at `/settings/pricing`**, NOT `/pricing`. All links to "full pricing page" must point to `/settings/pricing`.

6. **`chefs.slug` column already exists** (TEXT UNIQUE, nullable). Auto-generation logic must: slugify the business name (kebab-case, lowercase, strip special chars), check uniqueness, append `-2`, `-3` etc. on collision, and NOT overwrite an existing non-null slug.

---

## Notes for Builder Agent

1. **Existing upload infrastructure:** Use `uploadChefProfileImage` from `lib/network/actions` and `uploadChefLogo` from `lib/chef/profile-actions` for the profile step. For portfolio photos, follow the pattern in `components/recipes/recipe-photo-upload.tsx`.

2. **Triple-write requirement (CRITICAL).** The codebase has three overlapping profile data stores. Onboarding must write to ALL THREE for data to display correctly everywhere:
   - `chefs` table (legacy fields)
   - `chef_directory_listings` (older directory system, unique on `chef_id`)
   - `chef_marketplace_profiles` (newest, canonical for discovery)
     Directory queries merge all three with priority: marketplace > listing > legacy. See the "Three Overlapping Profile Systems" section above for the exact field mapping. Use `INSERT ... ON CONFLICT DO UPDATE` for both directory listings and marketplace profiles. If `chef_marketplace_profiles` doesn't exist yet, the migration in this spec must create it.

3. **Public/private toggle writes to `chef_preferences.network_discoverable`**, NOT `directory_approved`. The toggle controls whether the chef opts in to being discoverable. Actual directory appearance also requires admin approval (`directory_approved = true`) and a `slug`. The onboarding UI must be honest about this: "Your profile will be submitted for review" not "Your profile is now live." If `chef_preferences` row doesn't exist, create it via upsert.

4. **Slug auto-generation.** When business name is saved, auto-generate a URL slug (kebab-case, unique) ONLY if `chefs.slug` is currently NULL. Don't overwrite existing slugs. Handle collisions by appending `-2`, `-3`, etc.

5. **Cuisine "Other" handling:** Store cuisines as an array. If "Other" is selected and custom text is provided, append the custom text entries to the array (split by comma). Example: user selects "Italian", "Other" and types "Ethiopian, Molecular Gastronomy" -> stored as `['Italian', 'Ethiopian', 'Molecular Gastronomy']`.

6. **Banner dismissal migration:** The new `onboarding_banner_dismissed_at` column on `chefs` defaults to NULL. NULL = not dismissed. Timestamp = dismissed at that time.

7. **Backward compatibility:** Chefs who already completed the old 3-step wizard should NOT be forced back through the new 5-step wizard. The gateway logic in `page.tsx` should check `chefs.onboarding_completed_at` FIRST. If set, redirect to dashboard. If not set, fall through to the progress-based check for old completions. New steps (portfolio, pricing) can appear as suggestions but not blockers.

8. **The crash (BUG 1):** Most likely in `onboarding-wizard.tsx` when `WIZARD_STEPS[currentIndex]` is undefined (index out of bounds after step changes). Add `if (!currentStep) return <ErrorFallback />` guard.

9. **Connect Gmail copy:** The user explicitly said "don't want to be sued or sound invasive." The words "reads", "reads emails", "AI processing" are the triggers. Reframe everything as "with your permission" and "checks for platform notifications only." Never say "reads your email."

10. **No em dashes.** Anywhere. In any copy. Use commas, periods, or parentheses instead.

11. **Profile step validation:** Business name should be the only truly required field. Everything else is optional. The Continue button should work even if only business name is filled. But if business name is empty and they click Continue (not Skip), show an inline error.

12. **State dropdown:** Include all 50 US states + DC + "Other (International)". If "Other" selected, show a text input for country/region.

13. **Discovery completeness score:** Read from `lib/discovery/profile.ts` (`computeDiscoveryCompleteness` function) to show the completeness meter on the public/private toggle. Don't reinvent the scoring logic. The existing 8-point check is the source of truth. Returns a decimal 0-1.

14. **Pricing quick form writes to `chef_pricing_config`.** The existing table has detailed fields (couples rates, group rates, weekly, specialty, premiums, add-on catalog). The onboarding quick form should write to the relevant subset: `group_rate_3_course_cents` for per-guest rate, `minimum_booking_cents` for minimum, and the add-on catalog JSONB for package deals. Don't create a separate pricing table. The "more complex pricing" link goes to `/settings/pricing`.

15. **`chefs.phone` already exists** (TEXT, nullable, from Layer 1). No migration needed for this column.
