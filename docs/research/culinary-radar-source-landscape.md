# Research: Culinary Radar Source Landscape

> **Date:** 2026-04-29
> **Question:** What external source classes can ChefFlow ingest to keep chefs aware of safety, opportunity, sustainability, business, and culinary craft signals?
> **Status:** complete for planning, partial for final source allow-list

## Origin Context

The developer said ChefFlow needs news on everything, not just recalls: charity retreats in other countries looking for chefs, direct feeds from World Central Kitchen, gastronomy breakthroughs, and practical sustainability guidance for running a food business in 2026. The developer does not want an invasive news app. The desired behavior is that users should not have to leave ChefFlow to learn that something relevant is happening now or has happened recently.

## Summary

ChefFlow can build this as a source registry plus relevance engine. The source registry should ingest trusted external signals, while the relevance engine maps them to the chef's real events, ingredients, vendors, menus, profile, goals, geography, and interests.

The first production slice should prioritize food safety and recall sources because they are high-stakes and actionable. Opportunity, sustainability, craft, and business feeds should follow behind source credibility scoring and user preference controls.

## Detailed Findings

### Existing ChefFlow Primitives

- Remy already has authenticated web search through `searchWeb`, gated by `requireChef()`, with Tavily when configured and DuckDuckGo fallback. Evidence: `lib/ai/remy-web-actions.ts:32`, `lib/ai/remy-web-actions.ts:33`, `lib/ai/remy-web-actions.ts:36`, `lib/ai/remy-web-actions.ts:45`.
- Remy can read a specific public URL and blocks unsafe fetch targets before fetching. Evidence: `lib/ai/remy-web-actions.ts:54`, `lib/ai/remy-web-actions.ts:55`, `lib/ai/remy-web-actions.ts:58`.
- Remy's task catalog already describes `web.search` as current web data for food trends, supplier info, industry news, and competitor research, while banning recipe retrieval or generation. Evidence: `lib/ai/command-task-descriptions.ts:157`, `lib/ai/command-task-descriptions.ts:161`, `lib/ai/command-task-descriptions.ts:131`, `lib/ai/command-task-descriptions.ts:135`.
- The command orchestrator blocks recipe-like web searches before calling the web search helper. Evidence: `lib/ai/command-orchestrator.ts:572`, `lib/ai/command-orchestrator.ts:575`, `lib/ai/command-orchestrator.ts:577`, `lib/ai/command-orchestrator.ts:587`.
- ChefFlow already has a WFP RSS helper in the charity area. It fetches `https://www.wfp.org/rss.xml`, caches for one hour, and returns an empty list on failure. Evidence: `lib/charity/wfp-actions.ts:7`, `lib/charity/wfp-actions.ts:23`, `lib/charity/wfp-actions.ts:27`, `lib/charity/wfp-actions.ts:28`, `lib/charity/wfp-actions.ts:31`, `lib/charity/wfp-actions.ts:35`, `lib/charity/wfp-actions.ts:36`.
- The morning briefing pipeline already aggregates tenant-scoped data with `requireChef()` and uses alert sections. Evidence: `lib/briefing/get-morning-briefing.ts:112`, `lib/briefing/get-morning-briefing.ts:113`, `lib/briefing/get-morning-briefing.ts:115`, `lib/briefing/get-morning-briefing.ts:320`, `lib/briefing/get-morning-briefing.ts:321`.
- ChefFlow already has a cron route that creates tenant Remy alerts for morning briefings. Evidence: `app/api/cron/morning-briefing/route.ts:1`, `app/api/cron/morning-briefing/route.ts:2`, `app/api/cron/morning-briefing/route.ts:14`, `app/api/cron/morning-briefing/route.ts:33`, `app/api/cron/morning-briefing/route.ts:38`.
- The app audit shows the Culinary hub already has ingredient, price, vendor, costing, prep, shopping, and waste surfaces that are natural consumers of external intelligence. Evidence: `docs/app-complete-audit.md:782`, `docs/app-complete-audit.md:784`, `docs/app-complete-audit.md:812`, `docs/app-complete-audit.md:831`, `docs/app-complete-audit.md:839`, `docs/app-complete-audit.md:840`, `docs/app-complete-audit.md:845`, `docs/app-complete-audit.md:851`.

### External Source Classes

#### Safety and recalls

- FDA food recalls, outbreak advisories, safety alerts, and emergencies are official and high priority. FDA describes food recalls, foodborne outbreaks, safety advisories, emergencies, and a FoodSafety.gov widget that compiles FDA and USDA recall information. Source: https://www.fda.gov/food/recalls-outbreaks-emergencies.
- CDC publishes foodborne outbreak notices and explains that food safety alerts provide urgent, specific advice about foods to avoid eating or selling. Source: https://www.cdc.gov/foodborne-outbreaks/outbreak-basics/issuing-notices.html.
- USDA FSIS has a Recall API endpoint for recalls and public health alerts in JSON. Source: https://www.fsis.usda.gov/science-data/developer-resources/recall-api.

#### Charity, relief, and global chef opportunities

- WCK has public pages for Chef Corps, volunteer participation, and careers. These are relevant but must be treated as opportunity feeds, not critical alerts. Sources: https://wck.org/chef-corps/, https://wck.org/en-us/volunteer, https://wck.org/careers.
- Worldchefs has sustainability, education, humanitarian, competition, and networking programs. Source: https://worldchefs.org/worldchefs-launches-spanish-edition-of-sustainability-education-for-culinary-professionals/.

#### Sustainability and professional development

- Worldchefs Feed the Planet and Sustainability Education content is directly chef-relevant and practical. It frames sustainability as a better future and better bottom line for food professionals. Sources: https://feedtheplanet.worldchefs.org/our-trainers/ and https://worldchefs.org/tvs/sustainability-education-for-culinary-professionals-start-your-online-learning-journey/.
- IFT published 2026 food science and policy trends covering innovation, safety, sustainability, and consumer trust. Source: https://www.ift.org/press/press-releases/2025/december/16/ift-spi-reveals-top-trends-for-2026.

#### Craft, gastronomy, and food science

- The International Journal of Gastronomy and Food Science explicitly covers the interface of food science and gastronomy, including sensory science, innovation, culinary techniques, sustainability, gastronomy business models, and culinary traditions. Source: https://www.sciencedirect.com/journal/international-journal-of-gastronomy-and-food-science.
- ArXiv and journal feeds can supply early research signals, but ChefFlow should not present them as operational facts without source labeling and confidence scoring.

## Gaps and Unknowns

- WCK does not appear to expose a stable public RSS/API for all relief opportunities from the searched pages. A builder should implement WCK as monitored public pages first, with source-specific parsers and change detection.
- Some sources have robots, paywalls, or changing HTML. The ingestion system needs source health telemetry and a disabled state per source.
- Local health department feeds vary by state and county. V1 should support a source registry, then start with national sources and a small manually configured local source set.
- Some opportunity sources will include stale evergreen pages. The system must separate "new item" from "page still exists."

## Recommendations

- **Needs a spec:** Build Culinary Radar as a reusable intelligence layer, not a one-off news feed.
- **Quick fix candidate:** Add safety-source ingestion first and show critical matches in existing alerts and morning briefing surfaces.
- **Needs discussion:** Decide whether opportunity sources can send email by default. Recommendation: no email by default except safety, legal, and event-impacting alerts.
