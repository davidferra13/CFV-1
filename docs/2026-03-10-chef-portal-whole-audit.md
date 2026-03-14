# Chef Portal Whole Audit

Date: 2026-03-10

Scope:
- Current internal chef portal under `app/(chef)`
- Shared navigation and route protection
- Archetype presets, hybrid selection, custom builder, widgets, documents, and compliance packs
- Existing audit and test artifacts that materially affect confidence

Method:
- Direct source inspection of `app/(chef)`, `components/navigation`, `lib/archetypes`, `lib/documents`, `lib/haccp`, `middleware.ts`, and `lib/auth/route-policy.ts`
- Live repo stats gathered from the current worktree
- Validation run: `npm run verify:chef-nav`

## Findings First

### 1. High: archetype presets do not actually drive mobile tabs, and the custom builder does not apply dashboard widget choices

Verified fact:
- `lib/archetypes/presets.ts` defines `mobileTabHrefs` for all 6 base archetypes.
- `lib/archetypes/actions.ts` and `lib/archetypes/archetype-actions.ts` only persist `enabled_modules` and `primary_nav_hrefs`.
- `components/navigation/chef-nav.tsx` uses static `mobileTabItems` when the portal is not in focus mode or event lock-in.
- `components/navigation/nav-config.tsx` defines those mobile tabs statically.
- `lib/archetypes/builder-actions.ts` stores `mobileTabHrefs` and `dashboardWidgets` only inside `custom_archetype_config`, but does not write a live mobile-tab preference or the live `dashboard_widgets` column.
- `app/(chef)/settings/archetype-builder/page.tsx` and `components/settings/archetype-builder-form.tsx` present mobile tabs and dashboard widgets as saved settings.

Why this matters:
- Onboarding and settings promise portal personalization that is only partially applied.
- Mobile UX stays static even though archetype presets claim otherwise.
- Custom archetype builder state can look saved while not affecting the live portal.

### 2. High: the chef navigation source of truth is overloaded and out of sync with the implemented chef surface

Verified fact:
- `npm run verify:chef-nav` fails.
- Current chef surface contains 582 `page.tsx` files, 496 static routes, 86 dynamic routes, and 91 static top-level sections.
- The same nav source defines 15 nav groups, 24 top shortcuts, 2 bottom shortcuts, 150 group items, and 154 child items.
- The nav audit currently reports 12 duplicate hrefs and 179 discoverable static chef routes missing from nav coverage.

Why this matters:
- Discoverability and maintainability are already beyond safe manual ownership.
- New routes can easily ship without usable navigation or audit visibility.
- Duplicate and overloaded navigation will keep producing regressions until ownership is tightened.

### 3. Medium: the nav audit tool is itself producing false positives

Verified fact:
- `scripts/audit-chef-nav.ts` treats the word `placeholder` as evidence of prototype content.
- Legitimate pages like `app/(chef)/vendors/page.tsx`, `app/(chef)/documents/page.tsx`, `app/(chef)/guests/page.tsx`, `app/(chef)/prospecting/page.tsx`, and `app/(chef)/finance/pricing-calculator/page.tsx` contain normal JSX input `placeholder=` props and are therefore falsely flagged.
- The same script scans only `app/(chef)` for route files, while `components/navigation/nav-config.tsx` also includes `/admin/*` links that live under `app/(admin)/admin/*`.

Why this matters:
- Current audit output overstates placeholder or broken pages.
- Real navigation debt gets mixed with tooling noise.
- The script should not be treated as canonical until its heuristics are fixed.

### 4. Medium: the onboarding gate fails open on error

Verified fact:
- `app/(chef)/layout.tsx` uses `getOnboardingStatus().catch(() => true)`.

Why this matters:
- A transient error can bypass onboarding and archetype setup.
- That increases the chance of chefs landing in partially initialized states.

### 5. Medium: the existing whole-app audit is stale

Verified fact:
- `docs/app-complete-audit.md` says it was generated from about 265 page files on 2026-02-23.
- Current chef-only source now contains 582 `page.tsx` files.

Why this matters:
- Planning, QA scoping, and product decisions based on the older audit will miss a large part of the live surface.

## Portal Stats

| Metric | Current value |
| --- | ---: |
| Chef `page.tsx` files | 582 |
| Static chef routes | 496 |
| Dynamic chef routes | 86 |
| Chef route handlers (`route.ts`) | 3 |
| Static top-level sections | 91 |
| Nav groups | 15 |
| Top shortcuts | 24 |
| Bottom shortcuts | 2 |
| Nav group items | 150 |
| Child nav items | 154 |
| Admin-only top shortcuts inside shared nav config | 3 |
| Admin-only group items inside shared nav config | 55 |

Largest route families by page count:

| Section | Pages |
| --- | ---: |
| `finance` | 76 |
| `settings` | 65 |
| `culinary` | 37 |
| `clients` | 36 |
| `events` | 35 |
| `commerce` | 29 |
| `inventory` | 23 |
| `cannabis` | 13 |
| `analytics` | 12 |
| `staff` | 12 |
| `bakery` | 11 |
| `food-truck` | 11 |
| `quotes` | 10 |
| `meal-prep` | 9 |
| `partners` | 9 |
| `social` | 9 |
| `stations` | 9 |
| `inquiries` | 8 |
| `prospecting` | 8 |
| `games` | 7 |

## Archetype Coverage

Base archetypes implemented in code:
- Private Chef
- Caterer
- Meal Prep Chef
- Restaurant
- Food Truck
- Bakery / Pastry

Additional archetype systems:
- Hybrid multi-archetype merge: `lib/archetypes/hybrid-preset.ts`
- Custom builder: `app/(chef)/settings/archetype-builder/page.tsx`
- Archetype-aware terminology: `lib/archetypes/terminology.ts`
- Archetype-aware dashboard primary action: `lib/archetypes/ui-copy.ts`
- Archetype-aware starter templates: `lib/archetypes/starter-templates.ts`
- Archetype-aware document packs: `lib/documents/archetype-packs.ts`
- Archetype-aware HACCP generation: `lib/haccp/templates.ts`

### Archetype matrix

| Archetype | Enabled modules in preset | Primary nav items | Mobile tabs defined | Catalog modules by default | Dashboard widgets available | Starter templates | Document pack (rec/opt/future) | HACCP (steps/ccps/prereqs/records) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| Private Chef | 6 | 8 | 5 | 14 | 8 | 5 | 10 / 0 / 0 | 8 / 5 / 10 / 11 |
| Caterer | 6 | 8 | 5 | 22 | 8 | 5 | 8 / 2 / 2 | 9 / 7 / 10 / 13 |
| Meal Prep | 5 | 6 | 5 | 11 | 8 | 5 | 5 / 2 / 2 | 10 / 6 / 10 / 12 |
| Restaurant | 5 | 8 | 5 | 16 | 9 | 5 | 5 / 4 / 2 | 8 / 6 / 9 / 11 |
| Food Truck | 4 | 6 | 5 | 10 | 9 | 5 | 7 / 2 / 2 | 8 / 5 / 10 / 12 |
| Bakery | 6 | 6 | 5 | 15 | 9 | 5 | 4 / 3 / 2 | 10 / 6 / 10 / 12 |

Important constraint:
- Only the preset `enabled_modules` and `primary_nav_hrefs` are currently applied to live chef preferences.
- `mobileTabHrefs` exist in definitions but are not read into the live mobile nav.

## Functional Surface Inventory

This is the current product map at the domain level. It is broad enough to understand ownership and scope, and it is grounded in the route tree rather than old docs.

### Command and dashboard layer

- Dashboard, briefing, daily ops, queue, activity, goals, intelligence, reports, insights, Remy, command center

### Sales and pipeline

- Inquiries, quotes, rate cards, proposals, leads, calls, marketplace, prospecting, guest leads, testimonials

### Client and relationship layer

- Clients, recurring services, communication follow-ups, guest CRM, circles, chat, communications, surveys, reviews, reputation

### Event lifecycle and delivery

- Event list/board/status lanes plus per-event pages for travel, schedule, prep, pack, guest card, grocery quote, BEO, financials, receipts, documents, split billing, live mode, KDS, breakdown, debrief, close-out, AAR, invoice, floor plan, site assessment, interactive mode, story

### Culinary and production

- Menus, recipes, nutrition, culinary components, costing, prep, plating guides, ingredient systems, menu scaling, substitutions, approvals, templates

### Inventory and procurement

- Inventory dashboard, purchase orders, audits, counts, FIFO, expiry, demand planning, reorder, locations, procurement, staff meals

### Finance

- Finance overview, invoices, payments, payouts, ledger, recurring, retainers, contractors, cash flow, budget, forecast, food cost, goals, pricing calculator, reporting, payroll, sales tax, bank feed, tax tools

### Commerce and service

- Register, table service, KDS, specials, gift cards, QR menu, purchase orders, peak-hours analytics, open tables, waitlist-adjacent surfaces

### Vertical-specific operations

- Meal prep, food truck, bakery, cannabis

### Growth and community

- Marketing, push dinners, sequences, loyalty, network, partners, social, marketplace capture, open tables, portfolio

### Setup, compliance, and platform controls

- Onboarding, import, settings, billing, devices, automations, API keys, integrations, compliance, protection, emergency contacts, health, appearance, discoverability, modules, navigation, journal

### Non-core but implemented

- Games, dev simulate, test-account banners, beta and survey surfaces

## Test and Audit Surface

Current automated test shape:

| Suite family | Count |
| --- | ---: |
| Journey specs | 30 |
| Coverage specs | 7 |
| Product specs | 13 |
| Unit tests | 98 |
| Integration tests | 5 |

Chef-heavy journey coverage is present for:
- onboarding
- archetype setup
- client management
- recipes and menus
- financial basics
- event lifecycle
- communications
- analytics
- grocery and sourcing
- safety and compliance
- documents
- marketing
- loyalty
- settings customization
- edge cases
- deep chef routes
- cannabis
- network, partners, and settings extensions

Existing audit docs worth keeping as companion material:
- `docs/app-complete-audit.md`
- `docs/ui-audit-settings.md`
- `docs/ui-audit-marketing-social.md`
- `docs/ui-audit-network-community.md`
- `docs/ui-audit-secondary-pages.md`

## Verified Gaps vs Open Questions

Verified gaps:
- Archetype mobile tabs are defined but not applied.
- Custom archetype builder does not apply mobile tabs or dashboard widgets to live portal state.
- Shared nav config is too large and currently fails its own audit.
- The nav audit script has false positives for `placeholder=` and false positives for admin routes outside `app/(chef)`.
- The onboarding gate fails open.
- The old whole-app audit is stale.

Strong inference:
- The portal has outgrown a single manually curated nav source of truth.
- Route discoverability is likely inconsistent for many secondary and advanced surfaces, especially inside finance, settings, culinary, inventory, and commerce.

Open questions:
- Of the 179 discoverable routes that the nav audit marks as missing, which are intentionally contextual-only and which are true discoverability misses?
- Was mobile tab personalization intentionally deferred, or was it expected to ship with archetype presets and custom builder?
- Should chef and admin navigation continue to share one config file, or should they be split and audited independently?

## Recommended Next Actions

1. Fix the archetype application path.
   - Persist and read mobile-tab preferences.
   - Either apply custom dashboard widget choices to live preferences or remove that claim from the builder UI.

2. Split or hard-scope navigation ownership.
   - Either separate chef and admin nav configs, or make the audit aware of cross-portal routes and role visibility.

3. Repair the nav audit script.
   - Replace broad `placeholder` string matching with a more precise prototype detector.
   - Validate against all route groups actually referenced by the nav config.

4. Regenerate the canonical audit.
   - The older audit should become a companion doc, not the authoritative current map.
   - The current route tree is large enough that a generated artifact should be the source of truth.
