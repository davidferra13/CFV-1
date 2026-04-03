# Spec: Search Intent Landing Architecture

> **Status:** ready
> **Priority:** P1 (next up)
> **Depends on:** `featured-chef-public-proof-and-booking.md` (verified), `public-chef-credentials-showcase.md` (verified), `discover-state-normalization-hardening.md` (verified)
> **Estimated complexity:** medium (6-8 files)

## Timeline

_Every status change, every claim, every verification gets a row. This is the audit trail._

| Event         | Date             | Agent/Session | Commit |
| ------------- | ---------------- | ------------- | ------ |
| Created       | 2026-04-03 15:10 | Codex         |        |
| Status: ready | 2026-04-03 15:10 | Codex         |        |

---

## Developer Notes

_This section preserves the developer's original conversation and intent. It is MANDATORY. A builder reading a spec without this section is building blind._

### Raw Signal

- We need to synthesize all research into a cross-reference document so we can actually leverage the findings alongside the existing specs.
- Is there anything else we can synthesize to improve our system.
- Proceed with the most intelligent decisions on my behalf, in the correct order.
- Before taking action, fully understand the current system, constraints, and context.
- Plan briefly, then execute in a dependency-aware sequence so the builder agent has full context and can execute cleanly, in order.
- Do not build, just write a spec.

### Developer Intent

- **Core goal:** convert the highest-priority research-backed website gap into a builder-ready implementation slice so public acquisition can improve without reopening broad strategy work.
- **Key constraints:** preserve the current public proof, `/chefs`, `/discover`, `/book`, and sitemap foundations; do not create thin programmatic SEO pages; do not start the much larger `/eat` expansion just to solve the first landing-architecture gap.
- **Motivation:** the research stack already says the next website gain is search-intent landing architecture by city, service type, and occasion, but the builder still has no narrow implementation spec for it.
- **Success from the developer's perspective:** a builder can implement curated, inventory-backed landing pages and internal-linking improvements cleanly, without guessing route shape, metadata rules, or where this work stops.

---

## What This Does (Plain English)

This spec adds a curated public landing-page architecture around the routes ChefFlow already has. Instead of relying only on the homepage, `/chefs`, `/discover`, and query-string filter states, the site gains real city, service, and occasion landing pages that point into the existing chef directory and booking flow, use unique metadata, and only publish where ChefFlow has enough real inventory and proof to support the page.

---

## Why It Matters

The website cross-reference already identifies search-intent landing architecture as the first unspecced website gap to close, and the competitor research is clear that segmented city/service/occasion pages are part of the conversion system, not just SEO filler (`docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md:453`, `docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md:574`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:605`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:606`).

This is also intentionally narrower than the larger consumer-first `/eat` expansion, which is already specced as a broader strategic lane (`docs/specs/consumer-first-discovery-and-dinner-planning-expansion.md:53`, `docs/specs/consumer-first-discovery-and-dinner-planning-expansion.md:63`, `docs/specs/consumer-first-discovery-and-dinner-planning-expansion.md:139`).

---

## Files to Create

| File                                                             | Purpose                                                                                                 |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `app/(public)/chefs/locations/[slug]/page.tsx`                   | Curated location landing pages that route users into the existing chef directory and booking flow       |
| `app/(public)/chefs/services/[slug]/page.tsx`                    | Curated service-type landing pages backed by real inventory                                             |
| `app/(public)/chefs/occasions/[slug]/page.tsx`                   | Curated occasion landing pages built from real inventory plus occasion framing                          |
| `app/(public)/chefs/_components/chef-directory-card.tsx`         | Extracted reusable chef card so `/chefs` and landing pages share one canonical public directory tile    |
| `app/(public)/chefs/_components/search-intent-landing-shell.tsx` | Shared landing-page shell with hero, proof summary, filtered chef grid, FAQ, and internal-link clusters |
| `lib/marketing/search-intent-landings.ts`                        | Curated landing definitions, metadata copy, filter mappings, and inventory threshold rules              |

---

## Files to Modify

| File                                                                                      | What to Change                                                                                                                                      |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/(public)/page.tsx`                                                                   | Route homepage service/intent entry points into the new curated landing pages where appropriate and add one lightweight intent-link cluster         |
| `app/(public)/chefs/page.tsx`                                                             | Extract the chef card into a shared component and add curated city/service/occasion link clusters above or below the main directory results         |
| `app/(public)/chefs/_components/chef-hero.tsx`                                            | Accept props or composition hooks so the hero can be reused or aligned with landing-page framing without duplicating the current visual system      |
| `app/(public)/discover/page.tsx`                                                          | Add a high-intent handoff block from the broad food directory into curated private-chef landing pages, especially on landing and zero-result states |
| `app/sitemap.ts`                                                                          | Include only enabled curated search-intent landing pages in the sitemap                                                                             |
| `docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md` | Mark search-intent landing architecture as spec-backed and update the builder sequence accordingly                                                  |

---

## Database Changes

None.

---

## Data Model

This spec adds no schema. It introduces a curated route-definition model in code.

Use a typed definition such as:

```ts
type SearchIntentLandingKind = 'location' | 'service' | 'occasion'

type SearchIntentLandingDefinition = {
  kind: SearchIntentLandingKind
  slug: string
  title: string
  description: string
  heroEyebrow: string
  heroTitle: string
  heroSubtitle: string
  intro: string
  primaryCtaLabel: string
  primaryCtaHref: string
  secondaryCtaLabel?: string
  secondaryCtaHref?: string
  chefFilters: {
    query?: string
    location?: string
    serviceType?: string
    cuisine?: string
    acceptingOnly?: boolean
  }
  bookPrefill?: {
    occasion?: string
    serviceType?: string
  }
  faq: Array<{ question: string; answer: string }>
  relatedLandingSlugs: string[]
  minChefCount: number
  minReviewedChefCount?: number
  enabled: boolean
}
```

Key rules:

1. **Curated allowlist only.** Do not auto-generate pages for every city, service, or occasion in the data.
2. **Inventory threshold required.** A landing page is only publishable when the current directory inventory still meets the definition's threshold.
3. **Occasion pages are mapping pages, not new chef taxonomy.** Occasion landing pages may map to one or more existing service types plus copy, but they must not claim occasion-specific certainty that the data model does not actually encode.
4. **Canonical filtered result set.** Each landing page must map to a canonical `/chefs` directory state and a `/book` CTA, not a parallel booking system.
5. **Unique content is mandatory.** Each page needs its own title, description, hero copy, FAQ, and related links. No thin templated shells.

---

## Server Actions

No new write actions.

Use server-side read helpers only, for example:

| Helper                                         | Auth | Input                           | Output                            | Side Effects                |
| ---------------------------------------------- | ---- | ------------------------------- | --------------------------------- | --------------------------- | ------------------------------ | ----- | ---- |
| `getSearchIntentLandingDefinition(kind, slug)` | none | `{ kind: 'location'             | 'service'                         | 'occasion'; slug: string }` | `SearchIntentLandingDefinition | null` | None |
| `getSearchIntentLandingChefs(definition)`      | none | `SearchIntentLandingDefinition` | `DirectoryChef[]`                 | None                        |
| `listEnabledSearchIntentLandings()`            | none | none                            | `SearchIntentLandingDefinition[]` | None                        |

Implementation rule:

- Reuse `getDiscoverableChefs()`, `filterDirectoryChefs()`, `sortDirectoryChefs()`, and existing location helpers rather than creating a second public directory data path.

---

## UI / Component Spec

### Page Layout

Every landing page uses the same shell:

1. **Hero**
   - page-specific eyebrow, title, and subtitle
   - short trust row using existing public positioning
   - primary CTA to `/book` with safe prefill query params when applicable
   - secondary CTA to the mapped `/chefs` filtered state

2. **Why this page exists**
   - 2-3 short bullets explaining what kind of chef or service the visitor is browsing
   - must be page-specific, not generic filler

3. **Chef results**
   - reuse the extracted canonical public chef card
   - show a filtered set of real chefs from `getDiscoverableChefs()`
   - preserve current public proof and inquiry CTAs

4. **How booking works**
   - short operational reassurance block with page-specific FAQ entries
   - keep this grounded in existing product truth, not imagined marketplace guarantees

5. **Related landings**
   - show nearby or adjacent city/service/occasion pages from the curated allowlist
   - use these for internal linking instead of footer spam or auto-generated link farms

### States

- **Loading:** normal server-rendered page load; no fake skeleton page indexation tricks
- **Empty:** do not ship an indexable empty landing page; if a definition is no longer eligible, the route must `notFound()` and the page must be excluded from the sitemap and homepage/link clusters
- **Error:** if the definition is missing or invalid, `notFound()`
- **Populated:** hero, unique copy, real chef cards, relevant FAQ, and related links render without inventing proof or city coverage

### Interactions

- Landing page primary CTA goes to `/book`, optionally with safe prefill such as `occasion` or `serviceType`
- Landing page secondary CTA goes to `/chefs` with canonical query params matching the landing definition
- Related links keep the visitor inside the curated landing lattice or send them to `/chefs`
- The extracted chef card must keep the current inquiry/profile behavior from `/chefs`

---

## Edge Cases and Error Handling

| Scenario                                                              | Correct Behavior                                                                                                  |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Config entry exists but current chef inventory falls below threshold  | Exclude from sitemap and internal clusters; route returns `notFound()` or is disabled until supply is restored    |
| Occasion page maps only loosely to existing data                      | Use honest copy and service-type mapping; do not claim exact occasion matching certainty                          |
| Location page has one or two chefs only                               | Do not publish the page as an indexable landing surface                                                           |
| Landing page has no reviewed chefs                                    | Either require `minReviewedChefCount` for that page or omit rating-led copy entirely                              |
| Builder tries to duplicate `/chefs` cards inline again                | Stop and extract the canonical card component first                                                               |
| Discover landing state stays broad while chef pages get more specific | Add only a handoff block from `/discover`; do not rewrite the food directory into a chef-only page in this spec   |
| Header/footer still mix audiences                                     | Leave that for the later navigation and CTA continuity spec; do not widen this slice into a full site-nav rewrite |

---

## Verification Steps

1. Add at least:
   - one location landing page
   - one service landing page
   - one occasion landing page
2. Open each page and confirm:
   - unique metadata and copy
   - real filtered chef results
   - CTA to `/book`
   - CTA to mapped `/chefs` filter state
3. Confirm `/chefs` now reuses the extracted shared chef card component.
4. Confirm homepage and `/chefs` include curated landing links without removing the current `/book`, `/chefs`, or `/discover` paths.
5. Confirm `/discover` includes a high-intent handoff block to chef booking landings, especially on the broad landing view and zero-result state.
6. Confirm `app/sitemap.ts` includes only enabled curated landing pages.
7. Disable or lower inventory for a landing definition in dev and confirm the page does not remain indexable as a thin shell.
8. Confirm the existing filtered `/chefs` page still works, including search, location, cuisine, service type, and zero-result suggestions.

---

## Out of Scope

- Building the broader `/eat` route or the full consumer-first discovery expansion
- Replacing `/chefs`, `/discover`, or `/book`
- Full navigation/header/footer audience rebalance
- Buyer education pages beyond the small FAQ modules on landing pages
- Operational reassurance overhaul beyond the landing-page FAQ blocks
- Programmatic generation of every city, ZIP code, cuisine, or occasion page
- New chef taxonomy, new review sources, or new database tables

---

## Notes for Builder Agent

- This spec is the narrow acquisition-architecture slice that should happen before the broader `/eat` spec if the assigned goal is better public demand capture, SEO clustering, and conversion continuity on the current site.
- Reuse the existing public route system. The point is to add a curated intent lattice, not to invent a second public product.
- Extract the current inline `ChefTile` from `app/(public)/chefs/page.tsx` into a reusable component first. Do not maintain two public chef card implementations.
- Keep the landing-page allowlist intentionally small in the first pass. Good pages with real inventory are better than a hundred thin ones.
- If a landing page cannot honestly say enough with current inventory and proof, do not publish it yet.

---

## Spec Validation

### 1. What exists today that this touches?

- The homepage already sells a clear private-chef path, includes service-category cards, and links directly into `/book` and `/chefs` (`app/(public)/page.tsx:53`, `app/(public)/page.tsx:354`, `app/(public)/page.tsx:357`, `app/(public)/page.tsx:367`, `app/(public)/page.tsx:431`).
- `/discover` already has a state-grid landing, popular-city links, and a broad food-directory frame rather than a chef-booking intent system (`app/(public)/discover/page.tsx:75`, `app/(public)/discover/page.tsx:97`, `app/(public)/discover/page.tsx:306`, `app/(public)/discover/page.tsx:367`).
- `/chefs` already acts as the private-chef directory with filtered search, zero-result suggestions, and current trust framing (`app/(public)/chefs/page.tsx:50`, `app/(public)/chefs/page.tsx:55`, `app/(public)/chefs/page.tsx:525`, `app/(public)/chefs/page.tsx:570`, `app/(public)/chefs/page.tsx:595`).
- The sitemap currently indexes only static public routes, compare pages, chef profiles, gift-card pages, and chef inquiry pages; it does not include city/service/occasion landing routes (`app/sitemap.ts:10`, `app/sitemap.ts:18`, `app/sitemap.ts:24`, `app/sitemap.ts:30`, `app/sitemap.ts:48`, `app/sitemap.ts:54`, `app/sitemap.ts:128`).
- The public header and footer still route visitors through a flatter set of top-level public pages (`components/navigation/public-header.tsx:12`, `components/navigation/public-header.tsx:13`, `components/navigation/public-header.tsx:14`, `components/navigation/public-header.tsx:15`, `components/navigation/public-header.tsx:84`, `components/navigation/public-footer.tsx:21`, `components/navigation/public-footer.tsx:22`, `components/navigation/public-footer.tsx:62`).

### 2. What exactly changes?

- Add curated landing routes under `/chefs` for location, service, and occasion intent.
- Extract the existing public chef card into a shared component so `/chefs` and landing pages stay in sync.
- Add one curated internal-link layer from homepage, `/chefs`, and `/discover` into those landing pages.
- Add sitemap support for enabled landing pages only.
- Update the website cross-reference so this work is no longer treated as research-only.

### 3. What assumptions are you making?

- **Verified:** the website cross-reference says search-intent landing architecture is the first remaining unspecced website gap (`docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md:453`, `docs/research/foundations/2026-04-02-website-build-research-and-spec-cross-reference.md:574`).
- **Verified:** competitor research says city, service-type, and occasion pages should only be built where there is enough real inventory and proof, not as thin SEO shells (`docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:605`, `docs/research/competitive-intelligence-chefflow-improvement-opportunities-2026-04-02.md:606`).
- **Verified:** the broader `/eat` strategy already exists as a separate, much larger spec, so this narrower landing slice should not absorb it (`docs/specs/consumer-first-discovery-and-dinner-planning-expansion.md:53`, `docs/specs/consumer-first-discovery-and-dinner-planning-expansion.md:63`, `docs/specs/consumer-first-discovery-and-dinner-planning-expansion.md:139`).
- **Unverified but fenced:** the exact live inventory depth for each candidate city/service/occasion cluster is not measured in this session, so the spec requires allowlist curation and threshold checks in the same implementation pass.

### 4. Where will this most likely break?

1. A builder may auto-generate too many landing pages and create thin, low-trust SEO surfaces.
2. A builder may duplicate the current `/chefs` card logic instead of extracting it.
3. A builder may over-scope into header/footer navigation re-architecture, which belongs to the later CTA continuity lane.
4. A builder may conflate this with the larger `/eat` spec and turn a medium slice into a huge one.

### 5. What is underspecified?

- The initial allowlist entries are intentionally not hardcoded in this spec because they must be chosen from current inventory in the implementation pass.
- The exact landing copy can vary by route, but the required structure and threshold rules above remove the risky ambiguity.

### 6. What dependencies or prerequisites exist?

- Preserve the current public-proof and profile baseline from the verified chef profile specs.
- Preserve `/discover` hardening and avoid rewriting the directory.
- Reuse existing directory filters and chef data helpers from the current `/chefs` route rather than inventing a second public data source.

### 7. What existing logic could this conflict with?

- The inline `ChefTile` in `app/(public)/chefs/page.tsx`, because landing pages need the same card behavior.
- The broad directory framing in `app/(public)/discover/page.tsx`, because a sloppy implementation could accidentally turn it into a chef-only route.
- The broader `/eat` strategy, if a builder tries to merge both scopes instead of landing the narrower intent-page slice first.

### 8. What is the end-to-end data flow?

1. Visitor lands on homepage, `/chefs`, `/discover`, sitemap, or a curated landing URL.
2. The landing definition resolves allowed metadata, mapped filters, FAQ copy, and CTA targets.
3. Existing `getDiscoverableChefs()` data is filtered through the mapped landing definition.
4. The visitor either:
   - browses chef cards on the landing page,
   - jumps into `/chefs` with canonical filters, or
   - moves into `/book` with safe prefill.

### 9. What is the correct implementation order?

1. Create the curated landing definitions and threshold rules.
2. Extract the shared public chef card component.
3. Build the landing shell and the three route families.
4. Add homepage, `/chefs`, and `/discover` internal-link handoffs.
5. Add sitemap support.
6. Update the website cross-reference.

### 10. What are the exact success criteria?

- At least one location, one service, and one occasion landing page exist and are unique, useful, and inventory-backed.
- The pages reuse current public chef data and current inquiry/profile CTAs.
- No thin or empty landing page is indexable.
- Homepage, `/chefs`, and `/discover` now surface the intent lattice.
- The website cross-reference treats this lane as spec-backed, not research-only.

### 11. What are the non-negotiable constraints?

- No thin programmatic SEO.
- No rewrite of `/chefs`, `/discover`, or `/book`.
- No hidden expansion into the `/eat` spec.
- No fabricated city coverage, proof, or review framing.

### 12. What should NOT be touched?

- Existing booking write paths.
- Public chef proof semantics.
- Discover-state data normalization.
- Header/footer audience re-architecture beyond minimal landing-link additions if the builder can avoid them entirely.

### 13. Is this the simplest complete version?

Yes. It converts the highest-priority research-backed acquisition gap into a narrow implementation slice without dragging in the broader consumer-intent product expansion.

### 14. If implemented exactly as written, what would still be wrong?

- Buyer education, reassurance architecture, and site-wide CTA continuity would still remain separate follow-up specs.
- The broader `/eat` and planning-first discovery product would still remain a later, larger lane.
- Real landing coverage would still depend on ChefFlow's live inventory depth, so the first pass should stay intentionally small.

---

## Final Check

This spec is production-ready for a builder handoff. The remaining uncertainty is inventory selection, not route structure. The implementation is still safe because the spec requires curated allowlists, real thresholds, and no indexable thin pages.
