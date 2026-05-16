# BUILD QUEUE MERGE + EXECUTION PRIMER

You are receiving two build queue inventories from two different AI agents analyzing the same codebase (ChefFlow V1). One is from Claude (unstructured, ~75 items from specs/memory/code gaps) and one is from Codex (structured GSD queue, 123 items).

Your job:

## STEP 1: MERGE

Take both lists and produce ONE deduplicated, categorized build queue. Rules:

1. **Group by domain/category.** If 8 items are all "lifecycle UI" work, they sit together. If 3 items are all "OpenClaw data infrastructure," they're one group.
2. **Deduplicate.** "Menu Versioning + Version Log" appearing in both lists = one item. "Event Lifecycle Rail And Stage Navigation" + "Post-Event Closeout Completeness Loop" = same domain group but distinct items.
3. **Mark status.** Each item gets one tag:
   - `PARTIAL` - started, not finished (code exists)
   - `SPEC-READY` - spec written, zero code
   - `UNSPECCED` - no spec, just an idea/need
   - `BLOCKED` - cannot proceed (state why)
   - `IN-FLIGHT` - actively being worked
4. **Preserve granularity.** Don't collapse 5 distinct features into "UI Polish." Keep them separate but grouped.
5. **Category examples** (use whatever emerges naturally):
   - Lifecycle & Events
   - UI System & Design Language
   - Client Communication & Remy
   - Menu & Recipe & Costing
   - OpenClaw & Data Infrastructure
   - PIE (Pricing Intelligence)
   - Security & Trust
   - Mobile & Offline
   - Onboarding & Getting Started
   - Navigation & Information Architecture
   - Admin & Operations
   - Public Surface & Marketing
   - Testing & QA
   - Developer Infrastructure

## STEP 2: OUTPUT FORMAT

Produce a single document. Each category gets:

```
## [CATEGORY NAME] (X items)

| # | Item | Status | Depends On | Notes |
|---|------|--------|------------|-------|
| 1 | ... | PARTIAL | None | ... |
| 2 | ... | SPEC-READY | #1 | ... |
```

Dependencies are WITHIN the category only. Cross-category deps get a note.

## STEP 3: DO NOT BUILD YET

After merging, present the merged queue for review. Do not start building until the queue is confirmed. The merge IS the deliverable for this first interaction.

---

## CONTEXT

- This is a Next.js app (PostgreSQL, Drizzle, Auth.js v5, Stripe, local-only infrastructure)
- ~265 lib/ domains already exist
- Specs live in `docs/specs/`
- The GSD planning system uses `.planning/` directory
- No active phase or plan right now
- Build is clean (TypeScript passes, no broken state)
- The developer is a chef building his own business tool. He speaks business language, not engineering.

---

Below are the two raw inventories. Merge them.
