# Swarm Handoff: Contextual Rail Design

**Date:** 2026-05-18
**Phase:** Brainstorming — design approved conceptually, spec not yet written
**Status:** Research complete, mockup validated, ready for full spec + approach proposal

---

## PASTE THIS INTO A FRESH CONTEXT WINDOW:

---

We're designing the Contextual Rail — the most important UX feature in ChefFlow. Read these files in order, then continue the brainstorming process (we're on step 3: "Propose 2-3 approaches with tradeoffs"):

### Required Reading (in order):

1. `docs/specs/contextual-rail-research.md` — Full research: top business success patterns mapped to 8 Rail intelligence categories, design principles, per-page activation matrix, and the `/rail-audit` skill concept.
2. `docs/intensify/rail.md` — Current Rail system state: 3 deep-pass runs, what's built, what's wired, what's dead code, what resolvers exist.
3. `CLAUDE.md` — Project rules (mandatory).

### What Exists Today:

- **RailStrip** — thin top bar on every page, 5 items max, auto-rotates every 8s, SSE real-time refresh. Lives in `components/rail/rail-strip.tsx`, rendered in `app/(chef)/layout.tsx`.
- **TieredRail** — full 4-tier rail (Critical/Action/Awareness/Opportunity) on dashboard only. Lives in `components/rail/tiered-rail.tsx`, rendered in `app/(chef)/dashboard/_sections/widget-sections.tsx`.
- **42 God Mode resolvers** in `lib/discovery/resolvers/chef/` — inquiries, messages, payments, events, quotes, contracts, prep, shopping, weather, CIL, lifecycle, cadence, completion, and more.
- **226-item Chef Rail Registry** in `lib/discovery/registries/chef-rail-registry.ts` with page affinity fields (currently dead — `currentPage` hardcoded null in `rail-tier-assigner.ts` line 144).
- **Scoring engine** — `computeUniversalRailScore()` in `lib/discovery/universal-rail-scoring.ts`. Multiplicative model with urgency, relevance, freshness, user affinity, fatigue, and boost. 7 role weight profiles.
- **Shell budget system** — `resolveChefShellBudgetWithDensity()` already controls what renders per route. Side panel / rail panel can plug into this.

### What We Decided:

1. **Three Rail surfaces** — keep the strip (ticker), keep the dashboard rail (main artery/central nervous system), ADD a new Contextual Rail panel at the top of every page.
2. **Top-of-page placement** — not a side panel. A collapsible intelligence banner above page content.
3. **8 intelligence categories**: Readiness, Money, People, Time, Risk, Intelligence, Communication, Actions. Each page activates a subset.
4. **Per-page Rail Profiles** — each URL pattern gets a profile defining which categories, engines, and resolvers are active. Built via a `/rail-audit` skill that optimizes URL by URL.
5. **Dashboard = main artery** — shows everything across all categories. Per-URL = bloodline for that specific page.
6. **Full cohesiveness** — every URL eventually knows how it connects to every other URL.

### Design Principles (non-negotiable):

- **Collapsible** — one-line summary when collapsed (readiness %, critical count, key facts). Completely out of your face.
- **Hover for details** — popovers/tooltips on intel cards. No page navigation to learn more.
- **Inline actions** — check-off items, send messages, approve things directly from the Rail. Never leave the page.
- **Quick menus** — mini-panels/dropdowns for common actions right in the Rail.
- **Temporal awareness** — knows what you were doing before, what's next, what changed recently.
- **Not a status bar** — it's a context-aware operational copilot that THINKS about what you're doing.

### What Needs To Happen Next:

1. **Propose 2-3 architectural approaches** — how does the per-page Rail Profile system work? Server component per page? Layout-level with route matching? Client-side filtering from a single payload? Tradeoffs.
2. **Design the Rail Profile schema** — what does a profile look like? Which fields? How does the `/rail-audit` skill generate them?
3. **Walk through 3-4 specific pages** in detail — event detail, client detail, menu detail, calendar. What exactly shows in each category on each page?
4. **Write the full design spec** to `docs/superpowers/specs/2026-05-18-contextual-rail-design.md`
5. **Create implementation plan** via the writing-plans skill.

### Visual Companion:

A mockup of the menu detail page Rail was created and validated. It shows:

- Expanded: 4-column layout (Client Intel, Price Intel, Context, Actions) with readiness bar on top
- Collapsed: single line with readiness %, critical count, and key facts ticker
- David approved this direction enthusiastically

The mockup lives in `.superpowers/brainstorm/514-1779085371/content/contextual-rail-menu-page.html` if you want to spin up the visual companion again for more mockups.

### Key Architecture Files to Read:

- `components/rail/` — all 7 rail components
- `lib/discovery/universal-rail-scoring.ts` — scoring engine
- `lib/discovery/rail-tier-assigner.ts` — tier assignment pipeline
- `lib/discovery/universal-rail-assembly.ts` — assembly orchestration
- `lib/discovery/universal-rail-actions.ts` — server actions hub
- `lib/discovery/registries/chef-rail-registry.ts` — 226 item definitions
- `lib/discovery/resolvers/chef/` — 42 resolvers
- `app/(chef)/layout.tsx` — shell structure where Rail lives

### Tone:

David speaks chef/business language, not engineering. He's the product visionary. Translate his intent into technical design. The Rail is his most ambitious UX concept — treat it with the gravity it deserves. This is the feature that makes ChefFlow feel like it THINKS.
