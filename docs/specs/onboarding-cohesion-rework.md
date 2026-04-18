# Spec: Onboarding Cohesion Rework

> **Status:** draft
> **Priority:** P1 (next up)
> **Depends on:** none (uses existing archetype system, wizard, hub, all 5 onboarding subsystems)
> **Estimated complexity:** large (9+ files)

## Timeline

| Event   | Date       | Agent/Session     | Commit |
| ------- | ---------- | ----------------- | ------ |
| Created | 2026-04-17 | opus main session |        |

---

## Developer Notes

### Raw Signal

"We need to talk about the chef onboarding. What even is it? Does it feel comfortable to use? Have we found full cohesiveness in this feature? Is every endpoint connected even if thought to be unrelated? Things can always be brought to cohesiveness, to full cohesiveness. Even if you think they're unrelated topics, we need to uncover that rock. We need all users to benefit, unless very specific. What's missing from the onboarding?"

### Developer Intent

- **Core goal:** Unify the 5 independent onboarding systems into one coherent journey that feels natural for ALL chef types, not just private chefs
- **Key constraints:** Rule #7 stays (no forced gates). Must work for all 6 archetypes. Existing working code is preserved and connected, not replaced
- **Motivation:** The system works but feels fragmented. Five independent state machines, three orphaned components, wizard copy that only fits one chef type. A new caterer or food truck operator would feel like the product wasn't built for them
- **Success from the developer's perspective:** A new user of ANY chef type goes through setup that feels like it was designed specifically for them. Every onboarding subsystem is aware of the others. No orphaned code, no dead ends, no false progress

---

## What This Does (Plain English)

When a new chef signs up, the first thing they see in the setup wizard is "What kind of chef are you?" with the 6 archetype cards. Their answer configures everything downstream: which wizard steps appear, what copy each step uses, what demo data gets seeded, what Remy says in its first greeting, and what nav layout they see. The wizard and post-wizard hub merge into one unified setup journey with a single progress tracker. Orphaned components get wired in or deleted. Cross-system connections get built (wizard knows about client onboarding tokens, Remy knows about wizard state, staff checklist links from the hub). Every step validates before marking complete. The result: setup that feels personal, coherent, and comfortable for private chefs, caterers, food trucks, meal prep, bakeries, and restaurants alike.

---

## Why It Matters

ChefFlow serves 6 different chef archetypes. Today's onboarding speaks only to private chefs. Every other type sees irrelevant copy ("per-guest dinner rate", "tasting menu"), gets no personalization, and encounters a fragmented post-wizard experience. This is the single highest-leverage change for new user retention across all chef types.

---

## Audit Findings (What This Spec Fixes)

### Critical Gaps Found

| #   | Gap                                                        | Fix                                    |
| --- | ---------------------------------------------------------- | -------------------------------------- |
| 1   | Archetype selector exists but is NOT in the wizard         | Make it Step 0                         |
| 2   | Wizard steps do not branch by chef type                    | Filter + adapt copy per archetype      |
| 3   | Two parallel step systems (wizard 6 steps vs hub 5 phases) | Merge into unified journey             |
| 4   | `serviceArea` collected but never persisted                | Write to `chefs.service_area`          |
| 5   | Pricing step can mark complete with zero data              | Require at least one rate              |
| 6   | `generateOnboardingLink()` has no UI caller                | Wire into "first client" step          |
| 7   | Remy has zero awareness of wizard state                    | Feed wizard events to Remy             |
| 8   | Three orphaned components never rendered                   | Wire in or delete                      |
| 9   | No demo data during onboarding                             | Seed per-archetype demos               |
| 10  | Completion screen has no guidance                          | Show archetype-aware next steps        |
| 11  | NetworkStep built but unwired                              | Add as optional final step             |
| 12  | `onboarding_completed_at` unreliable (skip = complete)     | Distinguish skip vs genuine completion |

### Cross-System Disconnects Fixed

| System A                   | System B                 | Connection Built                                     |
| -------------------------- | ------------------------ | ---------------------------------------------------- |
| Chef wizard                | Archetype selector       | Archetype = Step 0, feeds all downstream             |
| Chef wizard "first client" | Client onboarding tokens | Offer to send onboarding link after adding client    |
| Chef wizard                | Remy onboarding          | Remy greeting acknowledges wizard progress           |
| Chef wizard/hub            | Staff onboarding         | Hub "add staff" links to staff onboarding checklist  |
| Chef wizard                | Demo data seeder         | Auto-seed archetype-flavored demo data on completion |
| Wizard                     | Hub                      | Merge into one unified journey with shared progress  |

---

## Architecture: Unified Setup Journey

### The New Step Sequence

The wizard becomes a single unified setup journey. Steps are grouped into two tiers:

**Tier 1: First-run wizard (shown immediately, guided)**

| Step | Key             | Required?                           | Shown to                                     |
| ---- | --------------- | ----------------------------------- | -------------------------------------------- |
| 0    | `archetype`     | Yes (one click)                     | ALL                                          |
| 1    | `profile`       | Business name required              | ALL                                          |
| 2    | `portfolio`     | Skippable                           | ALL                                          |
| 3    | `first_menu`    | Skippable                           | private-chef, caterer, restaurant, bakery    |
| 4    | `pricing`       | Skippable (but validated if filled) | ALL (copy adapts per archetype)              |
| 5    | `connect_gmail` | Skippable                           | ALL                                          |
| 6    | `first_event`   | Skippable                           | private-chef, caterer, meal-prep, food-truck |
| 7    | `network`       | Skippable (awareness only)          | ALL                                          |

**Tier 2: Ongoing setup hub (shown at /onboarding after wizard, also on dashboard widget)**

| Phase                | Key           | Detected from              | Shown to                                 |
| -------------------- | ------------- | -------------------------- | ---------------------------------------- |
| Profile completeness | `hub_profile` | `chefs` table field checks | ALL                                      |
| First client         | `hub_client`  | `clients` count > 0        | ALL                                      |
| First recipe         | `hub_recipe`  | `recipes` count > 0        | private-chef, caterer, meal-prep, bakery |
| Staff roster         | `hub_staff`   | `staff_members` count > 0  | caterer, restaurant                      |
| First order/booking  | `hub_booking` | `events` count > 0         | ALL                                      |

### Step Visibility Rules

```typescript
// New export in onboarding-constants.ts
export const STEP_ARCHETYPE_FILTER: Record<string, ArchetypeId[] | 'all'> = {
  archetype: 'all',
  profile: 'all',
  portfolio: 'all',
  first_menu: ['private-chef', 'caterer', 'restaurant', 'bakery'],
  pricing: 'all',
  connect_gmail: 'all',
  first_event: ['private-chef', 'caterer', 'meal-prep', 'food-truck'],
  network: 'all',
  // Hub phases
  hub_profile: 'all',
  hub_client: 'all',
  hub_recipe: ['private-chef', 'caterer', 'meal-prep', 'bakery'],
  hub_staff: ['caterer', 'restaurant'],
  hub_booking: 'all',
}
```

### Archetype-Adaptive Copy

Each wizard step gets copy variants per archetype. Stored as a simple map:

```typescript
// New file: lib/onboarding/archetype-copy.ts
export const STEP_COPY: Record<string, Partial<Record<ArchetypeId, StepCopy>>> = {
  first_menu: {
    'private-chef': {
      title: 'Your First Menu',
      description: 'Create a menu: tasting menu, date night, holiday dinner',
      placeholder: 'e.g. Pan-seared scallops',
    },
    caterer: {
      title: 'Your First Menu',
      description: 'Build a sample catering menu for events',
      placeholder: 'e.g. Passed canapes, Plated entree',
    },
    restaurant: {
      title: 'Your Menu',
      description: 'Add your current restaurant menu',
      placeholder: 'e.g. House Burger, Caesar Salad',
    },
    bakery: {
      title: 'Your Product List',
      description: 'Add your signature items',
      placeholder: 'e.g. Sourdough Boule, Chocolate Croissant',
    },
  },
  pricing: {
    'private-chef': {
      rateLabel: 'Per-guest dinner rate',
      hourlyLabel: 'Hourly rate (cook and leave)',
      minimumLabel: 'Minimum booking',
    },
    caterer: {
      rateLabel: 'Per-person rate',
      hourlyLabel: 'Hourly service rate',
      minimumLabel: 'Minimum event size',
    },
    'meal-prep': {
      rateLabel: 'Per-meal rate',
      hourlyLabel: 'Weekly package rate',
      minimumLabel: 'Minimum order',
    },
    restaurant: {
      rateLabel: 'Average plate price',
      hourlyLabel: null, // not applicable
      minimumLabel: 'Minimum party size for reservations',
    },
    'food-truck': {
      rateLabel: 'Average item price',
      hourlyLabel: 'Event booking rate',
      minimumLabel: 'Minimum catering order',
    },
    bakery: {
      rateLabel: 'Average item price',
      hourlyLabel: 'Custom cake consultation rate',
      minimumLabel: 'Minimum order',
    },
  },
  first_event: {
    'private-chef': {
      title: 'Your First Booking',
      description: 'Create your first dinner event',
    },
    caterer: {
      title: 'Your First Event',
      description: 'Log an upcoming catering event',
    },
    'meal-prep': {
      title: 'Your First Prep Order',
      description: 'Create your first weekly prep order',
    },
    'food-truck': {
      title: 'Your First Stop',
      description: 'Add your next scheduled location or event',
    },
  },
}
```

---

## Files to Modify

| File                                                             | What to Change                                                                                                                                                       |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/onboarding/onboarding-constants.ts`                         | Add `archetype` and `network` to ONBOARDING_STEPS. Add STEP_ARCHETYPE_FILTER map. Export WIZARD_STEPS as archetype-filtered function instead of static array         |
| `components/onboarding/onboarding-wizard.tsx`                    | Step 0 = ArchetypeSelector. Filter subsequent steps by selected archetype. Pass archetype-aware copy to step components. Wire NetworkStep as final step              |
| `components/onboarding/onboarding-steps/profile-step.tsx`        | Persist `serviceArea` field (currently dropped)                                                                                                                      |
| `components/onboarding/onboarding-steps/pricing-step-wizard.tsx` | Validate at least one rate is filled before allowing "Complete" (not "Skip"). Accept archetype-aware labels as props                                                 |
| `components/onboarding/onboarding-steps/first-menu-step.tsx`     | Accept archetype-aware copy (title, description, placeholder) as props                                                                                               |
| `components/onboarding/onboarding-steps/first-booking-step.tsx`  | Accept archetype-aware copy as props                                                                                                                                 |
| `components/onboarding/onboarding-steps/first-client-step.tsx`   | After adding client, offer "Send onboarding link" button calling `generateOnboardingLink()`                                                                          |
| `lib/onboarding/onboarding-actions.ts`                           | `persistProfileData`: write `serviceArea` to `chefs.service_area`. `completeStep`: validate pricing data before marking complete. Add `getWizardStepsForArchetype()` |
| `components/onboarding/onboarding-hub.tsx`                       | Filter hub phases by archetype. Show unified progress (wizard + hub combined)                                                                                        |
| `app/(chef)/onboarding/page.tsx`                                 | Pass archetype to both wizard and hub. Single unified progress view                                                                                                  |
| `lib/ai/remy-personality-engine.ts`                              | In `getCuratedGreeting()`, check `onboarding_progress` table. If wizard recently completed, acknowledge it. If mid-wizard, offer encouragement                       |
| `lib/onboarding/demo-data-actions.ts`                            | Accept archetype param. Seed archetype-appropriate sample data (caterer gets multi-day events; bakery gets product orders; etc.)                                     |
| `app/(chef)/dashboard/page.tsx`                                  | Wire `OnboardingChecklistWidget` into sidebar (replaces orphaned state). Remove stale comment about layout gate                                                      |
| `components/dashboard/onboarding-checklist-widget.tsx`           | Filter phases by archetype. Show combined wizard + hub progress                                                                                                      |

## Files to Create

| File                               | Purpose                                      |
| ---------------------------------- | -------------------------------------------- |
| `lib/onboarding/archetype-copy.ts` | Archetype-adaptive copy for each wizard step |

## Files to Delete (Orphaned, Never Rendered)

| File                                                  | Reason                                                     |
| ----------------------------------------------------- | ---------------------------------------------------------- |
| `components/dashboard/onboarding-accelerator.tsx`     | Never imported. Functionality absorbed by checklist widget |
| `components/dashboard/onboarding-reminder-banner.tsx` | Never imported. Functionality absorbed by unified progress |

---

## Database Changes

### New Columns on Existing Tables

```sql
-- If chefs.service_area doesn't exist, add it:
ALTER TABLE chefs ADD COLUMN IF NOT EXISTS service_area text;
```

### Migration Notes

- Check if `chefs.service_area` already exists before creating migration
- No new tables needed; this spec connects existing systems

---

## Data Model

No new entities. Key relationships being connected:

- `chef_preferences.archetype` feeds into `onboarding_progress` step filtering
- `onboarding_progress` step events feed into `remy_onboarding` greeting logic
- `clients` rows created via wizard trigger `generateOnboardingLink()` offer
- `staff_members` rows link to `staff_onboarding_items` checklist from hub

---

## Server Actions

| Action                                  | Auth            | Input           | Output             | Side Effects                                     |
| --------------------------------------- | --------------- | --------------- | ------------------ | ------------------------------------------------ |
| `getWizardStepsForArchetype(archetype)` | `requireChef()` | `ArchetypeId`   | `OnboardingStep[]` | None (pure filter)                               |
| `completeStep` (modified)               | `requireChef()` | `step, data`    | `{ success }`      | Now validates pricing data; persists serviceArea |
| `seedDemoData` (modified)               | `requireChef()` | `{ archetype }` | `{ success }`      | Creates archetype-appropriate sample records     |

---

## UI / Component Spec

### Wizard Flow (Updated)

**Step 0: Archetype Selection**

- 6 cards in a 2x3 grid (mobile: single column)
- Each card: emoji, label, one-line description (from `presets.ts`)
- One click selects and advances. No "continue" button needed
- Calls `selectArchetype()` which configures nav/modules/HACCP
- This is the ONLY non-skippable step besides business name

**Steps 1-7: Filtered by archetype**

- Sidebar shows only steps relevant to selected archetype
- Progress bar reflects filtered count, not total
- Copy adapts per archetype (labels, placeholders, descriptions)
- "Skip" remains available on every step

**Completion Screen (Updated)**

- Shows archetype-aware congratulations: "Your [archetype label] workspace is ready"
- Three suggested next actions based on archetype (e.g., caterer sees "Add your team", private chef sees "Add your first client")
- "Explore on your own" button goes to dashboard
- Demo data toggle: "Want to see sample data to explore? We'll add a few example [events/orders/bookings]"

### Dashboard Integration

- `OnboardingBanner` remains as-is (primary CTA to `/onboarding`)
- `OnboardingChecklistWidget` gets wired into dashboard sidebar, showing combined wizard + hub progress filtered by archetype
- When all items complete (wizard + hub), widget shows "Setup complete" with a dismiss action, then disappears permanently

### States

- **Loading:** Skeleton cards for archetype step; skeleton progress bar for other steps
- **Empty:** Profile step pre-fills business name from auth if available
- **Error:** Toast on server action failure; step stays incomplete (never false-complete)
- **Populated:** Steps with existing data (e.g., returning to wizard after adding recipes elsewhere) auto-detect completion

---

## Edge Cases and Error Handling

| Scenario                                             | Correct Behavior                                                                                           |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| User skips archetype step                            | Cannot skip. Archetype is required. Show gentle prompt: "This helps us set up the right tools for you"     |
| User changes archetype later (Settings)              | Hub re-filters phases. Wizard is already complete so no re-run. Nav/modules update via `selectArchetype()` |
| `selectArchetype()` fails                            | Show toast error. Do not advance wizard. Retry button                                                      |
| Pricing step: user fills nothing and clicks Continue | Show validation: "Set at least one rate, or skip this step"                                                |
| `serviceArea` is empty string                        | Treat as null, don't persist empty string                                                                  |
| Client added in wizard but email is empty            | Don't offer "Send onboarding link" (requires email)                                                        |
| Demo data already seeded (user re-visits)            | `seedDemoData` is idempotent; check for existing sample records                                            |
| Remy greeting: wizard not started                    | Default greeting (current behavior)                                                                        |
| Remy greeting: wizard mid-progress                   | "Looks like you're getting set up! Let me know if you need help"                                           |
| Remy greeting: wizard just completed                 | "Welcome! Your workspace is ready. What would you like to do first?"                                       |

---

## Verification Steps

1. Sign in with agent account (fresh, no onboarding data)
2. Navigate to `/onboarding`
3. Verify Step 0 shows 6 archetype cards
4. Select "Caterer" - verify subsequent steps filter (no "Your First Booking" in private-chef style)
5. Verify pricing step shows "Per-person rate" (not "Per-guest dinner rate")
6. Verify menu step shows "Build a sample catering menu" copy
7. Skip all steps except archetype + profile (enter business name)
8. Verify completion screen shows "Your Caterer workspace is ready"
9. Verify dashboard nav reflects caterer preset (Staff in action bar)
10. Verify `OnboardingChecklistWidget` appears on dashboard with filtered phases
11. Navigate to `/onboarding` - verify hub shows with archetype-filtered phases
12. Open Remy - verify greeting acknowledges setup completion
13. Repeat steps 1-12 with "Food Truck" archetype to confirm different step filtering
14. Verify `OnboardingAccelerator` and `OnboardingReminderBanner` are deleted (no import references)
15. Screenshot final states for each archetype

---

## Out of Scope

- Redesigning individual step UIs (profile photo upload, Gmail OAuth, etc.) - those work fine
- Client onboarding form changes (token-based flow works)
- Staff onboarding checklist changes (9-item HR list works)
- Beta onboarding changes (separate funnel, different audience)
- Remy onboarding tour rewrite (separate system, just adding awareness bridge)
- New archetype definitions (6 is enough for V1)
- Mobile-specific wizard layout (works but could be improved later)

---

## Notes for Builder Agent

1. **Rule #7 is sacred.** No redirects in layout.tsx. The banner nudges; the wizard is opt-in.
2. **Archetype presets already exist** in `lib/archetypes/presets.ts`. `selectArchetype()` in `lib/archetypes/actions.ts` already writes to `chef_preferences` and configures nav/modules/HACCP. Do not rebuild this.
3. **`onboarding-constants.ts` cannot use `'use server'`** - Next.js restriction. Keep it as a plain module.
4. **The `ArchetypeSelector` component exists** at `components/onboarding/archetype-selector.tsx`. Reuse its card layout but adapt it for wizard step context (no `min-h-screen`, no standalone page layout).
5. **`NetworkStep` exists** at `components/onboarding/onboarding-steps/network-step.tsx`. Just import and wire it.
6. **`generateOnboardingLink()`** is in `lib/clients/onboarding-actions.ts`. It returns a URL. The first-client step just needs a "Send link" button that calls it.
7. **Remy personality engine** at `lib/ai/remy-personality-engine.ts` already has a priority chain in `getCuratedGreeting()`. Add wizard-state check as a new priority level.
8. **Test the archetype-to-step filtering** by selecting each of the 6 archetypes and verifying step count differs appropriately.
9. **Delete orphaned files** listed above. Grep for imports first to triple-confirm zero references.

---

## Question Set: Full Cohesion Verification

These 40 questions from the audit should all answer YES after this spec is built. The question set document is at `docs/specs/system-integrity-question-set-onboarding.md`.
