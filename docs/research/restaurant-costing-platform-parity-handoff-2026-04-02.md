# Restaurant Costing Platform Parity Handoff

> **Date:** 2026-04-02
> **Status:** ready for follow-up research or spec planning
> **Purpose:** let another agent continue the conversation about MarginEdge, meez, xtraCHEF, MarketMan, Restaurant365, and adjacent operator tooling without re-deriving the baseline.

---

## Executive Summary

The baseline answer is now clear:

- existing restaurant software already solves large parts of recipe costing and operator food-cost management
- ChefFlow does **not** already exceed everything these systems do
- the differentiator is not basic recipe costing, but a stronger combination of operator workflows plus nationwide market-aware ingredient pricing and gap-filling inference

This means the next conversation should not ask "does recipe costing already exist?"

That is already answered.

The next conversation should ask:

- what exact feature parity matters most?
- what should ChefFlow copy, improve, or refuse?
- what should be a separate spec sequence from OpenClaw?

---

## Read Order

Read these in this exact order:

1. `docs/research/restaurant-costing-platform-landscape-2026-04-02.md`
2. `docs/specs/openclaw-ideal-runtime-and-national-intelligence.md`
3. `docs/research/openclaw-runtime-builder-handoff-2026-04-02.md`

Only then decide whether the next task is:

- more competitor research
- feature extraction
- parity planning
- or spec writing for ChefFlow operator workflows

---

## What Is Already Established

Treat the following as baseline truths:

- MarginEdge, meez, xtraCHEF, MarketMan, and Restaurant365 all already do meaningful recipe costing and food-cost workflow work
- they are generally strongest when grounded in the operator's own invoices, vendors, inventory, POS, and accounting flows
- none of them clearly appears to offer a turnkey nationwide "best-available local ingredient price with no blanks" engine for arbitrary chefs everywhere in the U.S.
- ChefFlow should not assume it already exceeds these products in workflow maturity
- this lane is separate from OpenClaw runtime architecture, even though OpenClaw may become a major differentiator inside it

---

## What Another Agent Should Explore Next

### Priority 1. Feature-parity extraction

Produce a structured matrix for:

- invoice ingestion
- vendor-item mapping
- recipe and sub-recipe management
- prep workflows
- unit conversion and yield handling
- menu engineering
- cost alerts
- location-specific costing
- inventory workflows
- purchasing workflows
- accounting/AP integrations
- nutrition/allergen support
- training/rollout support

For each category, answer:

- what the leading tools already do
- what ChefFlow already does
- what ChefFlow clearly lacks
- whether the missing piece is strategic, optional, or distracting

### Priority 2. UX and workflow depth

Do not stop at feature names.

Investigate:

- how fast these systems let an operator get to first useful recipe cost
- where they are cumbersome
- where setup burden is too high
- what feels enterprise-heavy versus operator-friendly

### Priority 3. Separate-lane spec framing

Convert the findings into a spec sequence for ChefFlow that is distinct from OpenClaw.

Likely categories:

- recipe system parity
- operator costing parity
- menu engineering
- inventory and purchasing adjacency
- accounting/invoice integrations
- operator trust and workflow ergonomics

---

## Good Questions For The Next Agent

- Which of these products has the strongest invoice-to-cost workflow?
- Which has the strongest recipe-as-system-of-record workflow?
- Which has the best location-specific costing model?
- Which features are table stakes versus true differentiators?
- Which features would help ChefFlow most with chefs and small operators first?
- Which features are enterprise bait and not worth copying yet?
- What can ChefFlow do better because of OpenClaw that these products cannot?

---

## Questions That Are Already Answered

Do not spend another pass answering these unless the market materially changes:

- "Does recipe costing software already exist?"
- "Can operators already automate costs from invoices and vendors?"
- "Do we already exceed everything?"
- "Is the exact OpenClaw-plus-ChefFlow vision already obviously available as a turnkey product?"

Those answers are already in the baseline memo.

---

## Recommended Output For The Next Pass

The next useful deliverable would be one of these:

1. a feature-parity matrix
2. a "copy / improve / avoid" memo
3. a dedicated spec intake for ChefFlow operator-costing parity

Best option:

- start with `copy / improve / avoid`
- then convert that into a spec sequence

---

## Completion Condition

This handoff is complete when the next agent can answer these questions without guessing:

1. What is already solved in the market?
2. What is still differentiated in the ChefFlow + OpenClaw vision?
3. What should be researched next instead of repeated?
4. What kind of spec should come out of the next conversation?

This handoff now answers all four.
