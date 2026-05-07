# ChefFlow Domain Map

> Claude's guide to the 265 `lib/` domains. Use this to know where code lives, where new code goes, and how domains connect.
>
> **Rule:** New code goes in the existing domain that fits. If no domain fits, create one in `lib/{domain}/` and add it here. Never create loose files in `lib/` root.

---

## 1. CORE BUSINESS (Chef & Client Management)

| Domain                 | Files | Purpose                                                                                 |
| ---------------------- | ----- | --------------------------------------------------------------------------------------- |
| `chef`                 | 20    | Chef profile, health score, cannabis access, gratuity settings                          |
| `chef-services`        | 2     | Chef service type config (catering, meal-prep, etc.)                                    |
| `chef-decision-engine` | 3     | Multi-factor decision engine for course/dish recs based on guest dietary needs          |
| `cheftips`             | 2     | Tips/gratuity management                                                                |
| `clients`              | 71    | Full client CRM: CRUD, churn scoring, history, dietary, segmentation, household         |
| `client-dashboard`     | 3     | Client-facing dashboard preferences                                                     |
| `client-portal`        | 2     | Authenticated client portal with token-based access                                     |
| `client-work-graph`    | 4     | Graph view of all work related to a client (events, menus, quotes)                      |
| `favorite-chefs`       | 2     | Client's saved/favorite chef list                                                       |
| `archetypes`           | 3     | Chef persona presets (private-chef, caterer, meal-prep) driving nav and module defaults |
| `professional`         | 8     | Professional development: education, capability tracking, growth check-ins              |
| `profile`              | 2     | Chef public profile and actions                                                         |
| `portfolio`            | 4     | Chef portfolio showcase with highlight curation                                         |
| `contact`              | 4     | Contact form, claims, operator evaluation, public support                               |
| `connections`          | 1     | Chef-to-chef or chef-to-client connections                                              |

## 2. EVENTS & BOOKINGS

| Domain               | Files | Purpose                                                                        |
| -------------------- | ----- | ------------------------------------------------------------------------------ |
| `events`             | 68    | Core event lifecycle: creation, cancellation, carry-forward, alcohol, ambiance |
| `booking`            | 9     | Booking settings, budget parsing, instant book, series planning, chef matching |
| `action-graph`       | 1     | Booking action pipeline (proposal -> contract -> deposit -> menu review)       |
| `availability`       | 4     | Chef availability rules, conflict checking                                     |
| `scheduling`         | 28    | Calendar sync, capacity planning, availability sharing, schedule viz           |
| `calendar`           | 8     | Calendar entries, seasonal produce calendar, signal settings, reschedule       |
| `recurring`          | 5     | Recurring event planning, weekly retro, circle bridging                        |
| `confirm`            | 1     | Booking confirmation policy                                                    |
| `cancellation`       | 2     | Cancellation policy and refund actions                                         |
| `service-days`       | 1     | Service day management for regular schedules                                   |
| `service-execution`  | 3     | Day-of service orchestration and progress tracking                             |
| `service-simulation` | 6     | Pre-event dry-run simulation engine with gates/proofs/phases                   |
| `tickets`            | 14    | Event ticketing: purchase, distribution, broadcast, cohost dashboards          |
| `dinner-circles`     | 6     | Recurring dinner circles with sourcing, corporate, ingredient showcases        |
| `popups`             | 5     | Pop-up event management: forecasting, product library, snapshots               |
| `grazing`            | 4     | Grazing table/board planning with scaling and component mixing                 |

## 3. CULINARY & FOOD

| Domain             | Files | Purpose                                                                           |
| ------------------ | ----- | --------------------------------------------------------------------------------- |
| `menus`            | 35    | Menu CRUD, allergen checks, approval portal, canonical dish system, tasting notes |
| `recipes`          | 17    | Recipe management, ingredient parsing, allergen tracking, CSV import, nutrition   |
| `ingredients`      | 5     | Ingredient images, pricing, receipt scanning, substitutions                       |
| `dietary`          | 7     | Allergy sync, cross-contamination, dietary intake, catalog                        |
| `nutrition`        | 8     | Nutritional analysis via USDA FDC, Edamam, Open Food Facts                        |
| `food`             | 2     | Food data integration with Open Food Facts                                        |
| `dishes`           | 1     | Dish photo management                                                             |
| `cocktails`        | 1     | TheCocktailDB API integration                                                     |
| `culinary`         | 2     | Ingredient lifecycle and shopping list generation                                 |
| `culinary-words`   | 3     | Culinary vocabulary, animations, constants for UI embellishment                   |
| `scaling`          | 3     | Recipe scaling engine with yield inference and purchase feedback                  |
| `front-of-house`   | 3     | Printable front-of-house menu generation from templates                           |
| `meal-prep`        | 4     | Meal prep programs: batch aggregation, containers, delivery                       |
| `menu-performance` | 1     | Menu item performance analytics                                                   |
| `cannabis`         | 3     | Cannabis-infused event management: control packets, host agreements               |
| `haccp`            | 3     | HACCP food safety plan templates and actions                                      |
| `safety`           | 3     | Food safety incidents, recalls, backup chef management                            |

## 4. FINANCIAL & PAYMENTS

| Domain          | Files | Purpose                                                                                    |
| --------------- | ----- | ------------------------------------------------------------------------------------------ |
| `finance`       | 55    | Full financial suite: 1099, bank feeds, break-even, cash flow, chargebacks, invoicing, P&L |
| `pricing`       | 65    | PIE engine: benchmarks, anomaly detection, census pricing, elasticity                      |
| `stripe`        | 9     | Stripe: checkout, connect, payouts, refunds, subscriptions, deferred transfers             |
| `payments`      | 3     | Payment splitting and recurring payments                                                   |
| `billing`       | 7     | Feature gating, focus-mode billing, module access, pro tier                                |
| `ledger`        | 5     | Double-entry ledger: append, compute balances, payment imports                             |
| `expenses`      | 4     | Expense tracking with receipt upload                                                       |
| `costing`       | 3     | Event/recipe cost calculations, warnings, operator cost lines                              |
| `tax`           | 6     | Tax calculations, home office deductions, retirement planning                              |
| `revenue-goals` | 3     | Revenue goal setting and tracking engine                                                   |
| `retainers`     | 2     | Retainer agreement management                                                              |
| `commerce`      | 47    | POS/commerce: cash drawer, checkout, hardware, promotions, orders, tipping                 |
| `monetization`  | 3     | Platform monetization (supporter tiers), email/offer management                            |
| `currency`      | 2     | Multi-currency support via Frankfurter API                                                 |
| `gifts`         | 1     | Gift certificate generation                                                                |

## 5. QUOTES, PROPOSALS & CONTRACTS

| Domain      | Files | Purpose                                                                   |
| ----------- | ----- | ------------------------------------------------------------------------- |
| `quotes`    | 9     | Quote creation, client spending analysis, loss analysis, price confidence |
| `proposals` | 5     | Smart proposal fields, addons, client-facing proposals, view tracking     |
| `contracts` | 2     | Contract generation and advanced features                                 |

## 6. AI & INTELLIGENCE

| Domain         | Files | Purpose                                                                                                 |
| -------------- | ----- | ------------------------------------------------------------------------------------------------------- |
| `ai`           | 232   | Central AI: LLM router (Ollama/Gemini), Remy assistant, NLP parsing, content gen, command orchestration |
| `intelligence` | 33    | Business intel: churn prevention, demand forecasts, price elasticity, client journeys                   |
| `cil`          | 11    | Continuous Intelligence Layer: per-tenant SQLite observation pipeline, graph scanning                   |
| `copilot`      | 2     | Ops copilot generating recommendations with confidence scores                                           |
| `simulation`   | 9     | Business scenario simulation with Ollama, pipeline runner, quality evaluator                            |
| `formulas`     | 18    | Deterministic business formulas: allergen matrix, critical path, depreciation, risk scores              |
| `completion`   | 8     | Entity completeness evaluation (event, client, menu, recipe, ingredient readiness)                      |

## 7. COMMUNICATION & MESSAGING

| Domain          | Files | Purpose                                                                               |
| --------------- | ----- | ------------------------------------------------------------------------------------- |
| `email`         | 107   | Email service: templates, notifications, provider abstraction (Resend), ICS, routing  |
| `communication` | 27    | Omni-channel: auto-response, business hours, channel meta, delivery, follow-ups       |
| `messages`      | 4     | Internal messaging, realtime chat, TAC transcripts                                    |
| `chat`          | 4     | Real-time chat actions, system messages                                               |
| `sms`           | 5     | SMS sending, ingestion, rate limiting via Twilio                                      |
| `calling`       | 6     | Phone/Twilio calling: ingredient flags, voice helpers, webhook auth                   |
| `calls`         | 2     | Call scheduling and reminder delivery                                                 |
| `comms`         | 4     | Communication credentials, email channel, Twilio BYO config                           |
| `phone`         | 6     | Phone number management: normalization, verification, SMS routing                     |
| `gmail`         | 28    | Gmail integration: parsing (Bark, Cozymeal), classification, spam, inquiry extraction |
| `notifications` | 19    | Notification routing: desktop, email, push, off-hours, channel selection              |
| `push`          | 3     | Web push notifications via VAPID                                                      |
| `translate`     | 2     | Translation via LibreTranslate                                                        |
| `voice`         | 2     | Kitchen voice commands and speech recognition                                         |

## 8. CLIENT-FACING & PUBLIC SURFACES

| Domain            | Files | Purpose                                                             |
| ----------------- | ----- | ------------------------------------------------------------------- |
| `public`          | 8     | Public chef directory, market scope, seasonal pulse, intake config  |
| `public-consumer` | 2     | Consumer discovery and public menu browsing                         |
| `portal`          | 1     | SEO health checks for portal pages                                  |
| `site`            | 4     | National brand audit, public route SEO, public site config          |
| `directory`       | 7     | Chef directory: location search, admin, waitlist                    |
| `discover`        | 18    | Discovery engine: entity resolution, nearby browse, SEO collections |
| `discovery`       | 3     | Chef discovery profile and constants                                |
| `sharing`         | 5     | Content sharing: guest resend, public contracts, share policies     |
| `preview`         | 1     | Client portal preview                                               |
| `testimonials`    | 3     | Testimonial collection and submission                               |
| `reviews`         | 5     | Review management: chef feedback, external platform sync            |

## 9. CRM & PIPELINE

| Domain           | Files | Purpose                                                                     |
| ---------------- | ----- | --------------------------------------------------------------------------- |
| `inquiries`      | 25    | Inquiry management: completeness scoring, conversation scaffolding, urgency |
| `leads`          | 2     | Lead completeness and scoring                                               |
| `pipeline`       | 2     | Sales pipeline forecasting and stuck-event detection                        |
| `prospecting`    | 12    | Prospecting: API auth, lead scoring, fuzzy match, OpenClaw import           |
| `follow-up`      | 3     | Follow-up sequence engine and templates                                     |
| `journey`        | 2     | Client journey tracking                                                     |
| `lifecycle`      | 7     | Service lifecycle detection: critical path, next-action, circle templates   |
| `decision-queue` | 1     | Priority decision queue combining next-best-actions and proactive alerts    |

## 10. INVENTORY & PROCUREMENT

| Domain        | Files | Purpose                                                                                     |
| ------------- | ----- | ------------------------------------------------------------------------------------------- |
| `inventory`   | 21    | Inventory: audits, auto-reorder, batch tracking, demand forecasting, depletion alerts       |
| `grocery`     | 10    | Grocery list gen, Instacart integration, regional pricing, store-level shopping             |
| `procurement` | 1     | Procurement actions                                                                         |
| `vendors`     | 19    | Vendor management: catalog import, document intake/parsing, invoicing, scoring              |
| `openclaw`    | 51    | OpenClaw ingredient pricing: catalog mirror, cartridge registry, enrichment, market pricing |
| `shopping`    | 1     | Ingredient substitution suggestions                                                         |
| `equipment`   | 6     | Equipment tracking: depreciation, maintenance, packing lists                                |
| `packing`     | 1     | Event packing list management                                                               |
| `gear`        | 2     | Chef gear/equipment defaults                                                                |

## 11. OPERATIONS & KITCHEN

| Domain            | Files | Purpose                                                                         |
| ----------------- | ----- | ------------------------------------------------------------------------------- |
| `operations`      | 5     | Course planning, document comments/versions, KDS, split billing                 |
| `daily-ops`       | 4     | Daily operations plan/draft engine                                              |
| `prep`            | 2     | Prep sheet generation                                                           |
| `prep-timeline`   | 5     | Prep timeline computation, iCal export, week pressure analysis                  |
| `stations`        | 6     | Kitchen station management: clipboard, daily ops, order tracking, waste logging |
| `kitchen`         | 2     | Kitchen assessments and kitchen-steps actions                                   |
| `kitchen-rentals` | 1     | Commercial kitchen rental management                                            |
| `restaurant`      | 4     | Restaurant ops: prep gen, sales, service day dashboard                          |
| `shifts`          | 1     | Staff shift management                                                          |
| `waste`           | 2     | Food waste tracking and constants                                               |

## 12. STAFF & TEAM

| Domain          | Files | Purpose                                                                                         |
| --------------- | ----- | ----------------------------------------------------------------------------------------------- |
| `staff`         | 19    | Staff management: availability, briefings, clock-in/out, labor dashboard, contractor agreements |
| `team`          | 1     | Team management                                                                                 |
| `collaboration` | 5     | Chef collaboration: revenue dashboards, settlement, event archives                              |
| `network`       | 8     | Chef network: collab spaces, intro bridges, opportunity sharing                                 |
| `community`     | 7     | Community: benchmarking, mentorship, subcontracting, template sharing, feature voting           |

## 13. MARKETING & GROWTH

| Domain       | Files | Purpose                                                                             |
| ------------ | ----- | ----------------------------------------------------------------------------------- |
| `marketing`  | 20    | A/B testing, content performance, holiday campaigns, referrals, SEO, social sharing |
| `campaigns`  | 3     | Campaign targeting, push dinner campaigns, public booking                           |
| `social`     | 29    | Social media: OAuth, platform adapters, hashtags, OpenClaw ingest, event posts      |
| `stories`    | 2     | Event story/recap generation for social sharing                                     |
| `reputation` | 1     | Online reputation mention tracking                                                  |
| `content`    | 1     | Post-event content generation                                                       |

## 14. ANALYTICS & REPORTING

| Domain       | Files | Purpose                                                                            |
| ------------ | ----- | ---------------------------------------------------------------------------------- |
| `analytics`  | 41    | Booking scores, channel tracking, client LTV, collaboration analytics, conversions |
| `reports`    | 8     | Report engine: daily reports, delivery, computation, definitions                   |
| `insights`   | 1     | Business insight actions                                                           |
| `dashboard`  | 5     | Accountability, health metrics, touchpoints, widget management                     |
| `saturation` | 2     | Market saturation analysis by geography/capacity                                   |

## 15. DOCUMENTS & TEMPLATES

| Domain      | Files | Purpose                                                                                |
| ----------- | ----- | -------------------------------------------------------------------------------------- |
| `documents` | 39    | Document system: auto-gen, archetype packs, allergy cards, event workspaces, templates |
| `templates` | 11    | Text templates: AAR, contingency plans, contracts, email drafts, briefings             |
| `print`     | 2     | Print-formatted output                                                                 |
| `exports`   | 3     | Data export and takeout (GDPR-style)                                                   |

## 16. PLATFORM INFRASTRUCTURE

| Domain                   | Files | Purpose                                                                            |
| ------------------------ | ----- | ---------------------------------------------------------------------------------- |
| `db`                     | 17    | Drizzle schema, migrations, FK map, server client, boot contract                   |
| `api`                    | 12    | API layer: auth keys, guards, rate limiting, request validation, v2 routes         |
| `auth`                   | 24    | Auth: session management, admin access, preview mode, role-based guards            |
| `mfa`                    | 6     | Multi-factor auth: TOTP, SMS challenges, recovery codes                            |
| `security`               | 15    | Brute-force protection, CSRF, rate limiting, reauth, session binding               |
| `cache`                  | 1     | Upstash Redis cache integration                                                    |
| `cron`                   | 4     | Cron job definitions, heartbeat, monitoring, ticker                                |
| `jobs`                   | 3     | Background jobs via Inngest (commerce, post-event)                                 |
| `realtime`               | 5     | SSE client/server, broadcast, channel access, subscriptions                        |
| `webhooks`               | 5     | Webhook system: delivery, audit logging, emitter, types                            |
| `config`                 | 1     | Nearby collection configuration                                                    |
| `constants`              | 9     | App-wide constants: allergens, booking sources, business rules, dietary, equipment |
| `environment`            | 2     | Production safety guards, runtime environment detection                            |
| `storage`                | 1     | Storage abstraction layer                                                          |
| `mutations`              | 3     | Mutation infra: conflict resolution, idempotency, soft-delete compat               |
| `resilience`             | 2     | Circuit breaker and retry patterns for external calls                              |
| `monitoring`             | 7     | Error monitoring: Sentry, failure repair, non-blocking logging                     |
| `observability`          | 1     | Request ID tracking                                                                |
| `platform-observability` | 5     | Coverage digest, event taxonomy, provenance tracking                               |
| `platform`               | 1     | Owner account management                                                           |

## 17. INTEGRATIONS & THIRD-PARTY

| Domain         | Files | Purpose                                                            |
| -------------- | ----- | ------------------------------------------------------------------ |
| `integrations` | 28    | Integration hub: iCal, payment providers, platform connections     |
| `google`       | 7     | Google OAuth, Contacts sync, mailbox control                       |
| `wix`          | 4     | Wix form submission ingestion and processing                       |
| `images`       | 6     | Image services: Cloudinary, Pexels, Unsplash, reSmush optimization |
| `maps`         | 1     | Mapbox integration                                                 |
| `geo`          | 5     | Geocoding via Geocodio, IP-API, REST Countries                     |
| `geocoding`    | 1     | Nominatim geocoding                                                |
| `ocr`          | 2     | OCR Space receipt/document parsing                                 |
| `weather`      | 2     | Open-Meteo weather data for event planning                         |

## 18. LOYALTY, GUESTS & COMMUNITY

| Domain        | Files | Purpose                                                                 |
| ------------- | ----- | ----------------------------------------------------------------------- |
| `loyalty`     | 16    | Loyalty program: auto-award, gift cards, raffle, invoice adjustments    |
| `guests`      | 12    | Guest management: analytics, comms, comps, count changes, lead tracking |
| `raffle`      | 2     | Raffle/giveaway management                                              |
| `surveys`     | 2     | Survey creation and utilities                                           |
| `feedback`    | 7     | User feedback: surveys, issue reporting, token-gated surveys            |
| `beta`        | 4     | Beta program: onboarding, email triggers                                |
| `beta-survey` | 4     | Beta user survey with caching and presence tracking                     |

## 19. COMPLIANCE & LEGAL

| Domain       | Files | Purpose                                                                        |
| ------------ | ----- | ------------------------------------------------------------------------------ |
| `compliance` | 14    | Certifications, claims, data export/import, health inspection, insurance, GDPR |
| `protection` | 8     | Audit trails, compliance gates, continuity, insurance, traceability            |
| `moderation` | 1     | Content filtering/moderation                                                   |

## 20. UI FRAMEWORK & CLIENT-SIDE

| Domain                   | Files | Purpose                                                                                     |
| ------------------------ | ----- | ------------------------------------------------------------------------------------------- |
| `hooks`                  | 26    | React hooks: browser AI, chunk recovery, debounce, deferred actions, focus mode, pagination |
| `ui`                     | 2     | UI utilities: symbol registry, tooltip                                                      |
| `navigation`             | 3     | Focus mode nav, return-to, unsaved changes guard                                            |
| `keyboard`               | 1     | Keyboard shortcut definitions                                                               |
| `loading`                | 2     | Loading state registry and simulated progress                                               |
| `overlay`                | 1     | Overlay/modal queue management                                                              |
| `themes`                 | 3     | UI theming: color palettes, theme registry                                                  |
| `progressive-disclosure` | 3     | Progressive UI disclosure based on tenant data maturity                                     |
| `view-state`             | 2     | Persistent view state with URL context                                                      |
| `save-state`             | 1     | Save state model (unsaved/saving/saved/offline-queued/failed)                               |
| `undo`                   | 1     | Undo stack hook                                                                             |
| `drafts`                 | 1     | Durable draft hook for form persistence                                                     |
| `context`                | 2     | React contexts for app state and permissions                                                |
| `surfaces`               | 1     | Runtime surface contract defining route ownership                                           |
| `interface`              | 4     | Surface completeness auditing, route inventory, governance                                  |

## 21. PARTNER & MARKETPLACE

| Domain        | Files | Purpose                                                                       |
| ------------- | ----- | ----------------------------------------------------------------------------- |
| `partners`    | 9     | Partner management: analytics, invites, payouts, portal, location experiences |
| `marketplace` | 8     | Marketplace: command center, conversion tracking, ROI, scorecards             |

## 22. SCHEDULING & TIME

| Domain       | Files | Purpose                                              |
| ------------ | ----- | ---------------------------------------------------- |
| `time`       | 1     | Relative time formatting                             |
| `admin-time` | 2     | Admin time tracking and constants                    |
| `holidays`   | 8     | US holiday data, outreach campaigns, overlay configs |
| `seasonal`   | 3     | Seasonal ingredient/event helpers                    |

## 23. ONBOARDING & DEMO

| Domain       | Files | Purpose                                                                            |
| ------------ | ----- | ---------------------------------------------------------------------------------- |
| `onboarding` | 17    | Chef onboarding: config engine, archetype copy, demo data seeding, step completion |
| `demo`       | 3     | Demo mode with fixture data and seed helpers                                       |
| `migration`  | 3     | CSV data import for migrating from other platforms                                 |

## 24. LOCATION & TRAVEL

| Domain      | Files | Purpose                                                              |
| ----------- | ----- | -------------------------------------------------------------------- |
| `locations` | 6     | Multi-location: alerts, compliance, forecasting, metrics, purchasing |
| `travel`    | 2     | Chef travel management (distance, travel fees)                       |

## 25. TASK & WORKFLOW

| Domain        | Files | Purpose                                                                                   |
| ------------- | ----- | ----------------------------------------------------------------------------------------- |
| `tasks`       | 9     | Task management: dependencies, recurring engine, templates, carry-forward                 |
| `todos`       | 2     | Todo list actions and matching                                                            |
| `workflow`    | 5     | Workflow engine: stage definitions, confirmed facts, preparable actions                   |
| `queue`       | 14    | Priority queue system with domain-specific providers (inquiry, message, quote, financial) |
| `current`     | 12    | "The Current": unified operational feed ranking items by urgency                          |
| `checklist`   | 1     | Checklist management                                                                      |
| `quick-notes` | 1     | Quick note capture                                                                        |
| `notes`       | 2     | Notes and workflow-linked notes                                                           |

## 26. AUTOMATION & LEARNING

| Domain          | Files | Purpose                                                                           |
| --------------- | ----- | --------------------------------------------------------------------------------- |
| `automations`   | 11    | Automation engine: rule templates, conditions, action handlers, AAR triggers      |
| `interactions`  | 9     | Interaction execution framework: registry, permissions, visibility, schema-driven |
| `aar`           | 2     | After-Action Review: post-event feedback loop feeding the learning system         |
| `activity`      | 19    | Activity feeds, breadcrumbs, engagement tracking, chef/client payloads            |
| `passive-store` | 5     | Passive data derivation from existing chef/event/menu/recipe data                 |

## 27. HELP & KNOWLEDGE

| Domain            | Files | Purpose                                                                     |
| ----------------- | ----- | --------------------------------------------------------------------------- |
| `help`            | 29    | Contextual help system: page-info registry with per-section documentation   |
| `knowledge`       | 4     | Knowledge base: explore, link, review actions                               |
| `work-continuity` | 5     | Dev work continuity: session log parsing, spec status tracking, build index |

## 28. WELLBEING & SUSTAINABILITY

| Domain           | Files | Purpose                                    |
| ---------------- | ----- | ------------------------------------------ |
| `wellbeing`      | 2     | Chef burnout scoring and wellbeing actions |
| `sustainability` | 2     | Sourcing sustainability tracking           |

## 29. MOBILE & OFFLINE

| Domain    | Files | Purpose                                                                           |
| --------- | ----- | --------------------------------------------------------------------------------- |
| `mobile`  | 2     | Capacitor mobile app config and service                                           |
| `offline` | 9     | Offline-first: IndexedDB queue, sync engine, idempotent mutations, network status |
| `devices` | 5     | Device management: offline order queue, token registration                        |

## 30. HUB & CIRCLES

| Domain  | Files | Purpose                                                                                  |
| ------- | ----- | ---------------------------------------------------------------------------------------- |
| `hub`   | 58    | Chef Hub: circles, guest profiles, groups, messaging, media, notes, digest, verification |
| `inbox` | 2     | Unified inbox                                                                            |

## 31. MISC & UTILITY

| Domain             | Files | Purpose                                                                       |
| ------------------ | ----- | ----------------------------------------------------------------------------- |
| `utils`            | 7     | Classnames, currency formatting, name matching, safe-fetch, unit conversion   |
| `units`            | 1     | Measurement unit conversion engine                                            |
| `validation`       | 3     | Form validation rules and Zod schemas                                         |
| `errors`           | 2     | App error class and error-to-UI mapping                                       |
| `links`            | 1     | URL shortener                                                                 |
| `qr`               | 1     | QR code generation                                                            |
| `qol`              | 3     | Quality-of-life metrics and protected form hook                               |
| `search`           | 2     | Universal search and recent searches                                          |
| `brand`            | 1     | Brand constants (colors, naming)                                              |
| `features`         | 4     | Feature flag system and dev tools observability                               |
| `session`          | 1     | Session recovery                                                              |
| `versioning`       | 1     | Data snapshot versioning                                                      |
| `taxonomy`         | 3     | Entity taxonomy system with system defaults                                   |
| `entities`         | 1     | Entity photo management                                                       |
| `email-references` | 2     | Deterministic email reference ID extraction                                   |
| `classes`          | 1     | Cooking class management                                                      |
| `briefing`         | 2     | Morning briefing generation                                                   |
| `alerts`           | 1     | Unified alert hub                                                             |
| `goals`            | 9     | Business goals: check-ins, service mix, signal fetchers, notification builder |
| `custom-fields`    | 1     | Custom field definitions                                                      |
| `charity`          | 7     | Charity integration: ProPublica, WFP, volunteer hours                         |
| `credentials`      | 1     | Credential management                                                         |
| `contingency`      | 2     | Contingency/backup plan management                                            |
| `packages`         | 2     | Service package definitions and pricing calculator                            |

---

## Standalone Root Files

| File           | Purpose                |
| -------------- | ---------------------- |
| `demo-mode.ts` | Demo mode toggle       |
| `features.ts`  | Feature flag constants |
| `logger.ts`    | Logging utility        |
| `rateLimit.ts` | Rate limiting utility  |
| `utils.ts`     | Root utility functions |

---

## Domain Placement Rules

**Where does new code go?**

1. **Server action?** Put in `lib/{domain}/actions.ts` or `lib/{domain}/{feature}-actions.ts`
2. **Types?** Put in `lib/{domain}/types.ts`
3. **Constants?** Put in `lib/{domain}/constants.ts` or `lib/constants/{topic}.ts` if cross-domain
4. **React hook?** Put in `lib/hooks/` if generic, `lib/{domain}/` if domain-specific
5. **Database query?** Put in `lib/{domain}/queries.ts`
6. **Formula/calculation?** Put in `lib/formulas/` if reusable, `lib/{domain}/` if domain-specific
7. **External API integration?** Put in `lib/{service-name}/` (e.g., `lib/stripe/`, `lib/google/`)
8. **AI prompt/agent?** Put in `lib/ai/`

**Ambiguous domain?** Pick the domain closest to the _entity being acted on_, not the _feature requesting it_. Example: a booking action that creates an event goes in `lib/events/`, not `lib/booking/`.

## Stats

- **265 domains**, ~2,400+ files
- **Top 10 by size:** ai (232), email (107), clients (71), events (68), pricing (65), hub (58), finance (55), openclaw (51), commerce (47), analytics (41)
- **Patterns:** `'use server'` actions, Drizzle ORM, Zod validation, Ollama/Gemini AI, multi-tenant via `requireChef()`/`requireAdmin()`, deterministic-first (formulas before AI), offline-first with IndexedDB
