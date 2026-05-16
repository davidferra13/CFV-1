# ORCHESTRATION MISSION: Route Consolidation (-217 routes)

> Reduce ChefFlow from 932 pages to ~715 via structural consolidation. Zero features deleted. Every page becomes a tab, filter param, or redirect.

## Context Load (Read These First)

- `CLAUDE.md` (project rules, mandates)
- `docs/specs/hub-consolidation.md` (the 7-hub architecture - principles, tab assignments)
- `docs/chef-portal-navigation-audit.md` (orphan inventory, status-as-page catalog, Section 10 hit list)
- `docs/intensify/route-proliferation.md` (root causes, consolidation math)
- `docs/intensify/build-performance.md` (why this matters: 22-min builds, OOM at 16GB)

## Session Decisions (Do Not Re-Debate)

- ZERO DELETIONS. Every feature survives as a tab, panel, filter, or redirect.
- Tabs component (`components/ui/tabs`) is the consolidation mechanism. Only 11 pages use it today.
- Status-as-route pages become `?status=X` query params on parent list pages.
- Thin redirects from old URLs preserve bookmarks (pattern proven: 62 already exist in quotes/\*).
- Event detail keeps its own page (`/events/[id]`) but sub-routes become tabs WITHIN it.
- Settings collapses from 96 pages to 10 grouped sections with Tabs.
- Per `memory/feedback_never_delete_code.md`: no route deletions. Consolidate only.
- Build queue items #4 (Route Coverage CI) and #7 (Route Manifest) are prerequisites for #8 (Dead Route Cleanup) but NOT for this consolidation work.

## Wave 1 (Parallel - Launch Immediately)

### Agent 1: Status-as-Route Elimination (~60 routes → filter params)

- **Model:** opus
- **Task:** Convert status-filtered pages to query-param filters on their parent list. Each status page (e.g., `app/(chef)/events/confirmed/page.tsx`) should become a thin redirect to the parent with `?status=confirmed`. The parent list page should read the `status` searchParam and apply the filter. Use the proven pattern from `app/(chef)/quotes/accepted/page.tsx` (thin redirect already exists).
- **Scope:** Start with these confirmed clusters:
  - `events/{confirmed,cancelled,completed,upcoming,awaiting-deposit}` → `/events?status=X`
  - `leads/{archived,contacted,converted,qualified}` → `/leads?status=X`
  - `invoices/{draft,paid,sent,overdue,cancelled,refunded}` → `/finance/invoices?status=X`
  - `inquiries/{awaiting-response,declined,expired,new}` → `/inquiries?status=X`
  - Any other status-as-page routes found in same pattern
- **Read first:** `docs/specs/hub-consolidation.md` (Principle #4: Filters over pages), existing redirect example at `app/(chef)/quotes/accepted/page.tsx`, the parent list pages for each domain
- **Done when:** Each status page is a thin redirect (import parent, redirect with searchParam). Parent list pages accept `?status=` and filter accordingly. Old URLs still work via redirect. `npx tsc --noEmit --skipLibCheck` passes.

### Agent 2: Duplicate Route Deduplication (14 exact duplicates → redirects)

- **Model:** haiku
- **Task:** Create thin redirects from duplicate routes to their canonical counterparts. Pure mechanical work.
- **Scope:**
  - `/social/*` (11 pages) → redirect to `/marketing/social/*` (canonical)
  - `/safety/*` (7 pages) → redirect to `/settings/compliance/*` (canonical, more complete)
  - `/chef/cannabis/*` (2 pages) → redirect to `/cannabis/*` (canonical)
  - Verify no unique content exists in the duplicate before redirecting
- **Read first:** Both sides of each duplicate pair. Verify they are truly duplicates (same or near-identical content).
- **Done when:** Duplicate pages replaced with `redirect()` calls to canonical. Old URLs work. No content lost. tsc passes.

### Agent 3: Settings Architecture Consolidation (96 pages → 10 sections)

- **Model:** opus
- **Task:** Redesign settings from 96 individual pages into 10 grouped TabsContent sections. This is the highest route-reduction move (-86 routes).
- **Scope:** The 10 target sections (from hub-consolidation spec):
  1. Profile & Identity (name, bio, avatar, certifications, specialties)
  2. Business & Billing (pricing defaults, Stripe, tax, payment terms)
  3. Notifications & Communications (email prefs, SMS, push, digests)
  4. Team & Access (roles, permissions, delegation, staff accounts)
  5. Integrations (calendar, POS, platforms, API keys)
  6. Preferences & Display (theme, locale, units, timezone, density)
  7. Security & Privacy (password, 2FA, sessions, data export)
  8. Branding & Customization (colors, logo, portal theme, email signature)
  9. Compliance & Safety (food safety, insurance, licenses, GDPR)
  10. Advanced (developer, feature flags, danger zone, account deletion)
- **Read first:** `docs/specs/hub-consolidation.md`, `app/(chef)/settings/` (all 96 pages - scan to understand groupings), existing Tabs usage in the app, the build queue item "Settings Information Architecture And Preferences UI Cleanup"
- **Architecture:** Create `app/(chef)/settings/page.tsx` as the shell with 10 Tabs. Each current settings page becomes a TabsContent panel rendered within its section. Use URL hash (`#section-name`) or searchParam (`?tab=security`) for deep linking. Create thin redirects from all 96 old URLs to the new `/settings?tab=X` URL.
- **Done when:** All 96 settings pages consolidated into 10 tab sections. Old URLs redirect correctly. No settings functionality lost. Tabs UI works. tsc passes.

## Wave 2 (After Wave 1 Verified)

### Agent 4: Event Detail Tab Consolidation (41 sub-routes → tabs)

- **Model:** opus
- **Task:** Convert event `[id]` sub-routes into tabs within the event detail page. The event detail (`app/(chef)/events/[id]/page.tsx`) already imports 60+ modules and functions as a workspace. Sub-routes should be absorbed as tabs.
- **Scope:** All routes under `app/(chef)/events/[id]/` that are separate pages:
  - menu, guests, timeline, billing, logistics, photos, notes, gear, contracts, documents, shopping, prep, packing, feedback, recap, share, etc.
  - Each becomes a tab within the event detail workspace
- **Read first:** `app/(chef)/events/[id]/page.tsx` (the workspace), all sub-route pages, `docs/specs/hub-consolidation.md` (Events hub section, note: "Event detail remains a full page because it has its own complex tab structure")
- **Architecture:** Event detail page gets a Tabs component with all sub-views as TabsContent. URL pattern: `/events/[id]?tab=menu` or `/events/[id]/menu` (keep nested routes but render as tabs via layout). Old deep links must still work.
- **Why Wave 2:** Depends on Wave 1 because event status pages (confirmed/cancelled) are handled in Wave 1 Agent 1. Must not conflict.
- **Done when:** Event detail renders all sub-views as tabs. Navigation between sub-views doesn't trigger full page load. All sub-route URLs still resolve. tsc passes.

### Agent 5: Client Detail Tab Consolidation (22 sub-pages → 5 tabs)

- **Model:** haiku
- **Task:** Absorb client sub-pages into tabbed client detail view.
- **Scope:**
  - insights/5 pages → "Insights" tab
  - preferences/5 pages → "Preferences" tab
  - loyalty/4 pages → "Loyalty" tab
  - communication/4 pages → "Communication" tab
  - history/4 pages → "History" tab
- **Read first:** `app/(chef)/clients/[id]/page.tsx`, all sub-route pages, existing tab patterns from Wave 1
- **Done when:** Client detail has 5 tabs absorbing 22 pages. Old URLs redirect. tsc passes.

## Verification Protocol

- Each agent runs `npx tsc --noEmit --skipLibCheck` before reporting done
- Orchestrator verifies old URLs still work (redirect, not 404)
- After Wave 1: full tsc + spot-check 5 redirects in browser
- After Wave 2: full tsc + Playwright verification of event detail and client detail flows
- Anti-Loop: 3 strikes on same error = stop, report, let developer decide
- NEVER delete a page.tsx without creating its redirect first

## Orchestrator Rules

1. You are the COORDINATOR. You do not write implementation code.
2. Dispatch agents via the Agent tool with appropriate model tier.
3. After dispatching a wave, wait for all agents to complete.
4. Verify each agent's output (type check, redirect test, behavioral check).
5. Only proceed to Wave 2 after Wave 1 is fully verified.
6. If an agent fails: diagnose, give it one retry with better context, then flag.
7. At completion: commit all work, update build queue items, push.
8. Log build times for comparison (tsc before/after, next build before/after).

## Success Metric

- Before: 932 page.tsx files
- After: ~715 page.tsx files (-217)
- Build time target: measurable reduction (fewer webpack entries = less memory = fewer OOMs)
- Zero 404s on previously-working URLs
- Zero lost functionality
