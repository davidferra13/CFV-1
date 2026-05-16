# Intensify: route-proliferation

Zone covering the structural reasons ChefFlow grew to 932 pages and consolidation strategies.

## Run 2026-05-16

STATUS: fresh
DEPTH: deep

SURFACED:

- 932 page.tsx files: 679 chef, 92 public, 63 client, 43 admin, 55 other
- Growth rate: 265 -> 932 in 7 weeks (~95 pages/week)
- Only 11 pages use the Tabs UI component (consolidation mechanism exists but massively underused)
- 201 dynamic [id] routes (29.6%, necessary) vs 478 static pages (70.4%, consolidation candidates)
- 62 thin redirects already exist (pattern proven at scale)
- ROOT CAUSE 1: page-per-concern pattern (settings alone = 96 routes)
- ROOT CAUSE 2: status-as-route anti-pattern (~60 pages that should be ?status= params)
- ROOT CAUSE 3: parallel agent builds without dedup (14 exact duplicates across 5 clusters)
- ROOT CAUSE 4: sub-entity views as siblings not children (client insights/preferences/loyalty are separate pages)
- ROOT CAUSE 5: Tabs component underuse (exists, works, only 11 of 932 pages use it)
- hub-consolidation.md spec exists (802 -> 7 hubs) but not in-flight
- Event [id] has 41 sub-routes that should be tabs (-40 routes)
- Settings has 96 pages that should be 10 grouped sections (-86 routes)
- Finance has 72 pages across 17 sub-domains
- Client has 22 sub-pages reducible to 5 tabs on detail
- /social (11 pages) duplicates /marketing/social (7 pages) exactly
- /safety (7 pages) duplicates /settings/compliance (10 pages) exactly
- Total recoverable: -217 routes (932 -> 715) with zero features lost

ACTED ON:

- All 6 moves dispatched to route-consolidation swarm (docs/handoffs/2026-05-16-route-consolidation-swarm.md)
- Wave 1: status-as-route elimination, duplicate dedup, settings collapse (parallel)
- Wave 2: event detail tabs, client detail tabs (depends on Wave 1)

SKIPPED:

- Analytics contextual in hubs: premature (needs hub infrastructure first)
- Culinary tab consolidation: low-yield (9 routes, domain in active build)
- Community placeholders: memory rule prevents deletion
- Deleting orphan routes: premature (needs per-route explicit approval)

NEXT TRIGGER: After event tabbed view + settings collapse (ranks 1+2 = -126 routes). Re-measure page count. If below 750, shift to analytics hub wiring.
