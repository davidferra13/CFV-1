# Codex Task: Persona Stress Test - Dr Julien Armand Michelin

## Objective

Evaluate ChefFlow's fitness for the following persona, then make ONLY the safe improvements identified.

## The Persona

**Chef Profile: “Dr. Julien Armand” — Michelin-Level Cannabis Tasting Chef (Dose-Precision, Fully Compliant, Pairing-Obsessed)**

I don’t run dinners.

I run **controlled dosing experiences at Michelin-level standards**.

Right now:

- I execute **6–10 course cannabis tasting menus**
- Guest count: **4–10 max**
- Every guest is:
  - Profiled
  - Dose-planned
  - Monitored

This is not novelty dining.
This is **pharmacologically aware culinary execution**.

The issue is not creativity.
The issue is **absolute control over chemistry, experience, legality, and documentation**.

---

### Primary Failure: No True Dose-Integrated Culinary System

The core problem is not infusion.

It is that **most systems treat cannabis as an add-on, not as a primary variable that must be controlled with precision**.

In my work:

- Cannabis is:
  - A measurable compound
  - A variable that affects outcome

There is no system that:

- Treats:
  - THC / CBD / terpene profiles
    As first-class data

---

### Structural Issue: No Molecule-Level Tracking

I need to track:

- Strain
- Source
- Batch
- Extraction method
- Potency (per mg)
- Terpene profile

Per ingredient.

There is no system that:

- Stores this at:
  - Ingredient level
  - Dish level
  - Course level

So:

- I track manually

---

### Dose Planning Breakdown

Each guest:

- Has a personalized dose curve

I design:

- A progressive experience across courses

Example:

- Course 1 → microdose
- Course 5 → peak
- Course 8 → taper

There is no system that:

- Maps:
  - Guest → dose → course

In a structured, reliable way

---

### Pairing Complexity (Critical)

I am pairing:

- Flavor
- Aroma
- Chemical effect

Example:

- Terpenes ↔ dish aromatics
- Fat content ↔ cannabinoid absorption

There is no system that:

- Models:
  - Culinary pairing + pharmacological interaction

So:

- I rely on:
  - personal knowledge
  - manual tracking

---

### Legal Compliance Layer

Everything must be:

- Fully compliant
- Fully traceable

I need to prove:

- What was used
- Where it came from
- Who consumed what
- At what dose

There is no system that:

- Generates:
  - Complete legal audit trails

Automatically

---

### Intake & Safety Failure

Before service:

Each guest must be:

- Profiled
- Screened

Including:

- Tolerance
- Medical considerations
- Prior experience

There is no:

- Structured intake system tied directly to dosing

---

### Real-Time Service Logging Gap

During service:

I need to log:

- What was served
- Exact dose delivered
- Guest response

In real time.

There is no:

- Live system that:
  - Tracks service events precisely

---

### Post-Event Traceability

After the dinner, I must be able to show:

- Full breakdown:
  - Ingredient → dose → guest

There is no:

- Complete, structured report generation

---

### Multi-Event Data Loss

Over time, I need:

- Data on:
  - What worked
  - What didn’t
  - Optimal dose curves

There is no:

- System aggregating this

---

### Visibility Failure: No Dose Dashboard

At any moment, I should see:

- Total cannabinoids per guest
- Progression through courses
- Remaining dose capacity

Instead:

- I calculate manually

---

### Psychological Model

I am:

- Precision-driven
- Risk-aware
- Control-obsessed

I do not tolerate:

- Untracked variables
- Unverified dosing
- Legal ambiguity

If it cannot be:

- measured
- documented
- proven

It does not belong in service.

---

### The Real Test

For this system to work under this profile, it must:

#### 1. Molecule-Level Ingredient Tracking

Track:

- Cannabinoids
- Terpenes
- Source data

---

#### 2. Per-Guest Dose Mapping

Link:

- Guest → tolerance → dose plan

---

#### 3. Course-Level Dose Control

Track:

- Exact mg per course
- Total progression

---

#### 4. Culinary + Chemical Pairing Engine

Model:

- Flavor + terpene interactions
- Absorption factors

---

#### 5. Full Compliance System

Generate:

- Audit-ready records

---

#### 6. Real-Time Service Logging

Capture:

- Every served item
- Every dose

---

#### 7. Post-Event Reports

Produce:

- Complete traceability

---

#### 8. Historical Optimization

Track:

- Patterns
- Outcomes
- Ideal experiences

---

### Pass / Fail Condition

**Pass:**

- Every dose is tracked
- Every variable is controlled
- Every event is defensible

→ The system becomes mission-critical

**Fail:**

- I:
  - Track manually
  - Risk inconsistency
  - Cannot prove compliance

→ The system is unusable

---

This is the **highest-control, highest-risk culinary environment**.

The system must **treat cannabis as a measurable system variable, not a feature**, or it fails entirely.

## Persona Type: Chef

## Instructions

### Step 1: Evaluate (READ ONLY - do not change any files yet)

Read these files to understand what ChefFlow currently offers:

- `docs/product-blueprint.md` (feature list and status)
- `docs/app-complete-audit.md` (every UI element that exists)
- `docs/service-lifecycle-blueprint.md` (the engagement model)
- `lib/billing/feature-classification.ts` (free vs paid features)

Based on the persona description, identify:

1. Which ChefFlow features this persona would use
2. Which features are missing or partially built for this persona
3. Which gaps are QUICK WINS (< 20 lines changed, existing files only)

### Step 2: Write the Report

Create file: `docs/stress-tests/persona-dr-julien-armand-michelin-2026-04-25.md`

The report MUST follow this exact structure:

# Persona Stress Test: Dr Julien Armand Michelin

## Generated: 2026-04-25

## Type: Chef

## Persona Summary

[2-3 sentence summary of who this person is and what they need]

## Capability Fit (rate each as SUPPORTED / PARTIAL / MISSING)

[List each relevant ChefFlow feature area and rate it]

## Top 5 Gaps

[The 5 most important things ChefFlow cannot do for this persona]
[For each: what's missing, which file would need to change, effort estimate]

## Quick Wins Found

[Changes under 20 lines that would improve the experience]
[For each: exact file, what to change, why]

## Score: X/100

[Workflow Coverage, Data Model Fit, UX Alignment, Financial Accuracy]
[Weighted final score with 1-sentence justification]

## Verdict

[2 sentences: would this persona succeed on ChefFlow today?]

### Step 3: Identify Build Follow-Up Work

Do not implement changes in this analysis pass. The local persona watcher launches a separate build agent after this report exists.
In the report, make the "Top 5 Gaps" and "Quick Wins Found" specific enough that a follow-up builder can safely choose one implementation slice.

### Step 4: Update the Registry

Append one row to the table in `docs/stress-tests/REGISTRY.md` under "## Persona Registry":

| #             | Label                     | Type | Date       | Score       | Method           | Report                                                              | Key Finding    |
| ------------- | ------------------------- | ---- | ---------- | ----------- | ---------------- | ------------------------------------------------------------------- | -------------- |
| {next_number} | Dr Julien Armand Michelin | Chef | 2026-04-25 | {score}/100 | Codex autonomous | `docs/stress-tests/persona-dr-julien-armand-michelin-2026-04-25.md` | {one sentence} |

## Scope

Only modify files within:

- docs/stress-tests/ (reports and registry)
- app/(chef)/ (UI text/labels only, no logic)
- app/(client)/ (UI text/labels only, no logic)
- app/(public)/ (UI text/labels only, no logic)
- components/ (UI text/labels only, no logic)

Do NOT modify:

- database/ (no migrations, no schema changes)
- lib/auth/ (no auth changes)
- lib/billing/ (no payment changes)
- lib/db/ (no database logic)
- lib/ai/ (no AI changes)
- app/(chef)/layout.tsx (no layout gates)
- Any server action file (no business logic)
- devtools/ (no self-modification)
- .claude/ (no skill/agent changes)

## Branch

codex/persona-dr-julien-armand-michelin

## Guardrails

These rules are mandatory. Violating any of them makes the task a failure.

- All monetary amounts in integer cents, never floats
- Every database query must be tenant-scoped
- No em dashes anywhere
- "OpenClaw" must never appear in UI text
- No @ts-nocheck in any new file
- No DROP TABLE, DROP COLUMN, DELETE, or TRUNCATE
- Wrap side effects in try/catch
- Use only existing component variants: Button (primary/secondary/danger/ghost), Badge (default/success/warning/error/info)
- AI must never generate recipes
- No forced onboarding gates

## Acceptance Criteria

- [ ] Report exists at `docs/stress-tests/persona-dr-julien-armand-michelin-2026-04-25.md`
- [ ] Report follows the exact structure above
- [ ] Registry row added to `docs/stress-tests/REGISTRY.md`
- [ ] No product code files modified
- [ ] No files modified outside scope directories
- [ ] No new files created (except the report)

## Context

Stack: Next.js 14, PostgreSQL (Drizzle ORM via postgres.js), Auth.js v5, Tailwind CSS, TypeScript.
Server actions with 'use server' for business logic. SSE for realtime. Local filesystem for storage.
ChefFlow is an operating system for food service professionals (primarily solo private chefs).
