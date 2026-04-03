# Spec: Chef Getting Started Surface Consolidation

> **Status:** ready
> **Priority:** P1 (next up)
> **Depends on:** none
> **Estimated complexity:** medium (3-8 files)

## Timeline

_Every status change, every claim, every verification gets a row. This is the audit trail._

| Event                 | Date             | Agent/Session   | Commit |
| --------------------- | ---------------- | --------------- | ------ |
| Created               | 2026-04-03 00:11 | Planner (Codex) |        |
| Status: ready         | 2026-04-03 00:11 | Planner (Codex) |        |
| Claimed (in-progress) |                  |                 |        |
| Spike completed       |                  |                 |        |
| Pre-flight passed     |                  |                 |        |
| Build completed       |                  |                 |        |
| Type check passed     |                  |                 |        |
| Build check passed    |                  |                 |        |
| Playwright verified   |                  |                 |        |
| Status: verified      |                  |                 |        |

---

## Developer Notes

_This section preserves the developer's original conversation and intent. It is MANDATORY. A spec without Developer Notes is incomplete. A builder reading a spec without this section is building blind._

### Raw Signal

- The `Getting Started` tab is old, from the website's infancy, and it has not been rethought in a long time.
- The developer cannot stand it. It feels tacky, uncanny, and visually intrusive.
- They hate having something like that sitting on the screen while trying to do normal work.
- Their instinct is to get rid of it entirely because ChefFlow already has stronger onboarding elsewhere.
- If it is not removed, it needs to be reintroduced in a completely different way because the current version is unacceptable.
- They explicitly asked for a real product audit: click around the site, do unrelated tasks, take screenshots, use the feature in context, and explain why it fails right now.
- They also made an important product point: the feature exists to do one specific job, and that job matters. The problem is not that the job is useless. The problem is that the current surface is extremely underperforming and makes them want to delete it out of frustration.

### Developer Intent

- **Core goal:** Remove the chef-facing floating `Getting Started` overlay as a persistent portal surface and consolidate setup guidance into calmer, contextual surfaces that already exist.
- **Key constraints:** Preserve the important job behind the feature, which is guiding a new chef through foundational setup and migration; do not break client or staff tours; do not silently break other peripheral UI that currently depends on onboarding visibility state.
- **Motivation:** The current feature is visually cheap, globally intrusive, and architecturally misleading because it shows up during unrelated work and records fake progress.
- **Success from the developer's perspective:** The chef portal no longer has the floating checklist or guided-tour shell, the core setup job still exists in a better place, and unrelated pages feel clean again.

---

## What This Does (Plain English)

This removes the chef portal's floating `Getting Started` overlay, welcome modal, and spotlight-tour shell from the global layout, while keeping the real setup job alive through the existing dashboard and `/onboarding` surfaces. After this is built, chefs still have a clear setup path, but it is contextual and progress-based instead of being a tacky floating drawer that follows them through unrelated work.

---

## Why It Matters

The current chef `Getting Started` feature is doing the wrong work in the wrong place. It is global, dismissible out of annoyance, and it measures route visits instead of meaningful setup completion, so it degrades trust while failing at the one job it is supposed to perform.

---

## External Research Signals

- Shopify's current launch checklist is explicit, staged, and contextual. It separates `Getting started`, `Migrating your data`, `Configuring your admin`, `Preparing to launch`, and `After launching`, and it calls out that migration order matters for trustworthy history. It is a workflow guide, not a floating overlay. Source: https://help.shopify.com/en/manual/intro-to-shopify/plus-launch-checklist
- Linear's onboarding docs are role-aware and setup-aware. They route new teams through creating a workspace, inviting teammates, importing existing work, connecting integrations, and using a demo workspace. Source: https://linear.app/docs/onboarding and https://linear.app/docs/create-a-workspace
- Current founder/operator feedback keeps repeating the same lesson: cute in-app checklists and tooltip spam get ignored, while onboarding that drives one real outcome performs better. Source: https://www.reddit.com/r/SaaS/comments/1rdju06/onboarding_experiment_log_7_tries_1_worked_the/

These signals support a contextual setup surface with real progress and clear sequencing, not a layout-level floating checklist.

---

## Files to Create

| File                                                          | Purpose                                                                                                       |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `components/onboarding/chef-peripheral-visibility-bridge.tsx` | Publishes `onboarding peripherals allowed = true` for chef pages after the legacy chef tour shell is removed. |

---

## Files to Modify

| File                                                   | What to Change                                                                                                                                                              |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(chef)/layout.tsx`                                | Remove `ChefTourWrapper`, keep `OverlayQueueProvider`, and mount the new chef peripheral visibility bridge so quick capture, feedback nudge, and survey banners still work. |
| `app/(chef)/settings/page.tsx`                         | Replace the `Replay Tour` setting with a simple setup-guide entry. Rename the section so it no longer references a guided product tour.                                     |
| `components/dashboard/onboarding-checklist-widget.tsx` | Rename the card title from `Getting Started` to `Setup Progress`. Keep `/onboarding` as the canonical destination for this job.                                             |
| `app/(chef)/dashboard/_sections/alerts-section.tsx`    | Rename the wrapper title from `Onboarding Checklist` to `Setup Progress` so the widget and wrapper use the same language.                                                   |
| `app/(chef)/dashboard/_sections/alerts-cards.tsx`      | Keep the `Setup Progress` label, but change the card destination from `/settings` to `/onboarding` so all setup-progress surfaces point to the same route.                  |
| `app/(chef)/dashboard/_sections/business-section.tsx`  | Rename the `onboarding_accelerator` widget wrapper title from `Getting Started` to `Business Import` so it no longer competes with setup progress for the same label.       |
| `docs/app-complete-audit.md`                           | Update the onboarding/setup sections to reflect the removed chef floating checklist and the revised dashboard naming.                                                       |

---

## Database Changes

None.

### New Tables

```sql
-- None
```

### New Columns on Existing Tables

```sql
-- None
```

### Migration Notes

- No migration is part of this spec.
- Do not touch `database/migrations/20260330000066_product_tour_progress.sql`.
- Do not touch `database/migrations/20260401000048_onboarding_progress.sql`.

---

## Data Model

There are three separate setup/progress concepts in the current codebase, and this spec keeps them separate instead of trying to merge them in one pass:

- `product_tour_progress`: legacy per-auth-user chef/client/staff tour state. For chefs, this currently drives the floating welcome modal, checklist, and spotlight tour. This spec stops mounting the chef UI that consumes it, but does not delete the table or rewrite the data model.
- `onboarding_progress`: per-chef wizard-step persistence for the first-run wizard. This tracks `step_key`, `completed_at`, `skipped`, and `data`. It remains the source of truth for the wizard and banner summary.
- `OnboardingProgress` from `lib/onboarding/progress-actions.ts`: computed business-setup progress derived from real product tables (`chefs`, `clients`, `loyalty_config`, `recipes`, `staff_members`). This remains the correct source for dashboard setup progress and the `/onboarding` hub.

Important constraints:

- `chefs.onboarding_completed_at` and `chefs.onboarding_banner_dismissed_at` remain the wizard completion/opt-out gates.
- This spec does not add or change DB state. It changes where chef setup UI is shown and how it is labeled.

---

## Server Actions

No new server actions are required.

| Action                                                            | Auth            | Input | Output                                                     | Side Effects                                                                             |
| ----------------------------------------------------------------- | --------------- | ----- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `getOnboardingProgress()` in `lib/onboarding/progress-actions.ts` | `requireChef()` | none  | `OnboardingProgress`                                       | Reads `chefs`, `clients`, `loyalty_config`, `recipes`, `staff_members`                   |
| `getOnboardingProgressSummary()`                                  | `requireChef()` | none  | Wizard summary object                                      | Reads `onboarding_progress`                                                              |
| `getOnboardingDismissalState()`                                   | `requireChef()` | none  | `{ wizardCompleted, bannerDismissed, remindersDismissed }` | Reads `chefs`                                                                            |
| `dismissOnboardingBanner()`                                       | `requireChef()` | none  | `{ success, error? }`                                      | Updates `chefs.onboarding_banner_dismissed_at`                                           |
| `resetTourProgress()`                                             | `requireAuth()` | none  | `void`                                                     | Deletes `product_tour_progress` row. After this spec, chef settings no longer expose it. |

Builder note: do not modify the behavior of these actions in this pass. This is a surface-consolidation change, not a progress-model rewrite.

---

## UI / Component Spec

### Page Layout

- **Chef layout:** No chef tour shell. The global chef layout must no longer render the welcome modal, floating checklist, or spotlight tour. It must still provide `OverlayQueueProvider` so queued overlays keep their current behavior, and it must explicitly publish onboarding peripherals as allowed so quick capture, feedback nudges, and survey banners keep rendering.
- **Dashboard:** The existing `OnboardingBanner` stays where it is. The dashboard setup-progress widget/card becomes the canonical passive surface for this job. The separate business-import widget keeps its behavior but gets a different title so it is no longer another `Getting Started`.
- **Settings:** The sample-data area can still offer setup help, but the control must be a plain route into `/onboarding`, not a replay of the removed chef product tour.

### States

- **Loading:** No new loading state. Keep current server-rendered behavior.
- **Empty:** No chef floating setup UI should appear on empty or unrelated pages. If setup progress is incomplete and the widget/card is enabled by current dashboard rules, the user sees `Setup Progress` on dashboard only.
- **Error:** If dashboard data fails, keep existing fail-open or hidden behavior. Do not add fake zeros or fallback progress.
- **Populated:** Dashboard surfaces use `Setup Progress` for setup/migration and `Business Import` for the accelerator. No chef page shows the legacy floating drawer.

### Interactions

- Visiting any chef route, including unrelated work surfaces like `/menus/new`, must never show the legacy `Getting Started` floating checklist, welcome modal, or spotlight tour.
- Clicking setup CTAs from dashboard or settings routes the user into `/onboarding` or its existing subroutes. No CTA in chef settings should call `resetTourProgress()`.
- The `Business Import` accelerator keeps its existing step links and completion logic. Only the label changes.
- Client and staff portals remain unchanged.

---

## Edge Cases and Error Handling

| Scenario                                                                         | Correct Behavior                                                                                                                                                                         |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Builder removes `ChefTourWrapper` but forgets the overlay/peripheral replacement | `FeedbackNudgeCard`, `QuickCapture`, and survey banners can disappear or change behavior. The layout must add both `OverlayQueueProvider` and the new chef peripheral visibility bridge. |
| Existing chefs already have `product_tour_progress` rows                         | Leave them untouched. The UI simply stops consuming chef tour state. No cleanup migration.                                                                                               |
| Dashboard setup widget is disabled by user preferences                           | `alerts-cards.tsx` still points `Setup Progress` to `/onboarding`, so there is still a canonical route for the job.                                                                      |
| Builder deletes client/staff tour code while cleaning up chef code               | That is a regression. Client and staff tours are explicitly out of scope.                                                                                                                |
| Builder changes progress semantics while renaming labels                         | Do not do it. This spec does not change what counts as complete. It changes where the surface lives and how it is named.                                                                 |

---

## Verification Steps

1. Sign in with a chef account that has an incomplete `product_tour_progress` row.
2. Navigate to `/dashboard`.
3. Verify: no chef welcome modal appears.
4. Verify: no floating `Getting Started` checklist appears.
5. Navigate to an unrelated chef page such as `/menus/new`.
6. Verify: the old floating checklist is still absent there.
7. Switch to a mobile viewport on a chef page.
8. Verify: no bottom drawer style `Getting Started` checklist appears.
9. Return to `/dashboard`.
10. Verify: the existing banner still renders if the wizard is incomplete.
11. Verify: setup-progress surfaces say `Setup Progress`, not `Getting Started` or `Onboarding Checklist`.
12. Verify: the accelerator wrapper says `Business Import`.
13. Open chef settings.
14. Verify: the old `Replay Tour` control is gone and the section no longer references a guided product tour.
15. Click the replacement setup entry in settings and verify it routes to `/onboarding`.
16. Regression check: on a mobile chef page, confirm `QuickCapture` still appears when the account is otherwise eligible.
17. Regression check: if the account is eligible for the feedback nudge or survey banner, confirm those surfaces still render under their existing rules.

---

## Out of Scope

- Rewriting the first-run wizard or changing its step model.
- Rewriting the business-setup progress model in `lib/onboarding/progress-actions.ts`.
- Deleting `product_tour_progress`, `tour-actions`, `tour-config`, `ChefTourWrapper`, or `ReplayTourButton` as cleanup. User-visible chef deactivation is enough for this pass.
- Changing client or staff onboarding tours.
- Cleaning the existing schema drift between migration SQL and generated schema files.
- Redesigning the `/onboarding` hub UI.

---

## Notes for Builder Agent

- Preserve the distinction between these jobs:
  - `Setup Progress`: passive dashboard/setup guidance for real migration work.
  - `Business Import`: historical import and first-live-workflow accelerator.
  - `OnboardingBanner`: first-run wizard summary/nudge.
- The legacy tour contract test does **not** prove the chef spotlight targets are real. It only checks that configured routes exist and that selector tokens appear in at most one source file. It does not require a token to exist at all (`tests/unit/onboarding.tour-contract.test.ts:67-70,81-82,109,131-132`).
- The current chef tour targets do not match the chef-side `data-tour` markers that actually exist. Treat the chef spotlight system as already untrustworthy; do not try to salvage it inside this spec.
- Do not move business logic out of existing server actions. This is a surface-consolidation pass, not an activation-logic rewrite.

---

## Planner Validation

### 1. What exists today that this touches?

- The chef layout globally mounts the chef tour shell around all chef content via `ChefTourWrapper`, while also rendering other peripheral UI like `RemyWrapper` and `QuickCapture` in the same layout (`app/(chef)/layout.tsx:29,179-200`).
- The chef tour shell currently assembles `WelcomeModal`, `TourChecklist`, and `TourSpotlight` under `OnboardingTourProvider` and `OverlayQueueProvider` (`components/onboarding/tour-shell.tsx:8-30`).
- The floating checklist is a fixed bottom-right overlay titled `Getting Started`, and clicking a step both routes and completes the step immediately (`components/onboarding/tour-checklist.tsx:28-31,39,44,58,84,115`).
- The chef tour provider shows the checklist whenever welcome has been seen and the checklist is not dismissed, auto-completes steps on `route_visited`, and publishes onboarding peripheral visibility (`components/onboarding/tour-provider.tsx:105,120-127,134-149,166,200,247`).
- The chef tour config defines five chef setup steps and marks all of them as `route_visited` completions (`lib/onboarding/tour-config.ts:37,49-101`).
- The actual chef dashboard and chef app use different `data-tour` markers than the ones the chef tour targets expect. Existing chef markers include `chef-dashboard-home`, `chef-explore-calendar`, `chef-setup-payments`, `chef-send-quote`, `add-recipe`, `add-client`, and `create-event` (`app/(chef)/dashboard/page.tsx:341`, `app/(chef)/calendar/page.tsx:119`, `app/(chef)/settings/stripe-connect/stripe-connect-client.tsx:49`, `app/(chef)/quotes/page.tsx:136`, `app/(chef)/recipes/recipes-client.tsx:137,207`, `app/(chef)/clients/page.tsx:80`, `app/(chef)/events/page.tsx:260`). The chef tour config instead targets `chef-onboarding-home`, `chef-import-clients`, `chef-add-recipes`, `chef-setup-staff`, and `chef-setup-loyalty` (`lib/onboarding/tour-config.ts:53,66,77,88,99`).
- The dashboard also has other setup surfaces today:
  - `OnboardingBanner` on the chef dashboard (`app/(chef)/dashboard/page.tsx:19,351`; `components/onboarding/onboarding-banner.tsx:29-30,49,57,83,107`)
  - `OnboardingChecklistWidget`, which already computes real progress and currently labels itself `Getting Started` (`app/(chef)/dashboard/_sections/alerts-section.tsx:21,50,153,328-335`; `components/dashboard/onboarding-checklist-widget.tsx:61-71,119`)
  - `onboarding_accelerator`, whose wrapper is also currently titled `Getting Started` even though the card itself is about importing contacts, logging past events, capturing an inquiry, and sending a quote (`app/(chef)/dashboard/_sections/business-section.tsx:88,113-119`; `components/dashboard/onboarding-accelerator.tsx:37-81`)
- Chef settings still exposes `ReplayTourButton` under `Sample Data & Tour` (`app/(chef)/settings/page.tsx:32-33,831-840`; `components/onboarding/replay-tour-button.tsx:12,20,23,37`).
- The wizard and hub are separate systems:
  - `/onboarding` shows either `OnboardingWizard` or `OnboardingHub` based on `chefs.onboarding_completed_at` and `chefs.onboarding_banner_dismissed_at` (`app/(chef)/onboarding/page.tsx:1-27`)
  - the wizard uses six first-run steps (`lib/onboarding/onboarding-constants.ts:5,10,17,24,31,38,45,90`; `components/onboarding/onboarding-wizard.tsx:419,505-533`)
  - the hub uses real product progress for profile, clients, loyalty, recipes, and staff (`components/onboarding/onboarding-hub.tsx:32,41,52,62,73,86,93,104,183`)
- Real business-setup progress is computed from `chefs`, `clients`, `loyalty_config`, `recipes`, and `staff_members`, not from route visits (`lib/onboarding/progress-actions.ts:20,43-60`).
- DB state involved:
  - `product_tour_progress` stores legacy tour UI state (`database/migrations/20260330000066_product_tour_progress.sql:12-49`)
  - `onboarding_progress` stores wizard-step completion/skip rows (`database/migrations/20260401000048_onboarding_progress.sql:1-13`)
  - wizard completion/opt-out fields live on `chefs` (`app/(chef)/onboarding/page.tsx:16-20`; `lib/onboarding/onboarding-actions.ts:247-253,270-276,288-330`).

### 2. What exactly changes?

- Add one tiny client bridge component that publishes `onboarding peripherals allowed = true` for chef pages once the legacy chef tour shell is removed. This replaces the side effect currently emitted by `OnboardingTourProvider` (`components/onboarding/tour-provider.tsx:120-127`; `lib/onboarding/peripheral-visibility.ts:37-53`).
- Modify the chef layout to stop rendering `ChefTourWrapper` and instead keep `OverlayQueueProvider` plus the new bridge (`app/(chef)/layout.tsx:29,179-200`; `components/onboarding/tour-shell.tsx:25-30`; `lib/overlay/overlay-queue.tsx:41-103`).
- Rename passive dashboard setup labels:
  - `Getting Started` -> `Setup Progress` for the checklist widget (`components/dashboard/onboarding-checklist-widget.tsx:69-71`)
  - `Onboarding Checklist` -> `Setup Progress` for the alerts-section wrapper (`app/(chef)/dashboard/_sections/alerts-section.tsx:334`)
  - `Getting Started` -> `Business Import` for the accelerator wrapper (`app/(chef)/dashboard/_sections/business-section.tsx:118`)
- Change the alert-card setup destination from `/settings` to `/onboarding` (`app/(chef)/dashboard/_sections/alerts-cards.tsx:211-219`).
- Replace the settings replay-tour entry with a plain setup-guide entry to `/onboarding` (`app/(chef)/settings/page.tsx:831-840`; `components/onboarding/replay-tour-button.tsx:12-23`).
- Update the audit doc's onboarding/setup descriptions after shipping (`docs/app-complete-audit.md:130-137,1534-1538`).

### 3. What assumptions are you making?

- **Verified:** Removing the chef tour wrapper without replacement would change or suppress other peripheral UI, because `useOnboardingPeripheralsEnabled()` defaults to `false` unless some component publishes visibility (`lib/onboarding/peripheral-visibility.ts:14-20,37-53`), and `QuickCapture`, `FeedbackNudgeCard`, and beta survey banners all depend on that flag (`components/mobile/quick-capture.tsx:15,21,65`; `components/feedback/feedback-nudge-card.tsx:15,31,49-54`; `components/beta-survey/beta-survey-banner.tsx:6,18,24-28,57`).
- **Verified:** We must preserve `OverlayQueueProvider` semantics if we want overlay consumers like `FeedbackNudgeCard` to keep queue behavior (`components/feedback/feedback-nudge-card.tsx:16,54`; `lib/overlay/overlay-queue.tsx:41-103`).
- **Verified:** Client and staff tours are separate and can stay untouched (`components/onboarding/client-tour-wrapper.tsx:4-21`; `components/onboarding/staff-tour-wrapper.tsx:4-21`; `lib/onboarding/tour-config.ts:106-166`).
- **Unverified, but not correctness-blocking:** Whether every chef dashboard configuration exposes the checklist widget. This is why the spec also normalizes the `alerts-cards.tsx` setup destination instead of relying on one widget path (`app/(chef)/dashboard/_sections/alerts-section.tsx:328-335`; `app/(chef)/dashboard/_sections/alerts-cards.tsx:211-219`).

### 4. Where will this most likely break?

- **Chef layout peripheral gating:** If the builder removes the chef tour shell but forgets the replacement visibility bridge, `QuickCapture`, feedback nudges, and survey banners can disappear because the flag will never be published (`lib/onboarding/peripheral-visibility.ts:14-20,37-53`; `components/mobile/quick-capture.tsx:21,65`; `components/feedback/feedback-nudge-card.tsx:31,49-54`; `components/beta-survey/beta-survey-banner.tsx:24-28,57`).
- **Overlay behavior regression:** If the builder removes the provider entirely, `useOverlaySlot()` fails open and stops queueing overlays, which can subtly change timing/priority behavior (`lib/overlay/overlay-queue.tsx:95-103`).
- **Setup-label drift:** If the builder renames only one dashboard surface, the product will still have mixed labels for the same job (`components/dashboard/onboarding-checklist-widget.tsx:69-71`; `app/(chef)/dashboard/_sections/alerts-section.tsx:334`; `app/(chef)/dashboard/_sections/business-section.tsx:118`; `app/(chef)/dashboard/_sections/alerts-cards.tsx:214-219`).

### 5. What is underspecified?

- Without this spec, a builder could interpret "remove Getting Started" as "delete the entire onboarding system." That would be wrong because the important job still lives in `/onboarding`, `OnboardingBanner`, `OnboardingChecklistWidget`, and the hub (`app/(chef)/onboarding/page.tsx:1-27`; `app/(chef)/dashboard/page.tsx:351`; `components/dashboard/onboarding-checklist-widget.tsx:61-119`; `components/onboarding/onboarding-hub.tsx:93-183`).
- Without explicit naming rules, a builder could leave `Getting Started` on the accelerator and `Onboarding Checklist` on the wrapper, preserving the same semantic overlap this spec is trying to remove (`app/(chef)/dashboard/_sections/business-section.tsx:118`; `app/(chef)/dashboard/_sections/alerts-section.tsx:334`; `components/dashboard/onboarding-checklist-widget.tsx:69`).
- Without explicit non-goals, a builder could start rewriting wizard progress semantics or deleting legacy tour files. That is not part of this pass (`lib/onboarding/onboarding-actions.ts:94-330`; `components/onboarding/replay-tour-button.tsx:12-23`; `lib/onboarding/tour-config.ts:37-170`).

### 6. What dependencies or prerequisites exist?

- No migration dependency exists. This spec is DB-neutral (`database/migrations/20260330000066_product_tour_progress.sql:12-49`; `database/migrations/20260401000048_onboarding_progress.sql:1-13`).
- The builder must preserve existing dashboard data dependencies and auth boundaries, especially `requireChef()`-backed progress readers (`lib/onboarding/progress-actions.ts:20`; `lib/onboarding/onboarding-actions.ts:94,247,270,315`).
- The builder must update the audit doc because this is a user-visible dashboard/layout change (`docs/app-complete-audit.md:130-137,1534-1538`).

### 7. What existing logic could this conflict with?

- `FeedbackNudgeCard` overlay queue participation and peripheral gating (`components/feedback/feedback-nudge-card.tsx:15-16,31,54`).
- `QuickCapture` mobile FAB gating (`components/mobile/quick-capture.tsx:15,21,65`).
- Beta survey banner gating (`components/beta-survey/beta-survey-banner.tsx:6,18,24-28,57`).
- Client and staff tour shells, which still rely on the same shared tour infrastructure (`components/onboarding/client-tour-wrapper.tsx:4-21`; `components/onboarding/staff-tour-wrapper.tsx:4-21`; `components/onboarding/tour-shell.tsx:25-30`).

### 8. What is the end-to-end data flow?

- **After this spec for chef layout:** page render -> `app/(chef)/layout.tsx` mounts `OverlayQueueProvider` and the new bridge -> bridge calls `publishOnboardingPeripheralVisibility(true)` -> `QuickCapture`, feedback nudge, and survey banners can evaluate their own display rules locally (`lib/onboarding/peripheral-visibility.ts:37-53`; `components/mobile/quick-capture.tsx:21,65`; `components/feedback/feedback-nudge-card.tsx:31,49-54`; `components/beta-survey/beta-survey-banner.tsx:24-28,57`).
- **Setup Progress surface:** dashboard render -> `alerts-section.tsx` and/or `alerts-cards.tsx` call `getOnboardingProgress()` -> progress is computed from real product tables -> UI links the chef into `/onboarding` or an onboarding subroute (`app/(chef)/dashboard/_sections/alerts-section.tsx:153,328-335`; `app/(chef)/dashboard/_sections/alerts-cards.tsx:211-219`; `lib/onboarding/progress-actions.ts:20-60`; `components/dashboard/onboarding-checklist-widget.tsx:30-48,119`).
- **Business Import surface:** dashboard render -> `business-section.tsx` computes `shouldShowOnboardingAccelerator` from business data -> accelerator card renders existing import/inquiry/quote links -> label only changes (`app/(chef)/dashboard/_sections/business-section.tsx:88,113-123`; `app/(chef)/dashboard/_sections/business-section-metrics.ts:80-81`; `components/dashboard/onboarding-accelerator.tsx:37-81`).

### 9. What is the correct implementation order?

1. Create the chef peripheral visibility bridge.
2. Update `app/(chef)/layout.tsx` to remove `ChefTourWrapper`, keep `OverlayQueueProvider`, and mount the bridge.
3. Update dashboard/setup copy and destinations:
   - `components/dashboard/onboarding-checklist-widget.tsx`
   - `app/(chef)/dashboard/_sections/alerts-section.tsx`
   - `app/(chef)/dashboard/_sections/alerts-cards.tsx`
   - `app/(chef)/dashboard/_sections/business-section.tsx`
4. Update chef settings to remove the replay-tour entry and replace it with a setup-guide entry.
5. Update `docs/app-complete-audit.md`.
6. Verify chef portal pages, then verify an adjacent peripheral like mobile quick capture still works.

### 10. What are the exact success criteria?

- No chef page renders the floating `Getting Started` checklist, welcome modal, or spotlight tour.
- `Setup Progress` becomes the canonical passive label for chef setup progress on dashboard surfaces.
- `Business Import` becomes the accelerator label.
- Chef settings no longer offers `Replay Tour`.
- `/onboarding` remains the canonical route for setup guidance.
- Quick capture, feedback nudge, and survey banners still work under their current rules.
- Client and staff tours remain untouched.

### 11. What are the non-negotiable constraints?

- Keep auth/tenant scoping untouched. No server action auth changes (`lib/onboarding/progress-actions.ts:20`; `lib/onboarding/onboarding-actions.ts:94,247,270,315`).
- Do not change what counts as onboarding completion in the DB (`lib/onboarding/progress-actions.ts:43-60`; `lib/onboarding/onboarding-actions.ts:247-330`).
- Do not touch financial, loyalty, client, recipe, or staff business logic just because setup surfaces link there (`components/onboarding/client-import-form.tsx:12,80,334,342`; `components/onboarding/loyalty-setup.tsx:13-15,56,95,125,414`; `components/onboarding/recipe-entry-form.tsx:12,99,362,370`; `components/onboarding/staff-entry-form.tsx:12,63,221,228`).
- Preserve client and staff onboarding tours (`lib/onboarding/tour-config.ts:106-166`; `components/onboarding/client-tour-wrapper.tsx:4-21`; `components/onboarding/staff-tour-wrapper.tsx:4-21`).

### 12. What should NOT be touched?

- `database/migrations/*` for onboarding or product tour.
- `lib/onboarding/onboarding-actions.ts` business logic.
- `lib/onboarding/progress-actions.ts` completion rules.
- Client/staff tour config and wrappers.
- The first-run wizard step contents.
- Loyalty, client import, recipe, and staff setup data flows.

### 13. Is this the simplest complete version?

Yes. It resolves the user-visible problem now by removing the global chef overlay, preserving peripheral behavior, and clarifying dashboard labels, without rewriting the underlying onboarding architecture or touching DB state.

### 14. If implemented exactly as written, what would still be wrong?

- The codebase will still contain unused chef legacy tour files/config/actions after the chef layout stops mounting them. That is acceptable for this pass because it avoids unnecessary risk to shared client/staff tour infrastructure (`components/onboarding/chef-tour-wrapper.tsx:4-23`; `lib/onboarding/tour-config.ts:37-101,169-176`; `components/onboarding/replay-tour-button.tsx:12-23`).
- The broader activation model is still split across wizard progress, wizard-dismissal state, and business-setup progress. This spec intentionally does not merge those systems. It removes the worst surface and clarifies labels, but it is not a full onboarding architecture rewrite (`app/(chef)/onboarding/page.tsx:16-27`; `lib/onboarding/onboarding-actions.ts:94-330`; `lib/onboarding/progress-actions.ts:20-60`).

### Final Check

This spec is production-ready for the scoped problem it solves.

The only remaining uncertainty is strategic, not correctness-blocking: ChefFlow still has multiple onboarding concepts under the hood. That is already true in the current codebase, and this spec explicitly avoids pretending to solve all of it in one pass. If the developer wants those systems unified later, that should be a separate spec after this deactivation/consolidation lands.
