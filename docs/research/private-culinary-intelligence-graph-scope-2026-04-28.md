# Research: Private Culinary Intelligence Graph Scope

Date: 2026-04-28
Status: Research note, not implementation spec
Prompt: Continue researching and documenting the private culinary intelligence system. Include non-food items that fully belong to the culinary world, especially equipment, properties, and licensing.

## First Principles

ChefFlow is not trying to build a grocery price database. The durable problem is operational truth for culinary work.

A culinary operator needs to know whether a fact can be trusted enough to use in costing, purchasing, inventory, quoting, compliance, or planning. That applies to food, but it also applies to ovens, refrigeration, hotel pans, generators, insurance certificates, alcohol licenses, commissary rentals, venue load-in rules, food truck permits, fire inspections, pesticide-sensitive farm products, packaging, cleaning chemicals, delivery windows, storage constraints, and recalled equipment.

The base unit of the future system should not be "price." It should be an evidenced claim about an operational entity, scoped by tenant, source, time, location, jurisdiction, and review state.

## Current ChefFlow Ground Truth

ChefFlow already has the strongest source-of-truth pattern in its price intelligence layer. The catalog detail contract exposes price cents, confidence, source URLs, image URLs, confirmation time, package size, provenance label, publication eligibility, surface eligibility, and lifecycle state in one typed shape (`lib/openclaw/catalog-types.ts:11`, `lib/openclaw/catalog-types.ts:15`, `lib/openclaw/catalog-types.ts:17`, `lib/openclaw/catalog-types.ts:21`, `lib/openclaw/catalog-types.ts:23`, `lib/openclaw/catalog-types.ts:24`, `lib/openclaw/catalog-types.ts:26`, `lib/openclaw/catalog-types.ts:27`, `lib/openclaw/catalog-types.ts:28`). The public catalog query only surfaces rows when `surface_eligible = true`; internal views can include `surfaceable` and `internal_only` facts (`lib/openclaw/catalog-detail-contract.ts:220`, `lib/openclaw/catalog-detail-contract.ts:223`).

The database contract already models lifecycle and publication gating. The price intelligence contract computes `lifecycle_state`, `publication_eligibility`, and `surface_eligible` (`database/migrations/20260422000003_price_intelligence_contract_and_governor.sql:162`, `database/migrations/20260422000003_price_intelligence_contract_and_governor.sql:189`, `database/migrations/20260422000003_price_intelligence_contract_and_governor.sql:414`). It also tracks frontier health by last observed time and counts of observed, stale, review, duplicate, and surfaceable facts (`database/migrations/20260422000003_price_intelligence_contract_and_governor.sql:522`, `database/migrations/20260422000003_price_intelligence_contract_and_governor.sql:525`, `database/migrations/20260422000003_price_intelligence_contract_and_governor.sql:528`, `database/migrations/20260422000003_price_intelligence_contract_and_governor.sql:531`, `database/migrations/20260422000003_price_intelligence_contract_and_governor.sql:534`).

Price resolution is already evidence-ranked, not a blind average. It prefers recent chef receipts, then live quotes, wholesale, direct scrape, flyers, marketplace data, regional averages, system market data, government data, historical receipts, category baselines, and finally no data (`lib/pricing/resolve-price.ts:10`, `lib/pricing/resolve-price.ts:17`, `lib/pricing/resolve-price.ts:242`, `lib/pricing/resolve-price.ts:263`, `lib/pricing/resolve-price.ts:338`, `lib/pricing/resolve-price.ts:547`, `lib/pricing/resolve-price.ts:1006`). It returns confidence, freshness, confirmation time, and a reason, including a clear no-data reason instead of fake zero pricing (`lib/pricing/resolve-price.ts:100`, `lib/pricing/resolve-price.ts:103`, `lib/pricing/resolve-price.ts:104`, `lib/pricing/resolve-price.ts:1014`).

ChefFlow also has raw document intake and review primitives. Vendor document status is explicit: uploaded, processing, review, completed, or failed (`lib/vendors/document-intake-actions.ts:64`). Uploads track file hashes and parse summaries (`lib/vendors/document-intake-actions.ts:73`, `lib/vendors/document-intake-actions.ts:75`), infer OCR/image extraction methods (`lib/vendors/document-intake-actions.ts:255`), dedupe by file hash (`lib/vendors/document-intake-actions.ts:920`), and hold extracted drafts in review before applying (`lib/vendors/document-intake-actions.ts:1107`, `lib/vendors/document-intake-actions.ts:1357`). Catalog imports already assess high, medium, and low confidence before auto-apply or review (`lib/vendors/catalog-import-actions.ts:75`, `lib/vendors/catalog-import-actions.ts:126`, `lib/vendors/catalog-import-actions.ts:370`).

AI is already constrained to structured extraction. `parseWithOllama` has no cloud fallback, throws `OllamaOfflineError`, validates against Zod, and attempts one repair pass through the same runtime (`lib/ai/parse-ollama.ts:3`, `lib/ai/parse-ollama.ts:150`, `lib/ai/parse-ollama.ts:439`, `lib/ai/parse-ollama.ts:458`). This supports the intended rule: AI may parse, classify, normalize, summarize, and detect conflicts, but it must not invent culinary truth or generate recipes.

## Non-Food Domains That Belong In The Culinary Graph

The graph should treat these as first-class culinary entities, not side notes.

### Equipment And Smallwares

Scope:

- Major equipment: ovens, ranges, induction burners, fryers, steamers, mixers, proofers, blast chillers, walk-ins, freezers, dish machines, hood systems, fire suppression, generators, food trucks, trailers, refrigeration vehicles.
- Smallwares: hotel pans, cambros, sheet pans, knives, scales, thermometers, immersion blenders, chafers, service trays, squeeze bottles, pastry molds, piping tips, cutting boards, lexans, bus tubs.
- Service and event gear: tables, linens, plateware, glassware, flatware, warmers, portable handwash stations, tents, lighting, signage, buffet guards.
- Maintenance facts: serial number, model, capacity, wattage, gas/electric type, voltage, dimensions, safe operating range, service history, last inspection, warranty, replacement cost in cents, expected lifespan, rental source, ownership, custody, status, and safety recall exposure.

Existing ChefFlow coverage:

- The equipment intelligence migration adds equipment categories, aliases, richer item fields, replacement cost cents, expected lifespan, recipe-equipment requirements, status logs, inference records, event equipment gaps, and event venue type (`database/migrations/20260427000002_equipment_intelligence_system.sql:11`, `database/migrations/20260427000002_equipment_intelligence_system.sql:27`, `database/migrations/20260427000002_equipment_intelligence_system.sql:41`, `database/migrations/20260427000002_equipment_intelligence_system.sql:61`, `database/migrations/20260427000002_equipment_intelligence_system.sql:101`, `database/migrations/20260427000002_equipment_intelligence_system.sql:122`, `database/migrations/20260427000002_equipment_intelligence_system.sql:153`, `database/migrations/20260427000002_equipment_intelligence_system.sql:191`, `database/migrations/20260427000002_equipment_intelligence_system.sql:235`).
- Costing already recognizes equipment as operational cost, including rental equipment and specialty equipment (`lib/costing/operator-cost-lines.ts:81`, `lib/costing/operator-cost-lines.ts:363`).
- Costing knowledge already calls out oven capacity, batch sizes, equipment yield impact, commissary, generator, vehicle, permit, venue, and equipment transport costs (`lib/costing/knowledge.ts:744`, `lib/costing/knowledge.ts:786`, `lib/costing/knowledge.ts:882`, `lib/costing/knowledge.ts:918`).

Gap:

Equipment has classification, inference, and operational use, but not a universal evidence spine. A future equipment fact should be able to say: "This Rational iCombi is available for event X, has 6 full-size pan capacity, requires 208V 3-phase, was last serviced on date Y, source is invoice/photo/manual confirmation/vendor spec, confidence Z, freshness W, surfaceable or not."

### Properties, Locations, And Physical Constraints

Scope:

- Client homes, rental homes, Airbnb properties, restaurants, commissaries, shared kitchens, hotels, resorts, yachts, farms, food trucks, commissary lots, warehouses, bakeries, schools, hospitals, senior living kitchens, stadiums, event venues, farmers markets, food banks, cannabis consumption lounges, and pop-up sites.
- Physical facts: address, coordinates, jurisdiction, loading dock, elevator, stairs, parking, delivery window, trash access, grease disposal, water, hot water, hand sink, mop sink, hood, fire suppression, generator need, gas availability, amperage, refrigeration, freezer capacity, storage, prep table size, oven count, burner count, indoor/outdoor, tenting, weather exposure, pest risk, floor plan, photos, access instructions, COI requirements, house rules, alcohol/cannabis restrictions, and noise limits.

Existing ChefFlow coverage:

- Client profiles store kitchen size, kitchen constraints, equipment available, and equipment the chef must bring (`database/migrations/20260215000001_layer_1_foundation.sql:106`, `database/migrations/20260215000001_layer_1_foundation.sql:107`, `database/migrations/20260215000001_layer_1_foundation.sql:109`, `database/migrations/20260215000001_layer_1_foundation.sql:110`).
- Events store address, city, state, zip, location notes, cannabis preference, and kitchen notes (`database/migrations/20260215000003_layer_3_events_quotes_financials.sql:124`, `database/migrations/20260215000003_layer_3_events_quotes_financials.sql:128`, `database/migrations/20260215000003_layer_3_events_quotes_financials.sql:134`, `database/migrations/20260215000003_layer_3_events_quotes_financials.sql:138`).
- Events can store coordinates (`database/migrations/20260221000019_add_event_coordinates.sql:6`, `database/migrations/20260221000019_add_event_coordinates.sql:7`).
- Partner locations, kitchen rentals, and public location references already exist (`database/migrations/20260221000014_referral_partners.sql:85`, `database/migrations/20260303000010_kitchen_rentals.sql:5`, `database/migrations/20260310000003_public_data_references.sql:62`).

Gap:

Location and property facts are currently fragmented across client, event, partner, rental, and public reference tables. The future graph needs a canonical property/location entity with claims and evidence, because "this venue has a working hood" and "this event needs a generator" are operational facts that affect cost, safety, staffing, prep plan, and legal exposure.

### Licensing, Permits, Certifications, Insurance, And Legal Constraints

Scope:

- Food service permits, temporary event permits, mobile food permits, health permits, fire permits, vendor permits, parking permits, business licenses, cottage food permits, residential kitchen permits, commissary agreements, FDA food facility registration where applicable, alcohol/caterer licenses, resale certificates, seller permits, cannabis licenses, cannabis event permits, lab COAs, food protection manager certificates, food handler cards, HACCP/variance approvals, pest control records, hood and fire suppression inspections, grease trap service records, workers comp, general liability, product liability, liquor liability, hired and non-owned auto, certificates of insurance, venue contracts, and vendor onboarding documents.

Existing ChefFlow coverage:

- Chef certifications include cert type, issuing body, cert number, issue and expiry dates, renewal URL, document URL, active status, tenant scoping, and indexes for expiry and type (`database/migrations/20260322000005_certification_tracker.sql:2`, `database/migrations/20260322000005_certification_tracker.sql:24`, `database/migrations/20260322000005_certification_tracker.sql:26`, `database/migrations/20260322000005_certification_tracker.sql:29`, `database/migrations/20260322000005_certification_tracker.sql:30`, `database/migrations/20260322000005_certification_tracker.sql:31`, `database/migrations/20260322000005_certification_tracker.sql:45`, `database/migrations/20260322000005_certification_tracker.sql:57`).
- Food safety compliance tracks certifications and event temperature logs, with comments that temperature ranges are display guidance and event logs support auditing and HACCP awareness (`database/migrations/20260303000011_food_safety_compliance.sql:2`, `database/migrations/20260303000011_food_safety_compliance.sql:72`, `database/migrations/20260303000011_food_safety_compliance.sql:86`).
- Food truck permits include health, business, fire, parking, vendor, mobile food, and other permit types, with tenant and expiry indexes (`database/migrations/20260331000017_food_truck_permits_and_maintenance.sql:8`, `database/migrations/20260331000017_food_truck_permits_and_maintenance.sql:12`, `database/migrations/20260331000017_food_truck_permits_and_maintenance.sql:26`, `database/migrations/20260331000017_food_truck_permits_and_maintenance.sql:27`).
- Restaurant compliance includes daily temperature logs and cleaning logs (`database/migrations/20260331000031_restaurant_compliance_and_breaks.sql:10`, `database/migrations/20260331000031_restaurant_compliance_and_breaks.sql:41`, `database/migrations/20260331000031_restaurant_compliance_and_breaks.sql:47`).
- Business protection already exists as a product concept for insurance tracking, liability management, certificate storage, and compliance alerts (`lib/billing/feature-classification.ts:824`, `lib/billing/feature-classification.ts:826`).
- Expense categorization explicitly includes insurance and licenses (`lib/constants/expense-categories.ts:18`, `lib/constants/expense-categories.ts:57`), and vendor parsing maps insurance/license language into that category (`lib/vendors/document-intake-parsers.ts:248`, `lib/vendors/document-intake-parsers.ts:249`).

Gap:

The existing compliance research correctly notes that private chef and caterer permits vary by jurisdiction, and that local ambiguity is a major compliance gap (`docs/research/2026-04-03-compliance-regulatory-and-legal-workflows.md:17`, `docs/research/2026-04-03-compliance-regulatory-and-legal-workflows.md:28`, `docs/research/2026-04-03-compliance-regulatory-and-legal-workflows.md:32`). The future graph must not store "license required" as a universal truth. It must store source-backed jurisdictional rules with lifecycle, review status, and a "consult authority" presentation when uncertainty remains.

### Packaging, Disposables, Chemicals, And Safety Materials

Scope:

- Packaging: clamshells, containers, deli cups, lids, labels, tamper seals, bags, foil, wrap, bakery boxes, insulated carriers, dry ice, ice packs.
- Chemicals and safety: sanitizer, dish chemicals, degreaser, quats, chlorine, test strips, SDS sheets, gloves, aprons, first aid, fire extinguishers, cleaning logs, pest control, allergen labels, nutrition labels, cannabis warning labels.
- Key facts: food-contact suitability, temperature tolerance, compostable/recyclable claims, size, case pack, unit cost in cents, vendor, lead time, SDS, use dilution, storage incompatibilities, recall status, and compliance scope.

Existing ChefFlow coverage:

- Food safety constants include FDA Food Code 2022 references, HACCP usage, cooking temperatures, time as a public health control, storage order, chemical storage guidance, and an explicit manual-verification path for unknown items (`lib/constants/food-safety.ts:3`, `lib/constants/food-safety.ts:6`, `lib/constants/food-safety.ts:107`, `lib/constants/food-safety.ts:229`, `lib/constants/food-safety.ts:315`, `lib/constants/food-safety.ts:335`, `lib/constants/food-safety.ts:484`).

Gap:

Packaging and chemical facts are not yet modeled as universal entities with evidence. They should not be hidden inside expenses. They affect compliance, allergen control, shelf life, transport, labeling, cannabis workflows, institutional purchasing, and cost.

### Vendors, Farms, Distributors, And Source Records

Scope:

- Grocery stores, wholesale distributors, farms, seafood docks, butchers, bakeries, specialty retail, equipment vendors, rental companies, linen services, pest control, hood cleaners, waste haulers, cannabis suppliers, food banks, commissaries, packaging vendors, repair technicians, and inspection agencies.
- Facts: location, delivery area, lead time, minimum order, account terms, payment method, tax exemption support, delivery windows, contact, reliability, recall history, availability, price sheet, catalog, product images, document evidence, and review state.

Existing ChefFlow coverage:

- Source manifests classify source type as instacart, API, website, account, government, or farm (`database/migrations/20260401000151_price_type_and_source_manifest.sql:27`, `database/migrations/20260401000151_price_type_and_source_manifest.sql:30`).
- Quarantined prices and sync audit logs already separate suspect data and operational audit history (`database/migrations/20260405000001_openclaw_price_validation.sql:7`, `database/migrations/20260405000001_openclaw_price_validation.sql:27`).
- Vendor document ingestion can classify invoices and expenses, normalize equipment and insurance/license costs, and preserve review state (`lib/vendors/document-intake-parsers.ts:62`, `lib/vendors/document-intake-parsers.ts:69`, `lib/vendors/document-intake-parsers.ts:200`, `lib/vendors/document-intake-actions.ts:1211`, `lib/vendors/document-intake-actions.ts:1230`).

Gap:

Vendor intelligence should become one shared graph domain instead of separate price, invoice, expense, and catalog subsystems. A distributor catalog, a repair invoice, a COI, and a fire inspection all produce evidenced facts about operational entities.

## Target Architecture

### Universal Entity Graph

Additive tables should eventually model:

- `culinary_entities`: one canonical node per ingredient, product, UPC, brand, vendor, store, farm, equipment item, packaging item, chemical, property, location, license, certification, insurance policy, inspection, document, image, person, organization, vehicle, or operational event.
- `culinary_entity_aliases`: tenant-scoped and global aliases, UPCs, SKUs, catalog IDs, vendor item numbers, serial numbers, permit numbers, license numbers, model numbers, and matched names.
- `culinary_entity_edges`: relationships such as product made_by brand, product sold_by vendor, equipment located_at property, permit applies_to location, COI covers event, document evidences fact, image depicts entity, vendor delivers_to location, product packed_as packaging, ingredient contained_in product, recall affects product.
- `culinary_source_records`: raw captures from URLs, APIs, PDFs, images, screenshots, OCR, email, receipts, invoices, manual corrections, public datasets, vendor feeds, and reviewer notes.
- `culinary_candidate_facts`: extracted claims with value, unit, currency minor units, source span, confidence, freshness window, extraction method, lifecycle state, and conflict group.
- `culinary_published_facts`: reviewed or automatically trusted facts that can surface to users.
- `culinary_fact_reviews`: human review actions, corrections, dismissals, merge decisions, and audit trail.

This keeps raw capture separate from trusted facts, matches ChefFlow's existing publication gate, and lets every domain share provenance and freshness instead of rebuilding those concepts per feature.

### Evidence Model

Every source record should preserve:

- Tenant scope: `chef_id`, with nullable shared/system scope only where explicitly safe.
- Source identity: source URL, API endpoint, vendor account, uploaded document, image, screenshot, OCR text, manual correction, public dataset, or user-confirmed fact.
- Capture metadata: capture timestamp, method, fetch status, parser version, content hash, storage path, response headers if relevant, and source freshness policy.
- Extracted content: OCR text, text spans, table rows, image references, detected entities, raw JSON, PDF page numbers, row numbers, confidence, and warnings.
- Lifecycle: captured, parsed, candidate, needs_review, conflicting, verified, surfaceable, internal_only, stale, rejected, superseded, archived.
- Review: reviewer, reviewed timestamp, reason, correction, merge target, publication eligibility.

### Normalization Model

Normalization should produce canonical IDs but retain history:

- Identity: UPC, GTIN, PLU, SKU, vendor item number, model number, serial number, permit number, certificate number, license number, policy number, address, geocode, and jurisdiction.
- Unit and pack: each, lb, oz, g, kg, fl oz, gallon, liter, case, case pack, portion, yield, edible percentage, drain weight, net weight, tare, and conversion source.
- Food safety: allergen risk, storage requirement, shelf life, lot, recall status, HACCP relevance, cannabis compliance, alcohol restriction.
- Non-food operational facts: equipment capacity, utility requirements, location constraints, access notes, inspection status, insurance coverage, permit validity, service interval, maintenance state, and rental availability.
- Merge history: original entity, merge target, conflicting aliases, manual override, dismissed match, reviewer, and reason.

ChefFlow already has ingredient identity and alias groundwork through `system_ingredients` and `ingredient_aliases` (`database/migrations/20260331000001_ingredient_seed_data.sql:11`, `database/migrations/20260331000001_ingredient_seed_data.sql:32`, `database/migrations/20260401000112_ingredient_aliases.sql:5`, `database/migrations/20260401000112_ingredient_aliases.sql:13`, `database/migrations/20260401000112_ingredient_aliases.sql:14`, `database/migrations/20260401000112_ingredient_aliases.sql:16`, `database/migrations/20260401000112_ingredient_aliases.sql:19`). That pattern should expand to every entity type.

## Pipeline Design

### Acquisition

Inputs:

- APIs: store catalogs, distributor feeds, equipment catalogs, recall APIs, public datasets, geocoding, licensing agency feeds where available.
- Scrapers: public store pages, vendor catalog pages, equipment spec sheets, regulator lookup pages, permit portals, recall pages.
- Documents: receipts, invoices, quotes, distributor catalogs, COIs, inspection reports, permits, licenses, rental agreements, contracts, SDS sheets, farm product lists, food bank manifests, cannabis COAs.
- Images: product packaging, shelf tags, equipment nameplates, property photos, kitchen walkthroughs, licenses on walls, health permit postings, delivery labels.
- Manual review: chef corrections, staff confirmations, vendor confirmations, inspector notes.

Rules:

- All raw captures are stored before extraction.
- Every capture gets a content hash.
- Extraction failure is a first-class state, not silent absence.
- AI extraction produces candidate facts only.
- Manual correction never overwrites raw evidence.

### Normalization

Steps:

1. Parse raw capture into candidate entities and facts.
2. Match aliases, UPCs, SKUs, vendor item numbers, serial numbers, permit numbers, addresses, and model numbers.
3. Normalize units, pack sizes, prices in cents, yields, shelf life, storage, capacity, dimensions, and dates.
4. Detect conflicts against current published facts.
5. Assign lifecycle state and publication eligibility.
6. Route low-confidence, high-impact, stale, conflicting, jurisdictional, or compliance-sensitive facts to review.
7. Publish only facts that pass the trust gate.

ChefFlow already has yield and unit groundwork in the price intelligence pipeline. It adds system ingredient yield percentage, price snapshots, trends, anomalies, coverage gaps, and yield-based usable cost assumptions (`database/migrations/20260406000009_price_intelligence_pipeline.sql:36`, `database/migrations/20260406000009_price_intelligence_pipeline.sql:40`, `database/migrations/20260406000009_price_intelligence_pipeline.sql:73`, `database/migrations/20260406000009_price_intelligence_pipeline.sql:88`, `database/migrations/20260406000009_price_intelligence_pipeline.sql:114`, `database/migrations/20260406000009_price_intelligence_pipeline.sql:138`, `database/migrations/20260406000009_price_intelligence_pipeline.sql:189`). It also adds package optimization and standard-unit pricing fields (`database/migrations/20260401000140_data_completeness_engine.sql:4`, `database/migrations/20260401000140_data_completeness_engine.sql:124`).

### Refresh

Each source type needs a policy:

- Live store catalog: high-frequency refresh, anomaly detection, fast stale decay.
- Distributor catalog: refresh when feed changes or on weekly schedule, depending on source reliability.
- Receipt/invoice: no refresh, but decays as market evidence while remaining a permanent purchase record.
- Equipment specs: slow refresh unless recall, model change, maintenance event, or user correction appears.
- Property constraints: refresh per event, per walkthrough, or on user confirmation.
- Licenses and insurance: refresh by expiry date, renewal window, uploaded replacement, or official lookup.
- Recalls: daily or more frequent for food, equipment, packaging, and consumer products.
- Jurisdictional rules: scheduled review plus manual source verification before surfacing as actionable requirements.

Refresh engine requirements:

- Source-specific schedules and stale decay.
- Retry policy with exponential backoff.
- Watchdogs for stuck captures and stuck reviews.
- Self-healing queues for parser failures.
- Coverage KPIs by entity type, geography, environment profile, source, store, vendor, and fact type.
- Anomaly detection for price jumps, impossible units, duplicate products, expired permits, unavailable critical equipment, and unsafe compliance states.

## Trust And Quality Rules

The universal trust gate should apply the same principle to all domains:

- Surfaceable: enough provenance, confidence, freshness, and scope to show to a user for the intended use.
- Internal only: useful for matching, dedupe, ranking, conflict detection, or review, but not user-facing truth.
- Needs review: low confidence, conflicting, expensive, safety-relevant, compliance-sensitive, or jurisdictional.
- Rejected: known wrong, superseded, duplicate, failed extraction, or user dismissed.
- Stale: previously accepted but past its freshness window.

No fact should surface without:

- Entity ID.
- Fact type.
- Structured value and unit, when applicable.
- Source record ID.
- Capture timestamp.
- Freshness state.
- Confidence.
- Lifecycle state.
- Publication eligibility.
- Tenant scope or explicit public/system scope.

High-risk facts always require tighter gates:

- Monetary values used in costing, quotes, purchasing, or inventory.
- Allergen, recall, food safety, cannabis, alcohol, and permit/license facts.
- Equipment safety, inspection, utility, and capacity claims.
- Property constraints that affect event feasibility.
- Insurance coverage and certificate validity.

Failure display rule:

- Do not display fake certainty. Use "not verified", "needs review", "last confirmed on date", "source unavailable", "jurisdiction-specific", or "manual confirmation required" rather than implying truth.

## Environment Profiles

The same graph supports different workflows through environment profiles:

- Private chef: client kitchen constraints, equipment to bring, receipt-backed pricing, event-specific allergens, COI, food handler certification, vehicle loading, and venue rules.
- Caterer: production kitchen, temporary event permits, rentals, staffing, hot holding, transport, venue access, buffet equipment, insurance certificates, and per-event purchasing.
- Restaurant: supplier catalogs, POS/inventory, station pars, refrigeration logs, cleaning logs, pest control, licenses, inspections, staff certifications, and equipment maintenance.
- Hotel or resort: multi-outlet vendors, banquets, room service, production kitchens, purchasing contracts, property-specific equipment, engineering tickets, and compliance logs.
- Yacht: storage limits, galley equipment, port provisioning, customs, supplier access, generator/power constraints, long shelf-life planning, and specialty equipment.
- Food truck: commissary agreement, generator, propane, mobile food permit, parking/vendor permits, fire permit, vehicle maintenance, water/waste, and location rules.
- Commissary or shared kitchen: tenant schedules, equipment reservations, inspection records, storage allocation, renter documents, and approved-use constraints.
- Bakery: proofing, ovens, mixers, allergen cross-contact, packaging, labeling, shelf life, ingredient lots, and equipment service intervals.
- Farm: harvest availability, pack sizes, cold chain, certifications, pesticide claims, delivery windows, crop seasonality, and recall traceability.
- Distributor: catalog, case packs, lead times, price sheets, substitutions, delivery windows, customer-specific terms, recalls, and product images.
- Specialty retail: shelf prices, UPCs, local products, vendor metadata, availability, and pack or display constraints.
- Food bank: donated product intake, lot/expiry, allergens, storage, redistribution constraints, recall tracking, and nonprofit reporting.
- Cannabis culinary operation: license stack, age verification, COAs, dosage limits, non-alcohol restriction, jurisdictional opt-in, separate financial reporting, and packaging warnings.
- Institutional kitchen: procurement contracts, nutrition/allergen documentation, compliance logs, menu cycles, bid pricing, storage, labor rules, and audit exports.

## External Source Registry

These official sources are relevant because they show how broad the graph must be, and why facts must remain source-scoped and location-scoped:

- FDA Food Code 2022: FDA describes the Food Code as a model for food safety at retail and food service, adopted by local, state, tribal, and federal jurisdictions. Source: https://www.fda.gov/food/fda-food-code/food-code-2022
- FDA Food Code overview: FDA says the 2022 Food Code is the most recent full edition and is used by regulators as a model. Source: https://www.fda.gov/food/retail-food-protection/fda-food-code
- FDA recalls, market withdrawals, and safety alerts: FDA notes this public page covers certain recalls and is not a complete listing of all recalls. Source: https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts
- USDA FSIS recall and public health alert API: FSIS launched an API for recalls and public health alerts. Source: https://www.fsis.usda.gov/news-events/news-press-releases/fsis-launches-new-data-tool-recall-and-public-health-alert-api
- USDA FSIS recalls and public health alerts: current public listing for meat, poultry, and egg product recalls and alerts. Source: https://www.fsis.usda.gov/recalls
- CPSC recall API: CPSC provides machine-readable public recall data in XML and JSON, relevant to culinary equipment and consumer products used in food operations. Source: https://www.cpsc.gov/Recalls/CPSC-Recalls-Application-Program-Interface-API-Information
- CPSC recalls and product safety warnings: public recall and warning page, with weekly data updates noted on the page. Source: https://www.cpsc.gov/Recalls
- FDA food facility registration: FDA states food facilities engaged in manufacturing, processing, packing, or holding food for U.S. consumption must register where applicable. Source: https://www.fda.gov/food/guidance-regulation-food-and-dietary-supplements/registration-food-facilities-and-other-submissions
- OSHA restaurant safety: OSHA publishes restaurant safety standards for young workers, relevant to institutional and restaurant environment profiles. Source: https://www.osha.gov/young-workers-restaurant-safety/standards
- Massachusetts ABCC 12C caterer license: Massachusetts states the 12C license allows a caterer to sell alcoholic beverages at private events and lists required application materials. Source: https://www.mass.gov/how-to/apply-for-a-12c-caterer-license-abcc

## Highest-Leverage First Build

Do not start with a broad UI. Start with the shared evidence spine.

The highest-leverage first build is an additive `culinary_source_records` plus `culinary_candidate_facts` contract that can ingest one or two existing flows first: vendor documents and equipment/property facts. This is the smallest step that prevents another silo.

Why this first:

- It reuses existing document intake, review state, OCR, and parse summaries.
- It extends the successful price intelligence contract pattern without replacing it.
- It gives equipment, properties, permits, licenses, and insurance the same provenance standard as prices.
- It lets AI extract facts without allowing AI to publish facts.
- It gives future dashboards one common trust language.

Initial fact types:

- `equipment_capacity`
- `equipment_status`
- `equipment_replacement_cost_cents`
- `property_kitchen_constraint`
- `property_access_constraint`
- `permit_or_license_validity`
- `insurance_coverage`
- `inspection_status`
- `vendor_terms`
- `document_extracted_expense`

Initial sources:

- Uploaded vendor invoice.
- Uploaded equipment invoice.
- Uploaded COI.
- Uploaded permit/license.
- Uploaded property photo or walkthrough note.
- Chef manual correction.

## Phased Roadmap

### Phase 0: Documentation And Taxonomy

- Finish the universal taxonomy for entity types, fact types, source types, lifecycle states, review reasons, and surface eligibility.
- Mark all regulatory facts as jurisdiction-scoped.
- Mark all monetary fields as cents.
- Define public, tenant, and system data boundaries.

### Phase 1: Evidence Spine

- Add source record and candidate fact tables.
- Mirror the pricing contract's lifecycle and publication eligibility model.
- Connect vendor document intake to source records.
- Add manual review, reject, merge, and publish actions.
- Keep all new tables additive and tenant-scoped.

### Phase 2: Equipment And Property Facts

- Attach evidence to equipment items, equipment inferences, event equipment gaps, client kitchen fields, partner locations, and kitchen rentals.
- Support photo, invoice, manual, and vendor spec evidence.
- Add property constraint fact types.
- Add conflict detection for "available at venue" versus "must bring."

### Phase 3: Licensing, Insurance, And Compliance Facts

- Attach evidence to certifications, permits, insurance documents, temp logs, cleaning logs, and inspection records.
- Add expiry-driven refresh.
- Add event readiness checks for valid certificates, permits, COIs, and insurance dates.
- Keep jurisdictional output conservative and source-cited.

### Phase 4: Recall And Safety Feeds

- Ingest FDA, USDA FSIS, and CPSC recall feeds as raw source records.
- Match recalls to products, ingredients, packaging, equipment, and vendors.
- Route fuzzy or high-risk matches to review.
- Surface only matched, scoped, and reviewed alerts.

### Phase 5: Environment Profiles

- Build environment-specific dashboards using the same graph facts.
- Private chef and catering get event readiness.
- Restaurant and institutional get compliance and maintenance readiness.
- Food truck gets permit, commissary, generator, vehicle, and location readiness.
- Cannabis gets license, COA, dosage, packaging, and jurisdiction readiness.

## Risks And Failure Modes

- Regulatory overreach: ChefFlow must not present legal advice as certainty. Store source-backed jurisdictional facts and show uncertainty honestly.
- AI publication leak: AI extraction must create candidates only. Publication needs deterministic gates or human review.
- Recipe IP leakage: Do not use recipe content to train or generate new recipes. Recipe references can be read-only operational inputs.
- False recall match: Fuzzy matching a recall to the wrong product can create panic. High-risk recall matches need review.
- Equipment safety hallucination: Never infer safe electrical, gas, hood, or fire suppression compatibility without source evidence.
- Property constraint drift: A venue or client kitchen can change. Property facts need event-level freshness and re-confirmation.
- License scope mismatch: A valid license may not cover a specific event, location, alcohol service, cannabis service, or jurisdiction.
- Insurance false comfort: A policy can exist but exclude hired auto, liquor, cannabis, product liability, or offsite events.
- Tenant leakage: Vendor pricing, invoices, client locations, recipes, photos, and documents are private tenant data unless explicitly shared or public.
- Source fragility: APIs, scrapers, and regulatory pages change. Capture failures must be visible, queued, and auditable.
- Silo relapse: Adding separate evidence fields per feature will recreate fragmentation. Use a shared evidence spine.

## Conclusion

The next evolution is a private culinary intelligence graph where every operational fact is a sourced, scoped, fresh, confidence-bearing claim. Food prices are just one fact type. Equipment, properties, licensing, insurance, inspections, packaging, chemicals, recalls, vendor terms, and source documents are equally culinary when they determine whether a meal, service, quote, purchase, or kitchen operation can happen.

ChefFlow already has the right primitives in pricing intelligence, document intake, equipment intelligence, compliance tracking, food safety constants, and privacy-first local AI. The next additive move is to unify those primitives under one evidence spine before building more surfaces.
