# Codex Task: Persona Stress Test - Noah Kessler

## Objective

Evaluate ChefFlow's fitness for the following persona, then make ONLY the safe improvements identified.

## The Persona

**Chef Profile: “Noah Kessler” — Real-Time Price Intelligence Chef (Location-Aware, Zero-Tolerance for Inaccurate Numbers)**

I don’t operate on estimates.

If I don’t have a number:

- I don’t make the decision
- I don’t build the menu
- I don’t take the job

Right now:

- I’m traveling constantly across the U.S.
- Cooking in:
  - Different cities
  - Different states
  - Different supply environments

Every event depends on:

- **what exists locally**
- **what it costs right now**

This is not static planning.
This is **real-time, location-dependent execution**.

---

### Primary Failure: No Real-Time Price Truth

The core problem is not sourcing.

It is that **I cannot reliably know what something costs at a specific store, in a specific location, at a specific moment**.

What I need:

- Exact or near-exact pricing
- At the store I will actually shop at

What exists:

- General averages
- Outdated data
- Irrelevant pricing

That is unusable.

---

### Structural Issue: No Location-Specific Ingredient Layer

Ingredients are treated as:

- Static items

But in reality:

- Price changes by:
  - City
  - Store
  - Day

There is no system that:

- Maps ingredient → location → store → current price

So:

- I cannot trust the numbers

---

### Planning Breakdown: Cannot Build Without Numbers

I don’t:

- Design menus first

I:

- Build from:
  - Available ingredients
  - Known costs

If I don’t know:

- What I can buy
- What it costs

I cannot:

- Build anything

---

### Travel Constraint

I’m constantly:

- Landing in new places
- Working with unfamiliar stores

Problems:

- No system that:
  - Shows me:
    - What stores exist
    - What they carry
    - What they charge

Before I arrive

---

### Store-Level Blindness

I need:

- Store-specific intelligence

Example:

- Whole Foods vs local market vs specialty shop

Each has:

- Different pricing
- Different availability

There is no:

- Unified view

---

### Inventory Reality Gap

Even if I know:

- A price

I still don’t know:

- If it’s in stock

There is no:

- Real-time availability signal

---

### Pricing Integrity Requirement

I need:

- Numbers that are:
  - Accurate
  - Recent
  - Location-specific

Tolerance:

- Very low

If it’s off:

- My margin is wrong
- My plan breaks

---

### Decision Speed Requirement

I operate fast.

I need to:

- Know instantly:
  - Where to go
  - What to buy
  - What it costs

There is no time for:

- Research
- Guessing

---

### Multi-Store Optimization Gap

I often:

- Shop across multiple locations

Problems:

- No system that:
  - Optimizes:
    - Route
    - Cost
    - Availability

---

### Visibility Failure: No Real-Time Map

At any moment, I should see:

- Nearby stores
- Ingredient availability
- Exact pricing

Instead:

- I rely on:
  - Guessing
  - Experience
  - Physical visits

---

### Psychological Model

I am:

- Data-driven
- Precision-focused
- Cost-obsessed

I do not tolerate:

- Approximation
- Outdated data
- Generalization

If the number is wrong:

- The system is wrong

---

### The Real Test

For this system to work under this profile, it must:

#### 1. Real-Time Price Engine

Provide:

- Current pricing
- Per ingredient
- Per store

---

#### 2. Location Intelligence

Detect:

- Where I am
- Show:
  - Relevant stores
  - Available options

---

#### 3. Store-Level Data

Show:

- Inventory
- Pricing
- Variability

---

#### 4. Availability Signals

Indicate:

- In stock
- Low stock

---

#### 5. Menu from Market

Allow:

- Menu creation based on:
  - Real availability
  - Real pricing

---

#### 6. Multi-Store Optimization

Recommend:

- Best stores
- Best routes
- Best pricing combinations

---

#### 7. High-Fidelity Data

Ensure:

- Data is:
  - Recent
  - Verified
  - Accurate

---

### Pass / Fail Condition

**Pass:**

- I know what exists before I arrive
- I know what it costs
- I can plan perfectly

→ The system becomes my sourcing engine

**Fail:**

- I:
  - Guess
  - Double-check in person
  - Adjust on the fly

→ The system is not reliable

---

This is a **real-time, location-sensitive, precision-critical workflow**.

The system must **reflect reality at the store level**, or it is not usable.

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

Create file: `docs/stress-tests/persona-noah-kessler-2026-04-25.md`

The report MUST follow this exact structure:

# Persona Stress Test: Noah Kessler

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

### Step 3: Apply ONLY Quick Wins (if any)

Rules for code changes:

- ONLY changes under 20 lines in a SINGLE EXISTING file
- NEVER create new files (except the report)
- NEVER modify database schemas or migrations
- NEVER modify auth, layout, or routing
- NEVER modify lib/billing/ or payment code
- ONLY modify: UI text, default values, empty states, labels, placeholder text, tooltips
- If unsure whether a change is safe: DO NOT MAKE IT. Document it in the report instead.

### Step 4: Update the Registry

Append one row to the table in `docs/stress-tests/REGISTRY.md` under "## Persona Registry":

| #             | Label        | Type | Date       | Score       | Method           | Report                                                 | Key Finding    |
| ------------- | ------------ | ---- | ---------- | ----------- | ---------------- | ------------------------------------------------------ | -------------- |
| {next_number} | Noah Kessler | Chef | 2026-04-25 | {score}/100 | Codex autonomous | `docs/stress-tests/persona-noah-kessler-2026-04-25.md` | {one sentence} |

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

codex/persona-noah-kessler

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

- [ ] Report exists at `docs/stress-tests/persona-noah-kessler-2026-04-25.md`
- [ ] Report follows the exact structure above
- [ ] Registry row added to `docs/stress-tests/REGISTRY.md`
- [ ] `npx tsc --noEmit --skipLibCheck` exits 0
- [ ] No files modified outside scope directories
- [ ] No code changes over 20 lines in any single file
- [ ] No new files created (except the report)

## Context

Stack: Next.js 14, PostgreSQL (Drizzle ORM via postgres.js), Auth.js v5, Tailwind CSS, TypeScript.
Server actions with 'use server' for business logic. SSE for realtime. Local filesystem for storage.
ChefFlow is an operating system for food service professionals (primarily solo private chefs).
