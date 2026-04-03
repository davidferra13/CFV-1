# Spec: Food Operator Survey Launch Without OpenClaw

> **Status:** fallback reference only
> **Priority:** fallback only
> **Depends on:** `docs/research/survey-food-operator.md`, `docs/research/surveys-google-forms-ready.md`, `docs/research/survey-distribution-brief-2026-04-02.md`, `docs/research/dev-survey-launch-workflows-2026-04-02.md`
> **Created:** 2026-04-02
> **Type:** documentation-only execution spec

---

Important note:

- This document is now fallback launch context, not the canonical builder execution path.
- The primary in-app launch path starts at `docs/research/current-builder-start-handoff-2026-04-02.md` and then continues through `docs/specs/survey-wave-1-internal-launch-builder-handoff-2026-04-02.md`.
- Keep this spec only if the internal ChefFlow survey route cannot be deployed.

## What This Does (Plain English)

This spec defines the older external-form shortcut for getting a high-signal food-operator survey in front of real operators, collecting usable responses, and building a qualified follow-up list without relying on OpenClaw.

It deliberately chose a lighter launch path than building new product surfaces first:

- use a short external survey for immediate distribution
- keep attribution and follow-up disciplined
- learn fast from warm channels before scaling
- preserve a clean path into ChefFlow's internal survey tooling later if the first wave works

This is a launch-and-learning spec, not a code-implementation spec.

Current boundary:

- this spec is fallback launch context only
- the canonical current execution path starts at `docs/research/current-builder-start-handoff-2026-04-02.md`
- it does not satisfy the broader zero-manual-entry requirement by itself
- the long-term replacement target is `docs/specs/p0-zero-manual-entry-form-control-plane.md`

---

## Why This Matters

The existing operator survey work is strong at the question-bank level, but not yet optimized for cold distribution at scale.

Current risks if we launch it as-is:

- `28` questions is too long for low-intent channels
- operator types are mixed together too early
- source attribution is weak
- anonymity and incentives are in tension
- the internal ChefFlow survey path is now the canonical execution path, so this document should only be used if that path is unavailable

The immediate goal is not to perfect the survey system.

The immediate goal is to learn:

1. which operator segments respond
2. what workflows hurt most
3. where pricing/costing demand is strongest
4. who wants follow-up access or interviews

---

## Decision Summary

These decisions are locked only for the fallback Google Forms path:

1. **Use Google Forms only if the internal ChefFlow survey path cannot be deployed.**
   This is no longer the primary wave-1 path.

2. **Do not launch the full 28-question operator survey as the primary cold-distribution instrument.**
   Treat the existing long survey as the research bank. Build a shorter launch form from it.

3. **Use one primary screener plus branching, not one flat survey.**
   Food operators do not all answer the same workflow questions.

4. **Keep survey responses anonymous.**
   If follow-up is desired, use a separate opt-in mechanism after submission.

5. **Track attribution explicitly.**
   Source tracking is mandatory from day one.

6. **Launch in phases.**
   Warm contacts first, then communities, then small paid tests, then partnerships.

7. **Do not depend on OpenClaw for this workflow.**
   OpenClaw can help later with reach, enrichment, or operator targeting, but it is not required for this first learning loop.

8. **Create the live forms in the final owner account from day one.**
   Do not build the live forms in a temporary or wrong Google account and assume ownership can be cleaned up later.

9. **Freeze wave-1 structure once the form is live.**
   If a material change is needed after distribution starts, create a dated follow-up version instead of silently rewriting the live form.

10. **Keep raw responses immutable.**
    The linked Google Sheet is the raw source. Cleaned coding, tagging, and analysis happen in a separate working sheet or export.

11. **Use strict responder settings.**
    Keep response editing off and response-summary visibility off for respondents.

---

## Existing Assets To Reuse

Use these existing documents as inputs, not as the final operating instructions:

- `docs/research/survey-food-operator.md`
- `docs/research/surveys-google-forms-ready.md`
- `docs/research/survey-distribution-brief-2026-04-02.md`

Use these existing product surfaces only as later follow-up options, not as launch dependencies:

- `app/(admin)/admin/beta-surveys/*`
- `app/beta-survey/*`
- `lib/beta-survey/*`

Reason:

- the current beta-survey subsystem is real, but it is built around beta research and invite flows
- its seeded taxonomy is still broad (`chef`, `client`, `tester`) instead of operator-segment specific
- it is useful for later cohort follow-up, but not the fastest lowest-risk first-wave launch path

---

## Chosen Launch Path

### Phase 0: Prep

Create:

1. `Food Operator Survey - Wave 1`
2. `Operator Follow-Up Opt-In`
3. response tracker sheet
4. source/channel log

Create the two live forms inside the final long-term owner Google account, not inside a temporary or shared account with unclear ownership.

No OpenClaw dependency.
No new product build required.

### Phase 1: Soft Launch

Send the survey to `20-30` known or warm operators first.

Purpose:

- verify the survey is understandable
- measure completion time
- detect confusing or low-signal questions
- confirm that the follow-up flow works

Do not scale until the first `10-15` completions are reviewed manually.

### Phase 2: Controlled Distribution

Launch to:

1. direct contacts
2. existing warm lists
3. operator communities and groups

This is still primarily organic distribution.

### Phase 3: Scaled Testing

Only after messaging and segment response quality are clear:

1. run small-budget paid social tests
2. approach associations
3. approach vendors and suppliers for amplification

Associations and partnerships are a scale-up path, not the first immediate path.

---

## Survey Architecture

### Rule

The launch survey must be short enough for cold traffic and structured enough for segmentation.

Target:

- `5-7` minutes
- `12-15` questions
- one primary operator-type screener
- one branch for chef/caterer-style operators
- one branch for location-based operators

### Required Screener

The first question must be **single-select**, not checkbox, so Google Forms can branch cleanly.

Use:

`What best describes your primary business today?`

Options:

- Private chef / personal chef
- Caterer
- Meal prep service
- Bakery or dessert business
- Food truck / pop-up
- Restaurant / cafe / storefront food business
- Other food operator

### Common Core Questions

Every respondent should answer:

1. primary operator type
2. state or metro area
3. years operating
4. business size / team size
5. current tools used
6. biggest workflow pain point
7. current confidence in actual profitability
8. importance of live ingredient pricing or food-cost visibility
9. willingness to test a new tool
10. willingness to pay range

### Branch A: Chef / Caterer / Meal Prep

This branch is for:

- private chef
- caterer
- meal prep service

Ask about:

1. inquiry source
2. quote / deposit workflow
3. menu approval friction
4. grocery / reimbursement handling

### Branch B: Restaurant / Food Truck / Bakery / Pop-Up

This branch is for:

- bakery
- food truck / pop-up
- restaurant / cafe / storefront
- other location-based operator

Ask about:

1. how ingredient costs are tracked
2. whether menu prices are recalculated regularly
3. procurement / inventory friction
4. biggest margin-risk area

### Follow-Up Separation

The survey itself stays anonymous.

The thank-you screen links to a separate form:

`Operator Follow-Up Opt-In`

That separate form collects only:

- name
- email
- operator type
- whether they want:
  - early access
  - interview invitation
  - pilot / beta participation
  - survey results summary

Do not collect these identity fields inside the main anonymous survey.

---

## Wave 1 Question Set

This is the recommended first-wave question set.

### Core

1. What best describes your primary business today?
2. What state or metro area are you based in?
3. How long have you been operating?
4. How many people regularly help run the business?
5. Which tools do you currently rely on most? (pick up to 4)
6. What takes the most time outside the actual food work? (pick up to 2)
7. Do you feel confident you know your true profit or margin on each job / product / menu?
8. How important would real-time ingredient pricing or food-cost visibility be for you?
9. If one platform handled your most painful workflow well, how interested would you be in trying it?
10. What monthly price range feels reasonable if it truly saves time or protects margin?

### Branch A: Chef / Caterer / Meal Prep

11. Where do most new inquiries come from today? (pick up to 2)
12. How do you currently handle quotes, deposits, or approvals?
13. What part of client communication breaks down most often?
14. How do you usually handle grocery costs?

### Branch B: Restaurant / Food Truck / Bakery / Pop-Up

11. How do you currently track ingredient costs?
12. How often do you revisit menu pricing or product pricing?
13. What is the biggest operational source of margin loss?
14. What part of purchasing / inventory / pricing feels most manual?

### Final Open Text

15. If we could solve one painful part of running your food business, what should it be?

This preserves signal while reducing cold-start fatigue.

---

## Distribution Order

Use this exact order for wave 1:

### 1. Warm Direct Outreach

Start with:

- personal contacts
- previous operator relationships
- known chefs, caterers, and food business owners
- existing DMs / email contacts

Goal:

- fast, high-quality responses
- message validation
- early qualitative learning

### 2. Operator Communities

Post into:

- Facebook groups
- chef/operator communities
- Reddit only where rules and context make it appropriate
- niche Slack/Discord groups if available

Do not spam low-context groups.
Use community-specific copy.

### 3. Small Paid Tests

Once the survey is stable:

- run small-budget Meta tests
- test audience + message + creative combinations
- optimize for completed, qualified responses

Do not scale paid spend before attribution and qualification are working.

### 4. Associations And Vendors

Only after the survey, messaging, and follow-up loop are stable:

- local restaurant associations
- food truck associations
- catering networks
- supplier newsletters
- operator-facing vendors

These channels are useful, but they are not the fastest immediate launch path.

---

## Channel Attribution

Attribution is mandatory.

Use two layers:

### Layer 1: Source Question In Survey

Add a required survey question:

`Where did you first see this survey?`

Options:

- Direct email or text
- Facebook group
- Instagram
- LinkedIn
- Reddit
- Paid ad
- Association or newsletter
- Supplier or vendor
- Friend / referral
- Other

### Layer 2: Channel Link Tracking

Each channel should use its own tracked link or short link, even if all routes land on the same Google Form.

At minimum, maintain a source sheet with:

- channel name
- community or partner name
- date posted
- exact copy used
- survey link used
- responses generated

Do not rely on memory.

### Preferred Google Forms Tactic

Where possible, generate pre-filled form links for channel-specific attribution defaults instead of relying only on one manual source question.

Use the source question as the fallback truth layer, but prefer:

- one pre-filled link per channel
- one pre-filled link per partner or community when practical
- one plain unfilled link only for direct manual sharing when attribution is obvious elsewhere

This gives cleaner attribution while staying inside Google Forms.

---

## Incentive Model

Do not use a generic gift-card-first strategy as the primary motivator.

Use product-aligned incentives first:

1. early access
2. founding operator pricing
3. private interview priority
4. summary benchmark report

If a gift card is used later, it must be handled through the separate opt-in form, not the anonymous survey itself.

---

## Messaging Principles

The message should not sound like market research for its own sake.

Lead with:

- help shape a tool for real operators
- built around actual food-business pain
- short time commitment
- no sales call required

Do not lead with:

- long explanation of the platform
- abstract startup language
- too many feature names

The message should feel like:

`We're learning how independent food operators actually run pricing, clientflow, sourcing, and day-to-day operations so we can build something useful.`

---

## Analysis Plan

Review responses in two layers.

### Daily Review

Check:

- total completions
- completion rate
- qualified respondent rate
- top segments responding
- opt-in rate
- obvious low-quality or duplicate responses

### Weekly Review

Segment results by:

- operator type
- years operating
- solo vs team
- geography
- channel source

Primary outputs:

1. top pain points by segment
2. clientflow pain vs pricing/inventory pain by segment
3. willingness-to-pay bands by segment
4. live-pricing demand by segment
5. best acquisition channels for serious respondents

### Raw vs Clean Workflow

Use this operating split:

1. linked Google Sheet = raw, untouched response log
2. separate analysis sheet or export = cleaned, tagged, deduplicated working data
3. summary artifacts = charts, coded themes, benchmark outputs

Do not manually overwrite, normalize, or recode the raw linked response sheet.

---

## Success Metrics

Track these from day one:

- completion rate
- median completion time
- qualified response count
- qualified response rate
- opt-in rate
- interview-volunteer count
- cost per qualified completion for paid channels

Initial operating thresholds:

- warm-channel completion rate should be at least `60%`
- cold/community completion rate should be at least `35%`
- median completion time should stay under `7 minutes`
- qualified response rate should stay above `70%`

If the survey misses these thresholds, revise it before broader scale.

---

## Qualification Rules

A response counts as qualified if:

1. respondent is a real food operator
2. the screener and core workflow answers are complete
3. the response is not obviously spam, duplicate, or contradictory

This matters because total submissions are less important than usable operator signal.

---

## Privacy And Safety Rules

1. The main survey remains anonymous.
2. Follow-up identity capture happens in a separate opt-in form.
3. Do not ask for exact revenue, exact profit, home addresses, or client-identifying information.
4. Treat exports as internal research material.
5. If results are shared externally, share only aggregated and redacted summaries.
6. Community posting must respect each community's rules.
7. Do not promise product capabilities that are not actually available yet.
8. Keep respondent-visible response summaries off.
9. Keep edit-after-submit off unless a later spec explicitly changes that rule.

---

## Live Form Governance

The repo remains the source of truth for wording and operating rules.

The live Google assets are the delivery surface.

### Required Live Asset Metadata

Record these values in the launch console as soon as the forms exist:

- owner Google account
- created date
- live version label
- main survey edit link
- main survey public link
- follow-up form edit link
- follow-up form public link
- raw linked response sheet
- clean analysis sheet or file location

### Change Control Rule

Before launch:

- small edits in-place are allowed

After launch:

- typo fixes are allowed in-place
- material wording, branching, or answer-option changes require a new dated version note
- if the live form meaning changes enough to affect comparability, create a new live version instead of mutating the old one

---

## Historical Note: Why This Fallback Existed

At the time this fallback was drafted, the repo already included:

- `app/beta-survey/*`
- `app/(admin)/admin/beta-surveys/*`
- `lib/beta-survey/*`
- `database/migrations/20260330000021_beta_survey_system.sql`

That was the earlier rationale for choosing an external shortcut first.

Historical reasons:

1. the first-wave requirement is speed, not platform purity
2. Google Forms was already close to launch
3. the then-current beta-survey taxonomy was not operator-specific enough
4. the internal system was better suited for tracked beta cohorts and follow-up invites than broad initial cold distribution

Current state:

- this rationale is no longer the active execution choice
- the internal ChefFlow survey path is now the canonical wave-1 path
- keep this section only to explain why the fallback docs exist

---

## Historical Follow-Up Logic

If the fallback external wave had produced useful signal, the next spec would have decided whether to:

1. mirror the winning operator survey into the internal beta-survey system
2. create operator-segment-specific follow-up cohorts
3. route opted-in respondents into early-access or interview pipelines

That fallback follow-up phase would only have begun after the external survey proved:

- which segments matter most
- which questions actually produce signal
- which channels deliver qualified operators

---

## Out of Scope

This spec does not include:

- OpenClaw-powered outreach or targeting
- new public product surfaces
- custom survey app development
- CRM implementation
- email automation implementation
- incentive fulfillment workflow implementation
- paid-media creative production

---

## Notes For The Builder / Operator

Do not start the active builder workflow from this document.

1. Treat `docs/research/survey-food-operator.md` as the master question bank, not the launch form.
2. Treat `docs/research/surveys-google-forms-ready.md` as the starting draft, not the locked operating version.
3. The first live form should be shorter than the current draft.
4. The main survey and the follow-up capture form must be separate.
5. The first launch objective is learning quality, not vanity reach.
6. For the current execution order, return to `docs/research/current-builder-start-handoff-2026-04-02.md`.

---

## Archive Rule

If the survey is materially revised after real distribution begins, create a dated follow-up execution note instead of silently rewriting this spec.
