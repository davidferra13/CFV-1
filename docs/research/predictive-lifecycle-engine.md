# Research: Predictive Lifecycle Engine

> **Date:** 2026-03-30
> **Question:** How can the system anticipate the next move at every stage of the chef-client interaction, so the chef is always prepared and never reactive?
> **Status:** complete
> **Builds on:** `docs/service-lifecycle-blueprint.md`, `lib/lifecycle/critical-path.ts`, `docs/specs/service-lifecycle-intelligence.md`

## Summary

The prediction engine is a rules-based layer on top of the lifecycle checkpoint tracker. At every stage, the system evaluates what is known, applies deterministic prediction rules ("if X then Y"), and surfaces: (1) what the chef should prepare next, (2) what the client is likely to ask or need, and (3) when to nudge vs. when to wait. The Dinner Circle fundamentally changes the prediction problem: instead of guessing what email to send, the system predicts what to prepare and when to nudge the client back to the portal.

## Core Principle: If We Know This, We Know That

Every prediction rule follows the pattern: given a set of known facts, a specific next action or outcome becomes predictable with high confidence. These are not AI guesses. They are deterministic rules derived from 10+ years of private chef engagement patterns.

The rules are organized by lifecycle stage. Each rule has:

- **Trigger:** what facts must be known
- **Prediction:** what happens next / what to prepare
- **Action:** what the system should do (surface to chef, auto-draft, auto-prepare, nudge client)
- **Confidence:** how reliable this prediction is (high/medium/low)

---

## Stage 1: Inquiry Received

The first message reveals intent. Speed of response is the #1 predictor of close rate.

| #    | If we know...                                              | Then we predict...                                                     | System action                                                            | Confidence |
| ---- | ---------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------ | ---------- |
| 1.1  | Date + guest count + dietary all present                   | Client is ready for pricing. Skip deep discovery.                      | Surface "fast-track" flag. Pre-calculate quote range.                    | High       |
| 1.2  | Date + guest count, NO dietary                             | Next communication must ask about dietary/allergies.                   | Auto-draft dietary question. Block quote generation until answered.      | High       |
| 1.3  | Only name + "interested in hiring a chef"                  | Client is browsing. Needs warm discovery, not a price sheet.           | Queue discovery-style response template.                                 | High       |
| 1.4  | Occasion = wedding or corporate                            | Multi-month timeline. Tasting dinner likely. Contract required.        | Flag as "complex engagement." Enable Stage 4 checkpoints by default.     | High       |
| 1.5  | Occasion = birthday/anniversary, < 12 guests               | Fast-track engagement. Could go inquiry-to-service in < 2 weeks.       | Suggest streamlined workflow. Disable Stage 4 checkpoints.               | High       |
| 1.6  | Guest count > 20                                           | Staff needed. Equipment needs grow.                                    | Auto-add staff line item to quote template. Flag equipment checklist.    | High       |
| 1.7  | Source = referral                                          | Higher close rate (~2x). Referrer already sold the chef.               | Move faster. Shorter discovery. Prioritize in queue.                     | Medium     |
| 1.8  | Source = third-party platform (Yhangry, Take a Chef, etc.) | Price-sensitive client. Already comparing chefs.                       | Response speed is critical. Flag for immediate reply.                    | Medium     |
| 1.9  | No chef response in 24 hours                               | Close probability drops ~30%.                                          | Escalate on dashboard. Auto-draft nudge to chef (not client).            | High       |
| 1.10 | Client provided specific dish names in first email         | They know what they want. Discovery can focus on logistics, not taste. | Populate `discussed_dishes`. Flag "menu-ready" for Stage 5 acceleration. | High       |

---

## Stage 2: Discovery

The information-gathering phase. The Dinner Circle changes this from "email ping-pong" to "shared workspace where both parties fill in gaps."

| #   | If we know...                                              | Then we predict...                                             | System action                                                               | Confidence |
| --- | ---------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------- | ---------- |
| 2.1 | Dietary = complex (multiple severe allergies)              | Menu planning takes 2x longer. Need direct guest confirmation. | Flag "confirm dietary directly with guests." Extend menu timeline.          | High       |
| 2.2 | Client mentions specific dishes by name                    | They know what they want. Draft menu around their dishes.      | Fuzzy-match against recipe book. Pre-populate menu draft skeleton.          | High       |
| 2.3 | Client mentions a budget number                            | Ready for quote once course count is confirmed.                | Pre-calculate pricing tiers that fit budget. Surface tier comparison.       | High       |
| 2.4 | Client asks about service styles/plating                   | Detail-oriented client. Expect 3+ revision rounds on menu.     | Extend timeline estimates. Flag "high-touch client."                        | Medium     |
| 2.5 | Kitchen = limited/outdoor/no oven                          | Equipment list needed. Setup time increases 30-60 min.         | Auto-generate equipment checklist. Factor extra time into pricing.          | High       |
| 2.6 | Client hasn't responded in 3 days                          | Busy or cooling off. Don't send another question.              | Send something of value instead (menu idea, photo of similar dinner).       | Medium     |
| 2.7 | All critical path items 1-7 are confirmed                  | Discovery is complete. Ready for quote.                        | Auto-flag "discovery complete." Surface "Generate Quote" action.            | High       |
| 2.8 | Client is active on the Dinner Circle (viewed in last 48h) | They're engaged. No email nudge needed.                        | Suppress email reminders. Chef can post updates directly to circle.         | High       |
| 2.9 | Client has NOT visited the Dinner Circle                   | Portal transition hasn't worked yet. Stay in email mode.       | Continue Version A emails. Re-attempt portal hook with next value delivery. | Medium     |

---

## Stage 3: Quote

The moment of truth. Price presentation determines whether the engagement continues.

| #   | If we know...                                  | Then we predict...               | System action                                                             | Confidence |
| --- | ---------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------- | ---------- |
| 3.1 | Quote accepted same day                        | Fast close. Don't lose momentum. | Auto-surface "Send Agreement" or "Send Deposit Invoice" action.           | High       |
| 3.2 | No response in 48 hours                        | Follow-up needed.                | Auto-draft gentle nudge email. Surface on dashboard as "needs follow-up." | High       |
| 3.3 | Client asks for revisions                      | Expect 1-2 more rounds.          | Prepare revised quote template. Track revision count.                     | Medium     |
| 3.4 | Quote exceeds stated budget by > 20%           | High risk of loss.               | Auto-generate tiered alternative (3-course vs 5-course). Surface to chef. | High       |
| 3.5 | Deposit not paid within 72 hours of acceptance | Client cooling off or forgot.    | Auto-draft deposit reminder with soft deadline.                           | High       |
| 3.6 | Client's budget aligns within 10% of quote     | High close probability.          | Start menu planning in parallel. Don't wait for formal acceptance.        | Medium     |

---

## Stage 4: Agreement

Most casual dinners skip this entirely. The system should know when to skip.

| #   | If we know...                               | Then we predict...             | System action                                                                | Confidence |
| --- | ------------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------- | ---------- |
| 4.1 | Guest count < 12, no corporate/wedding flag | Formal agreement not needed.   | Auto-skip Stage 4 checkpoints. Mark as "not applicable."                     | High       |
| 4.2 | Guest count > 20 OR corporate/wedding       | Full contract needed.          | Auto-generate contract from template. Surface for chef review.               | High       |
| 4.3 | Client is a repeat booker                   | Previous terms carry over.     | Skip agreement. Reference previous engagement terms.                         | High       |
| 4.4 | High-profile client or NDA mentioned        | Extra legal protection needed. | Flag for confidentiality clause. Require signed agreement before proceeding. | High       |

---

## Stage 5: Menu Planning

The Dinner Circle becomes the primary interface here, not email.

| #   | If we know...                                 | Then we predict...                                            | System action                                                               | Confidence |
| --- | --------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------- | ---------- |
| 5.1 | `discussed_dishes` has entries                | Start draft menu from those dishes. Don't start from scratch. | Pre-populate menu draft with discussed dishes. Fuzzy-match to recipes.      | High       |
| 5.2 | `selected_tier` is set (e.g., "3-course")     | Menu structure is locked. Just fill courses.                  | Constrain menu builder to selected tier.                                    | High       |
| 5.3 | All dietary restrictions confirmed            | Menu can be drafted with full confidence.                     | Remove "pending dietary" warnings from menu builder.                        | High       |
| 5.4 | Client hasn't viewed menu on circle in 3 days | They might not have seen it.                                  | Auto-draft "your menu is ready to review" email with circle link.           | Medium     |
| 5.5 | Client viewed menu but didn't respond         | They're thinking. Don't push.                                 | Suppress nudge for 48 more hours. Show "viewed, awaiting feedback" to chef. | Medium     |
| 5.6 | Client left feedback on the circle            | Menu revision needed.                                         | Surface feedback to chef with "Revise Menu" action.                         | High       |
| 5.7 | Menu confirmed by host                        | Lock menu. Move to logistics.                                 | Auto-advance to Stage 6. Generate shopping list skeleton.                   | High       |

---

## Stage 6: Pre-Service Logistics

The prediction engine shifts from "what does the client need" to "what does the chef need to prepare."

| #   | If we know...                                    | Then we predict...                                                         | System action                                                              | Confidence |
| --- | ------------------------------------------------ | -------------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------- |
| 6.1 | Date is < 7 days away                            | Shopping list must be built NOW. Guest count must be locked.               | Urgent flag on dashboard. Block guest count changes without chef approval. | High       |
| 6.2 | Date is < 48 hours                               | Everything must be confirmed. No cascading changes.                        | Lock all fields. Surface final confirmation checklist.                     | High       |
| 6.3 | Guest count changed by > 3 since quote           | Portions need adjustment. Grocery list rebuild. Possible price adjustment. | Auto-recalculate. Surface "price adjustment needed?" to chef.              | High       |
| 6.4 | Kitchen was flagged as "limited"                 | Chef needs equipment checklist 3 days early, not 1.                        | Move equipment deadline forward. Auto-remind.                              | High       |
| 6.5 | Staff was sourced for this event                 | Staff briefing must happen 24 hours before.                                | Auto-schedule briefing reminder. Surface briefing checklist.               | High       |
| 6.6 | Grocery budget was approved (pass-through model) | Shopping can proceed.                                                      | Surface "Ready to Shop" action with budget and list.                       | High       |

---

## Stage 7-10: Payment, Service Day, Post-Service, Retention

These stages are more operational than predictive, but key rules apply:

| #   | If we know...                                    | Then we predict...       | System action                                                | Confidence |
| --- | ------------------------------------------------ | ------------------------ | ------------------------------------------------------------ | ---------- |
| 7.1 | Event completed, no thank-you sent in 24 hours   | Relationship impact.     | Auto-draft thank-you referencing a specific moment.          | High       |
| 7.2 | Event completed, no review requested in 72 hours | Missing social proof.    | Auto-draft review request with direct link.                  | High       |
| 7.3 | Client was first-timer, no contact in 4 weeks    | Win-back window closing. | Auto-draft seasonal outreach. "We loved cooking for you..."  | Medium     |
| 7.4 | Client booked 2+ times                           | Classify as regular.     | Auto-populate preferences for next booking. Faster pipeline. | High       |
| 7.5 | Client booked 3+ times in 12 months              | VIP client.              | Flag for priority treatment. Anniversary acknowledgment.     | High       |
| 7.6 | Outstanding balance > 7 days past due            | Payment friction.        | Auto-draft polite payment reminder. Surface on dashboard.    | High       |

---

## How the Dinner Circle Changes the Prediction Problem

### Email model (old):

```
Chef needs info → sends email → waits 24-48h → client responds → chef parses →
asks follow-up → waits again → repeat 3-5x → finally has what's needed
```

Each round trip costs 2 messages and 24-48 hours. The chef must predict what to ask because each exchange is expensive. Getting it wrong means another 48-hour delay.

### Dinner Circle model (new):

```
Chef posts update to circle → client sees it at their own pace →
client updates their own info directly → chef sees it in real-time →
system shows what's still TBD → client fills it in when ready
```

Missing information costs zero messages. The circle shows what's TBD and the client self-serves. The prediction engine's job shifts from "what email to send" to "what to prepare next" and "when to nudge the client back to the circle."

### Key behavioral shift:

- **Email:** chef is reactive (waiting for responses, then acting)
- **Circle + predictions:** chef is proactive (system tells them what to prepare, client fills in gaps asynchronously)

### When to nudge vs. when to wait:

| Client behavior                                           | System response                                                       |
| --------------------------------------------------------- | --------------------------------------------------------------------- |
| Active on circle (viewed in last 48h)                     | No email needed. Chef posts updates to circle.                        |
| Not visited circle, but responded to last email < 48h ago | Patient. They're engaged via email. Try circle hook again next email. |
| No contact (email or circle) for 3+ days                  | Nudge needed. Send value, not a question.                             |
| No contact for 7+ days                                    | Escalate. Dashboard warning. Auto-draft re-engagement.                |
| Viewed circle but took no action                          | They're thinking. Suppress nudge for 48h.                             |

---

## Repeat Client Acceleration

For clients who have booked before, the prediction chain collapses dramatically:

**First booking:** 200+ checkpoints, 10 stages, weeks of discovery.
**Second booking:** System pre-fills from previous engagement:

- Same dietary (unless updated)
- Same address (probably, flag if different)
- Similar guest count (flag if > 30% different)
- Similar occasion type
- Previous menu as starting point
- Previous quote as pricing baseline (with confidence decay applied)

The prediction for repeat clients isn't "what do we need to find out" but rather "what changed since last time?"

Pre-fill rate by booking number:

- 1st booking: 0% (full pipeline)
- 2nd booking: ~60% pre-filled (dietary, address, preferences, pricing baseline)
- 3rd+ booking: ~80% pre-filled (add menu patterns, timing preferences, staff preferences)

---

## Open Design Questions

1. **Nudge delivery mechanism:** When the prediction engine says "follow up needed," what fires? Options: auto-draft email (chef approves), push notification, dashboard toast, Dinner Circle notification to client. Recommendation: auto-draft email + dashboard flag. Chef always approves before anything goes to the client.

2. **Dishes-to-recipe fuzzy match:** `discussed_dishes` is a flat string array. The recipe book has structured recipes. A fuzzy match ("Malai Soya Chaap" in inquiry maps to closest recipe) would accelerate menu planning. Recommendation: Ollama-powered fuzzy match, surfaced as suggestions, never auto-applied.

3. **Confidence threshold for auto-action:** The lifecycle detector has confidence scores (0-1). At what threshold does auto-detected data get auto-confirmed vs. flagged for chef review? Recommendation: >= 0.95 for field-present detections (auto-confirm), 0.7-0.94 for regex/text (flag for review), < 0.7 for Ollama (flag with low-confidence warning).

4. **Circle engagement tracking:** The system should know if the client viewed the circle page, when, and how long. This informs nudge timing. Recommendation: lightweight page view tracking (timestamp + duration) on circle pages. No cookies, no PII, just "token X viewed at time Y."

5. **Auto-action end state for repeat clients:** For 3rd+ booking regulars, should the system auto-generate the quote and menu draft without chef initiation? Recommendation: yes, but as a "review and approve" flow, never auto-sent. The chef sees "We prepared a draft based on Gunjan's previous bookings. Review?"

## Recommendations

- **Build the prediction rules as a deterministic engine** (no AI needed for the rules themselves). The rules are config, not code. Store them alongside the lifecycle templates so chefs can eventually customize thresholds. Tag: needs a spec.
- **Wire circle engagement tracking** into the nudge timing logic. Lightweight, privacy-respecting. Tag: quick fix (add view timestamp to hub_groups or a new table).
- **Add repeat-client pre-fill** to the inquiry creation flow. When a known client emails, auto-populate from their last engagement. Tag: needs a spec.
- **Surface "next action" on every inquiry card** on the dashboard. One line: "Ask about dietary" or "Menu ready for review" or "Follow up (3 days silent)." Tag: part of lifecycle intelligence spec.
