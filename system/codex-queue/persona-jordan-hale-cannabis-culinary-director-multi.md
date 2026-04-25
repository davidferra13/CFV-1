# Codex Task: Persona Stress Test - Jordan Hale Cannabis Culinary Director Multi

## Objective

Evaluate ChefFlow's fitness for the following persona, then make ONLY the safe improvements identified.

## The Persona

**Chef Profile: “Jordan Hale” — Cannabis Culinary Director (Multi-Event, Multi-Chef, Compliance + Scale)**

I don’t just cook cannabis dinners.

I run:

- **Multiple cannabis dining experiences**
- Across:
  - Different chefs
  - Different locations
  - Different formats

Right now:

- I have:
  - **3 upcoming cannabis events**
  - **2 chefs executing under my direction**
  - A rotating group of repeat clients

This is not a single chef operation.
This is **a scaled, multi-operator cannabis dining system**.

---

### Primary Failure: No Centralized Cannabis Control System

The core problem is not execution.

It is that **cannabis dining systems do not scale cleanly across multiple chefs and events**.

Each chef:

- Interprets dosing differently
- Handles infusion differently
- Tracks differently

There is no:

- Unified system enforcing:
  - Consistency
  - Safety
  - Documentation

---

### Structural Issue: No Standardized Dosing Framework

Every event requires:

- Per-guest dose planning
- Per-course dose allocation

Problems:

- No shared system that:
  - Defines dosing standards
  - Applies them consistently

So:

- I manually:
  - Review
  - Adjust
  - Approve

---

### Multi-Chef Inconsistency

I manage:

- Multiple chefs

Problems:

- Each chef:
  - Works differently
  - Documents differently
  - Infuses differently

There is no:

- System enforcing:
  - Standard protocols

So:

- Risk increases with scale

---

### Guest Risk Management

Guests:

- Have different tolerances

Problems:

- No centralized system that:
  - Tracks guest history across events

So:

- I:
  - Re-profile repeatedly
  - Risk inconsistent dosing

---

### Compliance Fragmentation

Each event must be:

- Legally defensible

Problems:

- Documentation is:
  - Manual
  - Inconsistent
  - Chef-dependent

There is no:

- Standard audit trail

---

### Event Data Loss

After events:

- Data disappears

I lose:

- Dose outcomes
- Guest reactions
- Event performance

There is no:

- Long-term dataset

---

### Communication Gap

Between:

- Me
- Chefs
- Clients

Problems:

- No unified system
- Information gets fragmented

---

### Visibility Failure: No Command Dashboard

At any moment, I cannot clearly see:

- All events
- All dosing plans
- All guest profiles

Everything is:

- Spread out
- Hard to verify

---

### Psychological Model

I am:

- Risk-aware
- Control-focused
- Scaling-oriented

I cannot:

- Rely on individual chefs to manage everything

---

### The Real Test

For this system to work under this profile, it must:

#### 1. Central Dosing Engine

Define:

- Standards
- Limits
- Per-course allocation

---

#### 2. Multi-Chef Enforcement

Ensure:

- All chefs follow:
  - Same protocols

---

#### 3. Guest History System

Track:

- Tolerance
- Past experiences

---

#### 4. Compliance Layer

Generate:

- Full documentation
- Audit trails

---

#### 5. Event Data Retention

Store:

- Outcomes
- Metrics

---

#### 6. Command Dashboard

Show:

- All events
- All risks
- All statuses

---

### Pass / Fail Condition

**Pass:**

- I scale cannabis dining safely
- Every event is consistent
- Risk is controlled

→ The system becomes my control center

**Fail:**

- Each event is:
  - Chef-dependent
  - Inconsistent
  - Risky

→ The system cannot scale

---

This is a **scaled cannabis operation**.

The system must **enforce consistency across people, not just track events**, or it fails under growth.

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

Create file: `docs/stress-tests/persona-jordan-hale-cannabis-culinary-director-multi-2026-04-25.md`

The report MUST follow this exact structure:

# Persona Stress Test: Jordan Hale Cannabis Culinary Director Multi

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

| #             | Label                                        | Type | Date       | Score       | Method           | Report                                                                                 | Key Finding    |
| ------------- | -------------------------------------------- | ---- | ---------- | ----------- | ---------------- | -------------------------------------------------------------------------------------- | -------------- |
| {next_number} | Jordan Hale Cannabis Culinary Director Multi | Chef | 2026-04-25 | {score}/100 | Codex autonomous | `docs/stress-tests/persona-jordan-hale-cannabis-culinary-director-multi-2026-04-25.md` | {one sentence} |

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

codex/persona-jordan-hale-cannabis-culinary-director-multi

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

- [ ] Report exists at `docs/stress-tests/persona-jordan-hale-cannabis-culinary-director-multi-2026-04-25.md`
- [ ] Report follows the exact structure above
- [ ] Registry row added to `docs/stress-tests/REGISTRY.md`
- [ ] No product code files modified
- [ ] No files modified outside scope directories
- [ ] No new files created (except the report)

## Context

Stack: Next.js 14, PostgreSQL (Drizzle ORM via postgres.js), Auth.js v5, Tailwind CSS, TypeScript.
Server actions with 'use server' for business logic. SSE for realtime. Local filesystem for storage.
ChefFlow is an operating system for food service professionals (primarily solo private chefs).
