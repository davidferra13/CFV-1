# Spec: Zero-Manual-Entry Form Control Plane

> **Status:** ready
> **Priority:** P0 (blocking)
> **Depends on:** `docs/research/current-builder-start-handoff-2026-04-02.md`, `docs/specs/survey-wave-1-internal-launch-builder-handoff-2026-04-02.md`
> **Estimated complexity:** large (9+ files)
>
> **Execution note:** This document is the long-term product direction, not the phase-order authority for the current wave-1 launch. For immediate builder sequencing, start with `docs/research/current-builder-start-handoff-2026-04-02.md`.

## Timeline

| Event         | Date                 | Agent/Session | Commit |
| ------------- | -------------------- | ------------- | ------ |
| Created       | 2026-04-02 18:00 EDT | Codex         |        |
| Status: ready | 2026-04-02 18:00 EDT | Codex         |        |

---

## Developer Notes

### Raw Signal

The developer does not want to manually plug survey or form content into external tools. Their ideal workflow is: share a link, configure a small set of parameters, and then review all collected inputs in one dashboard. Manual form authoring, copying questions into Google Forms, hand-linking sheets, and manually stitching together response sources are the wrong operating model.

### Developer Intent

- **Core goal:** eliminate manual data entry for form creation, distribution, intake, and review
- **Key constraints:** keep the operator focused on oversight and analysis, not form assembly or repetitive setup work
- **Motivation:** external-form launch shortcuts are acceptable for immediate learning, but they are not acceptable as the product's long-term operating model
- **Success from the developer's perspective:** a ChefFlow-native system where a user can define or select a form, generate shareable links, apply channel/source parameters, collect responses automatically, and review everything from one control plane

### Additional UX Signal From Live Survey Use

The current internal survey experience is already directionally right, but the response UX is still too rigid.

Direct pain points reported by the developer:

- users should be able to move between survey tabs / sections freely instead of being forced through a narrow sequence
- when an answer option is missing, there should be an immediate way to say so
- the final notes box is not enough; notes need a better place in the flow
- some prompts need more expressive answer space, especially location / metro / region answers
- the surveys are strong, but the quality of life of giving a response needs to improve

---

## What This Does (Plain English)

This spec replaces the current "copy content into Google Forms" workflow with a ChefFlow-native form control plane. A user should be able to choose a form definition, set launch parameters, generate share links, collect responses, and review structured and free-text results from one internal dashboard without hand-entering the form itself into a third-party tool.

---

## Why It Matters

The current wave-1 Google Forms launch path is fast, but it still depends on manual external authoring and setup. That directly conflicts with the developer's actual requirement. If ChefFlow owns the form definition, public rendering, attribution, and dashboarding, the operator can stay in oversight mode instead of becoming a survey operator or form assembler.

---

## Current-State Evidence

The repo already contains the core building blocks of the right architecture:

- Public tokenized survey delivery exists at `app/beta-survey/[token]/page.tsx`
- Public share-link delivery exists at `app/beta-survey/public/[slug]/page.tsx`
- Authenticated survey delivery exists at `app/beta-survey/page.tsx`
- A reusable survey renderer already exists at `components/beta-survey/beta-survey-form.tsx`
- Admin survey results, invite generation, and CSV export already exist under `app/(admin)/admin/beta-surveys`
- Server actions for active surveys, public submissions, invites, activation, and export already exist in `lib/beta-survey/actions.ts`
- The database migration for the beta survey system already exists at `database/migrations/20260330000021_beta_survey_system.sql`
- The canonical market-research survey seeding migration now exists at `database/migrations/20260402000118_market_research_public_surveys.sql`
- ChefFlow already has other inbound-form pipelines and dashboards, such as `components/embed/embed-inquiry-form.tsx` and `app/(chef)/wix-submissions/page.tsx`

The main gap is not raw capability. The main gap is that the existing system is still framed as a deferred beta-survey subsystem rather than the canonical form control plane.

### Current Phase Reality

For immediate execution, this spec is not the sequencing authority. The current wave-1 builder must still start with:

- `docs/build-state.md`
- `docs/research/current-builder-start-handoff-2026-04-02.md`
- `docs/specs/survey-wave-1-internal-launch-builder-handoff-2026-04-02.md`

What is already locally true in the current survey implementation slice:

- tracked launch metadata is already preserved through the public/tokenized survey routes and stored with responses
- the admin survey detail page already supports tracked-link generation and attribution-aware review
- CSV export already includes source/channel/campaign/wave/launch attribution fields

What is still not done:

- deployed verification of the current passive survey surfacing slice
- persistent launch records
- a generalized form service layer beyond survey framing
- versioned create/clone launch workflows

Builder implication:

- extend the existing survey base compatibility-first
- do not start with route renames or table renames
- do not describe the broader control plane as already delivered

---

## Files to Create

| File                       | Purpose                                                                                                                 |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| None in this planning pass | This spec already exists and should now be treated as the long-term direction document rather than a file-creation task |

---

## Files to Modify

| File                                                                     | What to Change                                                                                          |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `docs/research/survey-distribution-brief-2026-04-02.md`                  | Clarify that Google Forms is a wave-1 launch shortcut, not the long-term operating model                |
| `docs/specs/survey-wave-1-internal-launch-builder-handoff-2026-04-02.md` | Preserve the correct execution order and keep the internal launch path as the source of truth           |
| `docs/specs/food-operator-survey-launch-without-openclaw.md`             | Add an explicit boundary note pointing to this spec as the long-term replacement                        |
| `docs/specs/client-survey-launch-without-openclaw.md`                    | Mirror the same boundary note so operator and client launches do not drift                              |
| `lib/beta-survey/actions.ts`                                             | In implementation phase: rename and generalize survey actions into a broader form-control service layer |
| `components/beta-survey/beta-survey-form.tsx`                            | In implementation phase: generalize renderer naming and add hidden/source parameter capture             |
| `app/beta-survey/page.tsx`                                               | In implementation phase: transition to a broader forms surface or preserve as compatibility route       |
| `app/beta-survey/[token]/page.tsx`                                       | In implementation phase: preserve tokenized delivery while generalizing route ownership                 |
| `app/(admin)/admin/beta-surveys/page.tsx`                                | In implementation phase: evolve into a centralized form dashboard                                       |
| `app/(admin)/admin/beta-surveys/[id]/page.tsx`                           | In implementation phase: broaden results and launch controls beyond beta-only framing                   |
| `database/migrations/20260330000021_beta_survey_system.sql`              | Apply or supersede during implementation, depending on whether names are preserved or generalized       |

---

## Database Changes

This spec should prefer extending the existing survey schema rather than starting from zero.

### New Tables

None required if the existing beta survey tables are preserved and generalized in place.

### New Columns on Existing Tables

At minimum, implementation should add or confirm support for:

- source attribution fields
- channel identifier fields
- launch / wave version fields
- response status and lifecycle metadata that support dashboard filtering
- form kind / use case metadata if the system expands beyond surveys

Current local status:

- source/channel/campaign/wave/launch attribution is already preserved in the current survey response path
- admin filtering and CSV export already expose that attribution
- persistent first-class launch records are still missing

### Migration Notes

- The existing migration `20260330000021_beta_survey_system.sql` already provides a strong starting shape.
- If the team keeps the existing table names for speed, implementation may add generalized semantics first and rename later.
- If the team decides to rename tables now, do it once and do it fully. Do not leave half the system "beta survey" and half "forms."

---

## Data Model

The long-term model should support these entities:

- **Form definition:** title, slug, purpose, questions, status, active version, visibility mode, and supported parameters
- **Form launch / wave:** which version is live, owner, created date, attribution defaults, and external distribution context
- **Invite / access token:** optional tokenized delivery for targeted distribution, follow-up, or restricted cohorts
- **Response:** structured answers, fixed metric columns for aggregation, free-text payload, respondent metadata, source/channel metadata, timestamps, and submission status
- **Analysis layer:** raw response source remains immutable; coding, tagging, and insight extraction happen in a separate interpretation layer

Key rule:

- raw responses are append-only and never manually "cleaned" in place

---

## Server Actions

Implementation should provide a generalized action surface like this:

| Action                                          | Auth                             | Input                          | Output            | Side Effects                           |
| ----------------------------------------------- | -------------------------------- | ------------------------------ | ----------------- | -------------------------------------- |
| `getActiveForm(slugOrKind)`                     | public/admin depending on route  | identifier                     | form definition   | none                                   |
| `submitPublicForm(formIdOrSlug, answers, meta)` | public                           | answers + hidden/source params | success or error  | stores response, revalidates dashboard |
| `createFormLaunch(input)`                       | `requireAdmin()`                 | form id, wave label, defaults  | launch metadata   | creates launch record                  |
| `generateTrackedLinks(input)`                   | `requireAdmin()`                 | launch id + channels           | per-channel links | stores attribution defaults            |
| `listFormResponses(filters)`                    | `requireAdmin()` or scoped owner | filters                        | response list     | none                                   |
| `exportFormResponsesCsv(formId, filters)`       | `requireAdmin()`                 | form/filter set                | CSV payload       | none                                   |
| `cloneFormVersion(formId)`                      | `requireAdmin()`                 | source form id                 | new version       | preserves prior wave immutability      |

---

## UI / Component Spec

### Page Layout

The admin experience should become one centralized forms dashboard, not separate scattered launch docs plus third-party setup steps.

Recommended structure:

1. **Forms index**
   - all form definitions
   - active/inactive status
   - latest response volume
   - last modified date
   - launch status

2. **Form detail / launch control**
   - definition summary
   - wave version history
   - public link and tracked link generation
   - owner and governance metadata
   - raw response source link
   - analysis/export actions

3. **Response dashboard**
   - response counts
   - completion rate
   - breakdown by source/channel/segment
   - open-text review queue
   - export and coding hooks

### States

- **Loading:** show skeletons or existing admin loading pattern
- **Empty:** no launches yet or no responses yet, with clear next action
- **Error:** explicit failure state, never fake zeros
- **Populated:** launch controls plus real response data and filters

### Interactions

- Create or activate a launch from an internal form definition
- Copy public link or tracked channel links
- Filter responses by wave, channel, role, or segment
- Export raw responses without mutating them
- Clone a live form into a new version instead of mutating the active wave

### Survey Response UX Requirements

The builder agent should preserve these as product requirements, not optional polish:

1. **Non-linear section navigation**
   - respondents must be able to move between sections without losing work
   - section tabs should support intentional jumping, not only forced forward progression

2. **Question-level escape hatch for missing options**
   - for closed-choice questions where the answer set may be incomplete, support `Other` with free text
   - do not rely on a single final notes field as the only fallback

3. **Better notes model**
   - provide either per-question notes, per-section notes, or another localized explanation surface
   - users should be able to explain context near the answer they are reacting to

4. **More expressive text fields where appropriate**
   - prompts like location / metro / region should not feel artificially cramped
   - the system should support answers that do not fit one narrow place label

5. **Response comfort over rigid gating**
   - the system should collect high-fidelity answers, not merely complete answers
   - if a rigid control harms truthful expression, the control should be reconsidered

---

## Edge Cases and Error Handling

| Scenario                                            | Correct Behavior                                       |
| --------------------------------------------------- | ------------------------------------------------------ |
| Existing beta survey migration has not been applied | Show explicit empty/deferred state, not silent failure |
| A live form needs a structural change after launch  | Clone to a new version, keep prior wave immutable      |
| Channel/source is missing from the public link      | Preserve submission but mark attribution as unknown    |
| A public form token expires or is reused            | Return clear invalid/expired/already submitted state   |
| Admin exports data during active collection         | Export current snapshot without mutating raw data      |
| Free-text coding changes over time                  | Keep coded analysis separate from raw response payload |

---

## Verification Steps

1. Apply or validate the underlying survey tables.
2. Sign in with the agent admin account.
3. Open the forms dashboard.
4. Activate a form definition and generate a public link.
5. Submit the public form through the share link with source/channel parameters.
6. Verify the response appears in the admin dashboard with attribution intact.
7. Export the responses and confirm the raw payload is preserved.
8. Clone the form into a new version and verify the previous wave remains unchanged.

### Implementation Priority Inside This Spec

When this broader control-plane spec is resumed, preserve this order:

1. keep the already-working internal public survey path as the base
2. improve the response UX quality-of-life issues already documented
3. only then broaden into passive surfacing and larger platform-wide expansion

Do not let broader architecture work bury the current survey response UX problems.

---

## Out of Scope

- Not keeping Google Forms as the long-term canonical workflow
- Not building a full drag-and-drop visual form builder in the first pass
- Not solving every non-survey intake flow in the first implementation
- Not replacing existing inquiry or Wix ingestion flows on day one

---

## Notes for Builder Agent

- The fastest correct path is to generalize the existing beta survey system rather than starting a brand-new form platform.
- Preserve working public-token and admin-result patterns where possible.
- Do not leave the repo with a split brain where wave-1 survey docs imply Google Forms is the final architecture.
- Prefer compatibility wrappers and phased renaming if a full rename would create unnecessary migration risk.
- Do not start by renaming routes, tables, or directories to `forms` while the current wave-1 survey path is still the active compatibility base.
- Respect the current repo baseline: the survey handoff may be locally strong while `npm run typecheck:app` is still red for unrelated reasons. Keep those truths separate.
