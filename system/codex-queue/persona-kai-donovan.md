# Codex Task: Persona Stress Test - Kai Donovan

## Objective

Evaluate ChefFlow's fitness for the following persona, then make ONLY the safe improvements identified.

## The Persona

**Chef Profile: “Kai Donovan” — Underground Supper Club Operator (Ephemeral, Invite-Only, Experience-First)**

I don’t run a restaurant.
I don’t do traditional private dining.

I run **supper clubs**:

- Secret locations
- Limited seats (10–30 max)
- One-night-only menus

Right now:

- I have **2 upcoming drops**
- A waitlist of ~200 people
- Most tickets sell out in minutes

This is not service.
This is **curated experience + controlled access + cultural signal**.

---

### Primary Failure: No System for Ephemeral Events

The core problem is not demand.

It is that **everything I do is temporary, but the system expects permanence**.

Each event:

- New location
- New menu
- New audience mix

There is no:

- System built for:
  - Short-lived, high-intensity events

So:

- I rebuild everything every time

---

### Structural Issue: No Access Control Layer

My events are:

- Not public
- Not open booking

I control:

- Who gets access
- Who gets invited
- Who gets priority

Problems:

- No system that:
  - Handles tiered access
  - Manages invite waves
  - Controls visibility

So:

- I use:
  - DMs
  - Lists
  - Manual tracking

---

### Drop Chaos

When I release an event:

- Demand spikes instantly

Problems:

- No system for:
  - Controlled release
  - Fair allocation
  - Managing sell-out flow

So:

- It becomes:
  - First-come chaos
  - Message overload

---

### Audience Management Gap

I don’t just want guests.

I want:

- The right mix of people
- Energy
- Culture

There is no:

- System for:
  - Curating audience composition

---

### Menu Philosophy: One-Time Execution

Menus are:

- Designed for one night only

Problems:

- No structured way to:
  - Archive
  - Reuse
  - Analyze performance

So:

- Great ideas disappear

---

### Location Volatility

Each event:

- Happens somewhere new

Problems:

- No system to:
  - Track venue capabilities
  - Adjust setup

So:

- I:
  - Re-scope everything manually

---

### Payment & Commitment Risk

Guests:

- Reserve spots

Problems:

- No system enforcing:
  - Commitment
  - Payment security

So:

- Last-minute cancellations happen

---

### Community Layer Missing

My events:

- Build community

But:

- There is no system that:
  - Tracks recurring guests
  - Builds relationships

So:

- Community is:
  - Informal
  - Not structured

---

### Visibility Failure: No Event Lifecycle

Each event should have:

- Concept
- Drop
- Sell-out
- Execution
- Post-event

But:

- There is no system managing:
  - This lifecycle

---

### Psychological Model

I am:

- Creative
- Culture-driven
- Experience-focused

I care about:

- Energy
- Audience
- Impact

Not:

- Traditional booking systems

---

### The Real Test

For this system to work under this profile, it must:

#### 1. Controlled Access System

Support:

- Invite-only
- Tiered access
- Waitlists

---

#### 2. Drop Engine

Handle:

- High-demand releases
- Controlled ticketing

---

#### 3. Audience Curation

Allow:

- Selection
- Filtering
- Group composition

---

#### 4. Ephemeral Event Lifecycle

Manage:

- Start → finish → archive

---

#### 5. Location Adaptation

Track:

- Venue constraints
- Setup requirements

---

#### 6. Payment Enforcement

Ensure:

- Commitment
- No drop-offs

---

#### 7. Community Tracking

Build:

- Repeat guest profiles
- Event history

---

### Pass / Fail Condition

**Pass:**

- I run drops cleanly
- I control access
- I build community intentionally

→ The system becomes my backbone

**Fail:**

- I:
  - Manage everything manually
  - Lose control of audience
  - Rebuild each event

→ The system does not fit my model

---

This is an experience-driven, non-traditional operator.

The system must **support controlled, temporary, high-demand events**, or it is irrelevant.

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

Create file: `docs/stress-tests/persona-kai-donovan-2026-04-25.md`

The report MUST follow this exact structure:

# Persona Stress Test: Kai Donovan

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

| #             | Label       | Type | Date       | Score       | Method           | Report                                                | Key Finding    |
| ------------- | ----------- | ---- | ---------- | ----------- | ---------------- | ----------------------------------------------------- | -------------- |
| {next_number} | Kai Donovan | Chef | 2026-04-25 | {score}/100 | Codex autonomous | `docs/stress-tests/persona-kai-donovan-2026-04-25.md` | {one sentence} |

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

codex/persona-kai-donovan

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

- [ ] Report exists at `docs/stress-tests/persona-kai-donovan-2026-04-25.md`
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
