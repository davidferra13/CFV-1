# Codex Task: Persona Stress Test - Rina Solis

## Objective

Evaluate ChefFlow's fitness for the following persona, then make ONLY the safe improvements identified.

## The Persona

**Chef Profile: “Rina Solis” — Private Chef, Health-Constrained / Medically Integrated Operator**

I don’t cook for preference.

I cook for **requirement**.

Right now:

- I have **3 active clients**
- Each has:
  - Medical conditions
  - Doctor-directed dietary constraints
  - Non-negotiable restrictions

Examples:

- Autoimmune protocols
- Post-surgery recovery diets
- Strict anti-inflammatory plans
- Controlled sodium / sugar / allergen exposure

This is not creative-first cooking.
This is **precision + compliance + health outcome responsibility**.

---

### Primary Failure: No Enforced Constraint System

The core problem is not knowledge.

It is that **most systems treat dietary rules as suggestions, not constraints**.

In my world:

- There is no “close enough”
- There is no “optional substitution”

If something violates:

- It cannot be served

There is no system that:

- Prevents invalid menu creation
- Enforces restrictions automatically

So:

- I manually validate everything

---

### Structural Issue: No Medical Context Layer

Each client has:

- A different condition
- A different protocol
- A different tolerance

There is no:

- Central system that:
  - Encodes these constraints
  - Applies them to every decision

So:

- I re-check constantly
- Or risk serious consequences

---

### Menu Planning Breakdown: No Safe-By-Default System

Menus should:

- Only include valid options

But:

- Systems allow:
  - Anything to be selected
  - Then rely on me to catch issues

There is no:

- “Only safe options available” mode

---

### Ingredient Risk

I need to track:

- Hidden ingredients
- Cross-contamination risks
- Processing differences

Problems:

- No system flags:
  - Risky ingredients
  - Borderline items

So:

- I research manually

---

### Client Communication Sensitivity

Clients:

- Are often:
  - Stressed
  - Recovering
  - Highly aware of their condition

I cannot:

- Ask the same questions repeatedly
- Or appear uncertain

There is no:

- System that:
  - Stores and surfaces critical info cleanly

---

### Feedback Precision Gap

Feedback is not:

- “Did you like it?”

It is:

- “Did this cause a reaction?”
- “Was this tolerated?”

There is no:

- System capturing:
  - Outcome-based feedback

---

### Multi-Client Complexity

Each client:

- Has completely different rules

There is no:

- Unified system that:
  - Keeps them separate
  - Prevents cross-contamination of logic

---

### Legal / Liability Pressure

Mistakes are not:

- Minor

They can be:

- Health-impacting
- Legally significant

There is no:

- System ensuring:
  - Full traceability

---

### Visibility Failure: No Safety Dashboard

At any moment, I should see:

- What is safe
- What is not
- What needs verification

Instead:

- I rely on:
  - Memory
  - Notes

---

### Psychological Model

I am:

- Careful
- Methodical
- Risk-aware

I do not:

- Experiment freely

I prioritize:

- Safety
- Accuracy
- Trust

---

### The Real Test

For this system to work under this profile, it must:

#### 1. Constraint Enforcement Engine

Prevent:

- Invalid menu items
- Unsafe ingredient combinations

---

#### 2. Client Health Profiles

Store:

- Conditions
- Restrictions
- Tolerances

---

#### 3. Safe Menu Generation

Only allow:

- Valid options

---

#### 4. Ingredient Risk Detection

Flag:

- Hidden risks
- Problematic ingredients

---

#### 5. Outcome-Based Feedback

Track:

- Client reactions
- Meal success

---

#### 6. Full Traceability

Log:

- Ingredients
- Preparation
- Service

---

#### 7. Multi-Client Isolation

Ensure:

- No crossover of rules

---

### Pass / Fail Condition

**Pass:**

- I trust the system not to let mistakes happen
- I reduce manual validation
- I operate safely and confidently

→ The system becomes critical

**Fail:**

- I still:
  - Double-check everything
  - Rely on memory
  - Risk mistakes

→ The system is not safe enough to use

---

This is a **constraint-critical, liability-sensitive workflow**.

The system must **prevent failure, not just organize information**, or it is unusable.

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

Create file: `docs/stress-tests/persona-rina-solis-2026-04-25.md`

The report MUST follow this exact structure:

# Persona Stress Test: Rina Solis

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

| #             | Label      | Type | Date       | Score       | Method           | Report                                               | Key Finding    |
| ------------- | ---------- | ---- | ---------- | ----------- | ---------------- | ---------------------------------------------------- | -------------- |
| {next_number} | Rina Solis | Chef | 2026-04-25 | {score}/100 | Codex autonomous | `docs/stress-tests/persona-rina-solis-2026-04-25.md` | {one sentence} |

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

codex/persona-rina-solis

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

- [ ] Report exists at `docs/stress-tests/persona-rina-solis-2026-04-25.md`
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
