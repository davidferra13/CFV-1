# Exit Eval: Chef / Recipe & Culinary Research

> **Batch:** Wave 1 | Prompt 04
> **Role:** Chef
> **Category:** Recipe & Culinary Research
> **Scenarios:** #19, #20, #21, #22, #23, #24
> **Date:** 2026-05-25
> **Mode:** Solo (NEEDS-DEVELOPER-REVIEW on all scenarios)

---

## Scenario #19: Look up a technique or method

**Original classification:** Permanent exit
**Reclassified to:** Partially Reducible

**NEEDS-DEVELOPER-REVIEW**

**Why chef leaves:** The chef needs to close a knowledge gap before or during execution. "How do you temper chocolate at altitude?" is not curiosity; it is a prerequisite for a dish on tonight's menu. The chef needs a specific procedural answer (steps, temps, timing, visual cues) to avoid ruining expensive product. The real decision: "Can I execute this dish safely, or do I need to change the menu?"

**Context ChefFlow has:**

- The recipe being prepared (dish name, ingredients, method field, steps)
- The event context (date, guest count, location/altitude if venue profile exists)
- The chef's own ChefTips archive (tagged by technique, ingredient, equipment)
- ChefNotes (journal and reference entries)
- Past events where chef cooked this dish (production log history)
- Recipe tags including technique tags and method fields

**Data source?** Partially. Technique knowledge is vast, contextual, and constantly evolving. No single API covers it. YouTube and culinary sites are the real sources. However, the chef's OWN learned techniques (captured in ChefTips) are a compounding private data source ChefFlow already stores.

**Client-collaborative angle:** None. Technique knowledge is purely professional. The client has no role here.

**Physical reality:** This is frequently a mid-cook moment. Hands may be messy. Voice (Remy) is the natural interface: "Remy, what temperature do I temper dark chocolate to?" Large text for glance reference if on screen. If planning phase, screen is fine.

**Compounding:** High. Every technique a chef learns and records in ChefTips becomes permanent institutional knowledge. "I learned at altitude you need to reduce the tempering window by 3 degrees" is knowledge that serves every future mountain event. The chef's personal technique library grows more valuable over time.

**Solution design:**

- Surface ChefTips search results when chef queries technique-related terms on recipe detail or during prep. If the chef previously logged a tip tagged "tempering" or "chocolate," show it inline before they leave.
- Enable Remy to answer technique questions by first searching ChefTips, then the food safety reference, then offering a "search the web" exit link with pre-filled query.
- Add a "Technique Notes" field on recipe steps so technique knowledge gets captured at the point of use, not in a separate tips archive.
- When a recipe has method/technique tags, surface the chef's own tips for those tags in the recipe detail sidebar.

**Where it appears:**

- Recipe detail page (`/culinary/recipes/[id]`), in a "Your Notes on This Technique" panel
- Prep timeline (`/culinary/prep/timeline`), linked to steps with technique tags
- Remy chat, when chef asks a "how do I" question
- ChefTips archive (`/culinary/cheftips`), already exists as the capture surface

**What remains as permanent exit:**
Novel techniques the chef has never encountered. YouTube tutorials for visual learning. Complex multi-step unfamiliar procedures where video is essential. ChefFlow will never be a culinary school.

**Priority:** High frequency (chefs look up techniques constantly) x Low effort (ChefTips search surfacing is lightweight) = High priority for the search/surface layer; low priority for trying to replace YouTube
**Spec needed?** No. The ChefTips system already exists. The enhancement is surfacing tips contextually on recipe/prep pages, which is a wiring task, not a new spec.

---

## Scenario #20: Find recipe inspiration for a menu

**Original classification:** Permanent exit
**Reclassified to:** Partially Reducible

**NEEDS-DEVELOPER-REVIEW**

**Why chef leaves:** The chef has a blank menu to fill. A client said "summer garden party for 20" and the chef needs ideas. The operational question: "What dishes fit this event's constraints (season, guest count, dietary restrictions, budget, style) that I haven't already served this client?" This is creative ideation, but it is constrained by operational data ChefFlow already has.

**Context ChefFlow has:**

- Client taste profile (CP-Engine: hard vetoes, dislikes, ambiguity flags)
- Client dietary restrictions and allergies (FDA Big 9 cross-check)
- Past menus served to this client (avoid repeats, honor favorites)
- Seasonal calendar (`/culinary/seasonal-calendar`) showing what's peaking now
- Chef's full recipe library (all recipes, categorized, tagged by cuisine/technique/difficulty)
- Event date (season), guest count, budget
- Menu engineering analytics (profitability + popularity matrix)
- Dish index with insights (`/culinary/dish-index/insights`)
- Recipe track record (times cooked, would-use-again %)

**Data source?** No. Inspiration is not a data lookup. It is a creative process that draws from food blogs, Instagram, Pinterest, cookbooks, and lived experience. No API replaces browsing.

**Client-collaborative angle:** Medium. The Dinner Circle could collect: "What cuisines are you excited about?" "Any dishes you've had recently that you loved?" "Pinterest board or Instagram saves for this event?" This narrows the creative search before the chef even starts browsing.

**Physical reality:** This is a planning-phase activity. Screen is fine. Often happens at a desk, not in a kitchen. Tablet or laptop.

**Compounding:** High. Every recipe the chef creates from inspiration becomes part of their library. The recipe import system (`lib/recipes/import-actions.ts`) already captures URL-sourced recipes with full ingredient parsing. The seasonal calendar compounds seasonal awareness. The dish index compounds popularity/profitability data.

**Solution design:**

- Build an "Inspire Me" panel on the menu builder that uses ChefFlow's own data: "Dishes you've cooked successfully that match this event's season, client restrictions, and guest count, that you haven't served this client before." This is not AI inspiration; it is deterministic filtering of the chef's own library.
- Add a "Clipboard" feature: when browsing externally, the chef can paste a URL and ChefFlow imports the recipe via the existing URL import system (`importRecipeFromUrl`). One-click capture of external inspiration.
- Surface the seasonal calendar data inline on the menu builder: "What's peaking this month" as a sidebar.
- Collect client inspiration via Dinner Circle: "Share a Pinterest board or describe dishes you'd love" before the chef starts planning.

**Where it appears:**

- Menu builder (`/culinary/menus/[id]`), "Inspire Me" sidebar
- Seasonal calendar (`/culinary/seasonal-calendar`), already exists
- Recipe import dialog (already exists in `components/recipes/recipe-import-dialog.tsx`)
- Dinner Circle setup questionnaire (client-facing)
- Dish index insights (`/culinary/dish-index/insights`), already exists

**What remains as permanent exit:**
Browsing food blogs, Instagram, Pinterest, and cookbooks for genuinely new ideas the chef has never encountered. The creative spark itself. ChefFlow captures the output of inspiration, not the inspiration process.

**Priority:** High frequency (every new menu starts with inspiration) x Medium effort (the "Inspire Me" filter is algorithmic, not AI) = High priority
**Spec needed?** No. The components exist (recipe library, seasonal calendar, dish index, menu builder, recipe import). The gap is a filtered "suggest from my library" panel on the menu builder, which is a feature enhancement, not a standalone spec.

---

## Scenario #21: Research a cuisine they're less familiar with

**Original classification:** Permanent exit
**Reclassified to:** Bridgeable

**NEEDS-DEVELOPER-REVIEW**

**Why chef leaves:** A client requests Thai food and the chef specializes in French. The chef needs to understand flavor profiles, canonical dishes, essential techniques, pantry staples, and cultural context for a cuisine outside their comfort zone. The operational question: "Can I credibly execute this cuisine, and if so, what dishes and ingredients do I need?"

**Context ChefFlow has:**

- The chef's existing recipe library (may have some cross-cuisine overlap)
- Ingredient database with flavor profiles and typical pairings (seasonal calendar data includes `flavorProfile`, `culinaryUses`, `typicalPairings`)
- Substitution database (system-level, covers common swaps)
- Client dietary restrictions (still apply regardless of cuisine)
- PIE pricing data (can the chef even source galangal and kaffir lime leaves affordably?)
- Event budget constraints

**Data source?** No. Cuisine research is deep, contextual knowledge that spans technique, history, ingredient relationships, and cultural sensitivity. No single API or database covers it comprehensively.

**Client-collaborative angle:** Significant. If the client wants Thai food, they may have specific dishes in mind, restaurants they love, or a Thai family member who could advise. The Dinner Circle could ask: "Which Thai dishes are your favorites?" "Any must-have dishes?" "Is there a specific region of Thai cuisine you prefer (Northern, Isaan, Southern, Central)?"

**Physical reality:** Planning phase. Desk/screen work. May involve looking at cookbooks. Not a kitchen moment.

**Compounding:** High. Once a chef researches Thai cuisine and builds 5-10 Thai recipes in their library, the next Thai request is dramatically easier. Each cuisine the chef masters compounds permanently. ChefTips captured during the learning process ("galangal bruises, don't slice") serve forever.

**Solution design:**

- When a chef creates a recipe tagged with a cuisine they have few or zero recipes in, surface a "Cuisine Research" exit link panel with pre-assembled search queries: "[cuisine] essential techniques," "[cuisine] pantry staples," "[cuisine] canonical dishes."
- Capture the output: after external research, the chef should land back in ChefFlow to create recipes, log ChefTips, and add ingredients. The return path matters more than preventing the exit.
- Surface ingredient availability: when the chef enters a recipe with unfamiliar ingredients, show PIE pricing and seasonal availability inline. "Galangal: $4.99/lb at H Mart, year-round."
- Add cuisine tags to the recipe library so the chef can see their cross-cuisine coverage at a glance: "You have 45 French, 12 Italian, 2 Thai, 0 Indian."

**Where it appears:**

- Recipe creation (`/culinary/recipes/new`), cuisine tag selection with coverage indicator
- ChefTips (`/culinary/cheftips`), as the capture surface for cuisine-specific learnings
- Menu builder, when a cuisine filter reveals thin coverage
- Exit link panel with curated research links

**What remains as permanent exit:**
The research itself: reading food blogs, watching technique videos, studying cookbooks. ChefFlow cannot teach Thai cuisine. It can make the exit smooth, the return productive, and the knowledge permanent once captured.

**Priority:** Medium frequency (cuisine expansion happens a few times per year) x Medium effort (exit link assembly + cuisine coverage indicator) = Medium priority
**Spec needed?** No. This is a bridgeable exit. The work is: cuisine coverage indicator on recipe library, pre-built exit links, and ensuring the return path (recipe creation, ChefTips, ingredient import) is frictionless. All of these surfaces already exist.

---

## Scenario #22: Check nutritional info for a dish

**Original classification:** Could integrate USDA data
**Reclassified to:** Reducible

**NEEDS-DEVELOPER-REVIEW**

**Why chef leaves:** A client wants macros, calorie counts, or specific nutrient info for a menu. The chef needs to provide this information for menu approval, dietary compliance, or client health goals. The operational question: "What are the macros for this dish so I can present them to the client or adjust the recipe?"

**Context ChefFlow has:**

- Full recipe with structured ingredients (name, quantity, unit)
- USDA FoodData Central API integration (already built in `lib/nutrition/usda.ts`)
- Nutrition panel component (already built in `components/recipes/nutrition-panel.tsx`)
- Per-serving and whole-recipe macro breakdown (calories, protein, fat, carbs, fiber, sodium)
- Per-ingredient nutrition breakdown with USDA matching
- Nutritional calculator for draft recipes (`lib/recipes/nutritional-calculator-actions.ts`)
- Menu-level nutrition page (`/culinary/menus/[id]/nutrition`)
- Client dietary restrictions and health goals
- Unit conversion system (grams, oz, cups, etc. all converted to grams for USDA lookup)

**Data source?** Yes. USDA FoodData Central API. Already integrated. 380K+ foods, free, 1,000 requests/hour. Results cached in Upstash Redis for 30 days. This exit is already eliminated for the common case.

**Client-collaborative angle:** Low direct collaboration, but the client portal could display nutrition summaries for approved menus. Client says "I need under 500 calories per course" and ChefFlow shows the live calorie count in the menu builder.

**Physical reality:** Planning phase. Screen work. The nutrition panel is on-demand (chef clicks "Show Nutrition") which is appropriate since it makes API calls.

**Compounding:** Medium. Individual dish nutrition doesn't compound (it's recalculated per recipe). But the USDA cache compounds: each ingredient lookup is cached for 30 days, so repeat lookups are instant. The chef's understanding of which ingredients drive macros compounds through experience.

**Solution design:**

- This is already built. The gap is surfacing and polish, not new functionality.
- Ensure nutrition panel is visible and accessible on recipe detail, menu detail, and event menu pages.
- Add a "Nutrition Summary" export that the chef can share with clients (PDF or portal display).
- Surface nutrition warnings: "This dish exceeds 800 calories per serving" if the client has dietary targets.
- Add batch nutrition for full menus: "Show nutrition for all 5 courses" in one click on the menu page.

**Where it appears:**

- Recipe detail page, nutrition panel (already exists: `components/recipes/nutrition-panel.tsx`)
- Menu nutrition page (already exists: `/culinary/menus/[id]/nutrition`)
- Nutritional calculator for drafts (already exists: `components/recipes/NutritionalCalculator.tsx`)
- Client portal menu view (could add nutrition summary)
- Event detail, menu section

**What remains as permanent exit:**
Extremely precise clinical nutrition (for medical dietary plans). Specialized nutrient data not in USDA (exotic supplements, proprietary blends). MyFitnessPal for client-side tracking. ChefFlow provides planning-grade nutrition, not medical-grade.

**Priority:** High frequency (nutrition requests are increasingly common) x Already built (minimal remaining effort) = Low remaining effort, high value in polish
**Spec needed?** No. The system is built. Remaining work is: (1) client-facing nutrition display on portal, (2) batch menu nutrition, (3) nutrition warnings against client targets. These are enhancement tasks, not a new spec.

---

## Scenario #23: Verify food safety temps/times

**Original classification:** Could build a food safety quick reference
**Reclassified to:** Reducible

**NEEDS-DEVELOPER-REVIEW**

**Why chef leaves:** The chef needs to confirm a safe internal temperature, hold time, cooling protocol, or storage duration. "What's the safe hold temp for sous vide chicken?" is a question with a precise, authoritative answer that rarely changes. The operational question: "Am I handling this food safely?" Getting it wrong risks illness, lawsuits, and license revocation.

**Context ChefFlow has:**

- Full food safety reference library (`lib/reference/food-safety.ts` + `lib/reference/data/food-safety.json`)
- Searchable food safety table component (`components/reference/food-safety-table.tsx`)
- Dedicated food safety page (`/reference/food-safety`)
- FDA Food Code 2022 and USDA data with source URLs and last-verified dates
- Categories: protein, produce, dairy, seafood, egg, grain, prepared
- Fields: internal temp (F/C), rest time, hold temp min/max, danger zone notes, cooling protocol, thawing methods, fridge/freezer storage
- Sous vide time-at-temp entries
- Keyword search across item names and keyword arrays
- Food safety constants in `lib/constants/food-safety.ts` (queryable by prep timeline, HACCP, Remy)
- Remy intelligence: `executeIngredientSubstitution` and food safety Q&A in `lib/ai/remy-intelligence-actions.ts`
- HACCP wizard and section cards (`components/haccp/`)
- Compliance concierge system (`lib/compliance/`)

**Data source?** Yes. FDA and USDA food safety guidelines. Already fully seeded as static JSON data in `lib/reference/data/food-safety.json`. No API call needed; it is local reference data. Updates are rare (FDA Food Code updates approximately every 4 years).

**Client-collaborative angle:** None. Food safety is professional knowledge. The client has no role.

**Physical reality:** Critical. This is often a mid-cook question. Hands are messy. Kitchen is loud. The chef needs the answer in 3 seconds, not 30. Voice (Remy): "What temp for chicken?" gets an instant answer. Print: food safety quick reference card taped to the wall. Large text on screen for glance moments. The mid-cook reference system spec (`docs/specs/mid-cook-reference-system.md`) already addresses this.

**Compounding:** Low for the data (it rarely changes), but high for the system. Once built, this reference serves every chef on every event forever. Zero incremental cost.

**Solution design:**

- This is already built. The food safety reference page, searchable table, Remy Q&A, HACCP integration, and constants file all exist.
- Remaining gap: mid-cook access. The food safety page exists at `/reference/food-safety` but needs to be reachable in 1 tap from prep/execution contexts.
- Remy should answer food safety questions with zero latency (deterministic lookup from constants, no AI needed). This is already partially implemented in `remy-intelligence-actions.ts`.
- Print-friendly food safety card: a one-page PDF of the most common temps/times for kitchen wall posting.
- Surface relevant food safety data inline on recipes: if a recipe has chicken, show "Internal temp: 165F" on the recipe detail.

**Where it appears:**

- Food safety reference page (already exists: `/reference/food-safety`)
- Remy chat (already answers food safety questions via `lib/ai/remy-intelligence-actions.ts`)
- HACCP plans (already exist: `components/haccp/`)
- Prep timeline (could surface relevant temps per step)
- Recipe detail (could show safety temps for proteins in recipe)
- Event execution page (quick access during service)

**What remains as permanent exit:**
State-specific regulations (cottage food laws, local health codes). ServSafe certification study materials. Novel food safety questions not covered by standard FDA guidelines (e.g., fermentation safety for unusual products). Edge cases where the chef needs to consult a food safety professional.

**Priority:** High frequency (chefs verify temps constantly) x Already built (minimal remaining effort) = Polish priority. Surface the existing data in more contexts.
**Spec needed?** No. The system is fully built. The mid-cook reference system spec already exists at `docs/specs/mid-cook-reference-system.md`. Remaining work is wiring: surface food safety data inline on recipes and prep timelines.

---

## Scenario #24: Find a substitute ingredient

**Original classification:** Could build a substitution engine (AI-assisted, tied to recipes)
**Reclassified to:** Reducible

**NEEDS-DEVELOPER-REVIEW**

**Why chef leaves:** A client has an allergy and the chef needs a swap that works. Or the chef is mid-prep and the store is out of an ingredient. The operational question: "What can I use instead of X that (a) is safe for this client's allergies, (b) works in this recipe's chemistry, (c) is available and affordable, and (d) won't ruin the dish?"

**Context ChefFlow has:**

- Substitution engine with system defaults and chef personal additions (`lib/ingredients/substitution-actions.ts`)
- System substitution seed data (`lib/ingredients/substitution-seed.ts`) covering common swaps
- Substitution search with allergy conflict detection (checks client allergies against substitute)
- Cost delta calculation (substitute vs. original, via PIE pricing)
- Dietary safety flags per substitution (vegan, GF, nut-free, etc.)
- Dedicated substitution page (`/culinary/substitutions`) with quick lookup and personal substitution manager
- Menu-level substitutions page (`/culinary/menus/substitutions`)
- Remy intelligence: deterministic `executeIngredientSubstitution()` in `lib/ai/remy-intelligence-actions.ts` with hardcoded substitution database
- Client allergy/dietary data (FDA Big 9 cross-check)
- Recipe ingredient list with quantities and units
- Substitution ratio (e.g., "1:1 by volume")
- Quality impact ratings and confidence levels in type system (`lib/reference/types.ts`)

**Data source?** Partially. The most common substitutions (butter to oil, eggs to flax, wheat flour to almond flour) are well-known and already seeded. Long-tail substitutions (replacing a specific variety of chili pepper, finding a substitute for high-altitude baking) require external research. But the 80/20 case is covered by the existing seed data.

**Client-collaborative angle:** High. The client knows their allergies better than anyone. The Dinner Circle already collects allergy data with severity levels. If the client says "I can't have tree nuts but pine nuts are fine," that distinction drives the substitution engine's allergy conflict checker.

**Physical reality:** Often mid-prep. Hands may be messy. Voice is ideal: "Remy, what can I use instead of heavy cream for someone who's dairy-free?" Quick answer needed. Large text for the answer. This is a 10-second lookup, not a research session.

**Compounding:** High. Every substitution the chef discovers and adds as a personal substitution serves every future event. The system substitution database grows over time. Client allergy profiles compound: once recorded, every future menu is automatically checked. The chef's personal substitution library becomes a competitive advantage.

**Solution design:**

- The core system is already built. The gaps are contextual surfacing and Remy integration depth.
- When a recipe has an ingredient that conflicts with the current event's client allergies, auto-suggest substitutions from the engine. Show this on the menu builder and recipe detail, not just on a separate substitutions page.
- Remy should answer substitution queries by hitting the substitution database first (deterministic), then falling back to the system seed data, then offering an external search link for novel substitutions.
- Add a "Learn" flow: when the chef discovers a substitution externally, one-click add to personal substitutions from the recipe edit page.
- Surface cost impact: "Swapping butter for coconut oil saves $0.45 per serving" inline on the recipe.

**Where it appears:**

- Substitution lookup page (already exists: `/culinary/substitutions`)
- Menu substitutions page (already exists: `/culinary/menus/substitutions`)
- Recipe detail page, ingredient list (could add inline substitution suggestions when allergy conflict detected)
- Menu builder, allergen cross-check panel (already runs FDA Big 9 check; could suggest fixes)
- Remy chat (already handles substitution queries via `executeIngredientSubstitution`)
- Dinner Circle allergy collection (already collects data that drives the engine)

**What remains as permanent exit:**
Novel or extremely specific substitutions (e.g., "What replaces high-acyl gellan gum in a vegan panna cotta?"). Substitutions that depend on technique knowledge (e.g., "How do I adjust the recipe if I use almond flour instead of wheat?" requires understanding of hydration ratios, binding, and rise). Chef forums for community wisdom on unusual swaps.

**Priority:** High frequency (substitutions needed for nearly every client with dietary restrictions) x Mostly built (system exists, needs contextual wiring) = High priority for contextual surfacing, low priority for new infrastructure
**Spec needed?** No. The substitution engine, UI, Remy integration, and allergy cross-check all exist. Remaining work is wiring: surface substitution suggestions inline on recipe/menu when allergy conflicts are detected. This is an enhancement to existing surfaces.

---

## Batch Summary

| #   | Title                                         | Reclassified To     | Spec Needed? |
| --- | --------------------------------------------- | ------------------- | ------------ |
| 19  | Look up a technique or method                 | Partially Reducible | No           |
| 20  | Find recipe inspiration for a menu            | Partially Reducible | No           |
| 21  | Research a cuisine they're less familiar with | Bridgeable          | No           |
| 22  | Check nutritional info for a dish             | Reducible           | No           |
| 23  | Verify food safety temps/times                | Reducible           | No           |
| 24  | Find a substitute ingredient                  | Reducible           | No           |

### Classification Distribution

- **Reducible:** 3 (#22, #23, #24)
- **Partially Reducible:** 2 (#19, #20)
- **Bridgeable:** 1 (#21)
- **Permanent:** 0
- **Needs Developer Review:** 6/6

### Key Finding

All 6 scenarios were originally classified as "Permanent exit" or "Could integrate." After codebase analysis, 3 are already Reducible (the features are built), 2 are Partially Reducible (ChefFlow's own data can handle the common case), and only 1 (cuisine research) remains Bridgeable. No new specs are needed because the infrastructure exists. The remaining work is contextual surfacing: showing the right data at the right moment in the right context, rather than requiring the chef to navigate to a dedicated reference page.
