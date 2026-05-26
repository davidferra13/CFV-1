# Exit Eval: Chef / EVENT-SPECIFIC RESEARCH

> **Wave 1 | Batch 11 | 5 scenarios (#57-#61)**
> **Mode:** Solo (NEEDS-DEVELOPER-REVIEW on all)
> **Date:** 2026-05-25
> **Evaluator:** Claude (Opus 4.6)

---

## Scenario #57: Research a venue's kitchen capabilities

**Original classification:** Partially Reducible ("Could store venue profiles with kitchen specs")
**Reclassified to:** Reducible + Client-Collaborative

**NEEDS-DEVELOPER-REVIEW**

**Why chef leaves:** The chef needs to decide what equipment to bring, what prep to do at the commissary vs. on-site, and whether the venue can handle the planned menu at all. The real question is not "does it have an oven" but "can I execute a 40-person tasting menu in this kitchen, or do I need to bring portable burners, cambros, and a sheet pan rack?" This decision directly shapes the packing list, prep timeline, and DOP schedule.

**Context ChefFlow has:**

- Event date, time, guest count, menu, recipes, ingredient list
- Client profile with kitchen profile fields (oven notes, burner notes, counter space, refrigeration, plating surfaces, sink, constraints, equipment available, equipment must-bring)
- Venue profile system (`lib/venues/recon-types.ts`): venue_name, venue_type, kitchen_notes, equipment_available, oven_type, oven_count, burner_count, counter_space_rating, has_full_kitchen, has_refrigeration, has_freezer, has_running_water, refrigeration_notes, parking_notes, access_instructions, power_outlets, water_access, photos, quirks, visit_count
- Event venue details (`lib/events/venue-details-actions.ts`): kitchen_zone, power_access_notes, water_access_notes, setup zones
- Past events at same venue (via `getVenueHistory`)
- KitchenProfileCallout component already renders client kitchen data on event detail page
- Equipment checklist actions exist (`lib/events/equipment-checklist-actions.ts`)
- Venue recon document generator (`lib/documents/generate-venue-recon.ts`)

**Data source?** No single API. Venue kitchen capabilities are inherently local knowledge. Google Maps/Street View can show the exterior but not what's inside. The venue's own website sometimes lists kitchen specs for event venues, but residential kitchens (the majority of private chef work) have no public data.

**Client-collaborative angle:** This is the strongest angle. The client (or host) LIVES in the kitchen. They know exactly what equipment exists. Dinner Circle can collect:

- Kitchen equipment checklist (oven type/count, burners, counter space, fridge capacity)
- Photos of the kitchen (client takes 4-5 photos during Circle setup)
- Constraints ("no open flames," "the oven runs hot," "only one outlet works")
- Equipment client already owns that chef could use (stand mixer, immersion blender, etc.)

The `accommodation-intake.ts` in Dinner Circles already has patterns for collecting venue/space data from participants. A kitchen intake questionnaire via the Circle would eliminate 90%+ of these exits.

**Physical reality:** Chef may want a printed venue recon sheet for the day-of binder. The venue recon PDF generator already exists. Voice (Remy) could read back kitchen notes hands-free during packing. The KitchenProfileCallout already surfaces kitchen data on the event detail page.

**Compounding:** HIGH. Once a venue's kitchen is profiled, every future event there inherits it. The venue_profiles table already has visit_count tracking. A chef who does 50 events at the same client's home should never think about kitchen capabilities after event #1. The system already has the data model for this; the gap is populating it via client collaboration rather than chef reconnaissance.

**Solution design:**

- Add a "Kitchen Questionnaire" module to Dinner Circle intake: 8-10 questions with photo upload slots, pre-populated from client's existing kitchen profile
- Auto-link Circle kitchen responses to the venue_profile record (create if not exists, update if exists)
- Surface venue kitchen profile on event detail page alongside the existing KitchenProfileCallout (merge client kitchen profile + venue profile into unified view)
- Generate "equipment gap analysis": compare menu requirements (from recipe equipment tags) against venue capabilities, output what chef must bring
- Prompt chef to verify/update venue profile after first visit (post-event learning loop already exists in `lib/events/post-event-learning-actions.ts`)

**Where it appears:**

- Event detail page, overview tab (merged Kitchen Profile + Venue Profile card)
- Dinner Circle: kitchen intake questionnaire module
- Packing list: equipment gap analysis feeds "must-bring" items
- Venue profile page (already exists at `/venues/[id]` equivalent via recon-actions)
- Post-event closeout: "Anything new about this kitchen?" prompt

**What remains as permanent exit:**

- First-time venue visits where client hasn't filled out Circle intake (chef may still Google or call the venue)
- Commercial/event venue research (event halls, restaurants rented for private events) where the venue operator, not the client, has the info
- Very specific equipment questions ("does the Wolf range have a French top?") that require physical inspection

**Priority:** HIGH frequency (every new venue) x LOW effort (data model exists, Circle intake pattern exists) = HIGH priority
**Spec needed?** No standalone spec. The venue profile + Circle intake integration can be added to the existing Dinner Circle workspace modules spec. The `seating_plan` module pattern provides the template.

---

## Scenario #58: Check weather for outdoor event

**Original classification:** Partially Reducible ("Could show weather forecast on event detail")
**Reclassified to:** Reducible

**NEEDS-DEVELOPER-REVIEW**

**Why chef leaves:** The chef needs to decide: (1) whether to move service indoors, (2) whether to adjust the timeline (earlier start to avoid afternoon storms), (3) what backup equipment to bring (tents, wind screens, heating), and (4) whether to proactively communicate plan changes to the client. This is not a casual weather check; it directly drives operational decisions for the next 48-72 hours.

**Context ChefFlow has:**

- Event date, time, location (lat/lng via geocoding)
- Venue type (outdoor detection via keywords: farm, outdoor, garden, bbq, barbecue, picnic, rooftop)
- Venue details including rain_backup_plan and cancel_weather_threshold
- **Already built:** Full Open-Meteo integration (`lib/weather/open-meteo.ts`) with free API, no key required
- **Already built:** `getEventWeatherForecast` action (`lib/events/weather-actions.ts`) returning 3-day window (day before, event day, day after) with temp, precip probability, wind speed, condition, emoji
- **Already built:** `WeatherPanel` component rendering forecast on event detail page
- **Already built:** `weather-forecast-card.tsx`, `weather-alert-panel.tsx`, `weather-alert-badge.tsx`, `weather-widget.tsx`
- **Already built:** `weather-alert-enrichment.ts` in `lib/weather/`
- **Already built:** `solar-times.ts` for sunrise/sunset data
- **Already built:** Dinner Circle `weather_backup` workspace module (forecast snapshot, backup location, attire note, decision deadline)
- Contingency plan detection: `needsContingency` flag when outdoor + >40% precip + no rain plan
- Event risk assessment integration (`lib/events/event-risk-assessment.ts`)

**Data source?** Yes. Open-Meteo API (free, no key). Already fully integrated. Up to 16-day forecast, historical data for past events.

**Client-collaborative angle:** Already designed in the Dinner Circle `weather_backup` module: backup location coordination, attire note to guests, decision deadline for indoor/outdoor call. The client knows their property's indoor alternatives ("we can move to the screened porch" or "the barn is available").

**Physical reality:** Weather check is a quick glance. The existing WeatherPanel renders inline on the event detail page. No print/voice needed for weather itself, but the DECISION (move indoors, adjust timeline) may flow into printed DOP schedule updates.

**Compounding:** LOW for weather itself (every check is fresh data for a specific date). MEDIUM for venue weather patterns (e.g., "this farm always gets afternoon storms in July" could be captured in venue notes, but that's venue profile territory, not weather).

**Solution design:**

- This is already 90%+ built. The remaining gap is operational decision support:
- Add a "Weather Decision Prompt" when precip >40% for outdoor events: "Rain likely Saturday. Your backup plan: [rain_backup_plan]. Want to notify the client via Circle?" with one-click Circle notification
- Connect weather alerts to the DOP timeline: if weather changes significantly in the 48h window, flag the DOP for review
- Ensure the weather_backup Circle module is wired and active (currently defined in workspace modules but may not be fully built)

**Where it appears:**

- Event detail page, overview tab (WeatherPanel, already rendering)
- Weather alert badge on event cards in list/calendar views (already exists)
- Dinner Circle: weather_backup module (defined, needs build verification)
- DOP schedule: weather-triggered timeline review prompt

**What remains as permanent exit:**

- Hyperlocal microclimate questions ("will it be windy on THIS hilltop?") that no forecast API resolves
- Extended forecast beyond 16 days (event planned months out; chef checks periodically until it enters the forecast window)

**Priority:** HIGH frequency (every outdoor event) x VERY LOW effort (already built, just needs decision-support polish) = MEDIUM priority (most value already captured)
**Spec needed?** No. Remaining work is incremental polish on existing weather infrastructure.

---

## Scenario #59: Find local farm for farm-to-table sourcing

**Original classification:** Partially Reducible ("Vendor directory with farm focus")
**Reclassified to:** Partially Reducible

**NEEDS-DEVELOPER-REVIEW**

**Why chef leaves:** The chef wants to source specific ingredients directly from local producers for a farm-to-table event. The operational question is: "Who, within driving distance of this event's venue, grows the tomatoes/herbs/microgreens I need, accepts small orders, and can deliver or allow pickup before Saturday?" This combines geographic search, product availability, order minimums, and timing.

**Context ChefFlow has:**

- Event location (lat/lng), event date, menu with full ingredient list
- Vendor management system (`lib/vendors/vendor-actions.ts`): CRUD with categories including `farmers_market`, rating, preferred flag, contact info, address, notes
- Vendor sourcing intelligence (`lib/vendors/sourcing-actions.ts`): ranked vendor candidates by ingredient, with `farm` type ranked high (relevance score 8), supports both saved vendors and national directory
- Ingredient sourcing types (`lib/ingredients/sourcing-types.ts`): VendorType includes `farm`, `produce`, `dairy`
- Vendor price entries (track prices per vendor per item)
- Vendor trust ledger (`lib/vendors/vendor-trust-ledger-contract.ts`): reliability scoring, sourcing risk assessment
- Seasonal calendar data (`lib/openclaw/seasonal-calendar-actions.ts`)
- PIE pricing with farmer's market seasonal data (`lib/pricing/farmers-market-seasonal.ts`)
- Sustainability sourcing (`lib/sustainability/sourcing-actions.ts`, `sourcing-constants.ts`)

**Data source?** Partially. For farms the chef already knows and has saved as vendors, ChefFlow has the data. For discovering NEW local farms, there's no comprehensive API. USDA has a farmers market directory API, and some local food directories exist, but coverage is spotty. Google Maps/Places API could find farms, but quality/relevance varies wildly. Word of mouth, farmers market visits, and Instagram are how chefs actually discover farms.

**Client-collaborative angle:** Limited but present. For farm-to-table events specifically, the client sometimes already has a farm relationship ("we want to use Johnson's Farm because it's our neighbor"). Dinner Circle could collect "preferred local sources" as part of event intake. The venue-details farm profile fields (farm_name, farm_bio, farm_website, farm_crops) already capture this for farm-venue events.

**Physical reality:** Farm discovery is often physical: visiting farmers markets, driving past roadside stands, meeting producers at food events. The digital component is research (Google, Instagram, farm websites) that narrows options before physical visits. No special screen/print/voice needs.

**Compounding:** HIGH. Every farm relationship the chef builds compounds forever. A chef who has sourced from 15 local farms over 3 years has a personal supply network that's incredibly valuable. The vendor system already stores this; the gap is discovery of new farms, not management of known ones.

**Solution design:**

- Surface "farm vendors near this event" on event detail page: filter saved vendors by type=farm + proximity to event location (requires vendor addresses to be geocoded)
- Add a "sourcing suggestions" panel on event detail: for each ingredient in the menu, show which saved farm vendors carry it (already partially built via sourcing-actions)
- Integrate USDA Farmers Market Directory API as a discovery layer: free, covers 8,000+ markets with location, schedule, products
- Allow one-click "save to my vendors" from directory search results
- Post-event: prompt "Did you use any new farms? Add them to your vendor list" during closeout

**Where it appears:**

- Event detail page: "Local sourcing" panel showing farm vendors near event location
- Vendor list page: filter by type=farm, sort by proximity to selected event
- Ingredient sourcing panel: farm vendors highlighted for relevant ingredients
- Post-event closeout: new vendor capture prompt

**What remains as permanent exit:**

- Discovering farms not in any directory (word of mouth, farmers market encounters, Instagram)
- Evaluating farm quality (requires physical visit, tasting)
- Negotiating orders, delivery, and pricing with new farms (phone/email)
- Farmers market browsing (physical, seasonal, exploratory)

**Priority:** MEDIUM frequency (farm-to-table events are a subset, but growing) x MEDIUM effort (vendor geocoding + USDA API integration) = MEDIUM priority
**Spec needed?** No. The vendor system already has the data model. The work is: (1) geocode vendor addresses, (2) add proximity filter, (3) optionally integrate USDA farmers market API. These are incremental enhancements to existing vendor infrastructure.

---

## Scenario #60: Research wine/beverage pairings

**Original classification:** Permanent exit ("Could store pairing notes on menus")
**Reclassified to:** Partially Reducible

**NEEDS-DEVELOPER-REVIEW**

**Why chef leaves:** The chef needs to recommend specific wines or beverages that complement each course. The operational question is: "For this herb-crusted lamb with root vegetables served to 12 guests who include 2 non-drinkers, what wines should I suggest, at what price point given the per-person budget, and what non-alcoholic alternatives work?" This combines culinary knowledge, wine expertise, budget awareness, and guest dietary considerations.

**Context ChefFlow has:**

- Full menu with dishes, courses, ingredients, dietary tags
- Guest count and dietary restrictions (including alcohol preferences via beverage discovery)
- Beverage discovery fields (`lib/events/beverage-discovery-actions.ts`): beverage_expectations, beverage_service_type (chef_provides, client_provides, byob, no_alcohol, tbd), alcohol_being_served flag
- Beverage notes PDF generator (`lib/documents/generate-beverage-notes.ts`): per-course pairing sheet with fill-in fields
- Menu intelligence assembly (`lib/menus/intelligence/`) with pairing-related context
- Menu storytelling (`lib/menus/storytelling-actions.ts`, `storytelling-types.ts`): dish stories that could include pairing narratives
- Ingredient co-occurrence pairing data (`lib/recipes/pairing-actions.ts`): shows which ingredients appear together frequently
- Dinner Circle menu_reveal module: includes "pairings" in the dish story experience
- Discovery fields (`lib/events/discovery-types.ts`): table_presentation, vibe_atmosphere (context for pairing style)
- Client taste profile and preference history
- Budget/financial data for the event

**Data source?** Partially. Wine pairing is a blend of structured knowledge (classic pairings: lamb+Cabernet, fish+Sauvignon Blanc) and creative judgment. Structured pairing rules could be encoded as a reference database (similar to food safety temps). Wine-specific APIs exist (Vivino, Wine.com) but are mostly commercial/paid. The real value is the chef's own pairing knowledge plus basic rules.

**Client-collaborative angle:** Moderate. Client may have wine preferences ("we love Oregon Pinot Noir"), budget constraints for wine ("keep it under $20/bottle"), or specific requests ("we have a case of this Barolo we want to serve"). Dinner Circle could collect wine preferences and existing cellar inventory. The beverage_service_type field already captures who provides beverages.

**Physical reality:** Pairing research typically happens at a desk/laptop during menu planning, not in the kitchen. The beverage notes PDF is designed for print (fill-in fields for day-of reference). No hands-free needs.

**Compounding:** HIGH. Pairing knowledge for specific dishes compounds across the chef's career. "This lamb prep pairs beautifully with Cotes du Rhone" is knowledge that applies to every event where that dish appears. Storing pairing notes per dish/recipe creates a personal pairing library.

**Solution design:**

- Add a "pairing notes" field per dish in the menu editor (text field, chef writes their recommendation)
- Add a "pairing suggestions" AI feature via Remy: given the dish name, ingredients, and cooking method, suggest classic pairings (wine, beer, cocktail, non-alcoholic) using local Ollama/Gemma model
- Pre-populate the beverage notes PDF from stored pairing notes (currently generates blank fill-in fields)
- Store pairing notes at the recipe level so they carry forward when a recipe is reused across menus
- Surface client wine preferences from the client profile and Dinner Circle intake on the menu editor sidebar

**Where it appears:**

- Menu editor: per-dish pairing notes field
- Menu intelligence sidebar: AI pairing suggestions panel
- Beverage notes PDF: pre-filled from stored pairing notes
- Dinner Circle: wine/beverage preference collection in menu_reveal or dedicated intake
- Event detail overview: beverage discovery section (already exists)

**What remains as permanent exit:**

- Shopping for specific bottles (wine shop, distributor catalog)
- Deep wine research for unfamiliar varietals or regions
- Tasting and personal evaluation (physical, cannot be digitized)
- Checking local wine shop inventory/availability
- Creative pairing experimentation beyond classic rules

**Priority:** MEDIUM frequency (depends on service type; high for full-service dinners, zero for meal prep) x LOW effort (pairing notes field is trivial; AI suggestions are low-effort with existing Remy infrastructure) = MEDIUM priority
**Spec needed?** No. Per-dish pairing notes field in the menu editor + recipe-level pairing persistence is a small feature addition. AI pairing suggestions can be added to the existing Remy menu intelligence tools.

---

## Scenario #61: Get table/seating layout ideas

**Original classification:** Permanent exit
**Reclassified to:** Permanent (with Bridgeable capture)

**NEEDS-DEVELOPER-REVIEW**

**Why chef leaves:** The chef (or more often, the client/host) wants visual inspiration for how to arrange tables, seating, and place settings for a special event. The operational question varies: "How do I arrange 4 round tables for 24 guests in an L-shaped room?" or "What does a long-table farm dinner setup look like?" This is fundamentally a visual/creative exercise.

**Context ChefFlow has:**

- Guest count, occasion, vibe_atmosphere, table_presentation field (from discovery fields)
- Dinner Circle `seating_plan` module (defined): "Seat assignments, accessibility placement, VIPs, and client-safe print view"
- Venue details including dining_zone, bar_zone, other_zones
- Event type/occasion (farm dinner, corporate, intimate, etc.)
- Past event photos (photo gallery per event, photo tagging)

**Data source?** No useful API. Table/seating layout ideas are inherently visual and creative. Pinterest, event planning blogs, and Instagram are the natural sources. There's no database of "table layouts" that could be programmatically queried. This is browsing/inspiration, not data retrieval.

**Client-collaborative angle:** Strong for the DECISION but not the RESEARCH. The client often has strong opinions about seating ("I want a single long table, not rounds") and the Dinner Circle seating_plan module is designed to capture these decisions. But the inspiration browsing itself is personal/creative. The Circle can collect: preferred table style, seating constraints (keep these people apart, seat grandma near the kitchen), and accessibility needs.

**Physical reality:** This is a visual research task done on a screen (tablet/laptop), often in conversation with the client. Pinterest boards are the de facto tool. No kitchen/hands-free considerations.

**Compounding:** LOW. Each event's layout is unique to its venue, guest count, and occasion. A chef might develop general preferences ("I always do long tables for farm dinners"), but those are personal style, not data that compounds.

**Solution design:**

- Accept this as a permanent exit for the inspiration/browsing phase
- Bridge the round-trip: allow chef to save layout notes/links/photos on the event detail page (table_presentation field already exists in discovery fields)
- Ensure the Dinner Circle seating_plan module captures the client's layout decision
- Add an "inspiration link" field on the discovery section where chef can paste a Pinterest/image URL as reference
- Surface past event photos tagged as "table setup" or "venue" as internal inspiration

**Where it appears:**

- Event detail page: discovery section, table_presentation field (already exists)
- Dinner Circle: seating_plan module (defined, needs build)
- Event photo gallery: filter by "setup" tag for past layout reference

**What remains as permanent exit:**

- All visual inspiration browsing (Pinterest, Instagram, event planning sites)
- Creative layout design (sketching, spatial planning)
- Finding and purchasing decor, linens, centerpieces
- This is a creative/aesthetic exit that ChefFlow should not attempt to replace

**Priority:** LOW frequency (only for special events with custom layouts; most dinners use the client's existing table) x LOW effort (table_presentation field already exists) = LOW priority
**Spec needed?** No. The existing discovery fields + Dinner Circle seating_plan module cover the data capture. The inspiration browsing is a permanent exit by design.

---

## Batch Summary

| #   | Title                                      | Reclassified To                     | Spec Needed?                         |
| --- | ------------------------------------------ | ----------------------------------- | ------------------------------------ |
| 57  | Research a venue's kitchen capabilities    | Reducible + Client-Collaborative    | No (extend Circle intake)            |
| 58  | Check weather for outdoor event            | Reducible                           | No (already 90% built)               |
| 59  | Find local farm for farm-to-table sourcing | Partially Reducible                 | No (incremental vendor enhancements) |
| 60  | Research wine/beverage pairings            | Partially Reducible                 | No (per-dish pairing notes field)    |
| 61  | Get table/seating layout ideas             | Permanent (with Bridgeable capture) | No (discovery fields exist)          |

### Stats

- **Reducible:** 1 (#58)
- **Reducible + Client-Collaborative:** 1 (#57)
- **Partially Reducible:** 2 (#59, #60)
- **Permanent (with Bridgeable capture):** 1 (#61)
- **Specs written:** 0
- **All scenarios marked:** NEEDS-DEVELOPER-REVIEW
