# ORCHESTRATION MISSION: 20 Philosophical Principles Applied to ChefFlow

> Each principle derived from a famous quote. Each maps to concrete code improvement.
> Philosophy drives architecture. Not decoration.

## Context Load (Read These First)

- `CLAUDE.md` (auto-loaded)
- `docs/UNIFIED-BUILD-QUEUE.md` (current state, most items DONE)
- `docs/specs/universal-interface-philosophy.md` (UI philosophy)
- `docs/specs/surface-grammar-governance.md` (surface modes)
- `docs/product-blueprint.md` (V1 scope)
- `docs/CLAUDE-ARCHITECTURE.md` (patterns)
- `docs/CLAUDE-DOMAINS.md` (90 domain map)

## Session Decisions (Do Not Re-Debate)

- All 20 principles are VALID and map to code. No philosophy debates.
- Focus is WIRING and QUALITY, not new features. Almost everything is built.
- Each principle = one concrete improvement pass. Small, surgical.
- "Many ways to skin a cat" = flexible creation order. Already built. This is the reference example.
- Self-healing > reporting. Action suggestions > passive display. Trust chef > confirm everything.
- Do NOT create new tables or migrations. Wire existing infrastructure.
- Do NOT touch BLOCKED items (Remy routines). Work around them.

## The 20 Principles

| #   | Quote                                  | Principle                | Code Target                           |
| --- | -------------------------------------- | ------------------------ | ------------------------------------- |
| 1   | "I think, therefore I am"              | System self-awareness    | CIL signals surfaced in dashboard     |
| 2   | "Unexamined life not worth living"     | Reflection prompts       | Chef weekly retro nudges              |
| 3   | "To be, or not to be"                  | Binary decisiveness      | Eliminate ambiguous UI states         |
| 4   | "I have a dream"                       | Vision alignment         | Blueprint progress surface            |
| 5   | "Only thing to fear is fear itself"    | Remove over-caution      | Kill unnecessary confirmations        |
| 6   | "Give me liberty or death"             | User autonomy            | Remove forced linear workflows        |
| 7   | "One small step"                       | Incremental visibility   | Micro-progress indicators             |
| 8   | "In difficulty lies opportunity"       | Errors suggest actions   | Error states with next-step buttons   |
| 9   | "Knowledge is power"                   | Intelligence everywhere  | PIE data in more surfaces             |
| 10  | "I came, I saw, I conquered"           | Observe-assess-act       | Action suggestions on entity pages    |
| 11  | "Pen mightier than sword"              | Communication > features | Strengthen email pipeline wiring      |
| 12  | "Be the change"                        | Self-healing systems     | Auto-fix patterns, resilient defaults |
| 13  | "Hell is other people"                 | Clean boundaries         | Reduce cross-domain coupling          |
| 14  | "God is dead"                          | Break dead conventions   | Remove cargo-cult patterns            |
| 15  | "Float like butterfly, sting like bee" | Grace + precision        | UI micro-interactions                 |
| 16  | "The medium is the message"            | Delivery = product       | Information hierarchy in cards        |
| 17  | (duplicate, merged with #1)            | —                        | —                                     |
| 18  | "Workers unite!"                       | Collective action        | Agent/swarm infrastructure            |
| 19  | "I know that I know nothing"           | Never assume data        | Graceful empty states                 |
| 20  | "Imagination > knowledge"              | Synthesis over raw       | Smart defaults from existing data     |

---

## Wave 1: AUDIT PASS (Parallel - Launch All 5 Immediately)

> Read-only discovery. Each agent produces a hit list. No code changes.

### Agent 1: Fear Audit (Principle #5)

- **Model:** haiku
- **Task:** Find all unnecessary confirmation dialogs. Grep for `confirm`, `Are you sure`, `AlertDialog`, `confirm-modal`, `confirm-destructive-dialog` usage. For each, classify as JUSTIFIED (destructive/irreversible action) or UNJUSTIFIED (routine action that should just execute). Output a list of files + line numbers for unjustified confirmations.
- **Read first:** `components/ui/confirm-modal.tsx`, `components/ui/confirm-destructive-dialog.tsx`, `components/ui/confirm-policy-dialog.tsx`
- **Done when:** Markdown list of 20+ unjustified confirmations with file paths

### Agent 2: Ambiguity Audit (Principle #3)

- **Model:** haiku
- **Task:** Find UI states that are neither clearly "done" nor clearly "not done." Look for: conditional renders that show nothing (empty returns), status badges with unclear labels (e.g., "processing", "pending" without context), progress bars without labels, loading states that could be confused with empty states. Search `components/` for patterns like `{loading ? <Skeleton/> : data.length === 0 ? null : ...}` where the null/empty branch is indistinguishable from loading.
- **Read first:** `components/ui/status-badge.tsx`, `docs/specs/universal-interface-philosophy.md`
- **Done when:** List of 15+ ambiguous state locations

### Agent 3: Forced Workflow Audit (Principle #6)

- **Model:** haiku
- **Task:** Find places where the UI enforces a linear order that isn't technically necessary. Look for: disabled "Next" buttons that gate progress, wizard steps that can't be skipped, required fields that could have smart defaults, sequential-only flows where parallel entry would work. Focus on `components/events/event-creation-wizard.tsx`, `components/forms/`, onboarding flows.
- **Read first:** `docs/specs/flexible-creation-order-and-recipe-lifecycle.md`
- **Done when:** List of forced-linear patterns with file paths and what could be made flexible

### Agent 4: Empty State Audit (Principle #19)

- **Model:** haiku
- **Task:** Find components that render poorly when data is missing. Grep for: `$0.00`, `$0`, `0 items`, empty arrays rendered as blank space, `.length === 0` followed by a bare `<p>No items</p>` without guidance. Look for places that show zeros instead of "not yet tracked" or "add your first X." Focus on dashboard widgets, analytics panels, pricing displays.
- **Read first:** `components/dashboard/`, `components/analytics/`, `components/pricing/price-badge.tsx`
- **Done when:** List of 15+ poor empty states with fix suggestions

### Agent 5: Dead Convention Audit (Principle #14)

- **Model:** haiku
- **Task:** Find cargo-cult patterns copied from generic SaaS that don't serve a chef's workflow. Look for: generic CRM language ("leads," "pipeline stages," "conversion funnel") in chef-facing UI, unnecessary enterprise patterns (approval chains for single-user actions), overly formal UI copy that a chef would never say. Grep `components/` for terms like "pipeline", "funnel", "conversion", "lead" in user-visible strings.
- **Read first:** `CONTEXT.md` (ubiquitous language), `docs/specs/universal-interface-philosophy.md`
- **Done when:** List of convention violations with better chef-native alternatives

---

## Wave 2: QUICK FIXES (Parallel - After Wave 1 Verified)

> Apply findings from Wave 1. Small surgical edits.

### Agent 6: Confirmation Culling (Principle #5)

- **Model:** opus
- **Task:** Using Wave 1 Agent 1's hit list, remove or downgrade unjustified confirmations. Rules: (1) Destructive actions (delete, cancel event, remove client) KEEP confirmation. (2) Routine actions (save, update, toggle, send draft) REMOVE confirmation and just execute with a success toast. (3) Borderline actions (send email, mark complete) DOWNGRADE to inline undo (toast with "Undo" button, 5s window) instead of pre-confirmation. Do not touch `components/ui/confirm-destructive-dialog.tsx` (it's the justified one).
- **Read first:** Wave 1 Agent 1 output, `components/ui/confirm-modal.tsx`
- **Done when:** 10+ confirmations removed/downgraded, tsc clean

### Agent 7: Binary State Clarity (Principle #3)

- **Model:** haiku
- **Task:** Using Wave 1 Agent 2's hit list, fix ambiguous states. For each: (1) Loading states get skeleton + "Loading..." label. (2) Empty states get illustration + "No X yet. [Action button]" pattern. (3) Status badges get color + clear label (never just "pending" without context of what's pending). Use existing `components/ui/status-badge.tsx` variants.
- **Read first:** Wave 1 Agent 2 output, `components/ui/status-badge.tsx`
- **Done when:** 10+ ambiguous states clarified, tsc clean

### Agent 8: Empty State Enrichment (Principle #19)

- **Model:** haiku
- **Task:** Using Wave 1 Agent 4's hit list, replace poor empty states with helpful ones. Pattern: when data is missing, show (1) what this section will show once populated, (2) one-click action to populate it, (3) never show `$0.00` or `0 events` when the real answer is "not tracked yet." Use PostActionFooter pattern where appropriate (already exists in codebase).
- **Read first:** Wave 1 Agent 4 output, grep for `PostActionFooter` to see existing pattern
- **Done when:** 10+ empty states improved, tsc clean

### Agent 9: Chef-Native Language (Principle #14)

- **Model:** haiku
- **Task:** Using Wave 1 Agent 5's hit list, replace generic SaaS language with chef-native terms. Reference `CONTEXT.md` for canonical vocabulary. Examples: "pipeline" -> "kitchen board" or "workflow", "leads" -> "inquiries", "conversion rate" -> "booking rate." Only change USER-VISIBLE strings (labels, headings, descriptions). Do NOT rename code variables or function names.
- **Read first:** Wave 1 Agent 5 output, `CONTEXT.md`
- **Done when:** All user-visible generic terms replaced, tsc clean

### Agent 10: Flexible Paths (Principle #6)

- **Model:** opus
- **Task:** Using Wave 1 Agent 3's hit list, make 3 forced-linear workflows more flexible. For each: add smart defaults so steps can be skipped, allow re-ordering where safe, add "skip for now" options on non-critical wizard steps. Do NOT break validation on truly required fields (dates, guest count for events). The goal is: chef can start anywhere, fill in any order, come back later.
- **Read first:** Wave 1 Agent 3 output, `docs/specs/flexible-creation-order-and-recipe-lifecycle.md`
- **Done when:** 3 workflows made more flexible, tsc clean

---

## Wave 3: INTELLIGENCE & SELF-AWARENESS (Parallel - After Wave 2 Verified)

> System knows itself, suggests actions, surfaces intelligence.

### Agent 11: CIL Dashboard Consumer (Principle #1 - "I think therefore I am")

- **Model:** opus
- **Task:** The CIL (Continuous Intelligence Layer) is BUILT but has no UI consumer yet. Wire CIL signals into the chef dashboard. Read `lib/intelligence/cil/` to understand signal types. Create a small "System Pulse" card on the dashboard that shows: (1) signals detected in last 24h, (2) suggested actions from signals, (3) confidence levels. Use existing `components/dashboard/action-surface-card.tsx` as pattern.
- **Read first:** `lib/intelligence/cil/`, `components/dashboard/action-surface-card.tsx`, `app/(chef)/dashboard/page.tsx`
- **Done when:** CIL signals visible on dashboard, at least 3 signal types surfaced, tsc clean

### Agent 12: PIE Intelligence Surfacing (Principle #9 - "Knowledge is power")

- **Model:** opus
- **Task:** PIE pricing intelligence exists (Pi Price Bridge, 1.1M prices) but surfaces only in dedicated pricing pages. Wire price intelligence hints into: (1) event detail page (show estimated ingredient cost when viewing menu), (2) menu builder (show per-dish cost estimate), (3) inquiry response (show market-rate comparison for quoted price). Use existing `resolve-price.ts` and `components/intelligence/smart-pricing-hint.tsx`.
- **Read first:** `lib/pricing/resolve-price.ts`, `components/intelligence/smart-pricing-hint.tsx`, `components/pricing/price-badge.tsx`
- **Done when:** PIE data surfaces in 3 new locations beyond pricing pages, tsc clean

### Agent 13: Action Suggestions (Principle #10 - "I came, I saw, I conquered")

- **Model:** opus
- **Task:** Many entity pages show state but don't suggest what to do next. Add contextual "Next Action" suggestions to: (1) Event detail when event is in "confirmed" but has no menu (suggest: "Add menu"), (2) Client profile when last event was 60+ days ago (suggest: "Send check-in"), (3) Inquiry when older than 48h without response (suggest: "Respond now"). Use existing `components/dashboard/resolve-next-card.tsx` pattern. Wire into completion contract signals.
- **Read first:** `lib/completion/`, `components/dashboard/resolve-next-card.tsx`, `lib/lifecycle/`
- **Done when:** 3 entity types show contextual next-action suggestions, tsc clean

### Agent 14: Smart Defaults from History (Principle #20 - "Imagination > knowledge")

- **Model:** opus
- **Task:** When creating new events/menus, pre-fill fields from the chef's history patterns. Examples: (1) New event guest count defaults to chef's median guest count, (2) New menu pre-selects chef's most-used cuisine type, (3) Event pricing defaults to chef's average per-head rate. Use existing data in events/menus tables. Create a `lib/intelligence/smart-defaults.ts` that queries patterns and returns suggested values. Wire into creation forms as placeholder/default (not forced).
- **Read first:** `lib/events/actions.ts`, `lib/menus/actions.ts`, `components/events/event-creation-wizard.tsx`
- **Done when:** 3 creation flows have smart defaults from historical data, tsc clean

---

## Wave 4: COMMUNICATION & ERROR IMPROVEMENT (Parallel - After Wave 3 Verified)

> How information reaches the chef matters as much as what information.

### Agent 15: Error-to-Action States (Principle #8 - "In difficulty lies opportunity")

- **Model:** haiku
- **Task:** Find error boundaries and error states that just say "Something went wrong" without suggesting a fix. Replace with actionable error states: (1) Network errors: "Connection lost. [Retry] [Work offline]", (2) Permission errors: "You don't have access. [Request access] [Go back]", (3) Data errors: "This [entity] seems incomplete. [Fix it] [Skip for now]". Grep for generic error messages and upgrade them.
- **Read first:** `app/error.tsx`, `components/ui/`, grep for "went wrong" or "error occurred"
- **Done when:** 8+ error states upgraded with action buttons, tsc clean

### Agent 16: Information Hierarchy in Cards (Principle #16 - "The medium is the message")

- **Model:** haiku
- **Task:** Audit the top 5 most-used card components for information hierarchy. The most important info should be visually loudest (larger, bolder, higher). Secondary info should be smaller/muted. Ensure: (1) Primary metric is the largest text, (2) Status is color-coded and scannable, (3) Actions are at bottom or trailing edge, (4) Metadata is smallest/most muted. Fix any cards where hierarchy is flat (everything same size/weight).
- **Read first:** `components/dashboard/`, `components/events/event-kanban-board.tsx`, `components/inquiries/kanban-card.tsx`
- **Done when:** 5 high-traffic cards have clear visual hierarchy, tsc clean

### Agent 17: Reflection Nudges (Principle #2 - "Unexamined life not worth living")

- **Model:** haiku
- **Task:** Wire the weekly retro system (already built: `lib/operations/weekly-retro-actions.ts`) into visible UI. Add a small "Weekly Reflection" prompt that appears on the dashboard on Mondays (or day after last event of the week). Show: "Last week: X events, $Y revenue, Z% repeat clients. What went well? What to improve?" Use existing retro data, don't create new tables.
- **Read first:** `lib/operations/weekly-retro-actions.ts`, `components/dashboard/`
- **Done when:** Weekly retro prompt appears contextually on dashboard, tsc clean

### Agent 18: Email Pipeline Strength (Principle #11 - "Pen mightier than sword")

- **Model:** opus
- **Task:** The communication pipeline is built but some lifecycle transitions don't auto-trigger emails. Audit the event state machine transitions and ensure each major transition has an email or notification wired. Check: (1) Event confirmed -> client gets confirmation email, (2) Menu finalized -> client gets menu preview, (3) 48h before event -> client gets "what to expect" email. Wire any missing triggers using existing `lib/communication/` infrastructure.
- **Read first:** `lib/communication/cadence-trigger-handler.ts`, `lib/events/event-transitions.ts`, `lib/email/`
- **Done when:** 3+ lifecycle transitions newly wired to communications, tsc clean

---

## Wave 5: RESILIENCE & GRACE (Parallel - After Wave 4 Verified)

> System heals itself. UI has grace. Boundaries are clean.

### Agent 19: Self-Healing Patterns (Principle #12 - "Be the change")

- **Model:** opus
- **Task:** Add resilient defaults where the system currently shows errors or blank states on missing data. Pattern: if a derived value can't be computed, show the best available fallback with a "(estimated)" label instead of failing. Examples: (1) If PIE price unavailable, show last known price with staleness indicator instead of "No price", (2) If event timeline can't auto-generate (missing prep times), show a manual template instead of empty, (3) If client dietary info missing, show "Not provided" with a "Request from client" action instead of blank.
- **Read first:** `lib/pricing/resolve-price.ts` (already has fallback tiers), `components/events/event-timeline-view.tsx`
- **Done when:** 5 self-healing fallbacks added with "(estimated)" or "(not provided)" indicators, tsc clean

### Agent 20: Micro-Progress Indicators (Principle #7 - "One small step")

- **Model:** haiku
- **Task:** Add small progress indicators to multi-step processes so the chef sees incremental wins. Targets: (1) Event setup: show "3 of 7 steps complete" with checkmarks, (2) Menu building: show dish count / target count, (3) Inquiry response: show "response drafted, not sent" vs "sent, awaiting reply." Use the existing completion contract (`lib/completion/`) to derive progress. Render as small progress pills or checklists.
- **Read first:** `lib/completion/completion-engine.ts`, `components/events/`, `components/menus/`
- **Done when:** 3 multi-step flows show incremental progress, tsc clean

### Agent 21: Domain Boundary Hygiene (Principle #13 - "Hell is other people")

- **Model:** haiku
- **Task:** Find 5 cases where components import directly from another domain's internal files (not through the domain's public actions). Example: a pricing component importing from `lib/events/internal-helpers.ts`. These cross-boundary imports create coupling. For each: either (1) re-export the needed function from the domain's public API (actions.ts), or (2) extract the shared logic into `lib/shared/`. Do NOT break existing functionality.
- **Read first:** `docs/CLAUDE-DOMAINS.md`, `graphify-out/GRAPH_REPORT.md`
- **Done when:** 5 cross-boundary imports cleaned up, tsc clean

### Agent 22: Grace Micro-Interactions (Principle #15 - "Float like butterfly, sting like bee")

- **Model:** haiku
- **Task:** Add subtle UI polish to high-traffic interactions. Targets: (1) Status badge transitions: when status changes, badge should have a brief color transition (not instant swap), (2) Card hover: slight elevation/shadow increase on hoverable cards, (3) Action completion: brief checkmark animation on successful save (not a full-page toast for minor saves). Use Tailwind `transition-*` classes only. No animation libraries.
- **Read first:** `components/ui/status-badge.tsx`, `components/dashboard/`, `tailwind.config.ts`
- **Done when:** 3 micro-interactions added with Tailwind transitions, tsc clean

---

## Verification Protocol

- Each agent runs `npx tsc --noEmit --skipLibCheck` before reporting done
- Orchestrator does NOT build. Orchestrator dispatches, monitors, verifies.
- After each wave: full typecheck must pass
- After Wave 5: Playwright verification of dashboard, event detail, and inquiry flow
- Anti-Loop: 3 strikes on same error = stop, report, let developer decide
- No new tables. No new migrations. Wire existing infrastructure only.

## Orchestrator Rules

1. You are the COORDINATOR. You do not write implementation code.
2. Dispatch agents via the Agent tool with appropriate model tier.
3. After dispatching a wave, wait for all agents to complete.
4. Verify each agent's output (type check, screenshot if UI changed).
5. Only proceed to next wave after current wave is fully verified.
6. If an agent fails: diagnose, give it one retry with better context, then flag.
7. At completion: commit all work with message "feat: 20-principles philosophical alignment pass", push.
8. Wave 1 agents produce FINDINGS only (markdown). Waves 2-5 produce CODE.
9. Agents 11-14 (Wave 3) are Opus-tier because they require multi-file judgment.
10. Total agent count: 22 agents across 5 waves (5 + 5 + 4 + 4 + 4).

## Model Tier Summary

| Tier  | Agents                          | Why                                                 |
| ----- | ------------------------------- | --------------------------------------------------- |
| Haiku | 1-5 (audits), 7-9, 15-17, 20-22 | Mechanical: grep, classify, small edits             |
| Opus  | 6, 10-14, 18-19                 | Judgment: multi-file wiring, architecture decisions |

## Principle Coverage Verification

After all waves, confirm each principle has a visible effect:

- [1] CIL signals on dashboard (Agent 11)
- [2] Weekly retro nudge (Agent 17)
- [3] Ambiguous states fixed (Agent 7)
- [4] Progress toward blueprint visible via completion indicators (Agent 20)
- [5] Unjustified confirmations removed (Agent 6)
- [6] Forced workflows made flexible (Agent 10)
- [7] Micro-progress indicators (Agent 20)
- [8] Error states suggest actions (Agent 15)
- [9] PIE data in more places (Agent 12)
- [10] Next-action suggestions (Agent 13)
- [11] Lifecycle emails wired (Agent 18)
- [12] Self-healing fallbacks (Agent 19)
- [13] Domain boundaries cleaned (Agent 21)
- [14] Dead conventions replaced (Agent 9)
- [15] Micro-interactions added (Agent 22)
- [16] Information hierarchy fixed (Agent 16)
- [17] (merged with #1)
- [18] This swarm itself IS principle 18 in action
- [19] Empty states enriched (Agent 8)
- [20] Smart defaults from history (Agent 14)
