# Adaptive App Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform ChefFlow from a 662-page maze into a focused ~15-page app feel by unifying 6 surface visibility systems, collapsing nav into umbrella categories, and building hub pages with horizontal tabs.

**Architecture:** Unified Surface Graph merges 6 existing visibility systems (progressive disclosure, module toggles, focus mode, feature registry, surface registry, shell budget) into a single `resolveSurfaceVisibility()` resolver. Hub Page Pattern replaces nav sub-items with route-based horizontal TabNav tabs in domain layout.tsx files. Day-1 Defaults define deterministic starter surface for new chefs. Usage Analytics infrastructure enables future adaptive behavior.

**Tech Stack:** Next.js App Router layouts, TabNav compound component (`components/shared/tab-nav.tsx`), Drizzle ORM, server actions

**CRITICAL CONSTRAINT:** NEVER delete any pages, routes, components, or code. All changes are additive. Existing routes remain accessible via All Features nav, command palette, and direct URL.

---

## Work Streams (All Parallel)

### WS-1: Unified Surface Graph + Day-1 Defaults

**Files:**

- Read: `lib/surfaces/runtime-surface-contract.ts`, `lib/progressive-disclosure/`, `lib/billing/modules.ts`, `lib/billing/focus-mode.ts`, `lib/features/registry.ts`, `lib/interface/surface-governance.ts`
- Create: `lib/surfaces/surface-graph.ts`, `lib/surfaces/day-one-defaults.ts`, `lib/surfaces/route-metadata.ts`

- [ ] Read all 6 existing visibility systems and understand their APIs
- [ ] Create `surface-graph.ts` with unified `SurfaceGraph` class and `resolveSurfaceVisibility(routePath, chefContext)` function
- [ ] Create `route-metadata.ts` with tier classification (day-one / week-one / established / power / admin) for key routes
- [ ] Create `day-one-defaults.ts` with archetype-aware defaults (private-chef, caterer, restaurant, bakery, meal-prep, food-truck)
- [ ] Export clean types for consumers
- [ ] Commit: `feat(surfaces): unified surface graph + day-1 defaults`

### WS-2: Nav Config Collapse

**Files:**

- Modify: `components/navigation/nav-config.tsx`

- [ ] Read current nav-config.tsx structure (1959 lines, 7 primary items with subMenus)
- [ ] Remove all `subMenu` arrays from `standaloneTop` primary items
- [ ] Each primary item becomes direct link: Today→/dashboard, Events→/events, Culinary→/culinary, Clients→/clients, Finance→/finance, Circles→/circles
- [ ] KEEP: All Features collapse, Action Bar (8 items), mobile tabs, Create dropdown, all nav group definitions
- [ ] Commit: `feat(nav): collapse sidebar to umbrella categories`

### WS-3: Clients Hub Layout

**Files:**

- Create: `app/(chef)/clients/layout.tsx`, `app/(chef)/clients/clients-hub-nav.tsx`

- [ ] Read existing clients directory structure and page.tsx
- [ ] Create `clients-hub-nav.tsx` (client component) with route-based horizontal tabs: Directory, Communication, Insights, History
- [ ] Create `layout.tsx` that renders hub nav + children (skip nav on detail pages /clients/[id])
- [ ] Status routes (active/inactive/VIP) become filter concerns, not tabs
- [ ] Secondary routes (duplicates, gift-cards, loyalty, intake) accessible via All Features only
- [ ] Commit: `feat(clients): hub page with horizontal tab navigation`

### WS-4: Culinary Hub Layout

**Files:**

- Create: `app/(chef)/culinary/layout.tsx`, `app/(chef)/culinary/culinary-hub-nav.tsx`

- [ ] Primary tabs: Culinary (default), Recipes, Menus, Prep, Ingredients
- [ ] Secondary (not tabs): chefnotes, cheftips, costing, dish-index, my-kitchen, price-catalog, seasonal-calendar, sourcing, substitutions, supplier-calls, vendors, call-sheet
- [ ] Same pattern as WS-3
- [ ] Commit: `feat(culinary): hub page with horizontal tab navigation`

### WS-5: Finance Hub Layout

**Files:**

- Create: `app/(chef)/finance/layout.tsx`, `app/(chef)/finance/finance-hub-nav.tsx`

- [ ] Primary tabs: Overview (default), Invoices, Expenses, Ledger
- [ ] Secondary: bank-feed, cash-flow, contractors, disputes, export, forecast, goals, payments, payouts, payroll, planning, plate-costs, recurring
- [ ] Same pattern as WS-3
- [ ] Commit: `feat(finance): hub page with horizontal tab navigation`

### WS-6: Events Hub Layout

**Files:**

- Create: `app/(chef)/events/layout.tsx`, `app/(chef)/events/events-hub-nav.tsx`

- [ ] Primary tabs: Events (default), Board, Calendar (links to /calendar)
- [ ] Status routes (awaiting-deposit, cancelled, completed, confirmed) become filter concerns
- [ ] Secondary: csv-export, equipment-check, cannabis
- [ ] Same pattern as WS-3
- [ ] Commit: `feat(events): hub page with horizontal tab navigation`

### WS-7: Usage Analytics Infrastructure

**Files:**

- Create: `database/migrations/XXXX_surface_usage_events.sql`, `lib/surfaces/analytics/usage-tracking.ts`, `lib/surfaces/analytics/mock-profiles.ts`

- [ ] Check latest migration timestamp in database/migrations/
- [ ] Create additive migration for `surface_usage_events` table (chef_id, route_path, event_type, metadata, created_at)
- [ ] Create `usage-tracking.ts` with `logSurfaceVisit()`, `logSurfaceAction()`, `logSurfacePin()` server actions (fire-and-forget)
- [ ] Create `mock-profiles.ts` with 3 test profiles (new-chef, established-chef, power-user) clearly marked as test data
- [ ] Commit: `feat(surfaces): usage analytics infrastructure`
