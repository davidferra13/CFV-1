# Remy as Primary Operating Layer - Vision Spec

> **Status:** PHASE 1 EXPANDED (2026-05-02) - 24 write commands (staff, quotes, contracts, prep, packing, equipment added), 12 brain dump intent types, dependency-aware execution, SSE streaming wired
> **Priority:** P0 - this is the product thesis
> **Date:** 2026-05-01

---

## Core Thesis

**ChefFlow should work even if a user never manually operates the platform and only interacts with Remy.**

The UI remains. Manual use remains. But manual use is OPTIONAL. If someone wants to run their entire operation through conversation, Remy must be capable enough to support that.

The platform becomes a live command center: a place to watch, approve, inspect, correct, and verify what Remy is doing in real time. The UI is an approval layer, audit layer, and visual ground truth, not the only way to operate.

**The standard:** Anything a user can do manually in ChefFlow, they should eventually be able to ask Remy to do conversationally.

---

## The Identity Rule: Everything Is Remy

All background engines, data pipelines, pricing intelligence, pantry tracking, inquiry processing, prep scheduling, all of it IS Remy from the user's perspective.

- OpenClaw pricing engine running on Pi? That's Remy watching prices.
- CIL scanning event readiness overnight? That's Remy checking your prep.
- Email pipeline processing a 3am inquiry? That's Remy handling your inbox.
- Pantry intelligence suggesting ingredient swaps? That's Remy optimizing your costs.

The user sees one agent. The infrastructure behind it is complex, but the persona is singular. Remy takes credit (and responsibility) for everything the system does.

**Not vague or deceptive.** The actual architecture is documented in FAQs and info pages. But the user-facing narrative is: "Remy handled it while you slept."

---

## The 3am Email Example (Canonical Use Case)

A potential client emails at 3am asking about a dinner. By the time the chef wakes up:

1. Email pipeline captured the inquiry
2. Client name, date, location, guest count extracted
3. Menu preferences/requests identified from email body
4. Rough cost estimate calculated from pricing engine
5. Draft event created in ChefFlow (draft state, not committed)
6. Draft response email composed
7. All of this visible on the dashboard with "Remy handled 1 new inquiry overnight"

The chef reviews, approves or edits, and moves on. Zero manual data entry. Zero lost context.

**This is the quality of life that frees the chef to be creative.** When operations are automated, the chef can focus on making menus, being creative, doing what they love, instead of doing data entry.

---

## Three User Archetypes (All Must Be Served)

| Archetype   | Behavior                                             | ChefFlow Response                                                   |
| ----------- | ---------------------------------------------------- | ------------------------------------------------------------------- |
| **Full AI** | Talks to Remy for everything, rarely touches UI      | Remy executes everything, UI is audit/approval layer                |
| **Hybrid**  | Uses Remy for some things, UI for others             | Both paths work identically, data stays synced                      |
| **Manual**  | Opts out of AI entirely, uses platform traditionally | Every feature works without AI, no dead ends, no AI-dependent flows |

**Rule:** No feature should REQUIRE AI to function. AI accelerates. Manual always works. But if AI is enabled, it should be world-class, not a gimmick.

---

## Gap Analysis: What Remy Is Missing Today

### GAP 1: Write Operations (LARGELY RESOLVED)

Remy now has **24 write commands** across 9 domains. Went from 90% read / 10% write to roughly 55/45.

**Built (24 commands):**

- Event: create, update, transition (3)
- Client: create, update (2)
- Menu: create, add dish (2)
- Task/Todo: create, complete (2)
- Memory/Notes: save (1)
- Expense: create (1)
- Staff: create, assign to event, record hours (3)
- Quotes: create, transition (send/accept/reject/expire) (2)
- Contracts: generate from event (1)
- Prep: create block, complete block, toggle item (3)
- Packing: mark car packed (1)
- Equipment: create, log maintenance (2)
- Financial: create expense (already counted above)

**Still missing (Phase 2+):**

- Shopping list (generate from event, mark bought, add custom items)
- Ingredient updates (add to recipe, update qty; RESTRICTED per recipe rules)
- Timeline (create day-of, add entries; timeline is currently derived from prep data)
- Communication (draft email, send with approval; partially handled by existing draft commands)
- Packing (individual item toggles, beyond car-packed flag)
- Invoice generation from quotes

**Approach:** Each write wraps an existing server action with an approval tier:

- Tier 1 (auto): drafts, notes, memories, reversible changes
- Tier 2 (confirm): client updates, menu changes, task creation
- Tier 3 (explicit): emails, payments, state transitions, anything financial

### GAP 2: Real-Time UI Updates

Remy mutates data but UI doesn't reflect it. SSE broadcast() exists but Remy never calls it.

**Fix:** Every Remy write command calls broadcast() after mutation. useSSE() hooks pick up changes. User watches dashboard update in real time.

### GAP 3: Chef Defaults / Preference Engine

No structured system for reusable defaults (pricing, prep timing, packing, sourcing, timeline patterns). Remy asks the same questions repeatedly.

**Fix:** Structured defaults table. Remy queries it before acting. Builds it progressively from chef behavior.

### GAP 4: Auto-Grill / Context Gathering

Remy doesn't detect "I don't have enough info to do this right." Should auto-interrogate when context is insufficient.

**Fix:** Context completeness scoring before write commands. Progressive profiling (ask 20 questions on first event, 2 on fifth).

### GAP 5: Workflow Chains

One intent should trigger a cascade. "Confirmed the Johnson dinner" should generate shopping list + prep timeline + packing list + confirmation email + staff briefing.

**Fix:** Workflow templates. Tier 1 steps auto-execute. Tier 2/3 steps appear for approval.

### GAP 6: Cross-Page Session Context

Remy forgets what you were just looking at when you navigate. Short-term context (last 3-5 entities) should persist across pages.

### GAP 7: Completeness Check Integration

Completion Contract exists but Remy can't call it. "What am I missing?" should trigger recursive readiness scoring.

### GAP 8: Undo / Audit Trail

No history of what Remy changed. No "undo that." Need remy_action_log table.

### GAP 9: Proactive Push

Remy only speaks when spoken to. Should push morning briefings, deadline alerts, anomaly detection, post-event nudges. CIL signals exist but delivery channel doesn't.

### GAP 10: Image/Screenshot Processing

Chef's actual workflow includes pasting screenshots. Remy can't process images in chat. V2 when vision model is reliable.

---

## Builder Gate: The Remy Inclusion Check

**Every feature built in ChefFlow must answer these questions before being marked complete:**

1. Can Remy perform this action conversationally?
2. If not, what write command is needed?
3. Should Remy do this automatically (Tier 1), with confirmation (Tier 2), or with explicit approval (Tier 3)?
4. What context does Remy need to do this well?
5. What defaults should reduce repeated questions over time?
6. Does the UI update in real time when Remy acts?
7. Can the user undo what Remy did?
8. If the user has AI disabled, does this feature still work manually?

**This check must be a builder skill that fires automatically during feature development.** Not optional. Not "nice to have." Structural.

---

## Brain Dump Pipeline (Already Specced)

See: `docs/specs/remy-brain-dump-pipeline.md`

Multi-intent extraction -> entity resolution -> action plan -> confirmation -> batch execution. All pieces exist. Needs plumbing.

---

## Background Intelligence = Remy

All background processes should surface as Remy actions:

| Engine            | User-Facing Attribution                                               |
| ----------------- | --------------------------------------------------------------------- |
| OpenClaw pricing  | "Remy noticed lobster prices dropped 15% at Whole Foods"              |
| CIL event scanner | "Remy checked your Saturday dinner - 3 items still need attention"    |
| Email pipeline    | "Remy processed 1 new inquiry overnight"                              |
| Pantry tracker    | "Remy suggests using the rosemary from your garden instead of buying" |
| Prep scheduler    | "Remy built your prep timeline for Thursday-Saturday"                 |
| Post-event nudge  | "Remy: the Beckham dinner was 3 days ago. After-action review?"       |

The engines are the machinery. Remy is the face. This is not deception; it's product design. Like how "Siri" is the face of dozens of Apple subsystems.

---

## Build Priority

| Phase       | What                                                       | Enables                     |
| ----------- | ---------------------------------------------------------- | --------------------------- |
| **Phase 1** | Write operations + approval tiers + brain dump pipeline    | Remy can DO things          |
| **Phase 2** | Real-time UI updates + workflow chains + auto-grill        | Remy does things WELL       |
| **Phase 3** | Defaults engine + completeness checks + audit trail        | Remy gets SMARTER over time |
| **Phase 4** | Proactive push + background attribution + image processing | Remy runs autonomously      |

---

## The Standard

Not "can we achieve the final version today?" but:

**Are we building in the direction of the final version, without creating architecture we will need to undo later?**

The answer today is yes. Server actions for writes, SSE for realtime, memory for persistence, approval tiers for safety, Ollama for local AI. Nothing needs to be undone. Every gap is additive.

Build the data structures. Build the permission model. Build the memory layer. Build the approval gates. Build the audit trail. Build the workflow hooks. Build the UI state updates. Build the places where Remy can eventually act. Build the fallback for anything Remy can't do yet.

Get as close as possible now. Be ready the moment capabilities become practical.
