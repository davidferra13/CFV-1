# BUILD: First-Time Chef Experience (Progressive Disclosure)

## Context

ChefFlow is a Next.js + PostgreSQL (Drizzle ORM) + Auth.js v5 private chef operations platform. Read `CLAUDE.md` before doing anything.

## Problem

A brand-new chef with zero data sees the FULL complexity of a power user:

- Dashboard shows 15+ widget sections with headers (most empty)
- Sidebar shows all 13 nav groups regardless of data state
- No progressive disclosure hides irrelevant features
- Result: overwhelming, intimidating, "where do I even start?"

## What to Build

### 1. Dashboard Progressive Disclosure

- Read the dashboard page (likely `app/(chef)/dashboard/` or `app/(chef)/page.tsx`)
- Read all dashboard widgets (likely `components/dashboard/`)
- Implement progressive disclosure: hide widget sections that have zero data AND the chef has never used that feature
- Priority widgets always visible: upcoming events, recent inquiries, quick actions
- Secondary widgets appear only after the chef has data in that area (e.g., financial summary appears after first invoice)
- Use a simple heuristic: count rows in relevant tables for this tenant. No complex onboarding state machine.
- Empty dashboard should feel clean and actionable, not empty and broken

### 2. Sidebar Progressive Disclosure

- Read the sidebar/nav component (likely `components/navigation/` or `components/layout/`)
- Read `nav-config.tsx` for the full nav structure
- Group nav items into "starter" (always visible) and "advanced" (show after first use)
- Starter: Dashboard, Events, Clients, Recipes, Inquiries
- Advanced: everything else (Financials, Documents, Staff, Network, Prospecting, etc.)
- Advanced items appear individually once the chef has data in that area
- Add a "Show all features" toggle at the bottom of the sidebar that reveals everything
- Remember the toggle preference (localStorage or DB setting)

### 3. Zero-State Widget Design

- For widgets that ARE shown but have no data, ensure the empty state is helpful:
  - Show a clear action CTA ("Create your first event", "Add a recipe")
  - NOT just "No data" or an empty table
- Follow existing empty state patterns in the codebase (search for "No events" or "empty" in components)

### 4. CRITICAL CONSTRAINT

- **NEVER add a redirect gate or full-page blocker based on onboarding status.** Read CLAUDE.md section "No Forced Onboarding Gates in Chef Layout." Users must always navigate freely. This is progressive disclosure of UI chrome, not access gating.

## Key Files to Read First

- `CLAUDE.md` (mandatory, especially "No Forced Onboarding Gates" section)
- `app/(chef)/layout.tsx` - chef layout (DO NOT add redirects here)
- `app/(chef)/dashboard/` or `app/(chef)/page.tsx` - dashboard
- `components/dashboard/` - all dashboard widgets
- `components/navigation/` or `components/layout/` - sidebar
- `nav-config.tsx` or search for nav configuration
- `docs/specs/universal-interface-philosophy.md` - UI philosophy

## Rules

- Read CLAUDE.md fully before starting
- No em dashes anywhere
- NEVER gate navigation. Progressive disclosure = showing/hiding UI chrome, not blocking access
- No new database tables needed - use counts/existence checks on existing tables
- Test with Playwright / screenshots (use agent account)
- Performance: nav data checks should be lightweight (single query, cached)
- localStorage for toggle preference is fine (no need to persist to DB)
