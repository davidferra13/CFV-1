# Exit-Point Closure Swarm Build

> Paste this entire prompt into a fresh Claude Code session.
> It will orchestrate 8 specs across 4 waves with parallel agents.

---

## ORCHESTRATOR PROMPT

You are the build orchestrator for the Exit-Point Closure initiative. Your job is to dispatch parallel agents in waves, verify each wave, then proceed to the next. You do NOT build code yourself. You coordinate.

### Context

8 product specs were written from `docs/research/chef-exit-points-analysis.md`. They close all 64 scenarios where chefs leave ChefFlow. Read these specs before dispatching:

| Wave | Spec                           | File                                           | Why This Wave                                                                |
| ---- | ------------------------------ | ---------------------------------------------- | ---------------------------------------------------------------------------- |
| 0    | Frictionless Return UX Pattern | `docs/specs/frictionless-return-ux-pattern.md` | Foundation: ExternalLink + ReturnCapturePrompt components used by all others |
| 1a   | Communication Capture Loop     | `docs/specs/communication-capture-loop.md`     | No new tables, layers on existing infrastructure                             |
| 1b   | Shopping List & Order Bridge   | `docs/specs/shopping-list-order-bridge.md`     | No new tables, extends existing generateShoppingList()                       |
| 1c   | Culinary Reference Library     | `docs/specs/culinary-reference-library.md`     | Static JSON seed, no migrations in Phase 1                                   |
| 2a   | Client Intelligence Capture    | `docs/specs/client-intelligence-capture.md`    | Schema changes: 10 new columns on clients + event_references table           |
| 2b   | Event Intelligence Panel       | `docs/specs/event-intelligence-panel.md`       | Schema changes: venue FK, event_equipment_rentals table                      |
| 2c   | Business Operations Dashboard  | `docs/specs/business-operations-dashboard.md`  | Schema changes: credential/insurance columns                                 |
| 3    | PIE Coverage Gap Closure       | `docs/specs/pie-coverage-gap-closure.md`       | Most complex: 2 new tables, resolution chain tiers, 6 phases                 |

### Wave Execution Protocol

For each wave:

1. **Read every spec in the wave** before dispatching agents
2. **Dispatch agents in parallel** (one per spec, same wave)
3. **Each agent prompt MUST include:**
   - "Read `[spec-path]` and build exactly what it describes."
   - "Use ExternalLink component from `components/ui/external-link.tsx` for any outbound links (built in Wave 0)."
   - "Run `npm run regression:firewall` before marking done."
   - "Run `/wire-audit` before marking done."
   - Scope constraints: which files/folders the agent should touch
   - Done-when criteria from the spec
4. **After all agents in a wave complete:**
   - Run `npx tsc --noEmit --skipLibCheck` (must pass)
   - Run `npm run regression:firewall` (must pass)
   - Commit wave: `git add -A && git commit -m "feat(exit-points): wave N - [description]"`
5. **Only proceed to next wave after current wave passes verification**

### Wave 0: Foundation (1 agent, sequential gate)

Dispatch ONE agent (model: sonnet):

```
Read `docs/specs/frictionless-return-ux-pattern.md` and build it.

Deliverables:
1. `components/ui/external-link.tsx` - ExternalLink component with exit-type classification (permanent/reducible/bridgeable), external icon, target="_blank"
2. `components/ui/return-capture-prompt.tsx` - Dismissible bottom-of-viewport banner triggered by visibilitychange event. Pre-fills entity context. Never a modal.
3. Modify `components/ui/breadcrumb-bar.tsx` - Add snap-back stack (max 3 deep) for cross-domain navigation
4. `lib/navigation/breadcrumb-tracker.ts` - Breadcrumb memory logic

No new routes. No database changes. No new pages.
Export ExternalLink and ReturnCapturePrompt from components/ui/index.

Run `npx tsc --noEmit --skipLibCheck` before marking done.
Run `npm run regression:firewall` before marking done.
```

**Gate:** TypeScript compiles. Regression firewall passes. Commit.

### Wave 1: Zero-Schema Builds (3 agents, parallel)

**Agent 1a** (model: sonnet):

```
Read `docs/specs/communication-capture-loop.md` and build it.

Scope: lib/communication/, components/communication/, app/(chef)/communication/
No new tables. Layer on existing communication_events + conversation_threads.
Use ExternalLink component from components/ui/external-link.tsx for outbound links.

Key deliverables:
- Quick Capture Widget (one-tap post-conversation logger)
- Info Change Detection (heuristic scan of captured text for guest count, dietary, date changes)
- Vendor Coordination Log (per-event vendor touchpoint tracker)
- Communication Timeline UI (unified view of getUnifiedThread())

Run `npx tsc --noEmit --skipLibCheck` before marking done.
Run `npm run regression:firewall` before marking done.
```

**Agent 1b** (model: sonnet):

```
Read `docs/specs/shopping-list-order-bridge.md` and build it.

Scope: lib/shopping/, components/shopping/, app/(chef)/culinary/shopping/
No new tables. Extend existing generateShoppingList().
Use ExternalLink component from components/ui/external-link.tsx for vendor links.

Key deliverables:
- Auto-generated shopping list from menu/event with guest-count scaling
- Multi-event consolidation (merge across date range)
- Export formats (clipboard, email, print)
- Per-vendor sublists with vendor assignment
- Pantry offset (subtract on-hand items)

Run `npx tsc --noEmit --skipLibCheck` before marking done.
Run `npm run regression:firewall` before marking done.
```

**Agent 1c** (model: sonnet):

```
Read `docs/specs/culinary-reference-library.md` and build it.

Scope: lib/reference/, components/reference/, data/reference/
Static JSON seed files, no migrations in Phase 1.
Use ExternalLink component from components/ui/external-link.tsx for FDA/USDA source links.

Key deliverables:
- Food safety quick reference (static JSON: temps, hold times, cooling protocols)
- Substitution engine (~200 curated swap rules with ratios and reasons)
- Allergy & dietary condition reference cards (Big 9 + common intolerances)
- Nutritional data (USDA FoodData Central, per-ingredient macros)
- Accessible from recipe/event/client views and command palette, NOT new nav items

Run `npx tsc --noEmit --skipLibCheck` before marking done.
Run `npm run regression:firewall` before marking done.
```

**Gate:** All 3 compile. Regression firewall passes. Commit.

### Wave 2: Schema Changes (3 agents, parallel)

**Agent 2a** (model: sonnet):

```
Read `docs/specs/client-intelligence-capture.md` and build it.

Scope: lib/clients/, components/clients/, database/migrations/
Migration: 10 new columns on clients table + event_references table.
Use ExternalLink component from components/ui/external-link.tsx for social media links.
Use ReturnCapturePrompt from components/ui/return-capture-prompt.tsx after social research exits.

Key deliverables:
- Client intel fields (household_size, children_ages, lifestyle_tags, kitchen_quality, etc.)
- Pre-event intel checklist (computed at render, not persisted)
- Event reference pinning (URLs + images attached to events)
- Client history intelligence (deterministic pattern extraction from event history)

Write migration. Do NOT run drizzle-kit push.
Run `npx tsc --noEmit --skipLibCheck` before marking done.
Run `npm run regression:firewall` before marking done.
```

**Agent 2b** (model: sonnet):

```
Read `docs/specs/event-intelligence-panel.md` and build it.

Scope: lib/events/, components/events/, database/migrations/
Migration: venue_profile_id FK on events, travel columns, event_equipment_rentals table.
Use ExternalLink component for map/weather/venue link-outs.
Use ReturnCapturePrompt for venue research returns.

Key deliverables:
- Venue Profile Card (kitchen specs, parking, access notes)
- Event Map View (embedded Google Maps link per event)
- Nearby Store Finder (link to Google Maps, don't build routing)
- Weather Widget (Open-Meteo API, 3-day forecast on event detail)
- Travel & Equipment Notes (structured fields on event)

Write migration. Do NOT run drizzle-kit push.
Run `npx tsc --noEmit --skipLibCheck` before marking done.
Run `npm run regression:firewall` before marking done.
```

**Agent 2c** (model: sonnet):

```
Read `docs/specs/business-operations-dashboard.md` and build it.

Scope: lib/business-ops/, components/business-ops/, database/migrations/, app/(chef)/business/
Migration: credential/insurance tracking columns or tables per spec.

Key deliverables:
- Credential Tracker (food handler's license, permits, certifications with expiry reminders)
- Insurance Tracker (policy info, renewal dates, agent contact)
- Trusted Staff Roster (lightweight; "Promote to Staff" bridges to full staff system)
- Equipment Inventory (major items only, shares chef_equipment table)
- Tax Prep Export card (reuses existing CPA export pipeline)

Write migration. Do NOT run drizzle-kit push.
Run `npx tsc --noEmit --skipLibCheck` before marking done.
Run `npm run regression:firewall` before marking done.
```

**Gate:** All 3 compile. Migrations review (read each migration, verify additive-only). Regression firewall passes. Commit.

### Wave 3: PIE Coverage Gap Closure (1 agent, opus)

This is the most complex spec. It touches the pricing resolution chain.

**Agent 3** (model: opus):

```
Read `docs/specs/pie-coverage-gap-closure.md` and build it.

This is a 6-phase spec. Build Phase 1 (freshness model + coverage dashboard) and Phase 2 (manual price pinning) only. Phases 3-6 are future work.

Scope: lib/pie/, lib/pricing/, components/pricing/, database/migrations/
Migration: pinned price columns on ingredients, vendor_prices table.

Phase 1 deliverables:
- Freshness state model (fresh/aging/stale/expired with category-aware thresholds)
- Coverage gap dashboard (measures coverage against chef's actual recipe book)
- Freshness alerts (proactive notifications for stale/expiring prices)

Phase 2 deliverables:
- Manual price pinning (Tier 0.5 in resolution chain, pushpin UI, expiration tracking)
- Pin management view (list all pinned prices, bulk expire)

Do NOT build Phases 3-6 (price comparison, seasonal calendar, vendor import, cost modeler).
Write migration. Do NOT run drizzle-kit push.
Run `npx tsc --noEmit --skipLibCheck` before marking done.
Run `npm run regression:firewall` before marking done.
```

**Gate:** Compiles. Resolution chain still works for existing prices. Regression firewall passes. Commit.

### Post-Build Closeout

After all 4 waves:

1. Run `npx tsc --noEmit --skipLibCheck` (full typecheck)
2. Run `npm run regression:firewall` (full regression)
3. Run `npm run test:affected` (test suite)
4. Review all migrations in order (must be additive-only, no drops)
5. Final commit: `feat(exit-points): complete exit-point closure waves 0-3`
6. Push to GitHub

### Rules

- NEVER run `drizzle-kit push` without explicit approval
- NEVER drop tables, columns, or delete data
- All migrations additive-only
- Each agent reads its spec file first, builds exactly what it says
- If an agent fails 3 times on same error, commit partial progress and report
- Use `http://localhost:3100` for any browser verification
- Never use em dashes in any generated code or content
