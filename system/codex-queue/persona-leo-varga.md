# Codex Task: Persona Stress Test - Leo Varga

## Objective

Evaluate ChefFlow's fitness for the following persona, then make ONLY the safe improvements identified.

## The Persona

**Chef Profile: “Leo Varga” — Yacht / Ultra-Luxury Travel Chef (Mobile, On-Call, Isolation-Based)**

I don’t have a base.

I work:

- On yachts
- In remote villas
- In locations where:
  - Supply is inconsistent
  - Infrastructure is limited

Right now:

- I’m on a **6-week charter**
- Cooking for:
  - 6–10 guests
  - Rotating preferences

- Moving:
  - Port to port

This is not stable service.
This is **mobile, isolated, high-expectation execution**.

---

### Primary Failure: No Offline-First System

The core problem is not cooking.

It is that **I cannot rely on internet, connectivity, or external systems consistently**.

Reality:

- No signal
- Weak connections
- Delayed communication

Most systems:

- Break immediately in this environment

---

### Structural Issue: No Self-Contained Operation Layer

I need:

- Everything accessible locally

Menus
Preferences
Inventory
Plans

There is no:

- Fully self-contained system that:
  - Works without internet
  - Syncs when possible

---

### Preference Volatility

Guests:

- Change constantly

Problems:

- New guests arrive
- Old guests leave

There is no:

- System for:
  - Quickly onboarding new preferences
  - Dropping old ones

---

### Provisioning Complexity

I don’t shop like normal chefs.

I:

- Provision in bulk
- Plan ahead for:
  - Limited restocking

Problems:

- No system for:
  - Long-range ingredient planning
  - Usage tracking over time

So:

- I estimate manually

---

### Inventory Risk

Running out is not an option.

Problems:

- No system tracking:
  - What’s left
  - What’s critical

So:

- I overstock
- Or risk shortage

---

### Menu Adaptation

Menus depend on:

- What’s available onboard

Problems:

- No system that:
  - Suggests menus based on current inventory

So:

- I improvise constantly

---

### Timing & Routine Complexity

Days are:

- Fluid

Guests:

- Eat at different times
- Request things spontaneously

There is no:

- System tracking:
  - Daily flow
  - Meal timing

---

### Isolation Factor

I am:

- Alone or with minimal staff

Problems:

- No support system
- No quick communication

So:

- Everything must be:
  - Pre-structured
  - Reliable

---

### Visibility Failure: No Real-Time Awareness

At any moment, I should know:

- Inventory levels
- Guest preferences
- Upcoming needs

But:

- Everything is:
  - Mental
  - Scattered

---

### Psychological Model

I am:

- Independent
- Adaptable
- Used to pressure

But:

- I cannot rely on external systems

I need:

- Stability
- Reliability
- Independence

---

### The Real Test

For this system to work under this profile, it must:

#### 1. Offline-First Operation

Work:

- Fully without internet

---

#### 2. Local Data Storage

Store:

- Everything locally

---

#### 3. Sync Layer

Update:

- When connection is available

---

#### 4. Inventory Tracking

Track:

- Usage over time
- Critical levels

---

#### 5. Menu from Inventory

Generate:

- Options based on what exists

---

#### 6. Guest Rotation System

Handle:

- Changing guests
- Changing preferences

---

#### 7. Provision Planning

Plan:

- Long-term ingredient needs

---

### Pass / Fail Condition

**Pass:**

- I operate fully offline
- I never lose track of inventory
- I adapt menus instantly

→ The system supports my reality

**Fail:**

- I:
  - Lose data
  - Guess inventory
  - Depend on connection

→ The system is unusable

---

This is a **mobile, isolated, high-risk environment**.

The system must **operate independently of infrastructure**, or it fails immediately.

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

Create file: `docs/stress-tests/persona-leo-varga-2026-04-25.md`

The report MUST follow this exact structure:

# Persona Stress Test: Leo Varga

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

| #             | Label     | Type | Date       | Score       | Method           | Report                                              | Key Finding    |
| ------------- | --------- | ---- | ---------- | ----------- | ---------------- | --------------------------------------------------- | -------------- |
| {next_number} | Leo Varga | Chef | 2026-04-25 | {score}/100 | Codex autonomous | `docs/stress-tests/persona-leo-varga-2026-04-25.md` | {one sentence} |

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

codex/persona-leo-varga

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

- [ ] Report exists at `docs/stress-tests/persona-leo-varga-2026-04-25.md`
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
