# Spec: Culinary Radar Intelligence Layer

> **Status:** ready
> **Priority:** P1
> **Depends on:** none
> **Estimated complexity:** large (9+ files)

## Timeline

| Event                 | Date             | Agent/Session | Commit |
| --------------------- | ---------------- | ------------- | ------ |
| Created               | 2026-04-29 18:06 | Codex         |        |
| Status: ready         | 2026-04-29 18:06 | Codex         |        |
| Claimed (in-progress) |                  |               |        |
| Spike completed       |                  |               |        |
| Pre-flight passed     |                  |               |        |
| Build completed       |                  |               |        |
| Type check passed     |                  |               |        |
| Build check passed    |                  |               |        |
| Playwright verified   |                  |               |        |
| Status: verified      |                  |               |        |

---

## Developer Notes

### Raw Signal

The developer first asked whether ChefFlow knows the latest culinary news or general news. After seeing that Remy can search the web but ChefFlow does not maintain a curated intelligence layer, the developer clarified the real product gap:

ChefFlow needs to optimize the culinary news landscape and use this data internally or hand it off to users to improve their quality of life. The developer saw a salmonella outbreak on the news and immediately realized ChefFlow did not mention it. Users should not have to leave ChefFlow to learn or find out about something, especially if it affects a past event, current event, or real-time situation.

The developer then expanded the scope beyond recalls. ChefFlow needs news on everything: charity retreats in other countries looking for chefs, direct feeds from World Central Kitchen, new gastronomy breakthroughs, and insight into how a food business can be more sustainable in 2026. The source stream should not be invasive or annoying. It should be broad, but filtered.

### Developer Intent

- **Core goal:** Build a Culinary Radar that watches the external culinary world and translates it into ChefFlow-specific action, awareness, and quality-of-life improvements.
- **Key constraints:** Do not build a noisy generic news feed. Do not make users leave ChefFlow for relevant safety, opportunity, sustainability, business, or craft signals. Do not let AI invent facts or recipes. Source everything.
- **Motivation:** ChefFlow already owns the internal chef context, including events, ingredients, vendors, menus, tasks, pricing, and charity surfaces. External signals become valuable only when mapped to that context.
- **Success from the developer's perspective:** ChefFlow catches the kinds of things a working chef would otherwise see randomly on TV, in newsletters, on social feeds, or by manually checking government and industry pages, then shows only what matters and explains why.

---

## Validation Gate

**REQUEST:** New external culinary intelligence product surface and internal engine.

**EVIDENCE:** `developer-intent`, with a safety exception for recalls and outbreaks.

**DECISION:** Plan now, build safety slice first, then expand by source category.

**WHY:** The developer has explicitly identified a strategic gap. Food safety alerts are high-stakes operational risk and fit the exception class. Broader opportunity, craft, and sustainability feeds should ship after source credibility scoring and user preference controls.

---

## What This Does (Plain English)

ChefFlow gains a Culinary Radar that monitors trusted outside sources, stores normalized intelligence items, matches them against each chef's real business context, and surfaces only relevant alerts, opportunities, and briefings. A chef sees critical safety items in alerts and event prep, lower urgency signals in a Radar page and morning briefing, and opportunity or craft items when they match the chef's profile, location, interests, or goals.

---

## Why It Matters

ChefFlow should reduce the amount of outside-world monitoring a chef must do manually. The value is not "news"; the value is knowing what affects today's event, tomorrow's shopping list, a client's safety, a vendor choice, a charity opportunity, a sustainability improvement, or long-term craft growth.

---

## Current State Summary

- Remy can perform authenticated web search for current public information using `searchWeb`, with Tavily when configured and DuckDuckGo fallback. Evidence: `lib/ai/remy-web-actions.ts:32`, `lib/ai/remy-web-actions.ts:33`, `lib/ai/remy-web-actions.ts:36`, `lib/ai/remy-web-actions.ts:45`.
- Remy can fetch and read a URL after SSRF validation. Evidence: `lib/ai/remy-web-actions.ts:54`, `lib/ai/remy-web-actions.ts:55`, `lib/ai/remy-web-actions.ts:58`.
- Remy's task catalog already says `web.search` is for food trends, supplier info, industry news, competitor research, and current web data, with an explicit recipe ban. Evidence: `lib/ai/command-task-descriptions.ts:157`, `lib/ai/command-task-descriptions.ts:161`.
- Recipe search is limited to the chef's saved recipe book and must not generate or fabricate recipes. Evidence: `lib/ai/command-task-descriptions.ts:131`, `lib/ai/command-task-descriptions.ts:135`.
- The orchestrator blocks recipe-like web searches before calling web search. Evidence: `lib/ai/command-orchestrator.ts:572`, `lib/ai/command-orchestrator.ts:575`, `lib/ai/command-orchestrator.ts:577`, `lib/ai/command-orchestrator.ts:587`.
- The charity area already fetches an external WFP RSS feed server-side, caches it for one hour, and fails quietly to empty. Evidence: `lib/charity/wfp-actions.ts:7`, `lib/charity/wfp-actions.ts:23`, `lib/charity/wfp-actions.ts:27`, `lib/charity/wfp-actions.ts:28`, `lib/charity/wfp-actions.ts:31`, `lib/charity/wfp-actions.ts:35`, `lib/charity/wfp-actions.ts:36`.
- Morning briefing already aggregates tenant-scoped events, tasks, and alerts. Evidence: `lib/briefing/get-morning-briefing.ts:112`, `lib/briefing/get-morning-briefing.ts:113`, `lib/briefing/get-morning-briefing.ts:115`, `lib/briefing/get-morning-briefing.ts:320`, `lib/briefing/get-morning-briefing.ts:321`.
- The existing cron briefing route writes `remy_alerts` for each tenant. Evidence: `app/api/cron/morning-briefing/route.ts:1`, `app/api/cron/morning-briefing/route.ts:2`, `app/api/cron/morning-briefing/route.ts:14`, `app/api/cron/morning-briefing/route.ts:33`, `app/api/cron/morning-briefing/route.ts:38`.
- The Culinary hub already has relevant user surfaces for ingredients, price alerts, cost impact, prep shopping, vendors, and waste. Evidence: `docs/app-complete-audit.md:782`, `docs/app-complete-audit.md:784`, `docs/app-complete-audit.md:812`, `docs/app-complete-audit.md:831`, `docs/app-complete-audit.md:839`, `docs/app-complete-audit.md:840`, `docs/app-complete-audit.md:845`, `docs/app-complete-audit.md:851`.
- The app already has schema anchors for daily briefings, ingredients, recipe ingredients, vendor price entries, events, and menu items. Evidence: `lib/db/schema/schema.ts:8197`, `lib/db/schema/schema.ts:15745`, `lib/db/schema/schema.ts:15815`, `lib/db/schema/schema.ts:21854`, `lib/db/schema/schema.ts:22978`, `lib/db/schema/schema.ts:24014`.

---

## External Source Baseline

Initial source categories:

| Category                         | Initial Sources                                                                                                | Ingestion Type                      | Default Delivery                              |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------- | --------------------------------------------- |
| Safety and recalls               | FDA recalls, FDA outbreak advisories, CDC outbreak notices, USDA FSIS Recall API, FoodSafety.gov recall widget | API, RSS, page monitor              | Critical alerts, event prep, morning briefing |
| Charity and relief opportunities | WCK Chef Corps, WCK volunteer, WCK careers, Worldchefs, World Chefs Without Borders                            | page monitor, RSS where available   | Opportunity Radar, optional digest            |
| Sustainability                   | Worldchefs Feed the Planet, IFT, government or nonprofit sustainability guidance                               | RSS, page monitor                   | Sustainability Coach, weekly briefing         |
| Gastronomy and food science      | International Journal of Gastronomy and Food Science, IFT, selected academic feeds, arXiv food science queries | RSS, DOI metadata, page monitor     | Craft Briefing                                |
| Business landscape               | labor, permits, insurance, local health department notices, restaurant operations trends                       | page monitor, local source registry | Business Briefing, admin-configurable alerts  |
| Local context                    | weather, farmers markets, local closures, public health departments, supplier disruptions                      | API, RSS, page monitor              | event-impact alerts and local briefing        |

External evidence:

- FDA frames recalls, foodborne outbreaks, safety advisories, and emergencies as food safety surfaces, and points to FoodSafety.gov as a combined FDA and USDA recall source. Source: https://www.fda.gov/food/recalls-outbreaks-emergencies.
- CDC states that outbreak notices balance speed, accuracy, specificity, and actionability, and that food safety alerts provide urgent advice to people and businesses about foods to avoid eating or selling. Source: https://www.cdc.gov/foodborne-outbreaks/outbreak-basics/issuing-notices.html.
- USDA FSIS exposes a Recall API endpoint for recalls and public health alerts in JSON. Source: https://www.fsis.usda.gov/science-data/developer-resources/recall-api.
- WCK exposes chef-relevant opportunity surfaces including Chef Corps, volunteer participation, and careers. Sources: https://wck.org/chef-corps/, https://wck.org/en-us/volunteer, https://wck.org/careers.
- Worldchefs publishes sustainability education and professional development material for chefs. Sources: https://feedtheplanet.worldchefs.org/our-trainers/ and https://worldchefs.org/tvs/sustainability-education-for-culinary-professionals-start-your-online-learning-journey/.
- IFT publishes food science and policy trend material for 2026 around innovation, safety, sustainability, and consumer trust. Source: https://www.ift.org/press/press-releases/2025/december/16/ift-spi-reveals-top-trends-for-2026.
- The International Journal of Gastronomy and Food Science covers food science, sensory science, culinary innovation, sustainability, gastronomy business models, and related chef/scientist work. Source: https://www.sciencedirect.com/journal/international-journal-of-gastronomy-and-food-science.

---

## Files to Create

| File                                                                   | Purpose                                                                                                                                                                             |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `database/migrations/[next_timestamp]_culinary_radar_intelligence.sql` | Add global source/item tables plus chef-scoped matches, preferences, and digest state. Builder must list existing migrations and choose a strictly higher timestamp before writing. |
| `lib/culinary-radar/types.ts`                                          | Shared types, category enums, severity enums, and source credibility contracts.                                                                                                     |
| `lib/culinary-radar/source-registry.ts`                                | Static registry for approved source adapters, source categories, default cadences, and credibility tiers.                                                                           |
| `lib/culinary-radar/source-adapters.ts`                                | Adapter interface and shared fetch, RSS, JSON API, and page-monitor helpers.                                                                                                        |
| `lib/culinary-radar/adapters/fda.ts`                                   | FDA recall and outbreak source adapters.                                                                                                                                            |
| `lib/culinary-radar/adapters/fsis.ts`                                  | USDA FSIS Recall API adapter.                                                                                                                                                       |
| `lib/culinary-radar/adapters/cdc.ts`                                   | CDC outbreak notice adapter.                                                                                                                                                        |
| `lib/culinary-radar/adapters/wck.ts`                                   | WCK Chef Corps, volunteer, careers, and relief page monitor adapter.                                                                                                                |
| `lib/culinary-radar/adapters/worldchefs.ts`                            | Worldchefs, Feed the Planet, and sustainability education source adapter.                                                                                                           |
| `lib/culinary-radar/adapters/gastronomy.ts`                            | IFT, journal, academic, and food science source adapter shell.                                                                                                                      |
| `lib/culinary-radar/normalize.ts`                                      | Normalize source records into canonical intelligence items with stable external IDs.                                                                                                |
| `lib/culinary-radar/match-chef-context.ts`                             | Match source items to chef ingredients, events, menus, recipes, vendors, charity goals, geography, and profile.                                                                     |
| `lib/culinary-radar/severity.ts`                                       | Deterministic severity and relevance scoring.                                                                                                                                       |
| `lib/culinary-radar/actions.ts`                                        | Chef-facing server actions for reading matches, updating preferences, dismissing items, and marking items useful.                                                                   |
| `lib/culinary-radar/admin-actions.ts`                                  | Admin/internal actions for source health, replay, and manual source toggles.                                                                                                        |
| `app/api/cron/culinary-radar/route.ts`                                 | Scheduled ingestion and matching route guarded by cron auth.                                                                                                                        |
| `app/(chef)/radar/page.tsx`                                            | Main Culinary Radar page.                                                                                                                                                           |
| `app/(chef)/radar/radar-client.tsx`                                    | Client component for filters, dismissals, feedback, and preferences.                                                                                                                |
| `components/radar/radar-card.tsx`                                      | Reusable item card for alerts, opportunities, craft, sustainability, and business signals.                                                                                          |
| `components/radar/radar-impact-panel.tsx`                              | Shows why an item matters to this chef and which internal records matched.                                                                                                          |
| `components/radar/radar-preferences.tsx`                               | Category, source, delivery, and urgency preference controls.                                                                                                                        |
| `components/dashboard/culinary-radar-widget.tsx`                       | Dashboard widget for critical and high relevance items.                                                                                                                             |
| `components/briefing/culinary-radar-briefing-section.tsx`              | Morning briefing section for relevant radar items.                                                                                                                                  |
| `tests/unit/culinary-radar-normalize.test.ts`                          | Normalization and stable ID tests.                                                                                                                                                  |
| `tests/unit/culinary-radar-severity.test.ts`                           | Severity and delivery threshold tests.                                                                                                                                              |
| `tests/unit/culinary-radar-match-context.test.ts`                      | Tenant-scoped matching tests.                                                                                                                                                       |
| `tests/unit/culinary-radar-source-adapters.test.ts`                    | Adapter parser tests with fixtures.                                                                                                                                                 |
| `tests/launch/culinary-radar.spec.ts`                                  | Playwright coverage for page, alert states, preferences, and no fake data.                                                                                                          |

---

## Files to Modify

| File                                                       | What to Change                                                                                                              |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `components/navigation/nav-config.tsx`                     | Add `Culinary Radar` nav entry under a relevant chef operations or culinary section.                                        |
| `app/(chef)/dashboard/page.tsx` or dashboard section owner | Add `CulinaryRadarWidget` to the dashboard grid if the dashboard pattern supports another widget.                           |
| `lib/briefing/get-morning-briefing.ts`                     | Add a radar section to the returned briefing, scoped by `chef_id`, limited by severity and preferences.                     |
| `components/daily-ops/briefing-alerts-banner.tsx`          | Include critical radar matches in the alert banner only when severity meets interrupt threshold.                            |
| `app/api/cron/morning-briefing/route.ts`                   | Include radar summary only after `getMorningBriefing` can read radar matches. Do not duplicate alerts.                      |
| `lib/ai/command-task-descriptions.ts`                      | Add `radar.latest`, `radar.safety`, `radar.opportunities`, and `radar.explain_item` read tasks. Do not remove `web.search`. |
| `lib/ai/command-orchestrator.ts`                           | Add deterministic routing and task execution for read-only radar queries. Keep recipe web-search ban intact.                |
| `components/ai/remy-task-card.tsx`                         | Render radar task cards with source, severity, impact, and links.                                                           |
| `components/ai/remy-capabilities-panel.tsx`                | Update capability copy from ad hoc web search toward source-backed Culinary Radar.                                          |
| `lib/charity/wfp-actions.ts`                               | Leave WFP helper intact, but consider using the same RSS helper after `source-adapters.ts` exists.                          |
| `docs/app-complete-audit.md`                               | Add the new `/radar` page and dashboard/briefing surfaces after implementation.                                             |
| `project-map/chef-os/culinary.md`                          | Add Culinary Radar after implementation.                                                                                    |

---

## Database Changes

All database changes are additive. This spec does not create the migration file. Before creating the migration, the builder must list `database/migrations/*.sql`, choose a timestamp strictly higher than the current highest migration, and show the full SQL to the developer before writing the migration file.

### New Tables

```sql
CREATE TABLE IF NOT EXISTS culinary_radar_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  homepage_url TEXT,
  source_type TEXT NOT NULL CHECK (source_type IN ('api', 'rss', 'page', 'manual')),
  credibility_tier TEXT NOT NULL CHECK (credibility_tier IN ('official', 'mission_partner', 'academic', 'industry', 'local', 'experimental')),
  default_category TEXT NOT NULL CHECK (default_category IN ('safety', 'opportunity', 'sustainability', 'craft', 'business', 'local', 'client_signal')),
  default_cadence_minutes INTEGER NOT NULL DEFAULT 1440,
  active BOOLEAN NOT NULL DEFAULT true,
  last_checked_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS culinary_radar_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES culinary_radar_sources(id) ON DELETE RESTRICT,
  external_id TEXT NOT NULL,
  canonical_url TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  body_excerpt TEXT,
  source_published_at TIMESTAMPTZ,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  category TEXT NOT NULL CHECK (category IN ('safety', 'opportunity', 'sustainability', 'craft', 'business', 'local', 'client_signal')),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
  credibility_tier TEXT NOT NULL CHECK (credibility_tier IN ('official', 'mission_partner', 'academic', 'industry', 'local', 'experimental')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'stale', 'retracted')),
  affected_entities JSONB NOT NULL DEFAULT '{}'::JSONB,
  extracted_terms JSONB NOT NULL DEFAULT '{}'::JSONB,
  raw_payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  content_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_id, external_id)
);

CREATE TABLE IF NOT EXISTS chef_radar_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('safety', 'opportunity', 'sustainability', 'craft', 'business', 'local', 'client_signal')),
  enabled BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT false,
  min_alert_severity TEXT NOT NULL DEFAULT 'high' CHECK (min_alert_severity IN ('critical', 'high', 'medium', 'low', 'info')),
  digest_frequency TEXT NOT NULL DEFAULT 'daily' CHECK (digest_frequency IN ('immediate', 'daily', 'weekly', 'never')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (chef_id, category)
);

CREATE TABLE IF NOT EXISTS chef_radar_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES culinary_radar_items(id) ON DELETE CASCADE,
  relevance_score INTEGER NOT NULL CHECK (relevance_score BETWEEN 0 AND 100),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
  match_reasons JSONB NOT NULL DEFAULT '[]'::JSONB,
  matched_entities JSONB NOT NULL DEFAULT '[]'::JSONB,
  recommended_actions JSONB NOT NULL DEFAULT '[]'::JSONB,
  delivery_state TEXT NOT NULL DEFAULT 'unread' CHECK (delivery_state IN ('unread', 'read', 'dismissed', 'snoozed', 'archived')),
  useful_feedback BOOLEAN,
  dismissed_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (chef_id, item_id)
);

CREATE TABLE IF NOT EXISTS culinary_radar_digest_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  digest_type TEXT NOT NULL CHECK (digest_type IN ('daily', 'weekly', 'immediate')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  item_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'sent', 'skipped', 'failed')),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_culinary_radar_items_category_seen
  ON culinary_radar_items(category, first_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_culinary_radar_items_severity
  ON culinary_radar_items(severity, status);

CREATE INDEX IF NOT EXISTS idx_chef_radar_matches_chef_state
  ON chef_radar_matches(chef_id, delivery_state, severity, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chef_radar_matches_item
  ON chef_radar_matches(item_id);

CREATE INDEX IF NOT EXISTS idx_chef_radar_preferences_chef
  ON chef_radar_preferences(chef_id);
```

### New Columns on Existing Tables

```sql
-- None for V1.
```

### Migration Notes

- New tables use `chef_id` per project convention for new tables.
- Do not edit `types/database.ts`.
- Do not run `drizzle-kit push`.
- Do not add destructive SQL.
- Builder must add RLS policies if the repo pattern requires them for new tables. Chef-facing tables must restrict by `chef_id = auth user chef id` or equivalent existing policy pattern.

---

## Data Model

### `culinary_radar_sources`

Global source registry. No tenant data. Written by seed or admin-only source management. Read by cron ingestion.

Important fields:

- `key`: stable source key such as `fda_recalls`, `fsis_recall_api`, `wck_volunteer`.
- `source_type`: adapter shape.
- `credibility_tier`: controls default trust and delivery.
- `default_category`: safety, opportunity, sustainability, craft, business, local, or client signal.
- `default_cadence_minutes`: poll interval.

### `culinary_radar_items`

Global normalized item table. Each item is a source-backed external signal. It stores enough source truth to explain the item without inventing facts.

Important fields:

- `external_id`: stable ID from API, RSS GUID, URL hash, or source-specific fingerprint.
- `canonical_url`: required for attribution.
- `summary` and `body_excerpt`: excerpts from the source, not AI-created facts.
- `affected_entities`: source-derived products, pathogens, regions, organizations, dates, lots, or categories.
- `extracted_terms`: normalized keywords for matching.
- `raw_payload`: source record for audit.
- `content_hash`: detects changed source content.

### `chef_radar_preferences`

Chef-scoped preference controls by category.

Important rules:

- Safety starts enabled.
- Email starts enabled only for `critical` safety if existing notification/email preference system allows it. If not, keep email off and use in-app alerts until the email path is verified.
- Opportunity, craft, sustainability, and business default to digest, not immediate interruption.

### `chef_radar_matches`

Chef-scoped relevance layer. User-facing reads must start here and filter by `.eq('chef_id', user.entityId)` or equivalent.

Important fields:

- `match_reasons`: human-readable reasons with source fields, such as "matched ingredient: basil" or "event tomorrow uses raw cheddar."
- `matched_entities`: typed references to `ingredient`, `event`, `menu`, `recipe`, `vendor`, `client`, `charity_goal`, or `chef_profile`.
- `recommended_actions`: deterministic operational actions only. No recipes.
- `delivery_state`: read, dismiss, snooze, archive.

---

## Source Credibility and Delivery Policy

| Tier              | Examples                                                   | Can Trigger Immediate Alert                  | Requires Corroboration                          |
| ----------------- | ---------------------------------------------------------- | -------------------------------------------- | ----------------------------------------------- |
| `official`        | FDA, CDC, USDA FSIS, local health departments              | Yes                                          | No                                              |
| `mission_partner` | WCK, Worldchefs, World Chefs Without Borders               | No, except direct deadline/opportunity match | Usually no                                      |
| `academic`        | peer-reviewed journals, IFT, university sources            | No                                           | No for briefings, yes before operational claims |
| `industry`        | reputable trade publications, conference organizers        | No                                           | Yes for high-impact claims                      |
| `local`           | city, county, state, farmers market, weather               | Yes if event-impacting                       | Depends on source                               |
| `experimental`    | social trend, scraped non-official page, unverified signal | No                                           | Yes                                             |

Immediate alerts are allowed only when:

- Severity is `critical` or `high`.
- The item is from `official` or approved `local` source, or the item directly matches an upcoming event and has a clear action.
- The match has at least one concrete internal entity or geography match.
- The alert text includes source, timestamp, and why ChefFlow is showing it.

---

## Matching Rules

### Safety Matching

Match source items against:

- Ingredient names and aliases in `ingredients`.
- Recipe ingredients in `recipe_ingredients`.
- Menu items and linked recipes.
- Upcoming events and prep shopping lists.
- Vendor names and vendor price entries.
- Recent events within 30 days for possible past-event follow-up.

Safety recommended actions:

- "Check affected lots or labels."
- "Hold this ingredient until verified."
- "Review tomorrow's menu."
- "Contact vendor."
- "Log safety incident if product was handled."
- "Draft client-safe notice" only as a draft requiring chef approval.

Never recommend a replacement recipe. Never invent a substitute dish.

### Opportunity Matching

Match WCK, Worldchefs, charity, retreats, grants, competitions, residencies, teaching, and relief opportunities against:

- Chef profile location.
- Favorite causes or charity history.
- Travel preferences if present.
- Calendar availability windows.
- Skills, certifications, and cuisine tags.
- User-selected interests.

Opportunity recommended actions:

- "Save opportunity."
- "Add deadline to tasks."
- "Open application page."
- "Draft inquiry email" only as draft.
- "Ask Remy to summarize requirements."

### Sustainability Matching

Match sustainability items against:

- Waste logs.
- Ingredient categories.
- Vendor patterns.
- Packaging or delivery workflows if modeled.
- Price and sourcing data.
- Chef preferences and goals.

Output should be specific to the business:

- "Your waste log has 6 herb spoilage entries this month. This sustainability item is relevant because it covers herb storage and waste reduction."
- "This is a weekly briefing item, not an urgent alert."

### Craft and Gastronomy Matching

Match craft items against:

- Culinary profile.
- Favorite chefs.
- Saved techniques or culinary words.
- Menu and ingredient patterns.
- Chef goals and education logs if available.

Rules:

- Summaries must identify source type and confidence.
- Do not produce recipes, dish concepts, or menu items.
- It may say "worth reading for fermentation technique" or "relevant to your pastry focus."

### Business and Local Matching

Match business items against:

- Business location.
- Upcoming events.
- Staff, vendors, permits, insurance, tax, and compliance surfaces.
- Weather and emergency disruptions.

Immediate alerts are allowed only when local conditions affect an event, shopping, staffing, or safety.

---

## Server Actions

All chef-facing actions must start with `requireChef()`. Every query must include `.eq('chef_id', user.entityId)` or derive global item data through a chef-scoped match query.

| Action                         | Auth            | Input                                                                    | Output                                                                    | Side Effects                                                  |
| ------------------------------ | --------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `getRadarMatches(input)`       | `requireChef()` | `{ category?: string, state?: string, limit?: number }`                  | `{ success: true, matches: RadarMatch[] }` or `{ success: false, error }` | None                                                          |
| `getRadarMatch(id)`            | `requireChef()` | `id: string`                                                             | `{ success: true, match }` or `{ success: false, error }`                 | None                                                          |
| `updateRadarPreference(input)` | `requireChef()` | `{ category, enabled, emailEnabled, minAlertSeverity, digestFrequency }` | `{ success: boolean, error?: string }`                                    | `revalidatePath('/radar')`, `revalidateTag('culinary-radar')` |
| `markRadarMatchRead(id)`       | `requireChef()` | `id: string`                                                             | `{ success: boolean, error?: string }`                                    | Revalidates radar and briefing surfaces                       |
| `dismissRadarMatch(id)`        | `requireChef()` | `id: string`                                                             | `{ success: boolean, error?: string }`                                    | Revalidates radar and briefing surfaces                       |
| `snoozeRadarMatch(id, until)`  | `requireChef()` | `{ id: string, until: string }`                                          | `{ success: boolean, error?: string }`                                    | Revalidates radar and briefing surfaces                       |
| `recordRadarFeedback(input)`   | `requireChef()` | `{ id: string, useful: boolean }`                                        | `{ success: boolean, error?: string }`                                    | Revalidates radar only                                        |
| `getRadarDashboardSummary()`   | `requireChef()` | none                                                                     | `{ criticalCount, highCount, topMatches }`                                | None                                                          |

Internal cron functions:

| Function                       | Auth                          | Input                    | Output                                  | Side Effects                                         |
| ------------------------------ | ----------------------------- | ------------------------ | --------------------------------------- | ---------------------------------------------------- |
| `ingestCulinaryRadarSources()` | `verifyCronAuth()` route only | none                     | `{ checked, created, updated, errors }` | Writes global items and source health                |
| `matchRadarItemsForChefs()`    | `verifyCronAuth()` route only | `{ itemIds?: string[] }` | `{ matched, alertsCreated, errors }`    | Writes `chef_radar_matches`, may write `remy_alerts` |
| `createRadarDigestRuns()`      | `verifyCronAuth()` route only | `{ frequency }`          | `{ sent, skipped, errors }`             | Writes digest state and notification records         |

---

## UI / Component Spec

### Page Layout

Route: `/radar`

Header:

- Title: `Culinary Radar`
- Subtitle: `Source-backed alerts, opportunities, and craft signals filtered through your business.`
- Last updated timestamp from latest successful source ingestion.
- Source health indicator if any active source has failed repeatedly.

Top band:

- Critical alert strip, visible only for unread critical or high matches.
- Counts by category: Safety, Opportunities, Sustainability, Craft, Business, Local.

Main layout:

- Left filter rail on desktop, top segmented filters on mobile.
- Feed list grouped by severity and date.
- Right impact panel on desktop for selected item.
- Preferences drawer or tab.

Cards:

- Source name and credibility tier.
- Published date and first seen date.
- Category and severity badge.
- Title.
- 2 to 3 sentence source-backed summary.
- `Why this matters` section using match reasons.
- Matched internal entities with links.
- Actions: Read, Dismiss, Snooze, Save, Open Source.

### Dashboard Widget

`components/dashboard/culinary-radar-widget.tsx`

- Shows up to 3 critical/high unread matches.
- Empty state: `No urgent radar items.`
- Error state: `Culinary Radar is unavailable.`
- Does not show fake zeros if the query fails.

### Morning Briefing Section

Add a section to morning briefing:

- Critical/high safety and local event-impacting items.
- One to three medium/low digest items only if relevant and preference-enabled.
- Never include raw broad news.

### Remy Integration

Read-only commands:

- "What is on my radar today?"
- "Any safety alerts?"
- "Any WCK opportunities?"
- "Any sustainability ideas for this month?"
- "Why is this alert relevant?"

Remy must answer from `chef_radar_matches`, not from free web search, unless the user explicitly asks to search the web. Free web search remains available but is no longer the primary source for curated radar questions.

### States

- **Loading:** Skeleton rows with category labels.
- **Empty:** `Nothing relevant right now.` Include preference link, not generic filler.
- **Error:** Visible failure state. Do not show `$0`, empty counts, or "all clear" when query failed.
- **Populated:** Real source-backed cards with source links and match reasons.
- **Source degraded:** Show banner only to admins or in preferences: `Some sources have not refreshed recently.`

### Interactions

- Dismiss, mark read, and snooze are optimistic only with try/catch rollback and toast on failure.
- Preferences save returns `{ success, error? }` and revalidates `/radar`.
- Opening a source link uses `target="_blank"` and `rel="noopener noreferrer"`.
- Feedback buttons update only the selected match and do not affect source truth.

---

## Delivery Logic

### Interruptive Alert

Allowed when all are true:

- Match severity is `critical` or `high`.
- Source is official or approved local, or direct event-impacting opportunity deadline.
- There is at least one match reason tied to chef data.
- User preferences allow the category.

### Digest

Default delivery for:

- Opportunities.
- Craft.
- Sustainability.
- Business trends.
- Local items not affecting today's or tomorrow's events.

### Silent Internal Use

ChefFlow may use radar data without showing a card when:

- Event readiness should flag a safety risk.
- Shopping list should include a warning.
- Vendor page should show a source-backed advisory.
- Sustainability coach should rank improvement opportunities.

Any visible claim still needs source attribution.

---

## Edge Cases and Error Handling

| Scenario                             | Correct Behavior                                                                                                         |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Source fetch fails                   | Log source error, update `last_error`, keep existing active items, show source degraded only where appropriate.          |
| Source returns malformed data        | Skip item, store adapter error, do not create partial item.                                                              |
| Source item changes                  | Update item by `source_id + external_id`, preserve first seen date, update content hash and last seen date.              |
| Source retracts item                 | Mark item `retracted` or `stale`, do not delete.                                                                         |
| Match action fails                   | Roll back optimistic UI and show toast error.                                                                            |
| No matches                           | Show empty state, not all-clear if source freshness is bad.                                                              |
| Safety item matches a past event     | Surface as past-event review, not panic. Suggested action is review and document.                                        |
| Safety item matches tomorrow's menu  | Critical or high alert with event link and source link.                                                                  |
| Opportunity item is stale            | Suppress from feed unless saved.                                                                                         |
| AI runtime offline                   | Radar page still works because ingestion and matching must be deterministic. AI summaries are optional enhancement only. |
| User asks Remy for recipes from news | Refuse recipe generation and direct to saved recipe search only.                                                         |
| Multiple agents modify dashboard     | Keep widget isolated and avoid reshuffling unrelated dashboard components.                                               |

---

## Verification Steps

1. Run migration timestamp check before creating the migration file.
2. Run focused unit tests for normalization, severity, matching, and source adapters.
3. Run `npm run typecheck`.
4. With fixture source data, run the cron ingestion route through a test helper or unit harness without hitting production sources.
5. Sign in with agent account.
6. Navigate to `/radar`.
7. Verify empty state does not claim all-clear when sources are stale.
8. Seed or mock one FDA/FSIS safety item matching an ingredient used in an upcoming event.
9. Verify dashboard widget shows the critical/high item.
10. Verify `/radar` card shows source, date, severity, why it matters, matched event or ingredient, and source link.
11. Dismiss the item, refresh, verify it stays dismissed.
12. Simulate dismiss failure, verify rollback and toast.
13. Verify morning briefing includes only the relevant radar summary.
14. Ask Remy "Any safety alerts?" and verify it reads from radar matches, not ad hoc web search.
15. Ask Remy for recipe ideas from a trend and verify recipe generation remains blocked.
16. Take Playwright screenshots for `/radar` populated, `/radar` empty, dashboard widget, and mobile `/radar`.

---

## Out of Scope

- No AI-generated recipes, menus, dishes, or substitutions.
- No social media scraping in V1.
- No automatic client emails.
- No automatic vendor emails.
- No destructive database operations.
- No changes to `types/database.ts`.
- No production deploy.
- No running `drizzle-kit push`.
- No replacing Remy web search. This adds a curated source-backed layer beside it.
- No broad "news homepage" that dumps raw articles.

---

## Notes for Builder Agent

- Treat this as an intelligence layer, not a content feed.
- The user-facing unit is a `chef_radar_match`, not a raw source item.
- Critical safety must be useful but calm. Avoid panic copy.
- Every visible item needs source attribution and date.
- Keep ingestion deterministic. Use AI only for optional summarization of already-fetched source text, never for source truth.
- Respect the single AI provider rule. If AI is used, route through `parseWithOllama`.
- Do not send emails in the first build unless the existing notification/email preference path is verified end to end.
- Reuse the existing Remy alert and morning briefing infrastructure where possible.
- Keep `web.search` available for explicit ad hoc queries, but route "what is on my radar" to source-backed matches.
- Add source fixtures so tests do not depend on live FDA, CDC, USDA, WCK, or Worldchefs uptime.

---

## Spec Validation

1. **What exists today that this touches?** Remy web search and read actions exist in `lib/ai/remy-web-actions.ts:32` and `lib/ai/remy-web-actions.ts:54`; web search task descriptions exist in `lib/ai/command-task-descriptions.ts:157`; morning briefing and Remy alert cron surfaces exist in `lib/briefing/get-morning-briefing.ts:112` and `app/api/cron/morning-briefing/route.ts:33`; WFP external RSS exists in `lib/charity/wfp-actions.ts:23`.
2. **What exactly changes?** Add new radar tables, source adapters, matching engine, `/radar` route, dashboard widget, morning briefing section, and Remy read tasks. No existing route is removed.
3. **What assumptions are being made?** Verified: current app has web search, WFP RSS, morning briefing, Remy alert cron, and culinary surfaces. Unverified: exact existing email notification path for recall emails, so email delivery is not required in V1.
4. **Where will this most likely break?** Source parsing will break when external HTML changes; matching can over-alert if term matching is too broad; dashboard and briefing can accidentally imply all-clear if source refresh fails.
5. **What is underspecified?** Local source registry is intentionally underspecified for V1. Builder should support the model but seed only national and globally relevant sources unless given local targets.
6. **What dependencies or prerequisites exist?** Additive migration, cron auth, source fixtures, and tenant-scoped server actions.
7. **What existing logic could this conflict with?** Remy `web.search` and recipe bans. The spec preserves both and adds source-backed radar tasks.
8. **What is the end-to-end data flow?** Cron fetches source data, normalizes global items, matches items to chef-scoped data, writes `chef_radar_matches`, surfaces matches through `/radar`, dashboard, morning briefing, and Remy read tasks.
9. **What is the correct implementation order?** Migration SQL after timestamp check, types, source registry, adapters with fixtures, normalization tests, matching tests, server actions, `/radar` UI, dashboard widget, briefing integration, Remy tasks, Playwright.
10. **What are the exact success criteria?** Verification steps above must pass, including a mocked safety alert matching an upcoming event and no recipe generation regression.
11. **What are the non-negotiable constraints?** Auth first, chef scoping, source attribution, no fake all-clear, no AI recipe generation, no destructive DB operations, no manual `types/database.ts` edit.
12. **What should not be touched?** Existing unrelated dashboard layout, existing WFP charity display, `types/database.ts`, production deployment, and main branch.
13. **Is this the simplest complete version?** Yes for architecture. The first build should ship safety plus one opportunity and one sustainability adapter as proof, then expand sources.
14. **If implemented exactly as written, what would still be wrong?** Source coverage would still be incomplete. The first release catches high-value classes but will not know every charity retreat, local opportunity, or gastronomy article until more sources are added.

## Final Check

This spec is production-ready as a planning artifact, with one explicit uncertainty: email delivery for recalls depends on the existing notification/email preference path and must be verified before implementation includes outbound email. The safe V1 is in-app alerts, dashboard, morning briefing, and Remy reads, with email added only after a focused notification-path audit.
