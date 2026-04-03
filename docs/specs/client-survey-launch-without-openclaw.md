# Spec: Client Survey Launch Without OpenClaw

> **Status:** fallback reference only
> **Priority:** fallback only
> **Depends on:** `docs/research/survey-client.md`, `docs/research/surveys-google-forms-ready.md`, `docs/research/survey-distribution-brief-2026-04-02.md`, `docs/research/dev-survey-launch-workflows-2026-04-02.md`
> **Created:** 2026-04-02
> **Type:** documentation-only execution spec

---

Important note:

- This document is now fallback launch context, not the canonical builder execution path.
- The primary in-app launch path starts at `docs/research/current-builder-start-handoff-2026-04-02.md` and then continues through `docs/specs/survey-wave-1-internal-launch-builder-handoff-2026-04-02.md`.
- Keep this spec only if the internal ChefFlow survey route cannot be deployed.

## What This Does (Plain English)

This spec defines the older external-form shortcut for getting a high-signal client survey in front of real buyers and likely buyers, collecting usable responses, and building a qualified follow-up list without relying on OpenClaw.

It chose a lighter launch path than building new product surfaces first:

- use a short external survey for immediate distribution
- separate anonymous response capture from follow-up identity capture
- segment experienced buyers from not-yet-buyers
- learn from warm and adjacent channels before scaling
- keep a clean path into ChefFlow's internal survey tooling later if the first wave works

This is a launch-and-learning spec, not a code-implementation spec.

Current boundary:

- this spec is fallback launch context only
- the canonical current execution path starts at `docs/research/current-builder-start-handoff-2026-04-02.md`
- it does not satisfy the broader zero-manual-entry requirement by itself
- the long-term replacement target is `docs/specs/p0-zero-manual-entry-form-control-plane.md`

---

## Why This Matters

The existing client survey work is strong at the question-bank level, but not yet optimized for broad distribution.

Current risks if we launch it as-is:

- `22` questions is longer than necessary for mixed-intent public traffic
- experienced buyers and hypothetical respondents are blended too early
- source attribution is weak
- anonymity and incentives are in tension
- the internal ChefFlow survey path is now the canonical execution path, so this document should only be used if that path is unavailable

The immediate goal is not to perfect the survey system.

The immediate goal is to learn:

1. how real clients try to discover and trust food operators
2. what makes booking feel easy versus risky
3. what level of inquiry and payment structure feels normal
4. what increases trust, conversion, and rebooking

---

## Decision Summary

These decisions are locked only for the fallback Google Forms path:

1. **Use Google Forms only if the internal ChefFlow survey path cannot be deployed.**
   This is no longer the primary wave-1 path.

2. **Do not launch the full 22-question client survey as the primary cold-distribution instrument.**
   Treat the existing long survey as the master research bank. Build a shorter wave-1 form from it.

3. **Use one experience screener plus branching.**
   People who have hired before should not answer exactly the same questions as people who are only considering it.

4. **Keep survey responses anonymous.**
   If follow-up is desired, use a separate opt-in form after submission.

5. **Track attribution explicitly.**
   Source tracking is mandatory from day one.

6. **Launch in phases.**
   Warm contacts first, then communities, then small paid tests, then planners, venues, and partners.

7. **Do not depend on OpenClaw for this workflow.**
   OpenClaw can help later with targeting or reach, but it is not required for the first learning loop.

8. **Create the live forms in the final owner Google account from day one.**
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

- `docs/research/survey-client.md`
- `docs/research/surveys-google-forms-ready.md`
- `docs/research/survey-distribution-brief-2026-04-02.md`

Use these existing product surfaces only as later follow-up options, not as launch dependencies:

- `app/(client)/survey/*`
- `lib/surveys/*`
- `lib/feedback/*`
- `components/feedback/*`

Reason:

- the current token-based survey surfaces are oriented around post-event or in-product feedback flows
- they are useful later for tracked cohorts and owned-channel follow-up
- they are not the fastest or cleanest first-wave path for anonymous external market-validation distribution

---

## Chosen Launch Path

### Phase 0: Prep

Create:

1. `Client Survey - Wave 1`
2. `Client Survey Follow-Up Opt-In`
3. response tracker sheet
4. source/channel log
5. warm outreach list

Create the two live forms inside the final long-term owner Google account, not inside a temporary or shared account with unclear ownership.

No OpenClaw dependency.
No new product build required.

### Phase 1: Soft Launch

Send the survey to `20-30` warm or adjacent respondents first.

Examples:

- past clients who would give honest feedback
- friends or contacts who have hosted private events
- event planners, hosts, and referrers
- trusted local lifestyle or wedding contacts

Purpose:

- verify the survey is understandable
- measure completion time
- detect confusing or low-signal questions
- confirm that the follow-up flow works

Do not scale until the first `10-15` completions are reviewed manually.

### Phase 2: Controlled Distribution

Launch to:

1. direct contacts
2. community groups
3. event-planning and wedding communities
4. local lifestyle and hospitality-adjacent channels

This is still primarily organic distribution.

### Phase 3: Scaled Testing

Only after messaging and respondent quality are clear:

1. run small-budget paid social tests
2. approach planners, venues, and newsletters
3. test audiences such as hosts, wedding planners, event-heavy households, and luxury dining interest groups

Do not scale paid spend before attribution and qualification are working.

---

## Survey Architecture

### Rule

The launch survey must be short enough for mixed-intent public traffic and structured enough for segmentation.

Target:

- `4-6` minutes
- `10-13` questions shown per respondent
- one primary experience screener
- one branch for experienced buyers
- one branch for not-yet-buyers

### Required Screener

The first question must be **single-select**, not checkbox, so Google Forms can branch cleanly.

Use:

`Which best describes you today?`

Options:

- I have hired a private chef or caterer more than once
- I have hired one once
- I have not hired one, but I have seriously considered it
- I have not hired one, I am mostly curious

### Common Core Questions

Every respondent should answer:

1. experience level
2. likely or actual event type
3. state or metro area
4. survey source
5. final open text on what would make hiring easier

### Branch A: Experienced Buyers

Ask about:

1. how they found the chef
2. what mattered most when choosing
3. what felt hardest or most uncertain in booking
4. how they want quotes presented
5. comfort with online deposit payment
6. how much menu collaboration they want
7. what most increases rebooking or referral likelihood

### Branch B: Serious Considerers Or Curious Prospects

Ask about:

1. how they would try to find a chef
2. what they would need to trust
3. what has stopped them from booking
4. how much information feels reasonable to share up front
5. how they want quotes presented
6. comfort with online deposit payment
7. how much menu collaboration they want
8. what would increase trust enough to book

### Follow-Up Separation

The survey itself stays anonymous.

The thank-you screen links to a separate form:

`Client Survey Follow-Up Opt-In`

That separate form collects only:

- name
- email
- respondent type
- whether they want:
  - a results summary
  - a research interview invite
  - a future pilot or test invite
  - product updates

Do not collect these identity fields inside the main anonymous survey.

---

## Wave 1 Question Set

This is the recommended first-wave question set.

### Core

1. Which best describes you today?
2. What type of event was it or would it most likely be for?
3. What state or metro area are you based in?
4. Where did you first see this survey?

### Branch A: Experienced Buyers

5. How did you find the chef you hired? (pick up to 2)
6. What mattered most when choosing? (pick up to 2)
7. What part of booking or planning felt most annoying or uncertain?
8. If a chef sends a quote, how would you prefer to receive and review it?
9. How comfortable are you paying a deposit through an online portal?
10. Which menu approach feels best to you?
11. What would most increase the chance you rebook or recommend a chef? (pick up to 2)

### Branch B: Serious Considerers Or Curious Prospects

5. How would you most likely try to find a chef? (pick up to 2)
6. What would matter most when deciding whom to trust? (pick up to 2)
7. What has stopped you from booking so far? (pick up to 2)
8. When first reaching out, how much information feels reasonable to share up front?
9. If a chef sends a quote, how would you prefer to receive and review it?
10. How comfortable are you paying a deposit through an online portal?
11. Which menu approach feels best to you?
12. What would most increase your trust enough to book? (pick up to 2)

### Final Open Text

13. If one thing made hiring a chef feel easier, what would it be?

This preserves signal while reducing cold-start fatigue.

---

## Distribution Order

Use this exact order for wave 1:

### 1. Warm Direct Outreach

Start with:

- past clients or hosts willing to be candid
- friends who fit the target profile
- event planners, hosts, and referrers
- trusted local contacts likely to know the audience

Goal:

- fast, high-quality responses
- message validation
- early qualitative learning

### 2. Community Distribution

Post into:

- wedding and event planning groups
- local lifestyle and entertaining groups
- food and hosting communities
- Reddit only where the rules and fit are clear
- niche Facebook or neighborhood groups where private dining is realistic

Do not spam low-context groups.
Use community-specific copy.

### 3. Small Paid Tests

Once the survey is stable:

- run small-budget Meta tests
- test host/event-planner interest audiences
- optimize for completed, qualified responses

Do not scale paid spend before attribution and qualification are working.

### 4. Planner, Venue, And Newsletter Amplification

Only after the survey, messaging, and follow-up loop are stable:

- event planners
- wedding planners
- venues
- hospitality newsletters
- local luxury/lifestyle partners

These channels are useful, but they are not the fastest immediate path.

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
- Planner or venue
- Newsletter or blog
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

Do not lead wave 1 with a giveaway-first incentive.

Use research-aligned incentives first:

1. results summary
2. interview invitation
3. future pilot or testing access
4. product updates if requested

If a prize or giveaway is used later, it must be handled through the separate opt-in form, not the anonymous survey itself.

---

## Messaging Principles

The message should not sound like generic market research.

Lead with:

- making hiring easier and less confusing
- learning how real people decide to trust and book chefs
- short time commitment
- no sales call required

Do not lead with:

- long product explanation
- startup language
- too many feature names
- vague "help us innovate" messaging

The message should feel like:

`We're learning what actually makes hiring a private chef feel easy, trustworthy, and worth booking.`

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
- obvious low-quality or contradictory responses

### Weekly Review

Segment results by:

- experience level
- event type
- geography
- channel source

Primary outputs:

1. top trust and booking barriers by segment
2. portal/quote/payment comfort by segment
3. discovery-channel patterns by segment
4. menu-collaboration preferences by segment
5. best acquisition channels for serious respondents

Treat experienced buyers as the highest-confidence behavioral signal.
Treat serious considerers as directional signal.
Treat curious-only respondents as low-weight exploratory signal.

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

- warm-channel completion rate should be at least `65%`
- community-channel completion rate should be at least `40%`
- median completion time should stay under `6 minutes`
- qualified response rate should stay above `75%`

If the survey misses these thresholds, revise it before broader scale.

---

## Qualification Rules

A response counts as qualified if:

1. respondent is an actual buyer, serious considerer, or clearly relevant prospect
2. the screener and core experience answers are complete
3. the response is not obviously spam, contradictory, or careless

This matters because total submissions are less important than usable buyer signal.

---

## Privacy And Safety Rules

1. The main survey remains anonymous.
2. Follow-up identity capture happens in a separate opt-in form.
3. Do not ask for exact home address, exact spend, or personally identifying event details.
4. Treat exports as internal research material.
5. If results are shared externally, share only aggregated and redacted summaries.
6. Do not promise finished product capabilities that do not exist yet.
7. Keep respondent-visible response summaries off.
8. Keep edit-after-submit off unless a later spec explicitly changes that rule.

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

At the time this fallback was drafted, the repo already included token-based survey and feedback surfaces such as:

- `app/(client)/survey/[token]`
- `lib/surveys/*`
- `lib/feedback/*`

That was the earlier rationale for choosing an external shortcut first.

Historical reasons:

1. the first-wave requirement is speed, not platform purity
2. Google Forms was already close to launch
3. the earlier product-facing survey flows were better for owned, identified, or post-event use cases
4. the immediate job was broad market-validation signal, not deeper in-product instrumentation

Current state:

- this rationale is no longer the active execution choice
- the internal ChefFlow survey path is now the canonical wave-1 path
- keep this section only to explain why the fallback docs exist

---

## Historical Follow-Up Logic

If the fallback external wave had produced useful signal, the next spec would have decided whether to:

1. mirror the winning client survey into the internal survey system
2. create follow-up cohorts for experienced buyers and serious considerers
3. route opted-in respondents into interview or pilot pipelines

That fallback follow-up phase would only have begun after the external survey proved:

- which respondent segments matter most
- which questions actually produce signal
- which channels deliver qualified respondents

---

## Out of Scope

This spec does not include:

- OpenClaw-powered targeting or outreach
- new public product surfaces
- custom survey app development
- CRM implementation
- email automation implementation
- incentive fulfillment workflow implementation
- paid-media creative production

---

## Notes For The Builder / Operator

Do not start the active builder workflow from this document.

1. Treat `docs/research/survey-client.md` as the master question bank, not the launch form.
2. Treat `docs/research/surveys-google-forms-ready.md` as the starting draft, not the locked operating version.
3. The first live form should be shorter than the current draft.
4. The main survey and the follow-up capture form must be separate.
5. The first launch objective is learning quality, not vanity reach.
6. For the current execution order, return to `docs/research/current-builder-start-handoff-2026-04-02.md`.

---

## Archive Rule

If the survey is materially revised after real distribution begins, create a dated follow-up execution note instead of silently rewriting this spec.
