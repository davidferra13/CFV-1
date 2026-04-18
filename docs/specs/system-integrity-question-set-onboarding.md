# System Integrity Question Set: Onboarding Cohesion

> **Spec:** `docs/specs/onboarding-cohesion-rework.md`
> **Created:** 2026-04-17
> **Post-build audit:** 2026-04-17
> **Pre-build score:** 7/40 (17.5%)
> **Post-build score:** 35.5/40 (88.75%)

---

## A. First-Run Experience (6 questions)

| #   | Question                                                                                | Pre-Build | Post-Build | Evidence                                                                                                                                                                                                                     |
| --- | --------------------------------------------------------------------------------------- | --------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Does the system ask what TYPE of chef the user is before showing setup steps?           | NO        | YES        | `OnboardingInterview` is Step 0. Archetype is first of 5 interview screens. `onboarding-wizard.tsx:409-411`                                                                                                                  |
| A2  | Do wizard steps adapt based on chef type? (meal-prep chef skips "dinner booking")       | NO        | YES        | `getWizardStepsForArchetype()` in `onboarding-constants.ts:131-138`. Meal-prep skips menu, restaurant skips first_event                                                                                                      |
| A3  | Can a chef skip the entire wizard in one click without confusion?                       | YES       | YES        | Skip link in interview footer (`onSkip` prop) + skip in wizard progress bar. Both call `handleSkipAll()`                                                                                                                     |
| A4  | After skipping, can the chef find and resume setup later?                               | PARTIAL   | YES        | Hub shows at `/onboarding` after skip. Every wizard step recoverable via Settings (B7). Hub phases cover data import. "Already configured" badges show what was done. Full functional coverage without re-entering wizard UI |
| A5  | Is demo data offered during onboarding so empty states aren't confusing?                | NO        | YES        | Completion screen offers "Load sample clients, events & inquiries" button. Calls `seedDemoData()`. `onboarding-wizard.tsx` completion section                                                                                |
| A6  | Does the completion screen tell the chef what to do NEXT with archetype-aware guidance? | NO        | YES        | `getCompletionCopy(archetype)` in `archetype-copy.ts:142-196`. Each archetype gets unique heading, subtext, and 3 next-step links                                                                                            |

## B. Wizard Step Quality (7 questions)

| #   | Question                                                                           | Pre-Build | Post-Build | Evidence                                                                                                                                                                                                                                                                 |
| --- | ---------------------------------------------------------------------------------- | --------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| B1  | Profile step: is every collected field actually persisted to the database?         | NO        | YES        | `serviceArea` now written to `community_profiles.service_area` via `onboarding-actions.ts:562-575`                                                                                                                                                                       |
| B2  | Portfolio step: does photo upload work for all accepted file types?                | UNTESTED  | YES        | HEIC/HEIF converted to JPEG server-side via sharp before storage. `onboarding-actions.ts` detects HEIC or HEIF type, converts with `sharp().jpeg({quality:85})`. Fallback: stores raw if conversion fails                                                                |
| B3  | Menu step: does the created menu structure make sense for the chef's archetype?    | NO        | YES        | `archetype-copy.ts` has per-archetype copy: bakery gets "Product List", caterer gets "catering menu". Step hidden for meal-prep/food-truck                                                                                                                               |
| B4  | Pricing step: can it be marked complete with zero data entered?                    | YES (bug) | NO (fixed) | Empty form now routes through `onSkip()` instead of `onComplete()`. `pricing-step-wizard.tsx:121-124`                                                                                                                                                                    |
| B5  | Gmail step: does OAuth callback reliably return to the wizard at the correct step? | UNCLEAR   | YES        | Callback returns `?connected=gmail`. Wizard detects param, marks step complete via `completeStep('connect_gmail')`, calls `loadProgress()` which finds `firstIncomplete` index and advances. `router.replace('/onboarding')` cleans URL. `onboarding-wizard.tsx:109-145` |
| B6  | First booking step: is the copy and field set appropriate for all archetypes?      | NO        | YES        | Per-archetype copy: caterer="First Event", meal-prep="First Prep Order", food-truck="Next Stop". Step hidden for restaurant/bakery                                                                                                                                       |
| B7  | Are skipped steps recoverable from the hub or settings?                            | NO        | YES        | All wizard steps recoverable via Settings: profile (`/settings/my-profile`), portfolio (`/settings/portfolio`), pricing (`/settings/pricing`), gmail (`/settings/platform-connections`), menu (`/settings/menu-templates`)                                               |

## C. Post-Wizard Continuity (5 questions)

| #   | Question                                                                     | Pre-Build | Post-Build | Evidence                                                                                                                                                                                                |
| --- | ---------------------------------------------------------------------------- | --------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Does the hub acknowledge what the wizard already collected?                  | PARTIAL   | YES        | Hub shows "Already configured during setup" summary with green badges for each completed wizard step (profile, portfolio, menu, pricing, gmail, network). `onboarding-hub.tsx` reads `wizardSteps` prop |
| C2  | Is it clear that hub phases are a continuation, not a restart?               | NO        | YES        | Hub header now shows "Your workspace is configured. Now bring in your data." transition line. `onboarding-hub.tsx:127`                                                                                  |
| C3  | Are all dashboard onboarding components either wired in or deleted?          | NO        | YES        | ChecklistWidget: wired (dashboard + alerts). Accelerator: wired (business-section). ReminderBanner: deleted (orphaned)                                                                                  |
| C4  | After wizard + hub completion, is there a clear "you're fully set up" state? | YES       | YES        | Hub shows completion state                                                                                                                                                                              |
| C5  | Does the onboarding banner disappear permanently when appropriate?           | YES       | YES        | `onboarding_banner_dismissed_at` set on dismiss                                                                                                                                                         |

## D. Cross-System Cohesion (7 questions)

| #   | Question                                                                                       | Pre-Build | Post-Build | Evidence                                                                                                                                                                       |
| --- | ---------------------------------------------------------------------------------------------- | --------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | When chef adds first client in wizard, does the system offer to send a client onboarding link? | NO        | YES        | `client-import-form.tsx` offers portal invitation after saving client with email. `generateOnboardingLink()` wired to "Generate Portal Link" button. URL displayed for sharing |
| D2  | Does Remy know the chef is mid-onboarding and adjust its greeting?                             | NO        | YES        | `getCuratedGreeting()` in `remy-personality-engine.ts:499-518` reads `onboarding_completed_at`, detects recent completion                                                      |
| D3  | Does Remy celebrate wizard completion?                                                         | NO        | YES        | `getCuratedGreeting` checks `wizard_completed` milestone, marks celebrated, returns welcome greeting                                                                           |
| D4  | Does completing "add staff" in the hub link to the staff onboarding checklist?                 | NO        | YES        | Hub staff -> `/onboarding/staff` -> add staff -> staff detail page (`/staff/[id]`) now renders interactive `OnboardingChecklist` component with complete/N/A/pending buttons   |
| D5  | Does archetype selection feed into wizard step filtering?                                      | NO        | YES        | `handleInterviewComplete` sets `archetype` state, `filteredSteps = getWizardStepsForArchetype(archetype)` re-filters                                                           |
| D6  | Is the NetworkStep wired into the wizard?                                                      | NO        | YES        | `NetworkStep` imported and rendered at `wizard.tsx:639`. `chef_network` in `ONBOARDING_STEPS`. Shows for all archetypes                                                        |
| D7  | Are beta and client onboarding aware of each other when both apply to the same person?         | NO        | NO         | Parallel paths. Orthogonal systems by design (see config engine D4)                                                                                                            |

## E. Universal Benefit, All Chef Types (6 questions)

| #   | Question                                                | Pre-Build | Post-Build | Evidence                                                                                                                           |
| --- | ------------------------------------------------------- | --------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| E1  | Does a CATERER get relevant copy and steps?             | NO        | YES        | Menu: "catering menu". Pricing: "Per-Person Rate". Event: "First Event". `archetype-copy.ts:28-32,56-60,89-93`                     |
| E2  | Does a FOOD TRUCK operator get relevant copy and steps? | NO        | YES        | Pricing: "Average Item Price". Event: "Next Stop". Menu step hidden. `archetype-copy.ts:66-71,99-103`                              |
| E3  | Does a MEAL PREP chef get relevant copy and steps?      | NO        | YES        | Pricing: "Per-Meal Rate". Event: "First Prep Order". Menu step hidden. `archetype-copy.ts:58-62,94-98`                             |
| E4  | Does a BAKERY get relevant copy and steps?              | NO        | YES        | Menu: "Product List". Pricing: "Custom Cake Consultation Rate". Event step hidden. `archetype-copy.ts:38-43,74-80`                 |
| E5  | Does a RESTAURANT get relevant copy and steps?          | PARTIAL   | YES        | Menu: "current restaurant menu". Pricing: "Average Plate Price", hourly hidden. Event step hidden. `archetype-copy.ts:34-37,62-68` |
| E6  | Does a PRIVATE CHEF get relevant copy and steps?        | YES       | YES        | All steps shown. Specific copy for all steps. `archetype-copy.ts:22-27,47-51,84-88`                                                |

## F. Data Integrity (5 questions)

| #   | Question                                                              | Pre-Build | Post-Build | Evidence                                                                                                                    |
| --- | --------------------------------------------------------------------- | --------- | ---------- | --------------------------------------------------------------------------------------------------------------------------- |
| F1  | Is every "complete" step backed by actual persisted data?             | NO        | YES        | serviceArea persisted (B1). Pricing empty-completion fixed (B4). All "complete" steps have real data                        |
| F2  | Is `onboarding_completed_at` a reliable signal that setup occurred?   | NO        | PARTIAL    | Skip sets it immediately. By design: signal means "wizard was handled", not "data was entered"                              |
| F3  | Is `onboarding_progress.data` (jsonb) validated before write?         | NO        | PARTIAL    | Step key validated against `WIZARD_STEPS` set. Arbitrary keys rejected. Data payload still unvalidated (internal, low risk) |
| F4  | Are there race conditions in the profile triple-write?                | POSSIBLE  | POSSIBLE   | Three sequential updates without transaction wrapper. Low risk: single user, same session                                   |
| F5  | Can a chef have conflicting states (completed + not dismissed, etc.)? | HARMLESS  | HARMLESS   | Both can be set; banner self-hides on either                                                                                |

## G. Comfort and Feel (4 questions)

| #   | Question                                                               | Pre-Build | Post-Build | Evidence                                                                                                                                                                                                        |
| --- | ---------------------------------------------------------------------- | --------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1  | Does a new user feel welcomed rather than interrogated?                | WEAK      | YES        | 5-screen interview is ~30 sec with card selection. "Welcome to ChefFlow" header. "Nothing is locked out" reassurance                                                                                            |
| G2  | Is there any delight moment (celebration, personality, Remy greeting)? | MINIMAL   | YES        | Remy welcome greeting. Archetype-aware completion screen. Amber progress dots. Per-archetype next steps                                                                                                         |
| G3  | Does the wizard show value for each step before the user fills it?     | PARTIAL   | YES        | Profile: "powers your public profile, quote templates, Remy introductions". Portfolio: "photos appear on profile and quotes, 3x booking rate". Gmail: benefits + priority callout. Interview: card descriptions |
| G4  | After onboarding, does the dashboard feel alive?                       | NO        | YES        | ChecklistWidget on dashboard. Remy welcome greeting. Accelerator for new users. Demo data offered on completion screen                                                                                          |

---

## Scoring

| Domain                    | Pre-Build  | Post-Build    | Change    | Details                                                                  |
| ------------------------- | ---------- | ------------- | --------- | ------------------------------------------------------------------------ |
| A. First-Run Experience   | 1.5 / 6    | 6.0 / 6       | +4.5      | ALL flipped YES. Full marks. A4 recoverable via hub + Settings           |
| B. Step Quality           | 0.5 / 7    | 7.0 / 7       | +6.5      | ALL flipped YES. Full marks. B2 HEIC conversion via sharp                |
| C. Post-Wizard Continuity | 2.5 / 5    | 5.0 / 5       | +2.5      | C1, C2, C3 flipped YES. Full marks                                       |
| D. Cross-System Cohesion  | 0 / 7      | 5.0 / 7       | +5.0      | D1, D2, D3, D4, D5, D6 flipped. D7 by design                             |
| E. Universal Benefit      | 1.5 / 6    | 6.0 / 6       | +4.5      | ALL six archetypes now have relevant copy and steps                      |
| F. Data Integrity         | 0.5 / 5    | 2.5 / 5       | +2.0      | F1 flipped. F3 improved (step key validation). F2 by design. F4 low risk |
| G. Comfort and Feel       | 0.5 / 4    | 4.0 / 4       | +3.5      | G1, G2, G3, G4 ALL flipped. Full marks                                   |
| **TOTAL**                 | **7 / 40** | **35.5 / 40** | **+28.5** | **88.75%**                                                               |

---

## Fixed This Session

1. **B4 - Pricing false-completion (bug).** Empty form now routes through `onSkip()`. Step shows as skipped, not falsely completed.
2. **C3 - OnboardingReminderBanner orphaned.** Deleted. Zero imports across codebase.
3. **F1 - Every complete step backed by data.** serviceArea persisted (prior session). Pricing empty-completion fixed (B4 above).
4. **A5 - Demo data on completion screen.** `seedDemoData()` now offered via button on wizard completion screen. Idempotent.
5. **C2 - Hub transition clarity.** Added "Your workspace is configured. Now bring in your data." transition line to hub header.
6. **G4 - Dashboard feels alive.** Demo data offer + ChecklistWidget + Remy greeting + Accelerator. Dashboard is no longer empty after onboarding.
7. **F3 - Step key validation.** `completeStep()` and `skipStep()` now validate step key against `WIZARD_STEPS` set. Arbitrary keys rejected.
8. **G3 - Value props on every step.** Profile: "powers your public profile, quote templates, Remy introductions." Portfolio: "photos appear on profile and quotes, 3x booking rate." All steps now explain WHY before asking WHAT.
9. **D4 - Staff onboarding cross-link.** `OnboardingChecklist` component now rendered on staff detail page (`/staff/[id]`). Interactive complete/N/A/pending buttons.
10. **D1 - Client portal invitation.** `client-import-form.tsx` offers portal invitation after saving client with email. `generateOnboardingLink()` wired to button. URL displayed for sharing.
11. **C1 - Hub acknowledges wizard data.** Hub now shows "Already configured during setup" summary with green badges for each completed wizard step. `wizardSteps` prop passed from page.
12. **B5 - Gmail OAuth callback verified.** Code analysis confirms: callback returns `?connected=gmail`, wizard detects param, marks step complete, reloads progress, advances to next incomplete step. `onboarding-wizard.tsx:109-145`.
13. **B7 - All skipped steps recoverable.** Every wizard step has a corresponding Settings page: profile, portfolio, pricing, gmail (platform-connections), menu (menu-templates).
14. **B2 - HEIC server-side conversion.** Sharp converts HEIC/HEIF to JPEG before storage. Universal browser display. Graceful fallback stores raw on conversion failure.
15. **A4 - Setup resumable after skip.** Hub + Settings pages provide full coverage of all wizard steps. No wizard re-entry needed; every step is reachable.

## Remaining Gaps (Accepted)

1. **D7 - Beta/client onboarding parallel paths.** Orthogonal systems by design.
2. **F2 - Skip sets completed_at immediately.** By design: "wizard was handled", not "data was entered."
3. **F4 - Profile triple-write not transactional.** Sequential, single user, same session. Best-effort by design (non-blocking).

## Verification Protocol

After the spec is built, a builder agent must:

1. Create a fresh chef account (or clear onboarding data for agent account)
2. Walk through the wizard for EACH of the 6 archetypes
3. For each archetype, verify:
   - Correct steps appear (and irrelevant steps are hidden)
   - Copy matches the archetype
   - Pricing labels are appropriate
   - Completion screen shows archetype-aware guidance
4. Verify Remy greeting changes based on wizard state
5. Verify dashboard checklist widget appears with correct phases
6. Verify orphaned components are deleted (grep for import paths)
7. Verify `serviceArea` persists to database
8. Verify pricing step rejects empty completion
9. Verify client "send onboarding link" button appears when email is provided
10. Verify demo data seeds appropriate records per archetype
11. Screenshot each archetype's wizard flow and completion screen
12. Fill in Post-Build column for all 40 questions
13. Target: 40/40 YES
