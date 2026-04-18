# System Integrity Question Set: Configuration Engine + Onboarding Cohesion

> 40 questions across 8 domains. Forces every endpoint into a fully specified, verifiable state.
> Pre-build score: **14/40 (35%)**

---

## Domain A: Interview Flow (5 questions)

### A1. Does the 5-screen interview auto-advance on card selection?

**Answer:** YES. Each `select()` call updates state and either advances `screenIndex` or triggers `applyAndFinish()` on the last screen.
**Status:** BUILT
**File:** `components/onboarding/onboarding-interview.tsx:37-49`

### A2. Can the chef go back to a previous screen during the interview?

**Answer:** YES. Back button visible on screens 2-5. `goBack()` decrements `screenIndex`.
**Status:** BUILT
**File:** `components/onboarding/onboarding-interview.tsx:57-59`

### A3. If the chef closes the browser mid-interview (3 of 5 answered), what happens when they return?

**Answer:** GAP. Interview state lives in React `useState` only. No persistence. Chef starts over from screen 1. Previously answered values are lost.
**Status:** GAP (low risk; interview takes ~30 seconds)
**Recommended:** Accept as-is. 5 taps is fast enough that persistence is over-engineering.

### A4. Is there a "Skip setup entirely" escape hatch visible during the interview?

**Answer:** GAP. The old wizard had a "Skip setup entirely" link below the archetype cards. The interview component does NOT render this link. A chef stuck on the interview has no exit.
**Status:** GAP (medium risk)
**Recommended:** Add skip link to interview UI footer.

### A5. Does the progress indicator (dots) correctly reflect completed vs remaining screens?

**Answer:** YES. `INTERVIEW_SCREENS.map()` renders dots with width/color transitions based on `screenIndex`.
**Status:** BUILT

---

## Domain B: Configuration Engine Correctness (5 questions)

### B1. Is `resolveConfiguration()` a pure function with zero side effects?

**Answer:** PARTIAL. It calls `require()` to dynamically import `@/lib/archetypes/presets` and `@/lib/scheduling/types`. These are synchronous requires of pure-data modules, so no DB or network. But the `require()` pattern is fragile in Next.js.
**Status:** GAP (low risk)
**Recommended:** Convert to static imports. The engine file is NOT a `'use server'` file so regular imports work.

### B2. Is every input combination valid? Can any combination produce an invalid `SystemConfiguration`?

**Answer:** YES, all are valid. Every archetype has entries in every lookup table (`PREP_HOURS`, `BUFFER_MINUTES`, `REMY_ARCHETYPE_MAP`, `STARTER_TEMPLATES`, `DEPOSIT_PCT`, `BALANCE_DUE_HOURS`). TypeScript guarantees exhaustiveness at compile time.
**Status:** BUILT

### B3. Is `applyConfiguration()` idempotent?

**Answer:** YES. Uses upsert pattern (check existing, then insert or update). Event templates only insert if zero templates exist. Pricing only overwrites if still at defaults.
**Status:** BUILT

### B4. Does the engine overwrite user-customized settings if re-run?

**Answer:** PARTIAL GAP. `chef_preferences` fields (nav, widgets, modules, prep hours, etc.) ARE overwritten unconditionally. Only `chef_pricing_config` has the "only if still at defaults" guard. A chef who customized their nav layout and then re-ran the interview would lose customizations.
**Status:** GAP (medium risk; interview only runs once during onboarding, but re-running is theoretically possible via direct URL)
**Recommended:** Add a `configuration_applied_at` timestamp to `chef_preferences`. Skip writes on re-run unless the chef explicitly wants to reset.

### B5. Does the engine bust all relevant caches after writing?

**Answer:** YES. Calls `revalidatePath('/', 'layout')` + 3 `revalidateTag` calls. The chef layout cache, archetype cache, and preferences cache are all busted.
**Status:** BUILT

---

## Domain C: Data Flow Completeness (10 questions)

### C1. Does `dashboard_widgets` (written by engine) actually control which widgets render?

**Answer:** NO. The dashboard page (`app/(chef)/dashboard/page.tsx`) is a **hand-authored layout**. It does NOT iterate `dashboard_widgets` to decide what to render. The JSONB preference is only used on the Settings > Dashboard page (`/settings/dashboard`) where chefs toggle widgets. The dashboard itself renders all sections unconditionally via `<Suspense>` blocks.
**Status:** DISCONNECTED. Engine writes the preference, but the dashboard ignores it.
**Recommended:** This is a known architectural choice (dashboard layout is curated, not dynamic). The widget preference controls the Settings toggle state. Not a bug, but the engine's widget selection has no visible effect until the dashboard is made dynamic.

### C2. Does `mobile_tab_hrefs` (written by engine) actually render in a mobile tab bar?

**Answer:** YES. `app/(chef)/layout.tsx:115` reads `mobile_tab_hrefs` from layout cache. `components/settings/mobile-tab-form.tsx` provides the Settings UI. The mobile bottom nav renders these tabs.
**Status:** CONNECTED

### C3. Does `focus_mode` (written by engine) actually do anything?

**Answer:** YES. `lib/billing/focus-mode-actions.ts` reads it. `app/(chef)/layout.tsx:118` reads it from layout cache. When enabled, it restricts `enabled_modules` to core-only modules, reducing sidebar noise.
**Status:** CONNECTED

### C4. Do `default_prep_hours`, `default_buffer_minutes`, `default_shopping_minutes` flow into real scheduling?

**Answer:** YES. Read by:

- `lib/scheduling/timeline.ts:152-155` (event timeline generation)
- `lib/scheduling/prep-block-engine.ts:279-280` (prep block calculation)
- `lib/scheduling/capacity-planning-actions.ts:133-145` (capacity planning)
  **Status:** CONNECTED

### C5. Does `target_margin_percent` flow into financial calculations?

**Answer:** YES. Read by:

- `lib/grocery/pricing-actions.ts:858-865` (food budget ceiling from quote price)
- `lib/documents/generate-grocery-list.ts:500` (grocery list budget)
- `lib/documents/generate-consolidated-grocery-list.ts:124` (consolidated grocery budget)
- `lib/expenses/actions.ts:745` (expense budget formula)
  **Status:** CONNECTED

### C6. Do `deposit_percentage` and `balance_due_hours` flow into quote/invoice generation?

**Answer:** YES. `deposit_percentage` used in:

- `lib/quotes/actions.ts:166` (quote creation)
- `lib/pricing/config-actions.ts:24` (pricing config validation)
- `components/quotes/quote-form.tsx` (quote form defaults)
- `lib/pricing/compute.ts` (pricing computation)
  **Status:** CONNECTED

### C7. Does `remy_archetype` (written by engine) actually change Remy's personality in chat?

**Answer:** **NO. CRITICAL GAP.** The `remy_archetype` value is saved to `ai_preferences` and is selectable in Settings (`components/ai-privacy/remy-archetype-selector.tsx`). Each archetype has a detailed `promptModifier` string in `lib/ai/remy-archetypes.ts`. BUT: **`remy-actions.ts` never reads `remy_archetype` from the DB and never injects the `promptModifier` into the system prompt.** The system prompt hardcodes `REMY_PERSONALITY` (the veteran persona) for all chefs regardless of their selection.
**Status:** DISCONNECTED. Dead control.
**Recommended:** In `remy-actions.ts` system prompt builder, read `remy_archetype` from `ai_preferences`, look up the matching `REMY_ARCHETYPES[].promptModifier`, and inject it after `REMY_PERSONALITY`.

### C8. Does the starter event template (written by engine) get used anywhere?

**Answer:** **NO. CRITICAL GAP.** The `event_templates` table exists. The engine inserts a starter template for new businesses. But **no UI or server action reads from `event_templates` when creating events.** The event creation form (`app/(chef)/events/new/`) has no template selector. Templates are orphaned data.
**Status:** DISCONNECTED. Dead data.
**Recommended:** Either wire templates into event creation (template dropdown on new event form) or remove the starter template write from the engine.

### C9. Do `configHints` (returned to wizard) get used by any downstream wizard step?

**Answer:** **NO. GAP.** The wizard stores `configHints` in state via `setConfigHints(hints)`, but NO wizard step reads `configHints`. The Gmail connect step doesn't check `emphasize_gmail`. The import surfaces don't check `emphasize_import`. The hints die in state.
**Status:** DISCONNECTED.
**Recommended:** Pass relevant hints as props to downstream steps. E.g., ConnectGmailStep gets `priority={configHints.emphasize_gmail}` to show a highlighted UI.

### C10. Does the onboarding banner on dashboard know about configuration engine inputs?

**Answer:** NO. `components/onboarding/onboarding-banner.tsx` only reads generic progress (total steps, completed, current step). It has no archetype or maturity awareness. Shows same generic banner to all chefs.
**Status:** ACCEPTABLE. Banner is a simple progress nudge. Archetype-specific content belongs in the wizard, not the banner.

---

## Domain D: Cross-System Wiring (5 questions)

### D1. Does the Remy onboarding state machine (`remy_onboarding` table) know the wizard was completed?

**Answer:** YES. `remy-personality-engine.ts` checks `chefs.onboarding_completed_at` in `getCuratedGreeting()`. If completed within 2 hours, Remy gives a welcome greeting and marks the `wizard_completed` milestone.
**Status:** CONNECTED

### D2. Does archetype selection in Settings (not onboarding) also trigger the configuration engine?

**Answer:** NO. `selectArchetype()` in `lib/archetypes/actions.ts` only writes 3 columns (archetype, enabled_modules, primary_nav_hrefs). It does NOT call the configuration engine. Changing archetype in Settings does not reconfigure widgets, prep hours, margin targets, Remy personality, or focus mode.
**Status:** ACCEPTABLE GAP. Archetype change in Settings is a targeted override, not a full reconfiguration. The engine is a first-run initializer, not an ongoing sync.

### D3. Does the post-wizard hub (`OnboardingHub`) benefit from configuration engine outputs?

**Answer:** PARTIAL. The hub receives `archetype` prop and filters phases by archetype (staff only for caterer/restaurant). But it doesn't use scale, maturity, or other engine outputs.
**Status:** ACCEPTABLE. Hub is a simple phase tracker.

### D4. Does the beta onboarding checklist conflict with the main onboarding?

**Answer:** NO CONFLICT. `beta_onboarding_checklist` is a separate client-facing system (`lib/beta/onboarding-actions.ts`). It tracks client beta testing milestones (taste profile, circle creation, event booking). Completely orthogonal to chef onboarding.
**Status:** NO ISSUE

### D5. Do the orphaned components (OnboardingAccelerator, OnboardingReminderBanner) conflict with the configuration engine?

**Answer:** They exist but are NOT rendered anywhere in the main dashboard flow. `OnboardingAccelerator` is referenced only in `business-section-metrics.ts` and `business-section.tsx` (secondary insights). `OnboardingReminderBanner` is a standalone component not imported by any page.
**Status:** ACCEPTABLE (dead code, flagged for cleanup)

---

## Domain E: Edge Cases & Error Recovery (5 questions)

### E1. What happens if `configureWorkspace()` fails midway (e.g., chef_preferences succeeds but ai_preferences fails)?

**Answer:** PARTIAL STATE. `upsertChefPreferences` throws on failure (stops execution). But `upsertPricingConfig`, `upsertAiPreferences`, and `insertStarterTemplate` use `console.error` (non-blocking). So if prefs succeed but AI fails, the chef gets nav/widgets configured but Remy stays at defaults. This is acceptable degradation.
**Status:** ACCEPTABLE. Each table write is independent. Partial config is better than no config.

### E2. What if a chef who completed onboarding somehow re-enters the wizard?

**Answer:** SAFE. `app/(chef)/onboarding/page.tsx` checks `onboarding_completed_at` and `onboarding_banner_dismissed_at`. If either is set, it shows the Hub, not the Wizard. The interview cannot be accidentally re-run through normal navigation.
**Status:** BUILT

### E3. Can the chef navigate back from Profile step (Step 1) to the interview?

**Answer:** NO (by design). `goToStep()` blocks navigation to archetype step: `if (filteredSteps[index]?.key === 'archetype' && archetype) return`. Once the interview completes and archetype is set, the interview step is locked.
**Status:** BUILT

### E4. Does the pricing config "defaults check" have a false positive risk?

**Answer:** LOW RISK. The check is `deposit_percentage === 50 && balance_due_hours === 24`. A chef who manually set these exact values would have them overwritten. But: (a) 50/24 are the DB defaults, so a chef who never touched pricing would still have these values, and (b) this only runs for `new` maturity, where the chef explicitly said they have no existing pricing.
**Status:** ACCEPTABLE

### E5. Are there accessibility issues with the interview card selection?

**Answer:** PARTIAL GAP. Cards are `<button>` elements (keyboard accessible, focusable). But: no `aria-pressed` or `role="radio"` for selection state, no `aria-label` on the progress dots, no focus management between screens (focus doesn't auto-move to new content).
**Status:** GAP (low risk for MVP)
**Recommended:** Add `aria-pressed={selected}` to cards, `aria-label` to progress dots, `aria-live="polite"` region for screen transitions.

---

## Domain F: Settings Parity (5 questions)

### F1. Can the chef change archetype in Settings?

**Answer:** YES. `app/(chef)/settings/navigation/page.tsx` via `selectArchetype()`.
**Status:** CONNECTED

### F2. Can the chef change dashboard widgets in Settings?

**Answer:** YES. `app/(chef)/settings/dashboard/page.tsx` via `DashboardLayoutForm`.
**Status:** CONNECTED

### F3. Can the chef change Remy archetype in Settings?

**Answer:** YES. `app/(chef)/settings/remy/page.tsx` via `RemyArchetypeSelector`. But the selection has no effect (see C7).
**Status:** CONNECTED (UI), DISCONNECTED (behavior)

### F4. Can the chef change prep hours, buffer minutes, margin target in Settings?

**Answer:** YES. `components/settings/preferences-form.tsx` handles all timing and financial defaults. `components/scheduling/capacity-settings-form.tsx` for detailed capacity planning.
**Status:** CONNECTED

### F5. Can the chef change focus mode in Settings?

**Answer:** YES. `lib/billing/focus-mode-actions.ts` provides `toggleFocusMode()`. Layout reads it from cache.
**Status:** CONNECTED

---

## Domain G: Universal Benefit (3 questions)

### G1. Does the configuration engine benefit ALL archetypes, not just private chefs?

**Answer:** YES. Every lookup table has entries for all 6 archetypes. Restaurant gets different widgets, prep hours, and nav than private chef. Food truck gets different buffer minutes and Remy personality than bakery. No archetype is left at generic defaults.
**Status:** BUILT

### G2. Does the engine benefit chefs at all maturity levels?

**Answer:** YES. `new` gets pricing defaults, starter templates, focus mode ON, and mentor/zen Remy. `established` gets no pricing overwrites, no templates, focus mode OFF, and veteran/numbers Remy. `transitioning` gets intermediate margin target and mentor Remy.
**Status:** BUILT

### G3. Does the engine degrade gracefully if a chef skips onboarding entirely?

**Answer:** YES. If a chef dismisses the banner without doing the interview, they get the DB defaults (prep: 3h, buffer: 30min, margin: 60%, focus: false). No configuration engine writes happen. The app works with defaults.
**Status:** BUILT

---

## Domain H: Data Integrity (2 questions)

### H1. Does the engine respect DB constraints?

**Answer:** YES. `target_margin_percent` values (50, 55, 60) are within the CHECK constraint (0-100). `default_prep_hours` values (2.0, 3.0, 4.0) within (0.5-12). `default_buffer_minutes` (15, 30, 45) within (0-120). `default_shopping_minutes` (45, 60) within (15-240).
**Status:** BUILT

### H2. Does the engine use tenant scoping on every query?

**Answer:** YES. All DB operations use `chef_id` from `requireChef().entityId` or `tenantId` from `requireChef().tenantId`. No client-supplied IDs.
**Status:** BUILT

---

## Summary

| Domain                | Questions | Built  | Gaps                                |
| --------------------- | --------- | ------ | ----------------------------------- |
| A. Interview Flow     | 5         | 3      | 2 (skip link, no persistence)       |
| B. Engine Correctness | 5         | 4      | 1 (require() pattern)               |
| C. Data Flow          | 10        | 6      | 4 (remy, templates, hints, widgets) |
| D. Cross-System       | 5         | 5      | 0                                   |
| E. Edge Cases         | 5         | 4      | 1 (a11y)                            |
| F. Settings Parity    | 5         | 5      | 0 (1 behavioral gap in C7)          |
| G. Universal Benefit  | 3         | 3      | 0                                   |
| H. Data Integrity     | 2         | 2      | 0                                   |
| **Total**             | **40**    | **32** | **8**                               |

**Score: 32/40 (80%)**

---

## Critical Gaps (must fix)

1. **C7 - Remy archetype is a dead control.** `remy_archetype` saved but never injected into Remy's system prompt. The personality selector in Settings does nothing. Fix: wire `promptModifier` injection into `remy-actions.ts` system prompt builder.

2. **C8 - Event templates are orphaned.** Engine writes starter templates, but no event creation UI reads from `event_templates`. Fix: either wire template selector into event creation form, or remove template write from engine.

3. **C9 - configHints are unused.** Engine returns hints to wizard, wizard stores them, no step reads them. Fix: pass hints to downstream steps as props.

4. **A4 - No skip link during interview.** Chef stuck on interview has no escape hatch. Fix: add skip link to interview footer.

## Low-Priority Gaps

5. **B1 - require() in pure function.** Use static imports instead.
6. **B4 - Re-run overwrites customizations.** Add `configuration_applied_at` guard.
7. **E5 - Accessibility.** Add aria attributes to interview cards.
8. **C1 - Dashboard widgets preference doesn't control rendering.** Known architecture choice.
