# Configuration Engine

> Status: **draft** | Priority: **P0** | Depends on: onboarding-cohesion-rework

## Problem

Chef onboarding collects an archetype, then drops the user into a generic product. The user must manually configure dashboard widgets, nav layout, pricing defaults, Remy personality, and dozens of preference columns across 4+ tables. Most never do. The product feels generic instead of purpose-built.

## Solution

A **deterministic configuration engine** that collects 5 high-signal inputs during onboarding and maps them to concrete system state. No AI, no heuristics: structured inputs mapped to predefined transformations. The chef answers 5 questions; the system instantiates a fully working version tailored to them.

## Design Principles

1. **Formula over AI.** Every transformation is a lookup table, not a model call.
2. **Presets, not locks.** Every configured value is editable in Settings. The engine sets intelligent defaults; the chef owns the final state.
3. **Additive only.** The engine writes defaults where none exist. It never overwrites user-modified values.
4. **Idempotent.** Running the engine twice with the same inputs produces the same state. Re-running with different inputs overwrites only engine-managed fields.

---

## Input Dimensions

### 1. Archetype (what you do)

Already exists. 6 options: `private-chef`, `caterer`, `meal-prep`, `restaurant`, `food-truck`, `bakery`.

### 2. Scale (team size)

| ID           | Label            | Description              |
| ------------ | ---------------- | ------------------------ |
| `solo`       | Just me          | One-person operation     |
| `small-team` | Small team (2-5) | A few people helping     |
| `large-team` | Large team (6+)  | Full staff to coordinate |

### 3. Maturity (business stage)

| ID              | Label              | Description                         |
| --------------- | ------------------ | ----------------------------------- |
| `new`           | Just starting out  | No existing clients or history      |
| `established`   | Running business   | Existing clients, recipes, pricing  |
| `transitioning` | Changing direction | Pivoting from another food business |

### 4. Acquisition (how clients find you)

| ID              | Label                     | Description                                           |
| --------------- | ------------------------- | ----------------------------------------------------- |
| `word-of-mouth` | Word of mouth / referrals | Clients come from personal network                    |
| `inquiries`     | Online inquiries          | Clients find you via website, social media, platforms |
| `walk-ins`      | Walk-in / foot traffic    | Location-based discovery                              |
| `recurring`     | Recurring clients only    | Steady roster, no new client acquisition              |

### 5. Integrations (current tools)

| ID             | Label                    | Description                  |
| -------------- | ------------------------ | ---------------------------- |
| `gmail`        | Gmail / Google Workspace | Email-based workflow         |
| `spreadsheets` | Spreadsheets             | Tracking in Excel/Sheets     |
| `nothing`      | Nothing formal           | Mental tracking, paper, etc. |

---

## Output: SystemConfiguration

The engine produces a `SystemConfiguration` object that maps to writes across 4 tables:

### chef_preferences (upsert)

| Field                      | Derived from      | Logic                                                                |
| -------------------------- | ----------------- | -------------------------------------------------------------------- |
| `archetype`                | archetype         | Direct                                                               |
| `enabled_modules`          | archetype         | From `ArchetypeDefinition.enabledModules`                            |
| `primary_nav_hrefs`        | archetype         | From `ArchetypeDefinition.primaryNavHrefs`                           |
| `mobile_tab_hrefs`         | archetype         | From `ArchetypeDefinition.mobileTabHrefs`                            |
| `dashboard_widgets`        | archetype + scale | Archetype picks relevant categories; scale adds staff/collab widgets |
| `default_prep_hours`       | archetype         | Restaurant/bakery: 2.0; caterer: 4.0; others: 3.0                    |
| `default_buffer_minutes`   | archetype         | Caterer: 45; food-truck: 15; others: 30                              |
| `default_shopping_minutes` | archetype + scale | Solo: 60; team: 45                                                   |
| `target_margin_percent`    | maturity          | New: 50; established: 60; transitioning: 55                          |
| `focus_mode`               | maturity          | New: true (less overwhelming); established/transitioning: false      |

### chef_pricing_config (upsert, only for `new` maturity)

| Field                | Derived from | Logic                                                     |
| -------------------- | ------------ | --------------------------------------------------------- |
| `deposit_percentage` | archetype    | Caterer: 50; private-chef: 50; meal-prep: 100; others: 50 |
| `balance_due_hours`  | archetype    | Meal-prep: 0 (pay upfront); others: 24                    |

Note: For `established` maturity, pricing is NOT touched since the chef has real numbers.

### ai_preferences (upsert)

| Field            | Derived from         | Logic                                  |
| ---------------- | -------------------- | -------------------------------------- |
| `remy_enabled`   | always               | true                                   |
| `remy_archetype` | archetype + maturity | See Remy archetype mapping table below |

### event_templates (insert, only when none exist)

One starter template per archetype. Only created for `new` maturity.

---

## Transformation Tables

### Dashboard Widget Selection

Base widgets always enabled (all archetypes):

- `todays_schedule`, `week_strip`, `priority_queue`, `business_health`, `dietary_allergy_alerts`

Archetype-specific additions:

| Archetype      | Additional widgets                                                   |
| -------------- | -------------------------------------------------------------------- |
| `private-chef` | `response_time`, `pending_followups`, `payments_due`, `revenue_goal` |
| `caterer`      | `response_time`, `payments_due`, `revenue_goal`, `quick_expense`     |
| `meal-prep`    | `payments_due`, `revenue_goal`                                       |
| `restaurant`   | `quick_expense`, `revenue_goal`                                      |
| `food-truck`   | `quick_expense`                                                      |
| `bakery`       | `response_time`, `payments_due`, `revenue_goal`                      |

Scale-specific additions:

| Scale        | Additional widgets |
| ------------ | ------------------ |
| `small-team` | (none extra)       |
| `large-team` | (none extra)       |

### Remy Archetype Mapping

| Archetype      | new      | established | transitioning |
| -------------- | -------- | ----------- | ------------- |
| `private-chef` | `mentor` | `veteran`   | `mentor`      |
| `caterer`      | `mentor` | `veteran`   | `mentor`      |
| `meal-prep`    | `zen`    | `numbers`   | `mentor`      |
| `restaurant`   | `mentor` | `numbers`   | `mentor`      |
| `food-truck`   | `hype`   | `veteran`   | `mentor`      |
| `bakery`       | `zen`    | `veteran`   | `mentor`      |

### Starter Event Templates

Only created for `new` maturity, one per archetype:

| Archetype      | Template                                                                          |
| -------------- | --------------------------------------------------------------------------------- |
| `private-chef` | "Dinner Party" - occasion: dinner_party, service_style: plated, guest_count: 6    |
| `caterer`      | "Corporate Lunch" - occasion: corporate, service_style: buffet, guest_count: 30   |
| `meal-prep`    | "Weekly Meal Prep" - occasion: meal_prep, service_style: delivery, guest_count: 1 |
| `restaurant`   | (none, restaurants don't use event templates)                                     |
| `food-truck`   | "Pop-Up Event" - occasion: pop_up, service_style: counter, guest_count: 50        |
| `bakery`       | "Custom Order" - occasion: custom_order, service_style: pickup, guest_count: 1    |

### Import Wizard Surface

| Maturity        | Behavior                                                                  |
| --------------- | ------------------------------------------------------------------------- |
| `new`           | Skip import wizard emphasis; guide to manual creation                     |
| `established`   | Emphasize import wizard on first visit; show CSV/Gmail import prominently |
| `transitioning` | Same as established                                                       |

### Gmail Integration Prompt

| Integrations   | Behavior                                                           |
| -------------- | ------------------------------------------------------------------ |
| `gmail`        | Auto-surface Gmail connect step prominently; mark as high priority |
| `spreadsheets` | Surface CSV import prominently instead                             |
| `nothing`      | De-emphasize integrations; focus on manual entry                   |

---

## Implementation

### Files

| File                                             | Purpose                                                 |
| ------------------------------------------------ | ------------------------------------------------------- |
| `lib/onboarding/configuration-engine.ts`         | Types, `resolveConfiguration()`, `applyConfiguration()` |
| `lib/onboarding/configuration-inputs.ts`         | Input dimension definitions (labels, options, icons)    |
| `components/onboarding/onboarding-interview.tsx` | 5-screen interview UI (replaces single archetype card)  |

### resolveConfiguration(inputs) -> SystemConfiguration

Pure function. No DB access. Takes 5 inputs, returns a `SystemConfiguration` object with all computed values. Fully testable.

### applyConfiguration(config) -> void

Server action. Writes the `SystemConfiguration` to the database:

1. Upsert `chef_preferences` with nav, modules, widgets, timing, financial defaults
2. Upsert `chef_pricing_config` with deposit/balance defaults (new maturity only)
3. Upsert `ai_preferences` with Remy archetype and enabled flag
4. Insert `event_templates` starter template (new maturity only, when none exist)
5. Bust all relevant caches

### Interview UI Flow

5 screens, one per dimension. Each screen is a card selection (like current archetype step). Back/forward navigation. Progress indicator. Final "Set Up My Workspace" button triggers `resolveConfiguration()` + `applyConfiguration()`.

The interview replaces the current archetype-only Step 0 in the wizard. After completion, the wizard continues with the remaining steps (profile, portfolio, etc.) which are now filtered by archetype.

---

## Verification

- [ ] Each input combination produces a valid, non-empty SystemConfiguration
- [ ] applyConfiguration is idempotent (running twice = same state)
- [ ] Established maturity does NOT write pricing defaults
- [ ] Event templates only created when none exist
- [ ] All written values are editable in Settings
- [ ] Re-running interview with different inputs updates config correctly
- [ ] focus_mode correctly set per maturity
- [ ] Remy archetype correctly mapped per archetype + maturity
- [ ] Dashboard widgets match the transformation table
