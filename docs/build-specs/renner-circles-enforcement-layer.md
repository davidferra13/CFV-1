# Renner Enforcement Layer: 5-Agent Circles Build

> **Status:** Ready for Codex deployment
> **Created:** 2026-04-25
> **Author:** Claude Opus 4.6 (senior engineer recommendation)
> **Thesis:** Dinner Circles can solve every problem the "Alex Renner" archetype identifies: no systems, no enforcement, no repeatability, drift, chaos.

---

## The Problem (Renner's Diagnosis)

Most kitchen operations fail because they are people trying to hold things together, not systems. The divider between failing and elite kitchens is: systems, standards, enforcement.

For a system to be legitimate, it must:

1. **Enforce standards** (not suggest)
2. **Eliminate guessing** (no estimation, no memory reliance)
3. **Create repeatability** (consistent output across different people)
4. **Track real performance** (what's working, what's failing)
5. **Prevent drift** (catch deviations early)
6. **Reflect both worlds** (high-end and early-stage)

## The Answer: Dinner Circles as Enforcement Layer

Circles already handle #2-#6. The gap is #1 (enforcement on the kitchen floor) and broken plumbing that lets people slip through without joining circles.

## 5 Agents, All Parallel, Zero File Overlap

All 5 agents touch completely different files. Run simultaneously.

| Agent                      | Spec File                                                     | Files Touched                  | Codex Risk | Renner Criterion   |
| -------------------------- | ------------------------------------------------------------- | ------------------------------ | ---------- | ------------------ |
| **1. Bug Fixes**           | `docs/specs/codex-circles-agent-1-bug-fixes.md`               | 9 hub files                    | LOW        | Prevent Drift      |
| **2. Ticketing Bridge**    | `docs/specs/codex-circles-agent-2-ticketing-circle-bridge.md` | `lib/tickets/actions.ts`       | LOW        | Eliminate Guessing |
| **3. Crew Circles**        | `docs/specs/crew-circles-build-spec.md`                       | 5 files (2 new, 3 modified)    | LOW        | Enforce Standards  |
| **4. Collaborator Bridge** | `docs/specs/codex-collaborator-circle-bridge.md`              | `lib/collaboration/actions.ts` | LOW        | Repeatability      |
| **5. Post-Dinner Onramp**  | `docs/specs/codex-post-dinner-circle-onramp.md`               | 3 email/job files              | LOW        | Track Performance  |

### Why These 5 (and Not the Other 2)

**Excluded: Lifecycle Notifications (Agent 3)** -- Spec says "find the function" too often. Codex needs exact file paths and line numbers. This is a Claude Code task for a future session.

**Excluded: Reminder Cascade** -- Requires navigating a complex lifecycle cron file to find the 1-day threshold insertion point. Same problem: too much "figure it out yourself" for Codex.

### What Each Agent Accomplishes

**Agent 1 (Bug Fixes):** Fixes 9 broken things in the existing circle infrastructure. Broken email_normalized on profile creation (causes duplicate profiles). Dead searchPeople stub (friend discovery non-functional). Broken message_count increment. Unsecured photo delete. Unsecured poll close. These are exactly the kind of drift Renner would identify in a broken kitchen.

**Agent 2 (Ticketing Bridge):** Three ticket paths (comp, walk-in, toggle-on) skip circle auto-join. One refund path leaves the buyer as active member. After this, EVERY ticket path flows into circles correctly. No guessing about who's in the circle.

**Agent 3 (Crew Circles):** THE answer to Renner's core thesis. Creates a crew circle per event using existing hub infrastructure (`group_type = 'crew'`). Staff get the same shared coordination surface guests already have: real-time chat, notifications, polls, photos, notes. Zero new tables. The chef sees who's assigned, staff see what to do.

**Agent 4 (Collaborator Bridge):** When Chef B accepts a collaboration invite, auto-add them to the event's Dinner Circle. 1 change in 1 file. Tiny but critical: without this, co-hosting chefs are invisible to the guest community.

**Agent 5 (Post-Dinner Onramp):** After a successful dinner, the thank-you email includes a "Join the Dinner Circle" CTA. Turns one-time guests into circle members for future events. Closes the retention loop.

### Verification After All 5 Complete

```bash
npx tsc --noEmit --skipLibCheck
```

Must pass. If any agent breaks types, fix before merging.

### What Comes Next (Future Sessions, NOT This Build)

1. Lifecycle notification hooks (Agent 3 spec, needs Claude Code)
2. Reminder cascade (day-of circle notifications, needs Claude Code)
3. Guest Completion Tracker (Sophie Kaplan persona spec)
4. Menu lifecycle unification (poll locking + transitionMenu)
5. Security fixes from 82-question audit (12 broken items)

---

## Renner's Pass/Fail Verdict After This Build

| Criterion               | Before                                      | After                                           |
| ----------------------- | ------------------------------------------- | ----------------------------------------------- |
| Enforces discipline     | FAIL (no kitchen floor system)              | **PASS** (crew circles)                         |
| Eliminates guessing     | PARTIAL (3 ticket paths skip circles)       | **PASS** (all paths flow into circles)          |
| Creates repeatability   | PASS (dinner clubs, config blobs)           | **PASS** (+ crew circles persist across events) |
| Tracks real performance | PASS (pipeline, momentum, triage)           | **PASS** (+ post-dinner retention tracking)     |
| Prevents drift          | PARTIAL (9 bugs causing silent failures)    | **PASS** (bugs fixed, enforcement hooks live)   |
| Reflects both worlds    | PASS (config scales from solo to corporate) | **PASS** (unchanged)                            |

**Overall: moves from "organizer that sits next to the kitchen" to "system that runs the kitchen."**
