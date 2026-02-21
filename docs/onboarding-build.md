# Onboarding System — Build Notes

## What Was Built

Extended the existing 5-step onboarding wizard (profile + Stripe) with a full business migration hub covering five domains: clients, loyalty, recipes, and staff.

---

## Files Created or Modified

### New Server Actions

**`lib/onboarding/progress-actions.ts`**
Computes per-phase completion by querying 5 existing tables in parallel. No new schema — all reads hit tables that already exist. Returns `OnboardingProgress` with booleans and counts for each phase, plus `completedPhases / totalPhases` for the progress bar.

**`lib/clients/import-actions.ts`**
Two exports:
- `importClientDirect()` — inserts a client row directly with `auth_user_id = null`. Bypasses the invitation/email flow. Suitable for migrating existing clients who don't need portal access yet. Email is optional. Checks for duplicate email within tenant if provided.
- `getImportedClients()` — lightweight list for the loyalty seeding page.

### Modified Pages

**`app/(chef)/onboarding/page.tsx`** *(rewritten)*
Was: redirect to `/dashboard` when wizard done.
Now: when wizard done, shows `<OnboardingHub>` instead. When wizard not done, unchanged — still shows the existing 5-step `<OnboardingWizard>`.

### New Pages

**`app/(chef)/onboarding/clients/page.tsx`**
Server component. Loads `getImportedClients()` and renders `<ClientImportForm>`.

**`app/(chef)/onboarding/loyalty/page.tsx`**
Server component. Loads `getLoyaltyConfig()`, `getRewards()`, and `getImportedClients()` in parallel. Renders `<LoyaltySetup>`.

**`app/(chef)/onboarding/recipes/page.tsx`**
Server component. Loads `getRecipes()` and renders `<RecipeEntryForm>`.

**`app/(chef)/onboarding/staff/page.tsx`**
Server component. Loads `listStaffMembers()` and renders `<StaffEntryForm>`.

### New Components

**`components/onboarding/onboarding-hub.tsx`**
The migration progress dashboard. Shows five phase cards with completion status (green check vs. empty circle), counts where applicable, and CTA buttons. Top-level progress bar shows X of 5 phases complete. Has a "Go to Dashboard" escape hatch — the chef decides when they're done, there's no forced redirect.

**`components/onboarding/client-import-form.tsx`**
Split-panel layout: form on left (3/5), imported list on right (2/5). Fields: name, email, phone, preferred contact, referral source, dietary restrictions (chip input), allergies (chip input), past events count, historical spend. "Save & Add Another" clears form without navigating. Calls `importClientDirect()`.

**`components/onboarding/loyalty-setup.tsx`**
Three-tab wizard in a single page:
1. **Config** — earn rate, tier thresholds, welcome points. Calls `updateLoyaltyConfig()`.
2. **Rewards** — add reward catalog entries. Calls `createReward()`. Shows existing rewards (default catalog is auto-seeded by `getLoyaltyConfig()` on first load).
3. **Balances** — per-client balance seeding. Calls `awardBonusPoints()` with type=`bonus` and description "Opening balance — migrated from previous records". Append-only — no destructive operation. Warns chef prominently.

**`components/onboarding/recipe-entry-form.tsx`**
Same split-panel pattern. Calls existing `createRecipe()` from `lib/recipes/actions.ts` (no new action needed — it already existed). Fields: name, category, description, method (short + detailed), prep/cook time, yield, dietary tags, notes.

**`components/onboarding/staff-entry-form.tsx`**
Same split-panel pattern. Calls existing `createStaffMember()` from `lib/staff/actions.ts`. Fields: name, role (enum), email, phone, hourly rate, notes. Marked optional — has "Skip → Dashboard" link.

---

## Key Design Decisions

### Client Import vs. Invitation
The existing `inviteClient()` sends an email and creates a token expecting the client to sign up. That's wrong for migration — most existing clients don't need portal access. `importClientDirect()` creates the row with `auth_user_id = null`. The chef can send a proper invitation later from the Clients section.

### Loyalty Seeding Safety
The points ledger is append-only (immutable by DB trigger). There is no "edit balance" — only append transactions. The seed UI:
- Warns the chef visibly before entry
- Uses `type = 'bonus'` which is the correct transaction type for manual awards
- Tier is recomputed automatically by `awardBonusPoints()` after each save
- If a chef enters the wrong number, they correct it with another `adjustment` transaction from the client detail page

### No New Migrations
All tables exist. The build is entirely UI + two new server action files.

### Progress Detection Logic
- **Profile**: checks `business_name` AND `display_name` both non-null on the `chefs` row
- **Clients**: count > 0 on `clients` table (tenant-scoped)
- **Loyalty**: `loyalty_config` row exists for tenant (auto-created on first `getLoyaltyConfig()` call)
- **Recipes**: count > 0 on `recipes` table (tenant-scoped, non-archived)
- **Staff**: count > 0 on `staff_members` table using `chef_id` (not `tenant_id` — staff table uses `chef_id`)

### Staff Table Column
Discovered: `staff_members` uses `chef_id` (not `tenant_id`) for tenant isolation. This differs from every other table. The progress-actions.ts query correctly uses `.eq('chef_id', user.tenantId!)` to match this.

---

## How It Connects to the System

The onboarding hub is not a one-time flow — it's re-accessible any time. The progress recomputes live on each visit. A chef can leave mid-way, do other work, and come back. Each sub-page links back to the hub and forward to the next logical step.

After completing setup, clients appear immediately in the Clients section, recipes in the Culinary section, loyalty balances in the Loyalty dashboard, and staff in the Staff section. Nothing is isolated to "onboarding mode" — it all writes to the same live tables.
