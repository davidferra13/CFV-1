# Rail Umbrella Access Registry

Status: canonical proposed registry, created 2026-05-19.

Machine-readable source: `docs/domain/rail-umbrella-access-registry.json`

## Purpose

This registry gives ChefFlow rails a durable category spine:

- 24 umbrella categories.
- 132 product subcategories.
- 755 source category aliases redistributed from queue taxonomy, navigation labels, route groups, and rail language.
- 500 access paths tying each subcategory to plural, singular, workflow, public, client, staff, partner, vendor, admin, API, proof, or rail surfaces.

The important product rule is that a rail card should not only know what it is. It should know where the user can act on it, inspect it, prove it, or intentionally hide it.

## Umbrellas

| Umbrella                              | Rail Intent                                                                          |
| ------------------------------------- | ------------------------------------------------------------------------------------ |
| Today, Now, and Priority              | Current truth, blockers, stagnant critical items, and rotating ambient items.        |
| Events and Service Execution          | Booked service, prep, day-of execution, closeout, and AAR.                           |
| Clients and Relationships             | Client state, relationship memory, preferences, portals, and retention.              |
| Communication and Inbox               | Inbox, email, calls, SMS, chat, follow-ups, and communication proof.                 |
| Leads, Booking, and Sales             | Demand capture, inquiry response, lead conversion, and sales pipeline.               |
| Proposals, Contracts, and Commitments | Quotes, proposals, contracts, retainers, scope, and approvals.                       |
| Money, Finance, and Tax               | Cash, invoices, payments, receipts, ledger, payroll, and tax.                        |
| Pricing, PIE, and Costing             | Food cost, plate cost, price freshness, margin, and PIE intelligence.                |
| Culinary, Menus, and Recipes          | Menus, recipes, dishes, components, nutrition, and culinary memory.                  |
| Ingredients, Markets, and Procurement | Ingredients, sourcing, market signals, vendors, and peak ingredients.                |
| Inventory, Waste, and Supply Chain    | Stock, counts, purchase orders, depletion, expiry, and waste.                        |
| Kitchen, Ops, and Logistics           | Stations, equipment, packing, locations, travel, scheduling, and devices.            |
| Staff, Team, and Labor                | Staff, schedules, permissions, labor, team execution, and delegation.                |
| Safety, Compliance, and Protection    | Food safety, privacy, legal, incidents, insurance, auth, and hard stops.             |
| Public Discovery and Marketplace      | Public discovery, chef profiles, marketplace, services, and public intake.           |
| Marketing, Reputation, and Social     | Campaigns, content, social publishing, reviews, referrals, and public proof.         |
| Commerce, Products, and Orders        | Storefront, products, orders, sales, register, settlements, and commerce proof.      |
| Loyalty, Gifts, and Incentives        | Gift cards, rewards, raffles, points, and incentives.                                |
| Community, Circles, and Network       | Dinner circles, community, network, partners, vendors, and charity programs.         |
| Intelligence, Analytics, and Reports  | Analytics, reports, intelligence hub, forecasts, audit trails, and source proof.     |
| Automation, Remy, and AI              | Autopilot, Remy, AI health, scheduled intelligence, and automation controls.         |
| Documents, Media, and Proof           | Documents, media, print views, imports, exports, and build proof packs.              |
| Settings, Identity, and Customization | Profile, branding, account settings, integrations, taxonomy, and rail customization. |
| Platform, Admin, and System Health    | Admin, APIs, cron, architecture maps, QA, errors, and build queue governance.        |

## Access Path Contract

Every subcategory has one or more `accessPaths`:

- `plural`: list or hub route, such as `/clients`.
- `singular`: entity route, such as `/clients/[id]`.
- `workflow`: task-specific route, such as `/clients/communication/follow-ups`.
- `public`: unauthenticated route, such as `/chef/[slug]`.
- `client`: client-token route, such as `/client/[token]`.
- `staff`, `partner`, `vendor`, `admin`: role-specific route families.
- `api`: backing API, scheduled, cron, webhook, or data route.
- `proof`: audit, print, report, test, proof-pack, or source artifact.
- `rail`: logical rail surface such as `contextual-rail`, `dashboard-tiered-rail`, or `page-xray`.

## Rail Consumption Rules

Future rail implementation should consume the JSON registry this way:

1. Resolve each rail item to one primary umbrella and one subcategory.
2. Use `sourceCategoryAliases` for migration from legacy labels, queue categories, resolver names, nav labels, and route families.
3. Use `accessPaths` to decide where a card should deep-link, where its proof lives, and which role-specific variants can see it.
4. Use umbrella identity for color family, customization toggles, filtering, and high-level rail grouping.
5. Use subcategory identity for subrail creation, fine-grained hide/show controls, and duplicate prevention.
6. Treat public/client/staff/partner/vendor/admin access paths as visibility hints only. Server-side auth and tenant scoping remain mandatory.
7. Prefer additional subrails over cramming unrelated cards into one rail row.
8. Critical, safety, money, deadline, approval, client-waiting, sensitive, destructive, and current-next-action items should be eligible for stagnant/pinned placement.
9. Ambient and noncritical items may auto-scroll only in bounded rail zones with pause-on-hover, pause-on-focus, pause-on-touch, manual controls, and reduced-motion handling.

## Next Integration Targets

The registry should eventually feed these surfaces:

- `lib/discovery/contextual-rail-types.ts`
- `lib/discovery/rail-profiles.ts`
- `lib/discovery/rail-tier-assigner.ts`
- `lib/discovery/universal-rail-types.ts`
- `lib/navigation/url-capability-registry.ts`
- `components/rail/*`
- `/settings/taxonomy`
- `/settings/navigation`
- Page X-Ray and Wiring Audit access-surface proof

No app code consumes this registry yet. This change intentionally creates the durable taxonomy/access data first, so the next fired rail build can wire implementation against a stable map.
