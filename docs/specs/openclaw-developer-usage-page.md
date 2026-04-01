# Spec: OpenClaw Developer Usage Page

> **Status:** verified
> **Priority:** P1 (next up)
> **Depends on:** `openclaw-canonical-scope-and-sequence.md`, `openclaw-internal-only-boundary-and-debranding.md`
> **Estimated complexity:** medium (3-8 files)

## Timeline

| Event         | Date                 | Agent/Session | Commit |
| ------------- | -------------------- | ------------- | ------ |
| Created       | 2026-03-31 23:20 EDT | Codex         |        |
| Status: ready | 2026-03-31 23:20 EDT | Codex         |        |

---

## Developer Notes

### Raw Signal

The current OpenClaw setup on the Raspberry Pi is amazing and should not be touched. The goal is not to rebuild or change the system. The goal is to clearly lay out what OpenClaw does, how it is being used for website development, and what stages it will support next.

The developer described the current and planned sequence like this:

1. Use OpenClaw for research.
2. Use OpenClaw to help create databases for the website.
3. Use OpenClaw to help test the website once it reaches deployment quality.
4. Use OpenClaw to prospect and find leads for people who would use the website.

The developer explicitly asked whether prospecting is a different category of task. The answer is yes: prospecting belongs to go-to-market and growth, not testing or core development.

This page is not meant to be public. It is for the developer first, and only for people the developer deliberately chooses to show.

In a follow-up, the developer asked what else absolutely needs to be on the list. The missing required categories were planning and architecture, data ingestion and capture, data cleanup and normalization, data sync into the website, monitoring and regression detection, documentation and decision memory, and the work that happens after lead discovery: qualification, enrichment, and outreach support.

### Developer Intent

- **Core goal:** Create a private internal page that explains OpenClaw's role across the website lifecycle in the correct order, with a complete canonical list of required categories.
- **Key constraints:** Do not change the Raspberry Pi setup. Do not build infrastructure from this page. Do not make it public-facing. Do not blur prospecting into testing.
- **Motivation:** The developer wants a clean internal source of truth for what OpenClaw already does, what it will do next, and what it could do later.
- **Success from the developer's perspective:** A single internal page makes the OpenClaw story legible: current uses, planned uses, possible future uses, and clear category boundaries.

---

## What This Does (Plain English)

Adds a private admin page that explains OpenClaw as an internal operating system for the website lifecycle. The page shows the stages in order, marks which uses are already active versus planned versus possible later, and explicitly separates research, planning, data pipeline work, development support, deployment, testing, monitoring, lead discovery, lead qualification, outreach, and documentation into the correct categories. It is written for the developer, not customers.

---

## Why It Matters

Right now the OpenClaw story exists in the developer's head and across conversations. This page turns it into a stable internal map without changing the working Raspberry Pi setup or pretending that all OpenClaw work is the same kind of task.

---

## Core Decisions

1. The page lives in the admin surface, not the public site.
2. Access is founder-only in V1, even inside admin.
3. The page is hidden from normal navigation and accessed by direct URL or a founder-only quick tile.
4. The content is version-controlled in code, not stored in the database.
5. The page is descriptive, not operational. It does not trigger syncs, tests, scrapes, or deployments.
6. Prospecting is presented as a separate growth category, not as part of testing.
7. The lifecycle list is canonical and must include planning, data-pipeline work, monitoring, and post-prospecting steps.
8. OpenClaw naming is allowed on this founder-only internal page, but not on chef-facing or public-facing product surfaces.

---

## Correct Order of OpenClaw Usage

1. **Research and discovery**
   OpenClaw is used to gather information, compare options, and shape decisions before building.

2. **Planning and architecture**
   OpenClaw is used to help define priorities, workflows, page structure, feature sequencing, and system direction before implementation.

3. **Database and data-model design**
   OpenClaw is used to help define entities, relationships, sources, schemas, and backend data structure for the website.

4. **Data ingestion and capture**
   OpenClaw is used to gather raw source material, scraped inputs, reference datasets, and other information the website may need.

5. **Data cleanup, normalization, and deduplication**
   OpenClaw is used to turn messy raw inputs into usable, consistent, deduplicated records.

6. **Data sync into the website**
   OpenClaw is used to move validated data into the website and confirm that the data landed correctly.

7. **Development support**
   OpenClaw is used to support implementation decisions, workflows, content structure, tooling, and build execution around the website.

8. **Deployment readiness**
   OpenClaw can be used to support release prep, launch checks, and transition from development to live usage.

9. **Testing and QA**
   OpenClaw is used to validate the deployed website, verify flows, catch regressions, and confirm the site behaves correctly.

10. **Monitoring and regression detection**
    OpenClaw is used after launch to watch for failures, stale data, broken flows, and system drift.

11. **Prospecting and lead discovery**
    OpenClaw is used to identify businesses, targets, and lead opportunities related to the website. This is a separate growth function.

12. **Lead qualification, enrichment, and outreach support**
    OpenClaw is used to score leads, enrich records, support messaging, and help move opportunities through a pipeline after discovery.

13. **Documentation, decision memory, and ongoing optimization**
    OpenClaw is used to preserve specs, record decisions, support internal memory, and improve the system over time.

---

## Files to Create

| File                                       | Purpose                                                                 |
| ------------------------------------------ | ----------------------------------------------------------------------- |
| `app/(admin)/admin/openclaw/page.tsx`      | Founder-only route for the internal OpenClaw usage page                 |
| `components/admin/openclaw-usage-page.tsx` | Presentational component for the page sections, cards, and status map   |
| `lib/openclaw/developer-usage-map.ts`      | Typed static source of truth for stages, categories, statuses, and copy |

---

## Files to Modify

| File                                             | What to Change                                                                    |
| ------------------------------------------------ | --------------------------------------------------------------------------------- |
| `app/(admin)/admin/page.tsx`                     | Add a founder-only quick tile linking to `/admin/openclaw`                        |
| `lib/help/page-info-sections/23-admin-portal.ts` | Add page-info metadata for `/admin/openclaw` so the page remains self-explanatory |

**Do not modify:**

- `components/navigation/nav-config.tsx`
- `components/admin/admin-sidebar.tsx`
- Raspberry Pi scripts, cron, sync, scraper, or test runtime

The page should stay intentionally low-visibility.

---

## Database Changes

None.

This page is documentation and orientation, not a content-management feature. Storing the content in Postgres would add unnecessary complexity, mutation paths, and admin tooling for something that should stay stable and versioned.

---

## Data Model

The content should be driven by a small typed config, not fetched from the database.

### `OpenClawUsageStage`

```ts
type OpenClawUsageStage = {
  id: string
  order: number
  title: string
  category:
    | 'research'
    | 'planning'
    | 'data'
    | 'development'
    | 'deployment'
    | 'testing'
    | 'monitoring'
    | 'growth'
    | 'documentation'
  status: 'used' | 'active' | 'planned' | 'potential'
  summary: string
  details: string[]
  separateCategory?: boolean
}
```

### `OpenClawCapabilityGroup`

```ts
type OpenClawCapabilityGroup = {
  id: string
  title: string
  summary: string
  items: string[]
}
```

### Required Content Buckets

1. **Already used**
   Research and discovery, planning and architecture, database and data-model design, development support.

2. **Active / planned**
   Data ingestion and capture, cleanup and normalization, data sync, deployment readiness, testing and QA, monitoring and regression detection, prospecting and lead discovery, and lead qualification/outreach support.

3. **Potential future uses**
   Deeper analytics interpretation, richer competitor intelligence, broader market expansion research, and more advanced optimization systems.

4. **Explicit distinction**
   The config must distinguish research from planning, data pipeline work from testing, and lead discovery from qualification/outreach.

---

## Server Actions

None.

This page should render from static in-repo data only. No mutations, no server actions, no API routes, no cron hooks.

---

## UI / Component Spec

### Access Model

- Route: `/admin/openclaw`
- Gate 1: `requireAdmin()`
- Gate 2: founder-only check using `isFounderEmail(admin.email)`
- Non-admin users: redirect through existing admin auth flow
- Non-founder admins: return `notFound()` or equivalent hidden-denial behavior

This is the correct V1 security model because the page is meant for the developer, not the broader admin population.

### Navigation Model

- Do **not** add this page to the general admin sidebar or global nav.
- Add a founder-only quick tile on `/admin` so the developer can reach it easily.
- The route should still work directly by URL for the founder.

This balances privacy and convenience.

### Page Tone

- Internal, direct, and operational
- No marketing voice
- No customer-facing language
- No exaggerated visuals
- Should read like a founder memo or system map

### Page Layout

1. **Header**
   Title: `OpenClaw`
   Subtitle: `Internal map of what OpenClaw does for this website, what it will do next, and what it could do later.`

2. **Immutable Setup Banner**
   A high-visibility banner stating:
   `Current Raspberry Pi / OpenClaw setup is intentionally left untouched. This page documents usage. It does not change runtime behavior.`

3. **Lifecycle Section**
   Ordered vertical or stacked cards for the thirteen stages listed above.
   Each stage shows:
   - order number
   - title
   - category badge
   - status badge (`Used`, `Active`, `Planned`, `Potential`)
   - short summary
   - 2-4 bullet details

4. **Category Distinction Section**
   A dedicated callout answering the original question:
   `Yes. Prospecting and lead generation is a different category from testing, and lead discovery is different from qualification and outreach.`

   This section should briefly separate:
   - product/research work
   - planning and architecture
   - data/database work
   - data ingestion / cleanup / sync
   - engineering support
   - deployment readiness
   - QA/testing
   - monitoring/regression detection
   - lead discovery
   - lead qualification / outreach
   - documentation / memory / optimization

5. **Already Used / Planned / Potential Grid**
   Three columns or stacked sections:
   - Already Used
   - Active / Planned Next
   - Potential Later

6. **Potential Future Uses**
   Compact cards or bullets for future capabilities such as:
   - competitor intelligence
   - SEO and content research
   - analytics interpretation
   - market expansion research
   - stronger lead enrichment
   - more advanced outreach systems
   - deeper operational optimization

7. **Boundaries / Non-Goals**
   Short section stating:
   - this page does not run OpenClaw
   - this page does not edit Pi config
   - this page does not replace technical docs
   - this page does not expose private internals publicly

### States

- **Loading:** Minimal skeleton blocks matching the card layout
- **Empty:** Should never occur in normal operation because content is static; if config fails, show a clear internal error state
- **Error:** `Could not load OpenClaw developer map.` and no fake fallback content
- **Populated:** Full ordered lifecycle map with badges and grouped sections

### Visual Direction

- Reuse the admin dark-surface visual language already present in `/admin/pulse` and other admin pages
- Prefer clean panels, muted contrast, and strong hierarchy
- Make the lifecycle easy to scan in one scroll
- Avoid dashboard clutter and avoid noisy metrics for a page that is mostly conceptual

---

## Edge Cases and Error Handling

| Scenario                                | Correct Behavior                                                                          |
| --------------------------------------- | ----------------------------------------------------------------------------------------- |
| Non-admin hits `/admin/openclaw`        | Redirect through normal admin auth flow                                                   |
| Admin but not founder hits the route    | Hide page existence with `notFound()` or equivalent                                       |
| Static config import fails              | Show explicit internal error state, not an empty page                                     |
| Future stages are not yet implemented   | Show them as `Planned` or `Potential`, never as complete                                  |
| Prospecting is confused with testing    | Dedicated callout must explicitly separate the two categories                             |
| Prospecting is confused with outreach   | The lifecycle and distinction section must separate discovery from qualification/outreach |
| Developer later wants to show outsiders | V1 answer is manual screen-sharing or screenshots; tokenized sharing is separate          |

---

## Verification Steps

1. Sign in as the founder/admin account.
2. Visit `/admin/openclaw`.
3. Verify the page renders without any network dependency on OpenClaw runtime services.
4. Verify the banner explicitly says the Raspberry Pi setup is untouched.
5. Verify the lifecycle is shown in the correct order.
6. Verify prospecting is clearly labeled as a separate category from testing.
7. Verify lead discovery is clearly distinct from qualification and outreach support.
8. Verify the page includes planning, ingestion/cleanup/sync, monitoring, and documentation on the list.
9. Verify the page is not present in the standard admin sidebar.
10. Verify the founder-only quick tile appears on `/admin`.
11. Sign in as a non-founder admin account, navigate to `/admin/openclaw`, verify the page is hidden.
12. Confirm no database writes, server actions, cron hooks, or Pi-side changes are involved.

---

## Out of Scope

- Public landing page for OpenClaw
- Customer-facing explanation of OpenClaw
- Share-token or guest-access system
- Any change to Raspberry Pi configuration
- Any change to OpenClaw sync, scraping, testing, or deployment infrastructure
- Database-backed editing for this page
- Auto-generated status from live OpenClaw telemetry

---

## Notes for Builder Agent

1. Follow the simple admin page pattern from `app/(admin)/admin/price-catalog/page.tsx`: light route wrapper, auth at the page boundary, presentation component below it.
2. Follow the visual restraint of `app/(admin)/admin/pulse/page.tsx`: dark admin styling, strong hierarchy, direct copy.
3. Reuse `isFounderEmail` from `lib/platform/owner-account.ts` for the second access gate.
4. Keep the content in `lib/openclaw/developer-usage-map.ts`, not inline in the page component and not in the database.
5. Do not add this page to shared navigation config. This is intentional.
6. Add page-info metadata so the built-in help affordance explains what the page is.
7. The page is a map, not a machine. No refresh buttons, no sync buttons, no test runners, no cron controls.
8. If future sharing is needed, write a separate spec for a signed read-only share route. Do not improvise that here.

---

## Final Check

This spec is complete as written for a private developer-facing page. It preserves the current OpenClaw setup, answers the category question clearly, and gives a builder a constrained implementation path without opening any unnecessary security or infrastructure surface.
