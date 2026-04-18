# System Integrity Question Set: Onboarding Cohesion

> **Spec:** `docs/specs/onboarding-cohesion-rework.md`
> **Created:** 2026-04-17
> **Total questions:** 40 across 7 domains
> **Pass criteria:** All answers must be YES after build

---

## A. First-Run Experience (6 questions)

| #   | Question                                                                                | Pre-Build | Post-Build | Evidence                                              |
| --- | --------------------------------------------------------------------------------------- | --------- | ---------- | ----------------------------------------------------- |
| A1  | Does the system ask what TYPE of chef the user is before showing setup steps?           | NO        |            |                                                       |
| A2  | Do wizard steps adapt based on chef type? (meal-prep chef skips "dinner booking")       | NO        |            |                                                       |
| A3  | Can a chef skip the entire wizard in one click without confusion?                       | YES       |            | "Skip setup" button calls dismiss + complete          |
| A4  | After skipping, can the chef find and resume setup later?                               | PARTIAL   |            | `/onboarding` shows hub (different steps), not wizard |
| A5  | Is demo data offered during onboarding so empty states aren't confusing?                | NO        |            | `seedDemoData` exists but only on Settings page       |
| A6  | Does the completion screen tell the chef what to do NEXT with archetype-aware guidance? | NO        |            | Single "Go to Dashboard" button, no guidance          |

## B. Wizard Step Quality (7 questions)

| #   | Question                                                                           | Pre-Build | Post-Build | Evidence                                                  |
| --- | ---------------------------------------------------------------------------------- | --------- | ---------- | --------------------------------------------------------- |
| B1  | Profile step: is every collected field actually persisted to the database?         | NO        |            | `serviceArea` collected, never written                    |
| B2  | Portfolio step: does photo upload work for all accepted file types?                | UNTESTED  |            | HEIC accepted in code, conversion path unclear            |
| B3  | Menu step: does the created menu structure make sense for the chef's archetype?    | NO        |            | All chefs get "Course 1, Course 2" with private-chef copy |
| B4  | Pricing step: can it be marked complete with zero data entered?                    | YES (bug) |            | Empty config passes check, nothing saved, false progress  |
| B5  | Gmail step: does OAuth callback reliably return to the wizard at the correct step? | UNCLEAR   |            | Callback at wizard lines 122-138 parses URL params        |
| B6  | First booking step: is the copy and field set appropriate for all archetypes?      | NO        |            | "Dinner at a location" framing, private-chef only         |
| B7  | Are skipped steps recoverable from the hub or settings?                            | NO        |            | Wizard is one-way, no "back to step 2"                    |

## C. Post-Wizard Continuity (5 questions)

| #   | Question                                                                     | Pre-Build | Post-Build | Evidence                                                       |
| --- | ---------------------------------------------------------------------------- | --------- | ---------- | -------------------------------------------------------------- |
| C1  | Does the hub acknowledge what the wizard already collected?                  | PARTIAL   |            | Hub's "profile" checks `chefs` table; other phases independent |
| C2  | Is it clear that hub phases are a continuation, not a restart?               | NO        |            | Same URL, different content, no explanation of relationship    |
| C3  | Are all dashboard onboarding components either wired in or deleted?          | NO        |            | 3 orphaned: Accelerator, ChecklistWidget, ReminderBanner       |
| C4  | After wizard + hub completion, is there a clear "you're fully set up" state? | YES       |            | Hub shows completion, but reaching it requires real usage      |
| C5  | Does the onboarding banner disappear permanently when appropriate?           | YES       |            | `onboarding_banner_dismissed_at` set on dismiss                |

## D. Cross-System Cohesion (7 questions)

| #   | Question                                                                                       | Pre-Build | Post-Build | Evidence                                                                            |
| --- | ---------------------------------------------------------------------------------------------- | --------- | ---------- | ----------------------------------------------------------------------------------- |
| D1  | When chef adds first client in wizard, does the system offer to send a client onboarding link? | NO        |            | `FirstClientStep` collects data, `generateOnboardingLink()` exists, never connected |
| D2  | Does Remy know the chef is mid-onboarding and adjust its greeting?                             | NO        |            | Remy has its own state machine, doesn't read wizard state                           |
| D3  | Does Remy celebrate wizard completion?                                                         | NO        |            | Milestone detection via DB counts, not wizard events                                |
| D4  | Does completing "add staff" in the hub link to the staff onboarding checklist?                 | NO        |            | Staff onboarding is fully separate, no cross-link                                   |
| D5  | Does archetype selection feed into wizard step filtering?                                      | NO        |            | Archetype never asked during onboarding                                             |
| D6  | Is the NetworkStep wired into the wizard?                                                      | NO        |            | Built with correct props interface, never imported                                  |
| D7  | Are beta and client onboarding aware of each other when both apply to the same person?         | NO        |            | Parallel paths writing to same `clients` fields                                     |

## E. Universal Benefit - All Chef Types (6 questions)

| #   | Question                                                | Pre-Build | Post-Build | Evidence                                                         |
| --- | ------------------------------------------------------- | --------- | ---------- | ---------------------------------------------------------------- |
| E1  | Does a CATERER get relevant copy and steps?             | NO        |            | "Tasting menu", "per-guest dinner rate", private-chef framing    |
| E2  | Does a FOOD TRUCK operator get relevant copy and steps? | NO        |            | No location-based setup, per-guest pricing irrelevant            |
| E3  | Does a MEAL PREP chef get relevant copy and steps?      | NO        |            | No subscription/weekly plan concept, "first booking" meaningless |
| E4  | Does a BAKERY get relevant copy and steps?              | NO        |            | No product catalog step, no order form concept                   |
| E5  | Does a RESTAURANT get relevant copy and steps?          | PARTIAL   |            | Menu and pricing steps somewhat fit                              |
| E6  | Does a PRIVATE CHEF get relevant copy and steps?        | YES       |            | Wizard designed for this archetype                               |

## F. Data Integrity (5 questions)

| #   | Question                                                              | Pre-Build | Post-Build | Evidence                                             |
| --- | --------------------------------------------------------------------- | --------- | ---------- | ---------------------------------------------------- |
| F1  | Is every "complete" step backed by actual persisted data?             | NO        |            | Pricing can complete empty; serviceArea dropped      |
| F2  | Is `onboarding_completed_at` a reliable signal that setup occurred?   | NO        |            | "Skip setup" sets it immediately with zero data      |
| F3  | Is `onboarding_progress.data` (jsonb) validated before write?         | NO        |            | Raw JSON from client, no schema validation           |
| F4  | Are there race conditions in the profile triple-write?                | POSSIBLE  |            | Three sequential updates without transaction wrapper |
| F5  | Can a chef have conflicting states (completed + not dismissed, etc.)? | HARMLESS  |            | Both can be set; banner self-hides on either         |

## G. Comfort and Feel (4 questions)

| #   | Question                                                               | Pre-Build | Post-Build | Evidence                                                     |
| --- | ---------------------------------------------------------------------- | --------- | ---------- | ------------------------------------------------------------ |
| G1  | Does a new user feel welcomed rather than interrogated?                | WEAK      |            | 6 steps, no time estimate, form-like feel                    |
| G2  | Is there any delight moment (celebration, personality, Remy greeting)? | MINIMAL   |            | "You're all set!" with checkmark, no personality             |
| G3  | Does the wizard show value for each step before the user fills it?     | PARTIAL   |            | Gmail step explains benefits; others show fields only        |
| G4  | After onboarding, does the dashboard feel alive?                       | NO        |            | No demo data seeded, no guided first actions, no Remy tie-in |

---

## Scoring

| Domain                    | Pre-Build Score | Questions                  |
| ------------------------- | --------------- | -------------------------- |
| A. First-Run Experience   | 1.5 / 6         | A3 yes, A4 partial         |
| B. Step Quality           | 0.5 / 7         | B6 partial at best         |
| C. Post-Wizard Continuity | 2.5 / 5         | C1 partial, C4 yes, C5 yes |
| D. Cross-System Cohesion  | 0 / 7           | All NO                     |
| E. Universal Benefit      | 1.5 / 6         | E5 partial, E6 yes         |
| F. Data Integrity         | 0.5 / 5         | F5 harmless (half credit)  |
| G. Comfort and Feel       | 0.5 / 4         | G3 partial                 |
| **TOTAL**                 | **7 / 40**      | **17.5%**                  |

---

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
