# Exit Eval: Chef / OPERATIONAL TOOLS & CALCULATIONS (Part 1)

> **Batch:** Wave 1 | 8 scenarios (#72-#79)
> **Evaluator:** Claude (Solo mode)
> **Date:** 2026-05-25
> **Status:** NEEDS-DEVELOPER-REVIEW (all scenarios)

---

## Scenario #72: Sync events to personal calendar

**Original classification:** Reducible (Calendar export/sync via iCal feed or Google Calendar integration)
**Reclassified to:** Reducible

**Why chef leaves:** Chef's life is not only ChefFlow. They need a unified view of personal commitments, family events, and ChefFlow events in one place. The operational reason: avoiding double-bookings between personal life and work, and seeing the full picture of their week without toggling apps.

**Context ChefFlow has:**

- Full event list with dates, times, locations, client names
- Prep timelines with day-by-day breakdown
- Event timeline blocks (travel, setup, fire, plate, serve, cleanup)
- Guest counts, occasion types, service styles
- Serve times and event durations

**Data source?** No external data source needed. ChefFlow IS the data source. The external calendar app is the consumer.

**Client-collaborative angle:** None directly. This is chef-to-self workflow.

**Physical reality:** Calendar glances happen on phone lock screens, watch faces, and car dashboards. The iCal feed format is the universal standard that reaches all these surfaces without the chef opening ChefFlow.

**Compounding:** Medium. The feed is live; once subscribed, it works forever. But the data itself changes per event, so it is not "learn once" compounding. The one-time setup pays dividends indefinitely.

**Solution design:**

- ALREADY BUILT: `lib/exports/ical-generator.ts` produces RFC 5545 compliant .ics content
- ALREADY BUILT: `lib/exports/ical-actions.ts` exports prep timelines, event timelines, and weekly schedules as iCal
- ALREADY BUILT: `components/settings/ical-feed-settings.tsx` provides a subscribe-by-URL feed that auto-syncs every 5 minutes
- ALREADY BUILT: `components/settings/google-integrations.tsx` provides Google service connections
- GAP: Two-way sync (Google Calendar writes back to ChefFlow) is not built, but one-way outbound (ChefFlow to calendar) is complete and functional

**Where it appears:**

- Settings > Integrations (iCal feed toggle, URL copy)
- Event detail page (export individual event timeline)
- Calendar view (export weekly schedule)

**What remains as permanent exit:**
The chef still opens their personal calendar app to VIEW the unified schedule. ChefFlow cannot replace Apple Calendar or Google Calendar as the daily driver. But the data flows automatically; the chef never manually copies event details.

**Priority:** High frequency (daily) x Low effort (already built) = DONE. This is already solved.
**Spec needed?** No. Already implemented.

---

## Scenario #73: Track mileage for tax deductions

**Original classification:** Reducible (Log trip distance per event; export annual mileage report)
**Reclassified to:** Reducible

**Why chef leaves:** IRS requires mileage documentation for business deductions. Chef drives to every event, grocery run, consultation, and delivery. Without a tracker, they use a separate app (MileIQ, Everlance) or a messy spreadsheet. The operational reason: accurate tax deduction records tied to specific business purposes.

**Context ChefFlow has:**

- Every event date, location, and client
- Grocery shopping trips (from shopping list generation)
- Event addresses (from client/venue profiles)
- Chef's home address (from account settings)
- Financial data for tax prep integration
- Purpose categories (client service, grocery shopping, event prep, consultation, delivery)

**Data source?** Partially. Distance calculation between two addresses would require a mapping API (Google Maps Distance Matrix or similar). Currently, the chef manually enters miles. Auto-calculation would require an API call, but the core logging is self-contained.

**Client-collaborative angle:** None. This is purely chef operational/tax workflow.

**Physical reality:** Mileage logging happens in the car, right after arriving or before leaving. Quick-add from phone is essential. Address autocomplete reduces friction. Voice logging via Remy ("log 23 miles to client service") would be ideal for hands-on-wheel moments.

**Compounding:** High. The mileage log builds a complete annual tax picture. Patterns emerge: average miles per event, busiest months, most distant clients. This data also feeds profitability analysis (travel cost per event).

**Solution design:**

- ALREADY BUILT: `lib/finance/mileage-actions.ts` with full CRUD (add, update, delete, list, summary)
- ALREADY BUILT: `lib/finance/mileage-enhanced-actions.ts` with round-trip logging and purpose-based reporting
- ALREADY BUILT: `lib/finance/mileage-constants.ts` with IRS 2026 rate (72.5 cents/mile) and purpose categories
- ALREADY BUILT: `components/finance/mileage-tracker.tsx` with quick-add, list, YTD summary, address autocomplete
- ALREADY BUILT: `components/finance/mileage-log-panel.tsx` and `components/finance/mileage-summary-widget.tsx`
- ALREADY BUILT: Tax prep integration via `lib/reports/tax-prep.ts`
- GAP: Auto-distance calculation from addresses (would need mapping API). Currently manual entry.
- GAP: Remy voice command for mileage logging while driving

**Where it appears:**

- Finance > Expenses > Travel (`app/(chef)/finance/expenses/travel/page.tsx`)
- Event detail money section (per-event mileage)
- Tax prep dashboard (annual mileage summary)
- Finance dashboard (mileage summary widget)

**What remains as permanent exit:**
If the chef wants GPS-based automatic mileage tracking (start/stop trip detection), that requires a mobile app with background location services. ChefFlow's web-based tracker handles manual logging excellently, but auto-detection of trips is a mobile-native capability. The chef may still use MileIQ for auto-detection and ChefFlow for the tax-ready report.

**Priority:** High frequency (every trip) x Low effort (already built) = DONE. Core feature is complete.
**Spec needed?** No. Already implemented. Auto-distance calculation could be a future enhancement spec.

---

## Scenario #74: Scale a recipe from 4 to 40 servings

**Original classification:** Reducible (Built-in recipe scaling engine, core recipe feature)
**Reclassified to:** Reducible

**Why chef leaves:** A recipe written for 4 servings needs proportional scaling for a party of 40. But scaling is not linear for everything: spices need less than 10x, oil is per-pan not per-person, salt concentration changes with volume. The chef opens a calculator or spreadsheet because they need non-linear intelligence, not just multiplication.

**Context ChefFlow has:**

- Full recipe with ingredient quantities, units, and categories
- Ingredient category (protein, spice, oil, pantry, etc.)
- Guest count from event
- Service style (plated, buffet, family-style) with portion multipliers
- Yield information (explicit, from servings, or inferred from ingredient weights)
- Pack sizes and minimum order quantities from vendor data
- Historical purchase feedback (what the chef actually bought vs. what the recipe said)

**Data source?** No. All computation is pure math. No external API needed.

**Client-collaborative angle:** Guest count comes from the client (via Dinner Circle or event setup). Service style preference may come from client consultation.

**Physical reality:** Scaling happens during prep planning, not mid-cook. Desktop/tablet is fine. The output needs to flow into shopping lists (which it already does).

**Compounding:** High. The scaling engine learns from purchase feedback. After 3+ events, `lib/scaling/purchase-feedback.ts` flags ingredients where the chef consistently buys 15%+ more than the recipe calls for, suggesting recipe quantity adjustments. This gets more accurate over time.

**Solution design:**

- ALREADY BUILT: `lib/scaling/recipe-scaling-engine.ts` with full pipeline:
  - Guest count scaling (base multiplier)
  - Service style multipliers (plated, buffet, family-style)
  - Category-aware non-linear scaling (linear for proteins, sublinear for spices/herbs/condiments, fixed for bay leaves, by-pan for oils)
  - Yield adjustment (AP quantity from yield percentage)
  - Waste buffer (configurable per service style)
  - Pack rounding (count units ceil, weight to nearest 0.25, volume to nearest 0.5)
  - Minimum order quantity enforcement
- ALREADY BUILT: `lib/scaling/yield-inference.ts` infers servings from ingredient weights when not explicitly set
- ALREADY BUILT: `lib/scaling/purchase-feedback.ts` analyzes historical over-buy patterns to suggest recipe adjustments
- ALREADY BUILT: Default scaling category map covering 16 ingredient categories

**Where it appears:**

- Recipe detail page (scale for N guests)
- Event prep planning (auto-scales all recipes for event guest count)
- Shopping list generation (uses scaled quantities)
- Menu cost modeler (costs based on scaled quantities)

**What remains as permanent exit:**
Nothing. This is fully reducible. The chef never needs a calculator or spreadsheet for recipe scaling. ChefFlow's engine handles non-linear scaling, yield adjustment, waste buffer, and pack rounding in a single pipeline.

**Priority:** High frequency (every event) x Low effort (already built) = DONE. Core feature is complete and sophisticated.
**Spec needed?** No. Already implemented with purchase feedback loop.

---

## Scenario #75: Convert units (metric/imperial, volume/weight)

**Original classification:** Reducible (Built-in unit converter, trivial to build)
**Reclassified to:** Reducible

**Why chef leaves:** "How many grams in 3/4 cup of flour?" Chef Googles it or opens a converter app. The operational reason: recipes from different sources use different unit systems, and costing requires normalizing everything to a common unit for price comparison.

**Context ChefFlow has:**

- Full unit alias dictionary (50+ aliases normalized to canonical units)
- Volume conversions (tsp, tbsp, cup, fl_oz, pint, quart, gallon, ml, dl, l)
- Weight conversions (mg, g, kg, oz, lb)
- Ingredient-specific densities for 80+ common ingredients (flour 0.53 g/ml, sugar 0.85, butter 0.91, etc.)
- Count-to-weight equivalents for 40+ ingredients (bunch of cilantro = 56g, head of garlic = 56g, stick of butter = 113g, etc.)
- Cross-type conversion (volume to weight via density)

**Data source?** No. All conversions are static math from USDA and culinary reference tables, already embedded in the codebase.

**Client-collaborative angle:** None. Pure calculation.

**Physical reality:** Unit conversion happens during recipe writing, during scaling, and during costing. Sometimes mid-cook ("this European recipe says 200g butter, how many sticks is that?"). For mid-cook moments, Remy voice query would be the natural interface.

**Compounding:** Low per-conversion, but the conversion engine compounds across the entire system. Every recipe, every cost calculation, every shopping list uses it. Building it once serves every feature.

**Solution design:**

- ALREADY BUILT: `lib/units/conversion-engine.ts` with:
  - `convertQuantity()` for same-type conversions (volume-to-volume, weight-to-weight)
  - `convertWithDensity()` for cross-type conversions (volume-to-weight using ingredient density)
  - `computeIngredientCost()` for cost normalization across unit types
  - `computeIngredientCostWithCountConversion()` for count-to-weight cost calculations
  - `lookupDensity()` with 80+ common ingredient densities
  - `convertCountToGrams()` with 40+ ingredient count-to-weight equivalents
  - `normalizeUnit()` with 50+ unit alias mappings
  - `canConvert()` compatibility checker
- ALREADY BUILT: Used by 17+ consumers across the codebase (scaling, costing, shopping lists, pricing, grocery lists, inventory)
- GAP: No standalone "unit converter" UI tool for ad-hoc chef queries. The engine exists but is only used internally by other features.
- GAP: No Remy voice command for quick conversions ("Remy, how many cups is 500ml?")

**Where it appears:**

- Internally used by recipe scaling, food costing, shopping list generation, price comparison, inventory management
- NOT currently exposed as a standalone quick-reference tool for the chef

**What remains as permanent exit:**
Nothing, once a simple UI is added. The math engine is complete and comprehensive. The only gap is a user-facing quick-converter tool and Remy voice integration.

**Priority:** Medium frequency (weekly) x Very low effort (UI shell over existing engine) = Quick win.
**Spec needed?** No. Too small for a standalone spec. A "quick converter" utility in the culinary tools section wrapping the existing `convertQuantity` and `convertWithDensity` functions would take minimal effort.

---

## Scenario #76: Edit food photos before posting

**Original classification:** Permanent exit (Photo editing is its own domain)
**Reclassified to:** Permanent

**Why chef leaves:** Raw photos from events need color correction, cropping, brightness adjustment, and sometimes text overlays before posting to Instagram/social media. The chef opens Lightroom, Snapseed, or VSCO because photo editing is a creative, visual, tool-intensive workflow.

**Context ChefFlow has:**

- Event photos stored in the system (if uploaded)
- Event context (date, client, dishes served) for metadata/captioning
- The intent to post (social media is a marketing channel)

**Data source?** No. Photo editing is interactive creative work, not data retrieval.

**Client-collaborative angle:** None. This is the chef's personal brand/marketing workflow.

**Physical reality:** Photo editing is a visual, touch-based workflow. It requires precise color pickers, crop handles, filter previews, and undo stacks. Building a photo editor inside ChefFlow would be reinventing Photoshop. This is not ChefFlow's domain.

**Compounding:** None. Each photo edit is one-off creative work.

**Solution design:**

- No build needed. This is a permanent exit.
- ChefFlow's role: store the finished photos when the chef uploads them, attach them to events/menus/recipes for portfolio use, and provide easy export/sharing of event data that accompanies the photos (dish names, occasion, etc.)
- Potential bridge: "Share to social" button that pre-fills a caption with event details + dish names, so after the chef edits the photo externally, they can quickly post with context ChefFlow provides.

**Where it appears:**

- N/A (permanent exit)

**What remains as permanent exit:**
All of it. Photo editing tools (Lightroom, Snapseed, VSCO) are purpose-built creative applications. ChefFlow should never attempt to replace them. Clean door out with context (event details for captions) is the right approach.

**Priority:** Medium frequency (weekly) x Zero effort (permanent exit) = No build.
**Spec needed?** No.

---

## Scenario #77: Print allergen/nutrition labels

**Original classification:** Partially Reducible (Generate label content from recipe data; chef prints externally)
**Reclassified to:** Partially Reducible

**Why chef leaves:** Meal prep clients or catered events require physical allergen and nutrition labels on containers. The chef opens label software (Canva, Word, Avery label templates) to create printable stickers with allergen warnings and nutrition facts. The operational reason: food safety compliance and client trust require professional, accurate labels.

**Context ChefFlow has:**

- Full recipe ingredient lists with allergen detection (FDA Big 9 classification)
- USDA-sourced nutrition data via `lib/nutrition/usda-client.ts`
- FDA-style Nutrition Facts label component (`components/nutrition/nutrition-label.tsx`)
- Emergency allergy card generator (`lib/documents/generate-allergy-card.ts`) with color-coded severity (RED = Big 9, ORANGE = other allergies, YELLOW = dietary restrictions)
- Per-recipe and per-serving nutrition breakdown
- Allergen keyword detection for Dairy, Gluten, Nuts, Shellfish, Fish, Eggs, Soy, Sesame
- Allergen severity data from `lib/dietary/allergy-severity-actions.ts`
- Print-friendly design already in the nutrition label component (white background, black borders, FDA-standard layout)

**Data source?** USDA FoodData Central (already integrated). Allergen classification from `lib/constants/allergens.ts` (static, already embedded).

**Client-collaborative angle:** Guest dietary needs come from the Dinner Circle (already collected). Client allergies are stored in client profiles. The label content is driven by data ChefFlow already has.

**Physical reality:** This is fundamentally a print workflow. The chef needs to print physical labels and stick them on containers. The digital-to-physical bridge is the key challenge: generating correctly sized label content that matches standard label stock (Avery 5160, 5163, etc.).

**Compounding:** Medium. Once a recipe's nutrition is calculated, it persists. Label templates are reusable across events. Meal prep clients get the same labels each week with only date changes.

**Solution design:**

- ALREADY BUILT: FDA-style Nutrition Facts label component (print-friendly, per-serving toggle)
- ALREADY BUILT: Emergency allergy card generator (color-coded PDF)
- ALREADY BUILT: Recipe nutrition calculation from USDA data
- ALREADY BUILT: Allergen detection and classification
- GAP: No "label sheet" generator that formats multiple labels per page for standard label stock (Avery format)
- GAP: No combined allergen + nutrition mini-label for individual containers (the allergy card is event-wide, the nutrition label is recipe-wide; neither is container-sized)
- GAP: No batch label generation for meal prep (generate labels for all containers in a meal prep delivery)

**Where it appears:**

- Recipe detail page (nutrition panel with FDA label)
- Event detail page (allergy card generator)
- NOT yet: a dedicated "print labels" workflow for meal prep containers

**What remains as permanent exit:**
The physical printing itself. ChefFlow generates the label content and renders it as a print-ready PDF. The chef still needs a printer and label stock. If they want custom-designed labels with their branding/logo beyond the standard formats, they would still use Canva or label design software.

**Priority:** Medium frequency (weekly for meal prep chefs) x Medium effort (label sheet layout engine) = Medium priority.
**Spec needed?** Yes. A "Meal Prep Label Generator" spec covering Avery-format label sheets, combined allergen + nutrition mini-labels, and batch generation for meal prep deliveries.

---

## Scenario #78: Create contracts/proposals beyond ChefFlow templates

**Original classification:** Partially Reducible (Export proposals to editable format)
**Reclassified to:** Partially Reducible

**Why chef leaves:** Client needs custom terms, venue-specific clauses, or a format that goes beyond ChefFlow's built-in contract templates. The chef opens Google Docs or Word to create a bespoke proposal. The operational reason: every client and venue has unique requirements that template merge fields cannot always capture.

**Context ChefFlow has:**

- Contract template system with merge fields (`lib/contracts/actions.ts`): client_name, event_date, quoted_price, deposit_amount, cancellation_policy, occasion, guest_count, event_location
- E-sign workflow (client signs digitally, signature captured with IP/user-agent audit trail)
- Default clause library (`lib/contracts/default-clauses.ts`)
- Clause composition system (`lib/contracts/compose-actions.ts`)
- Insurance and countersign actions
- Proposal builder (`lib/quotes/proposal-builder-actions.ts`) with drag-and-drop sections: cover, menu, pricing, terms, photos, bio, custom
- Branding support (logo, colors, fonts, business name, tagline)
- Quick proposal generation (`lib/quotes/quick-proposal-actions.ts`)
- Menu approval portal and client-facing proposal views

**Data source?** No. Contract content is authored by the chef, with ChefFlow providing structure, merge fields, and e-sign infrastructure.

**Client-collaborative angle:** The client's specific requirements (venue clauses, dietary accommodations, custom terms) drive the need for customization. These could be captured during the Dinner Circle setup phase.

**Physical reality:** Contract editing is a desktop/laptop workflow. Document formatting, clause insertion, and legal language review require full-screen editing. Not a mobile or voice task.

**Compounding:** High. Custom clauses written once can be saved as reusable clause templates. Venue-specific terms persist in venue profiles. Each custom contract teaches ChefFlow what clauses the chef commonly needs, allowing better defaults over time.

**Solution design:**

- ALREADY BUILT: Full contract template system with merge fields and markdown body
- ALREADY BUILT: Proposal builder with drag-and-drop sections, branding, and custom content blocks
- ALREADY BUILT: E-sign workflow with audit trail
- ALREADY BUILT: Default clause library
- GAP: No "export to .docx" or "export to Google Docs" for cases where the chef truly needs a word processor. The contract system renders markdown, which handles most formatting but not complex table layouts or precise page formatting.
- GAP: No clause suggestion engine ("clients at this venue usually need a noise ordinance clause")
- GAP: No ability to import an externally-edited document back into ChefFlow's e-sign flow

**Where it appears:**

- Event contracts section
- Quotes/proposals workflow
- Client portal (client views and signs)
- Settings > contract templates

**What remains as permanent exit:**
Truly bespoke legal documents that require a lawyer's input or complex formatting beyond markdown (embedded tables, precise page breaks, legal headers/footers). Also, when a venue provides their own contract that the chef must sign (not generate), the workflow is inherently external.

**Priority:** Medium frequency (per new client/venue) x Low additional effort (export and clause library expansion) = Medium priority.
**Spec needed?** No. The system is already comprehensive. Incremental improvements (docx export, clause suggestions) can be added as individual tasks without a full spec.

---

## Scenario #79: Check competitor pricing/offerings

**Original classification:** Permanent exit (Could surface PIE market rate context)
**Reclassified to:** Bridgeable

**Why chef leaves:** "Am I charging enough for a 12-person dinner?" The chef browses other chefs' websites, Thumbtack listings, and Take a Chef profiles to understand market rates. The operational reason: pricing confidence. Without market context, the chef either undercharges (leaving money on the table) or overcharges (losing clients).

**Context ChefFlow has:**

- PIE (Pricing Intelligence Engine) with market rate data
- Competitor intelligence scrub system (`lib/prospecting/scrub/competitor-intel.ts`) that searches for competing chefs/caterers by region
- Chef's own historical pricing data across events
- Regional pricing benchmarks (`lib/pricing/benchmarks.ts`)
- Event pricing intelligence (`lib/finance/event-pricing-intelligence-actions.ts`)
- Price recommendation engine (`lib/pricing/recommend-actions.ts`)
- Rate card system (`components/pricing/rate-card-view.tsx`)
- National price oracle (`lib/pricing/pie-national-price-oracle-contract.ts`)
- Pricing configuration per chef (`lib/pricing/config-actions.ts`)

**Data source?** Yes, partially. Competitor pricing is scattered across websites, Thumbtack, Take a Chef, and word-of-mouth. No single API provides this. PIE synthesizes what it can from available data, but real-time competitor browsing is inherently external.

**Client-collaborative angle:** None directly. But client pushback on pricing ("that seems high") is a signal that feeds back into pricing confidence. The Dinner Circle could passively collect client budget expectations.

**Physical reality:** Competitor research is a browsing/reading activity. Desktop/laptop. Not time-sensitive or physical.

**Compounding:** High. Market rate intelligence compounds over time. Regional pricing benchmarks improve with more data points. The chef's own pricing history reveals trends. PIE's coverage expands continuously (per MEMORY.md: "PIE must always be expanding, improving, covering new areas. Every session.").

**Solution design:**

- ALREADY BUILT: PIE market rate context and pricing recommendations
- ALREADY BUILT: Competitor intel scrub (admin-only, region-based)
- ALREADY BUILT: Rate card and pricing configuration
- ALREADY BUILT: Historical pricing analytics
- BRIDGE OPPORTUNITY: When the chef creates or adjusts a quote, show "market context" alongside: PIE's rate range for this service type/region, the chef's own historical average, and a confidence indicator for the data quality
- BRIDGE OPPORTUNITY: After the chef browses competitors externally, provide a structured place to log what they found ("Chef X charges $Y for Z-person dinner") that feeds into market intelligence
- GAP: No surface that proactively says "you're 15% below market rate for your region" when the chef sets a price

**Where it appears:**

- Quote/proposal creation (market rate context sidebar)
- Finance cockpit (pricing analytics)
- PIE dashboard (market intelligence)
- NOT yet: proactive pricing alerts or competitor rate logging

**What remains as permanent exit:**
The actual browsing of competitor websites, Thumbtack profiles, and Take a Chef listings. ChefFlow cannot scrape or aggregate competitor pricing in real-time without running into the same anti-automation issues documented in `memory/reference_take_a_chef_platform.md`. The chef will always need to browse the market directly. ChefFlow's role is to contextualize what they find and surface what PIE already knows.

**Priority:** Medium frequency (monthly/quarterly) x Medium effort (contextualize existing PIE data on pricing surfaces) = Medium priority.
**Spec needed?** No. PIE expansion is an ongoing mandate. The bridge improvements (market context on quote creation, competitor rate logging) are incremental feature additions, not a new system.

---

## Batch Summary

| #   | Title                                                | Reclassified To     | Spec Needed?                    | Status                 |
| --- | ---------------------------------------------------- | ------------------- | ------------------------------- | ---------------------- |
| 72  | Sync events to personal calendar                     | Reducible           | No (already built)              | NEEDS-DEVELOPER-REVIEW |
| 73  | Track mileage for tax deductions                     | Reducible           | No (already built)              | NEEDS-DEVELOPER-REVIEW |
| 74  | Scale a recipe from 4 to 40 servings                 | Reducible           | No (already built)              | NEEDS-DEVELOPER-REVIEW |
| 75  | Convert units (metric/imperial, volume/weight)       | Reducible           | No (UI wrapper needed)          | NEEDS-DEVELOPER-REVIEW |
| 76  | Edit food photos before posting                      | Permanent           | No                              | NEEDS-DEVELOPER-REVIEW |
| 77  | Print allergen/nutrition labels                      | Partially Reducible | Yes (meal-prep-label-generator) | NEEDS-DEVELOPER-REVIEW |
| 78  | Create contracts/proposals beyond ChefFlow templates | Partially Reducible | No (incremental improvements)   | NEEDS-DEVELOPER-REVIEW |
| 79  | Check competitor pricing/offerings                   | Bridgeable          | No (PIE ongoing mandate)        | NEEDS-DEVELOPER-REVIEW |

### Classification Distribution

- **Reducible:** 4 (#72, #73, #74, #75)
- **Partially Reducible:** 2 (#77, #78)
- **Bridgeable:** 1 (#79)
- **Permanent:** 1 (#76)

### Key Findings

1. **4 of 8 scenarios are already fully built.** The recipe scaling engine, unit conversion engine, mileage tracker, and iCal calendar sync are all production-quality implementations. This category is ChefFlow's strongest exit-reduction area.
2. **The unit converter engine exists but has no standalone UI.** A quick-converter tool wrapping the existing `convertQuantity()` and `convertWithDensity()` functions would be a trivial, high-value addition.
3. **Nutrition/allergen label printing is the biggest gap.** ChefFlow has all the data (USDA nutrition, allergen detection, FDA-style label rendering) but no workflow for generating label sheets for meal prep containers. This deserves a spec.
4. **Photo editing is correctly permanent.** ChefFlow should never attempt to build image editing tools.
5. **Competitor pricing is bridgeable through PIE.** The system already has market intelligence; the gap is surfacing it at the right moment (quote creation) and allowing structured competitor rate logging.
