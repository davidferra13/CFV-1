---
name: persona-stress-test
description: Deterministic persona-based stress test against ChefFlow. Accepts any persona (chef, client, vendor, farm, guest, staff), simulates their full workflow, audits every capability, scores the system, and extracts actionable gaps. Checks the registry to avoid re-testing known personas. Use when evaluating product-market fit, onboarding readiness, or system completeness for a specific user type.
user-invocable: true
---

# PERSONA STRESS TEST (System Evaluation Engine)

Run a deterministic, structured stress test of ChefFlow against one or more user personas. Every claim must cite file paths and line numbers. No assumptions. No politeness. No vague suggestions.

**Treat every persona as a real, active, revenue-impacting user who signed up today.**

---

## THE SCOPE GUARD (READ THIS FIRST)

This skill evaluates how well ChefFlow serves a persona. It does NOT reshape ChefFlow to serve that persona.

**The difference:**

| Correct use                                                           | Wrong use                                                     |
| --------------------------------------------------------------------- | ------------------------------------------------------------- |
| "ChefFlow's event model doesn't fit catering BEOs" (gap identified)   | "We should rebuild the event model around BEOs" (scope drift) |
| "A vendor has no portal to receive purchase orders" (missing surface) | "We need a full vendor management platform" (new product)     |
| "Meal prep chefs need delivery tracking" (unserved need)              | "Build a delivery logistics system" (scope explosion)         |

**Rules:**

1. **Identify gaps, don't prescribe pivots.** The skill surfaces what's missing. The developer decides what to build.
2. **Classify every gap as EXPAND, REFINE, or OUT-OF-SCOPE:**
   - **EXPAND** = ChefFlow's existing architecture can absorb this with additive work (new fields, new tab, new component). The gap is a natural extension of what already exists.
   - **REFINE** = The feature exists but needs polish, better defaults, or UX adjustment for this persona. No new architecture.
   - **OUT-OF-SCOPE** = Serving this need would require a fundamentally different product. Flag it, don't plan it.
3. **Never recommend removing or restructuring existing features** to serve a non-primary persona. ChefFlow serves solo private chefs first. Everything else is additive.
4. **A persona scoring low is not a problem to solve.** It's information. Some personas are not ChefFlow's users. That's fine. The score documents the fit, not the obligation.
5. **Duplicate findings across personas are the highest-value signal.** If 4 personas all hit the same wall, that wall matters. If only one persona hits it, it might just mean they're not the target user.

---

## PERSONA TYPES

A persona is anyone who touches ChefFlow. Not just chefs. The system has many surfaces and many stakeholders.

| Type        | Folder     | Examples                                                                                                                                                                                                                                                    | Primary ChefFlow Surface                                   |
| ----------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **Chef**    | `Chef/`    | Solo private chef, meal prep specialist, catering lead, farm-to-table chef, grazing board artist, food truck operator, cannabis chef, estate chef, personal/family chef, pop-up chef, supper club host, culinary instructor, food stylist, recipe developer | Chef OS (`/dashboard`, `/events`, `/recipes`, etc.)        |
| **Client**  | `Client/`  | Home dinner host, corporate planner, wedding client, repeat customer, first-time booker, family chef employer, vacation rental host, event coordinator, restaurant buyer (private dining), holiday party organizer                                          | Client portal (`/my-events`, `/my-quotes`), public booking |
| **Guest**   | `Guest/`   | Dinner guest, event attendee, dietary-restricted guest, plus-one, child guest, VIP guest, guest with accessibility needs, remote/virtual event attendee                                                                                                     | Hub (`/hub/me/`), public event pages                       |
| **Vendor**  | `Vendor/`  | Ingredient supplier, specialty purveyor, farm/CSA, fishmonger, butcher, bakery, beverage distributor, equipment rental company, linen service, ice supplier, florist (event), cleaning service                                                              | No direct portal (evaluate gap)                            |
| **Staff**   | `Staff/`   | Sous chef, prep cook, line cook, pastry cook, server, bartender, kitchen manager, event captain, delivery driver, dishwasher, food runner, intern/extern, freelance cook                                                                                    | Staff portal, stations, tasks                              |
| **Partner** | `Partner/` | Farm co-host, venue owner, referral partner, event planner (external), photographer, sommelier, florist (collaborative), rental company, food blogger/influencer, culinary school, tourism board, wedding planner                                           | Circles, public pages, co-host surfaces                    |
| **Public**  | `Public/`  | Google searcher, social media follower, word-of-mouth referral, food blog reader, local foodie, someone browsing for gift ideas, journalist/press, competitor researching                                                                                   | Public pages (`/chefs`, `/book`, `/e/[token]`)             |

The skill adapts its evaluation surface to the persona type. A vendor stress test evaluates different routes than a chef stress test.

---

## INVOCATION

**Queue mode (primary workflow):**

```
/persona-stress-test queue
```

Processes all files in `Chef Flow Personas/Uncompleted/` one at a time. See QUEUE RUNNER below.

**Single persona (ad hoc):**

```
/persona-stress-test <persona description or name>
```

**Single file:**

```
/persona-stress-test file:Chef Flow Personas/Uncompleted/Chef/meal-prep-maria.txt
```

**Re-test a registered persona (after system changes):**

```
/persona-stress-test retest:<registry-label>
```

**Persona input format:** A persona is any description of a ChefFlow user that includes at minimum: (1) what they do, (2) how they operate, (3) what they need from the platform. Can be a name + role, a paragraph, or a structured profile. The agent will parse whatever is provided. Text files, markdown, or plain prose all work.

---

## QUEUE RUNNER (Primary Processing Mode)

The persona queue lives at `Chef Flow Personas/`. Structure:

```
Chef Flow Personas/
  Uncompleted/          <-- INPUT: drop persona files here
    Chef/
    Client/
    Guest/
    Vendor/
    Staff/
    Partner/
    Public/
  Completed/            <-- OUTPUT: processed files land here
    Chef/
    Client/
    Guest/
    Vendor/
    Staff/
    Partner/
    Public/
  Failed/               <-- ERROR: files that couldn't be processed
```

**Queue execution rules (strict):**

1. **List all files** in `Uncompleted/` across all type folders. Sort by type folder, then alphabetically.
2. **Take the first file.** Read it. Do not load anything else from the queue.
3. **Determine persona type** from the folder it's in (Chef/, Client/, etc.).
4. **Run the full 8-phase pipeline** on this one persona.
5. **On success:**
   - Save report to `docs/stress-tests/persona-[label]-[date].md`
   - Update the registry (`docs/stress-tests/REGISTRY.md`)
   - Move the source file from `Uncompleted/[Type]/` to `Completed/[Type]/`
   - Report score and top 3 findings to user
6. **On failure** (persona too thin, pipeline error, anti-loop triggered):
   - Move the source file to `Failed/`
   - Write a 1-line reason into the file header: `[FAILED: reason]`
   - Report the failure, continue to next file
7. **Ask the user:** "Continue to next persona? (Y/n)"
   - If yes, go to step 1
   - If no, stop and report queue status
8. **Never process the same file twice.** If a file is in `Completed/` or `Failed/`, skip it.
9. **Never load the full queue into memory.** List files, pick one, process it, repeat.

**Queue status report (shown after each persona and at the end):**

```
QUEUE STATUS
============
Processed this session: [N]
Remaining in queue:     [N]
Failed this session:    [N]
Next up:                [filename] ([type])
```

---

## EXECUTION PIPELINE (8 Phases, Strictly Sequential)

### PHASE 0: REGISTRY CHECK + CONTEXT LOAD

**Step 1: Check the registry.** Read `docs/stress-tests/REGISTRY.md`. If this persona (or a close match) has been tested before:

- Report the prior test date, score, and key findings
- Ask: "This persona was tested on [date] (score: [X]/100). Run again to check for improvements, or skip?"
- If retesting, the report must include a **DELTA** section comparing old vs new scores

If no match, proceed.

**Step 2: Load system truth.** Before evaluating anything:

1. Read `docs/product-blueprint.md` (what ChefFlow claims to do)
2. Read `docs/app-complete-audit.md` (what actually exists in the UI)
3. Read `docs/service-lifecycle-blueprint.md` (the 10-stage engagement model)
4. Read `lib/billing/feature-classification.ts` (free vs paid surface)
5. Read relevant `project-map/` files for feature areas the persona would touch
6. Read `docs/specs/universal-interface-philosophy.md` (UI contract)

**Do not proceed until all sources are loaded.** These are the ground truth. Every evaluation is measured against them, not against what you "think" exists.

### PHASE 1: PERSONA PARSE

Extract a structured persona profile from the input. Output exactly this structure:

```
PERSONA PROFILE
===============
Name/Label:        [assigned identifier]
Type:              [chef|client|guest|vendor|staff|partner|public]
Role:              [specific food service role]
Business Model:    [how they make money / how they engage with food service]
Scale:             [clients/events per month, team size, revenue range]
Tech Comfort:      [low / medium / high]
Current Tools:     [what they use today instead of ChefFlow]
Top 3 Pain Points: [what keeps them up at night]
Deal-Breakers:     [what would make them abandon the platform]
Success Metric:    [how they would judge ChefFlow as "worth it"]
ChefFlow Surface:  [which routes/portals this persona would primarily use]
```

If the input is sparse, infer reasonable defaults from domain knowledge but flag every inference with `[inferred]`. Do not invent fictional details; leave fields as `[unknown]` if truly unknowable.

### PHASE 2: WORKFLOW SIMULATION

Map the persona's real-world workflow onto ChefFlow's feature surface. Walk through their **entire operational cycle**, not just the features they would "like."

**For chef-type personas:** Use `service-lifecycle-blueprint.md` (10 stages).
**For client-type personas:** Use the client journey (discover -> book -> plan -> attend -> review -> re-book).
**For vendor/staff/partner/public:** Define the persona's natural workflow first, then map it.

For each stage:

1. **What this persona does at this stage** (real-world action)
2. **What ChefFlow offers** (specific route, page, component; cite file path)
3. **Gap analysis** (what's missing, broken, or awkward)
4. **Friction score** (0 = seamless, 1 = minor annoyance, 2 = workaround needed, 3 = impossible)

Also simulate these cross-cutting workflows:

- **First 10 minutes:** What happens when they sign up / land on their first page? Can they orient?
- **First day:** Can they enter their existing data or accomplish their first task?
- **First week:** Can they run their actual workflow through ChefFlow?
- **First month:** Is there enough value to stay? Or do they drift back to whatever they used before?

### PHASE 3: CAPABILITY AUDIT

Classify every relevant ChefFlow feature area against this persona. Use only these three ratings:

| Rating        | Definition                                                                          | Criteria                                                                    |
| ------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **SUPPORTED** | Feature exists, works, and fits this persona's workflow without modification        | Route exists, tested, persona can use it as-is                              |
| **PARTIAL**   | Feature exists but has gaps, friction, or missing sub-capabilities for this persona | Route exists but missing fields, wrong defaults, extra steps, or unclear UX |
| **MISSING**   | Feature does not exist or is so misaligned it provides zero value to this persona   | No route, no component, or fundamentally wrong model                        |

**For chef-type personas, audit these 12 domains:**

1. **Onboarding & Setup** - account creation, profile, initial data entry
2. **Client Management** - CRM, contacts, preferences, history
3. **Inquiry Pipeline** - leads, quotes, proposals, booking flow
4. **Event Lifecycle** - creation, planning, execution, completion
5. **Menu & Recipe** - menu building, recipe management, dietary handling
6. **Culinary Ops** - ingredients, costing, prep, stations, inventory
7. **Financial** - invoicing, expenses, payments, ledger, reporting, tax
8. **Calendar & Scheduling** - time management, availability, conflicts
9. **Communication** - email, notifications, client messaging
10. **Staff & Team** - if applicable; task delegation, scheduling
11. **Analytics & Intelligence** - dashboards, insights, CIL signals
12. **Public Presence** - booking page, chef profile, discoverability

**For non-chef personas, adapt the domain list** to match their actual interaction surface. A client doesn't need "Culinary Ops" but does need "Booking Experience," "Payment Flow," "Event Visibility," etc. Define the relevant domains before auditing.

For each domain, output:

```
[DOMAIN NAME] - [SUPPORTED|PARTIAL|MISSING]
  Evidence: [file path + what exists]
  Gap: [what's missing for THIS persona]
  Impact: [how this gap affects their daily work]
```

### PHASE 4: FAILURE MAP

Identify every point where ChefFlow would **fail this persona**. Not "could be better" but "would cause them to stop using the platform, lose money, or make a mistake."

Categories:

- **BLOCKER**: Cannot accomplish a core business task. Would prevent adoption.
- **MONEY RISK**: Could cause financial error, missed invoice, wrong pricing, lost revenue.
- **DATA DEAD-END**: Information goes in but has no useful output. Effort with no payoff.
- **TRUST VIOLATION**: System displays wrong information, fake success, or misleading state (Zero Hallucination violations).
- **WORKFLOW BREAK**: Persona's natural sequence is interrupted; they must leave ChefFlow to complete a step.

For each failure:

```
[CATEGORY] [severity: critical|high|medium]
  What: [specific failure]
  Where: [file path / route]
  Persona impact: [what happens to this person's business]
  Required fix: [build-level detail, not a suggestion; name the file, the component, the action]
  Scope class: [EXPAND|REFINE|OUT-OF-SCOPE]
```

### PHASE 5: REQUIRED ADDITIONS

List everything ChefFlow would need to build to fully serve this persona. Organized by effort:

**Quick Wins (< 2 hours each):**

- [addition] - [which file to modify] - [what it unblocks] - [EXPAND|REFINE]

**Medium Builds (2-8 hours each):**

- [addition] - [files involved] - [what it unblocks] - [EXPAND|REFINE]

**Large Builds (> 8 hours each):**

- [addition] - [scope description] - [what it unblocks] - [spec needed: yes/no] - [EXPAND|REFINE]

**Out-of-Scope (documented, not planned):**

- [need] - [why it's out of scope] - [what the persona would need to do instead]

Each addition must reference which Phase 4 failure it resolves. No orphan suggestions.

### PHASE 6: SYSTEM BEHAVIOR REQUIREMENTS

Define behavioral expectations that ChefFlow must meet for this persona. These are not features; they are system-level behaviors.

Format:

```
BEHAVIOR: [name]
  Rule: [what the system must do or never do]
  Trigger: [when this behavior activates]
  Violation example: [what a failure looks like]
  Test: [how to verify this behavior works]
```

Examples of behavior types: default values, navigation priority, notification timing, data visibility rules, role-based access, onboarding sequence, empty-state messaging.

### PHASE 7: SCORING

Score the system on 6 dimensions. Each dimension is 0-100. The final score is a weighted average.

| Dimension                | Weight | What It Measures                                                         |
| ------------------------ | ------ | ------------------------------------------------------------------------ |
| **Workflow Coverage**    | 30%    | Can this persona complete their full operational cycle in ChefFlow?      |
| **Data Model Fit**       | 20%    | Does ChefFlow's data structure capture what this persona needs to track? |
| **UX Alignment**         | 15%    | Does the interface match how this persona thinks and works?              |
| **Financial Accuracy**   | 15%    | Can this persona trust ChefFlow with their money?                        |
| **Onboarding Viability** | 10%    | Can this persona get value within their first session?                   |
| **Retention Likelihood** | 10%    | Will this persona still be using ChefFlow in 30 days?                    |

**Scoring rubric (each dimension):**

| Score  | Label         | Meaning                                                                    |
| ------ | ------------- | -------------------------------------------------------------------------- |
| 0-29   | **BROKEN**    | Fundamental mismatch. This persona cannot use ChefFlow for this.           |
| 30-49  | **HOSTILE**   | Technically possible but the experience actively pushes users away.        |
| 50-69  | **USABLE**    | Works with significant workarounds. Persona tolerates it, doesn't love it. |
| 70-84  | **STRONG**    | Fits well with minor gaps. Persona would recommend with caveats.           |
| 85-94  | **EXCELLENT** | Near-complete fit. Gaps are cosmetic or edge-case.                         |
| 95-100 | **COMPLETE**  | This persona's workflow is fully served. No meaningful gaps.               |

**Scoring rules:**

- A BLOCKER failure in Phase 4 caps Workflow Coverage at 49 max.
- A MONEY RISK failure caps Financial Accuracy at 59 max.
- More than 3 MISSING domains in Phase 3 caps the final score at 49 max.
- More than 5 PARTIAL domains caps the final score at 69 max.
- Every score must include a 1-sentence justification referencing specific evidence.

---

## CROSS-PERSONA SYNTHESIS (Batch Mode Only)

When running multiple personas, produce this additional section after all individual reports:

### Pattern Extraction

```
CROSS-PERSONA PATTERN: [name]
  Affected personas: [which ones]
  Root cause: [what in ChefFlow causes this]
  System-level fix: [one fix that resolves it for all affected personas]
  Priority: [critical|high|medium] based on persona count x severity
  Scope class: [EXPAND|REFINE|OUT-OF-SCOPE]
```

### Shared Gap Matrix

A table showing which gaps appear across multiple personas:

```
| Gap                    | Persona A | Persona B | Persona C | Fix Once? | Scope |
|------------------------|-----------|-----------|-----------|-----------|-------|
| [gap description]      | X         |           | X         | Yes       | EXPAND |
```

### Foundational Weakness Report

Identify system-level weaknesses that are not persona-specific but were exposed by the stress test:

- Architecture limitations
- Data model gaps
- Missing abstractions
- Scaling concerns
- Onboarding assumptions that break for non-primary personas

Each must cite the personas that exposed it and the specific failure that revealed it.

### Deduplication Check

Before listing required additions, verify:

- Is this already in `docs/product-blueprint.md` as planned?
- Is there already a spec in `docs/specs/` for this?
- Is this already built but not wired to navigation?

Flag duplicates. Do not recommend building what already exists or is already planned.

---

## SATURATION TRACKING

After every run, update the registry's saturation metrics:

```
SATURATION STATUS
=================
Total personas tested: [N]
Unique gaps found: [N]
Gaps found by last 3 personas: [N]
New gaps per persona (rolling avg): [N]
Saturation estimate: [low|medium|high|saturated]
```

**Saturation thresholds:**

- **Low** (< 10 personas tested, or > 5 new gaps per persona): keep testing aggressively
- **Medium** (10-20 personas, 2-5 new gaps per persona): testing is productive but slowing
- **High** (20+ personas, 1-2 new gaps per persona): most gaps found; target underrepresented persona types
- **Saturated** (< 1 new gap per persona for 3 consecutive runs): persona testing has diminishing returns; shift to depth work on known gaps

When saturation is high, the skill should recommend which persona _types_ are underrepresented in the registry and suggest specific personas to test next.

---

## ANTI-FAILURE CONSTRAINTS (Mandatory)

These rules prevent the agent from producing a useless report:

1. **NO ASSUMPTIONS.** Every capability claim must cite a file path. "I believe ChefFlow has..." is a failed report. Read the code or read the audit.
2. **NO VAGUE SUGGESTIONS.** "Consider adding better onboarding" is not actionable. Name the file, the component, the route, and the change.
3. **NO POLITENESS BIAS.** Do not soften failures. If the system fails the persona, say it fails. Do not frame blockers as "opportunities."
4. **NO FEATURE INVENTION.** Only evaluate what exists. Do not credit ChefFlow for features that are specced but not built, unless explicitly noting "specced, not built."
5. **PERSONA IS REAL.** Treat the persona as a real person who will sign up, enter real data, and judge ChefFlow against competitors. Not a thought experiment.
6. **REVENUE LENS.** Every gap must be evaluated through: "Does this cost the persona money, cost ChefFlow a customer, or both?"
7. **VERIFY AGAINST GROUND TRUTH.** Cross-reference `docs/app-complete-audit.md` for every UI claim. Cross-reference `lib/billing/feature-classification.ts` for every tier claim. Do not guess.
8. **NO DUPLICATE RECOMMENDATIONS.** Before recommending a build, check `docs/specs/` and `docs/product-blueprint.md`. If it's already planned, say so and move on.
9. **NO SCOPE DRIFT.** Every recommendation must be classified as EXPAND, REFINE, or OUT-OF-SCOPE. Never recommend restructuring ChefFlow's core to serve a non-primary persona. See the Scope Guard.
10. **REGISTRY AWARENESS.** Check the registry before running. Do not re-test a persona without acknowledging prior results. Track deltas.

---

## OUTPUT FORMAT (Locked)

Every run produces this exact structure. No sections may be omitted or reordered.

```
# PERSONA STRESS TEST: [Persona Label]
## Generated: [date]
## Prior test: [date and score if retesting, or "First run"]

## 1. PERSONA PROFILE
[Phase 1 output]

## 2. WORKFLOW SIMULATION
[Phase 2 output - lifecycle stage walkthrough + first 10min/day/week/month]

## 3. CAPABILITY AUDIT
[Phase 3 output - domains rated and evidenced]

### Capability Summary
| Domain | Rating | Key Gap |
|--------|--------|---------|

## 4. FAILURE MAP
[Phase 4 output - categorized, severity-tagged, scope-classified failures]

### Failure Summary
| Category | Critical | High | Medium |
|----------|----------|------|--------|
| BLOCKER  |          |      |        |
| MONEY RISK |        |      |        |
| DATA DEAD-END |     |      |        |
| TRUST VIOLATION |   |      |        |
| WORKFLOW BREAK |    |      |        |

## 5. REQUIRED ADDITIONS
[Phase 5 output - quick wins, medium, large, out-of-scope]

## 6. SYSTEM BEHAVIOR REQUIREMENTS
[Phase 6 output - behavioral rules]

## 7. SCORE
[Phase 7 output - 6 dimensions + weighted final]

### Score Card
| Dimension | Score | Justification |
|-----------|-------|--------------|
| Workflow Coverage (30%) | | |
| Data Model Fit (20%) | | |
| UX Alignment (15%) | | |
| Financial Accuracy (15%) | | |
| Onboarding Viability (10%) | | |
| Retention Likelihood (10%) | | |
| **FINAL SCORE** | **[X]/100** | **[label]** |

## 8. VERDICT
[2-3 sentences. Would this persona succeed on ChefFlow today? What is the single highest-impact change?]

## 9. DELTA (Retest only)
| Dimension | Previous | Current | Change |
|-----------|----------|---------|--------|
[dimension-by-dimension comparison]
[What improved. What regressed. What's still broken.]
```

For batch mode, append:

```
---

# CROSS-PERSONA SYNTHESIS

## Shared Patterns
[pattern extraction with scope classification]

## Gap Matrix
[shared gap table]

## Foundational Weaknesses
[system-level issues]

## Deduplicated Build List
[merged, deduplicated required additions across all personas]

## Saturation Status
[saturation metrics update]
```

---

## REPORT DESTINATION

Save the report to: `docs/stress-tests/persona-[label]-[date].md`

Create the `docs/stress-tests/` directory if it does not exist.

In batch mode, save individual reports AND the synthesis document:

- `docs/stress-tests/persona-[label]-[date].md` (per persona)
- `docs/stress-tests/batch-synthesis-[date].md` (cross-persona)

---

## REGISTRY UPDATE (Mandatory After Every Run)

After generating the report, update `docs/stress-tests/REGISTRY.md`:

1. Add or update the persona entry in the registry table
2. Update the saturation metrics
3. Update the gap inventory (new unique gaps only)
4. Update the coverage heat map

The registry is the persistent memory of this skill. It survives across sessions. It is the first thing checked on every run.

---

## COMPLETION

After generating the report:

1. Summarize the final score and top 3 failures to the user
2. If any BLOCKER failures exist, flag them prominently
3. Update the registry
4. Do NOT auto-create specs or start building. The report is the deliverable.
5. If in batch mode, highlight the cross-persona patterns first since those have the highest ROI
6. If saturation is high, recommend which persona types to test next
