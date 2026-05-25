# Spec: Culinary Reference Library

> **Status:** SPEC-READY
> **Priority:** P1
> **Origin:** Exit-points analysis (exits 17, 22, 23, 24): chefs leave ChefFlow to look up food safety temps, ingredient substitutions, nutritional data, and unfamiliar dietary conditions
> **Depends On:** `docs/specs/global-culinary-ingredient-ontology.md`, `docs/specs/allergy-severity-tiers.md`
> **Estimated Complexity:** Medium
> **Created:** 2026-05-25

---

## Problem Statement

Chefs leave ChefFlow mid-workflow to perform quick reference lookups:

- "What's the safe internal temp for sous vide chicken?" (FDA guidelines, ServSafe)
- "Client has celiac; what can I use instead of flour?" (Google, allergy sites)
- "Client wants macros for this menu." (USDA database, MyFitnessPal)
- "Client mentioned histamine intolerance; what does that mean for my menu?" (medical databases, Google)

These are 30-second lookups that break a 30-minute workflow. The data is stable, well-sourced, and fits naturally inside a chef ops platform. ChefFlow should answer these questions without the chef opening a browser tab.

This is reference data, not education. Quick lookups, not courses. Approximate nutrition, not medical-grade calculations.

---

## What This Does NOT Do

- **Culinary technique research** (how to temper chocolate, knife skills) is a permanent exit. This is not a culinary school.
- **Recipe inspiration** (what should I cook) is a permanent exit. This is not Pinterest.
- **Medical nutrition therapy** or clinical dietary planning. All nutritional data is labeled "approximate, for planning purposes only."
- **Duplicate the allergy severity tier system.** That spec handles classification (preference/intolerance/allergy) and chef protocols. This spec provides the knowledge base those tiers reference.
- **Duplicate the ingredient ontology.** That spec handles ingredient identity, forms, and transformations. This spec layers reference data (safety, nutrition, substitution rules) onto ontology entities.

---

## Four Modules

### Module 1: Food Safety Quick Reference

**What:** A searchable, static data table of safe internal temperatures, hold temperatures, cooling protocols, thawing methods, and storage durations. FDA and USDA sourced.

**Why:** Exit 23. Chefs Google "safe hold temp for chicken" constantly. This data changes rarely (FDA updates food safety guidelines every few years). A local reference eliminates the exit entirely.

#### Data Structure

```typescript
type FoodSafetyEntry = {
  id: string
  category: 'protein' | 'produce' | 'dairy' | 'seafood' | 'egg' | 'grain' | 'prepared'
  item: string // "Chicken (whole)", "Ground beef", "Pork loin"
  internalTempF: number | null // 165, 160, 145
  internalTempC: number | null // derived
  restTimeMinutes: number | null // "let rest 3 minutes after removing from heat"
  holdTempMinF: number | null // minimum hold temp for service (140F)
  holdTempMaxF: number | null // maximum cold hold (40F)
  dangerZoneNotes: string | null // "Do not hold between 40-140F for more than 2 hours"
  coolingProtocol: string | null // "Cool from 135F to 70F within 2 hours, then to 40F within 4 more hours"
  thawingMethods: string[] // ["Refrigerator (24-48 hrs)", "Cold water (change every 30 min)", "Microwave (cook immediately)"]
  storageFridge: string | null // "3-4 days at 40F or below"
  storageFreezer: string | null // "4-12 months at 0F"
  sourceUrl: string // FDA/USDA source link
  sourceLabel: string // "FDA Food Safety Guidelines, 2024"
  lastVerified: string // ISO date of last manual verification
  keywords: string[] // searchable terms: ["chicken", "poultry", "bird"]
}
```

#### Seed Data (Partial)

| Item                            | Internal Temp (F) | Rest  | Hold Min (F) | Source |
| ------------------------------- | ----------------- | ----- | ------------ | ------ |
| Poultry (whole, pieces, ground) | 165               | None  | 140          | FDA    |
| Ground meats (beef, pork, lamb) | 160               | None  | 140          | FDA    |
| Beef steaks/roasts              | 145               | 3 min | 140          | FDA    |
| Pork (chops, roasts)            | 145               | 3 min | 140          | FDA    |
| Fish & shellfish                | 145               | None  | 140          | FDA    |
| Eggs (cooked to order)          | 160               | None  | 140          | FDA    |
| Leftovers / casseroles          | 165               | None  | 140          | FDA    |
| Ham (fresh)                     | 145               | 3 min | 140          | FDA    |
| Ham (pre-cooked, reheating)     | 165               | None  | 140          | FDA    |

Additional entries for: sous vide proteins (time-at-temp tables), smoked meats, cured items, raw-service proteins (sushi-grade handling), dairy products, produce wash/storage, and prepared foods.

#### Sous Vide Specifics

Sous vide complicates the standard "hit X temp" model. Pasteurization is a function of time AND temperature. Include a simplified time-at-temp reference:

| Protein         | Temp (F) | Min Time | Result                   |
| --------------- | -------- | -------- | ------------------------ |
| Chicken breast  | 150      | 1h 11m   | Pasteurized, juicy       |
| Chicken breast  | 165      | Instant  | Pasteurized, traditional |
| Pork tenderloin | 140      | 1h 50m   | Pasteurized, medium-rare |
| Beef steak (1") | 130      | 1h 30m   | Pasteurized, medium-rare |
| Salmon (1")     | 130      | 45m      | Pasteurized, medium      |
| Eggs (in shell) | 145      | 1h 15m   | Soft-set                 |

Source: Douglas Baldwin, "A Practical Guide to Sous Vide Cooking" (peer-reviewed pasteurization tables derived from USDA/FDA log reduction data).

#### Access Points

- **Recipe view:** "Safety" icon on any protein ingredient opens the relevant entry.
- **Event prep timeline:** Safety temps shown inline for each protein dish.
- **Command palette:** `food safety [item]` searches the table.
- **Standalone page:** `/reference/food-safety` with full searchable table. Not in main nav; accessed from recipe/event views or command palette.

#### Maintenance

This data is static. Seed it from FDA/USDA sources at build time. Store in a JSON seed file (`lib/reference/data/food-safety.json`). No database table needed initially. Update the seed file when FDA publishes new guidelines (rare; last major update was 2024).

---

### Module 2: Substitution Engine

**What:** Given an ingredient and a reason for substitution (allergy, dietary restriction, availability, cost, preference), suggest alternatives with notes on ratio, behavior differences, and limitations.

**Why:** Exit 24. "Client has a tree nut allergy; what do I use instead of almond flour?" Chef currently Googles this. ChefFlow knows the client's allergy (from allergy-severity-tiers) and the recipe's ingredients (from the ontology). It should connect those dots.

#### Data Structure

```typescript
type SubstitutionRule = {
  id: string
  sourceIngredient: string // canonical name or ontology form slug
  sourceIngredientFormId: string | null // links to culinary_ingredient_forms when ontology is built
  targetIngredient: string
  targetIngredientFormId: string | null
  ratio: string // "1:1", "3/4 cup per 1 cup", "2 tbsp per 1 egg"
  reasons: SubstitutionReason[] // why this swap works
  behaviorNotes: string // "Coconut flour absorbs more liquid; reduce other liquids by 25%"
  qualityImpact: 'none' | 'minor' | 'moderate' | 'significant'
  cuisineContext: string | null // "Works best in baking" or null for universal
  limitations: string | null // "Not suitable for yeast breads"
  confidence: 'verified' | 'common' | 'experimental'
  sources: string[] // ["FARE (Food Allergy Research & Education)", "America's Test Kitchen"]
}

type SubstitutionReason =
  | 'allergy_dairy'
  | 'allergy_egg'
  | 'allergy_gluten'
  | 'allergy_nut'
  | 'allergy_shellfish'
  | 'allergy_soy'
  | 'allergy_fish'
  | 'allergy_sesame'
  | 'dietary_vegan'
  | 'dietary_vegetarian'
  | 'dietary_keto'
  | 'dietary_kosher'
  | 'dietary_halal'
  | 'dietary_low_sodium'
  | 'availability'
  | 'cost'
  | 'preference'
```

#### Seed Data Categories (Curated First, AI-Expanded Later)

**Phase 1: Curated seed database (~200 rules covering the most common swaps)**

Priority substitution families:

1. **Dairy alternatives:** milk (oat, almond, soy, coconut), butter (oil, vegan butter, applesauce in baking), cream (coconut cream, cashew cream), cheese (nutritional yeast, cashew-based)
2. **Egg alternatives:** flax egg, chia egg, aquafaba, commercial egg replacer, banana, applesauce (baking only)
3. **Gluten-free flours:** almond flour, rice flour, oat flour, coconut flour, tapioca starch, potato starch (with ratio and hydration notes)
4. **Nut alternatives:** sunflower seed butter for peanut butter, pepitas for pine nuts, coconut for almond (when safe), seed-based flours
5. **Protein swaps:** tofu for paneer, tempeh for ground meat, jackfruit for pulled pork, mushroom for beef (umami preservation)
6. **Common allergy swaps:** soy sauce to coconut aminos, wheat pasta to rice/legume pasta, shellfish stock to mushroom dashi
7. **Cost swaps:** chicken thigh for breast, pork shoulder for tenderloin, dried beans for canned, frozen fruit for fresh (in cooking)
8. **Availability swaps:** shallot for red onion, lime for lemon, dried herbs for fresh (with ratio), canned tomato for fresh

**Phase 2: AI-assisted expansion via local Ollama**

After the curated seed is proven:

- Chef searches for a substitution not in the database.
- System queries local Ollama: "What can replace [ingredient] in [context] for someone who [reason]? Include ratio, behavior notes, and limitations."
- Response is presented as "AI-suggested" with lower confidence.
- Chef can approve the suggestion, which promotes it to the curated database for future chefs.
- AI suggestions are never auto-trusted. Always labeled "AI-suggested, verify before serving to clients with severe allergies."

This follows the algorithm-first principle: deterministic curated data first, AI as opt-in expansion.

#### Integration with Allergy Severity Tiers

When a recipe contains an ingredient that conflicts with a guest's allergy-tier restriction:

- **Allergy (red):** Substitution engine auto-surfaces. "This recipe contains [allergen]. [Guest] has a severe allergy. Suggested safe alternatives: [list]." Zero cross-contamination swaps only.
- **Intolerance (orange):** Substitution engine suggests. "This recipe contains [irritant]. [Guest] has an intolerance. Possible alternatives: [list]."
- **Preference (yellow):** Substitution engine available on request, not auto-surfaced.

This spec provides the substitution knowledge. The allergy-severity-tiers spec provides the trigger logic and protocol.

#### Integration with Ingredient Ontology

The substitution engine reads from the ontology's form graph:

- Substitution rules link to `culinary_ingredient_forms` IDs when available.
- Form-level substitutions are more precise: "substitute almond flour (form: ground blanched almond)" not just "substitute almonds."
- Transformation awareness: "dried basil can substitute for fresh basil at 1:3 ratio" uses the ontology's form transformation data.

The ontology spec mentions substitution groups but does not define the substitution rules themselves. This spec owns the rules, reasons, ratios, and behavior notes.

#### Access Points

- **Recipe editor:** When adding an ingredient, a "Substitutes" action appears. When a guest allergy conflicts with a recipe ingredient, substitutions are proactively shown.
- **Event dietary summary:** "Accommodations needed" section links each conflict to substitution options.
- **Command palette:** `substitute [ingredient]` or `swap [ingredient] for [reason]`.
- **Menu builder:** When building a menu for an event with dietary-restricted guests, conflicting ingredients show substitution options inline.

#### Storage

Curated rules: JSON seed file (`lib/reference/data/substitutions.json`) for Phase 1. Migrate to database table when AI-expansion (Phase 2) needs persistence.

AI-expanded rules: stored in a database table with `confidence: 'experimental'` until chef-approved.

```sql
-- Phase 2 only (not needed for Phase 1 curated seed)
CREATE TABLE substitution_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_ingredient text NOT NULL,
  source_form_id uuid REFERENCES culinary_ingredient_forms(id),
  target_ingredient text NOT NULL,
  target_form_id uuid REFERENCES culinary_ingredient_forms(id),
  ratio text NOT NULL,
  reasons text[] NOT NULL DEFAULT '{}',
  behavior_notes text,
  quality_impact text NOT NULL DEFAULT 'minor',
  cuisine_context text,
  limitations text,
  confidence text NOT NULL DEFAULT 'experimental',
  sources text[] DEFAULT '{}',
  approved_by uuid REFERENCES chefs(id),
  approved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

---

### Module 3: Allergy and Dietary Condition Reference

**What:** A reference library of common dietary conditions: what they mean, what to avoid, what is safe, and how they connect to ChefFlow's ingredient and allergy systems.

**Why:** Exit 17. Client says "I have a histamine intolerance" or "We keep kosher." Chef has a general idea but needs specifics: which ingredients are affected? What are the gotchas? Currently they Google it. ChefFlow should have this knowledge built in, linked directly to the ingredients and menus the chef is working with.

#### Scope

This is a reference card per condition, not a medical database. Each entry tells a chef what they need to know to cook safely and competently for that condition.

#### Data Structure

```typescript
type DietaryConditionReference = {
  id: string
  slug: string // "celiac", "shellfish-allergy", "keto"
  name: string // "Celiac Disease"
  category: 'allergy' | 'intolerance' | 'autoimmune' | 'religious' | 'lifestyle' | 'metabolic'
  severity: 'life_threatening' | 'medical' | 'strict_observance' | 'preference'
  summary: string // 1-2 sentence plain-English explanation
  avoidList: string[] // ingredients/categories to avoid
  avoidDetails: string // nuances: "Watch for hidden gluten in soy sauce, malt vinegar, beer-battered items"
  safeAlternatives: string[] // common safe swaps
  crossContactRisk: boolean // true for celiac, severe nut allergy; false for vegan preference
  crossContactNotes: string | null // "Separate cutting boards, utensils, cooking oil"
  commonMistakes: string[] // "Using regular soy sauce (contains wheat)", "Assuming 'wheat-free' means 'gluten-free'"
  clientQuestions: string[] // questions chef should ask: "How strict is your observance?", "Do you carry an EpiPen?"
  sources: string[] // "FARE", "Celiac Disease Foundation", "FDA Big 9 Allergens"
  linkedAllergenTags: string[] // maps to ontology allergen_tags
  linkedDietFlags: string[] // maps to ontology diet_flags
}
```

#### Seed Conditions

**FDA Big 9 Allergens:**

| Condition          | Category | Severity         | Key Avoidances                                                                             |
| ------------------ | -------- | ---------------- | ------------------------------------------------------------------------------------------ |
| Milk/dairy allergy | allergy  | life_threatening | All dairy proteins (casein, whey); not the same as lactose intolerance                     |
| Egg allergy        | allergy  | life_threatening | Eggs, mayonnaise, meringue, some pasta, some baked goods                                   |
| Peanut allergy     | allergy  | life_threatening | Peanuts, peanut oil (refined may be safe; ask), peanut flour                               |
| Tree nut allergy   | allergy  | life_threatening | Almonds, cashews, walnuts, pecans, pistachios, pine nuts, etc.                             |
| Wheat allergy      | allergy  | life_threatening | Wheat flour, bread, pasta, couscous; distinct from celiac                                  |
| Soy allergy        | allergy  | life_threatening | Soy sauce, tofu, tempeh, edamame, soy lecithin (usually safe)                              |
| Fish allergy       | allergy  | life_threatening | All fin fish; may tolerate shellfish (ask)                                                 |
| Shellfish allergy  | allergy  | life_threatening | Shrimp, crab, lobster, scallops; fish sauce and oyster sauce contain shellfish derivatives |
| Sesame allergy     | allergy  | life_threatening | Sesame seeds, tahini, sesame oil, halvah; added to Big 9 in 2023                           |

**Common Intolerances and Autoimmune:**

| Condition                     | Category    | Severity         | Key Details                                                                            |
| ----------------------------- | ----------- | ---------------- | -------------------------------------------------------------------------------------- |
| Lactose intolerance           | intolerance | medical          | Cannot digest lactose; aged cheeses and butter often tolerated                         |
| Celiac disease                | autoimmune  | medical          | Zero gluten (wheat, barley, rye); cross-contact unsafe; not the same as wheat allergy  |
| Non-celiac gluten sensitivity | intolerance | medical          | Avoid gluten but less strict on cross-contact than celiac                              |
| Histamine intolerance         | intolerance | medical          | Avoid aged cheeses, fermented foods, cured meats, wine, some fish; freshness matters   |
| FODMAP sensitivity            | intolerance | medical          | Avoid certain fermentable carbs; onion and garlic are common triggers                  |
| Alpha-gal syndrome            | allergy     | life_threatening | Allergy to red meat (beef, pork, lamb) from tick bite; poultry and fish are safe       |
| Oral allergy syndrome         | allergy     | medical          | Raw fruit/vegetable cross-reaction with pollen; cooking usually eliminates the trigger |

**Religious and Lifestyle:**

| Condition   | Category  | Severity          | Key Details                                                                |
| ----------- | --------- | ----------------- | -------------------------------------------------------------------------- |
| Kosher      | religious | strict_observance | No pork, no shellfish, no mixing meat and dairy, kosher slaughter required |
| Halal       | religious | strict_observance | No pork, no alcohol, halal slaughter required                              |
| Vegan       | lifestyle | preference        | No animal products whatsoever; honey is debated                            |
| Vegetarian  | lifestyle | preference        | No meat/fish; may include eggs and dairy                                   |
| Pescatarian | lifestyle | preference        | No meat; fish and seafood OK                                               |
| Keto        | lifestyle | preference        | Very low carb (<20-50g/day); high fat; avoid grains, sugar, most fruit     |
| Paleo       | lifestyle | preference        | No grains, legumes, dairy, refined sugar, processed foods                  |

#### Cross-Linking

Each condition entry links to:

- **Allergy severity tiers:** When a client has a condition, the tier system classifies its operational severity.
- **Substitution engine:** Each condition's "safe alternatives" link to substitution rules.
- **Ontology allergen tags:** Each condition maps to ingredient-level allergen flags, so the system can auto-detect conflicts in recipes and menus.

#### Access Points

- **Client dietary profile:** When chef views a client's restrictions, each condition name is a link to its reference card. "Client has celiac" links to the celiac reference.
- **Event dietary summary:** The tiered allergy display (from allergy-severity-tiers spec) can expand each condition for details.
- **Command palette:** `condition [name]` or `dietary [name]` opens the reference card.
- **Standalone page:** `/reference/dietary-conditions` as a searchable library. Not in main nav.

#### Storage

JSON seed file (`lib/reference/data/dietary-conditions.json`). Static data. Update when medical consensus or regulatory changes occur.

---

### Module 4: Nutritional Data

**What:** Per-ingredient macronutrient data (calories, protein, fat, carbohydrates, fiber) from USDA FoodData Central. Calculate approximate dish-level nutrition by summing recipe ingredient quantities.

**Why:** Exit 22. "Client wants macros for this menu." Chef currently opens MyFitnessPal or the USDA website, looks up each ingredient, does mental math. ChefFlow already knows the recipe ingredients and quantities. It should compute an approximate total.

#### Data Source

**USDA FoodData Central** (https://fdc.nal.usda.gov/) is the primary source. Specifically:

- **SR Legacy** dataset: ~7,700 common foods with full nutrient profiles. Public domain. Downloadable as CSV/JSON.
- **Foundation Foods** dataset: more detailed but smaller coverage.

Use SR Legacy as the base. It covers the vast majority of ingredients a private chef uses.

#### Data Structure

```typescript
type NutritionEntry = {
  id: string
  usdaFdcId: number | null // USDA FoodData Central ID for traceability
  ingredientName: string // "Chicken breast, raw, boneless, skinless"
  ingredientFormId: string | null // links to culinary_ingredient_forms
  servingSize: number // grams
  servingLabel: string // "100g", "1 cup", "1 large"
  calories: number // kcal
  protein: number // grams
  fat: number // grams
  saturatedFat: number | null // grams
  carbohydrates: number // grams
  fiber: number | null // grams
  sugar: number | null // grams
  sodium: number | null // mg
  cholesterol: number | null // mg
  // Extended nutrients (Phase 2)
  vitaminA: number | null // mcg RAE
  vitaminC: number | null // mg
  calcium: number | null // mg
  iron: number | null // mg
  potassium: number | null // mg
  source: string // "USDA FoodData Central SR Legacy"
  sourceId: string // "171077"
}
```

#### Recipe-Level Calculation

When a recipe has ingredients with quantities:

1. For each ingredient, look up the best matching `NutritionEntry`.
2. Convert the recipe quantity to grams using the ontology's density/unit data.
3. Scale the per-100g nutrition data to the recipe quantity.
4. Sum across all ingredients.
5. Divide by number of servings (if specified).

```typescript
type RecipeNutritionSummary = {
  recipeId: string
  servings: number
  perServing: MacroSummary
  totalRecipe: MacroSummary
  coverage: number // 0-1: what % of ingredients had nutrition data
  missingIngredients: string[] // ingredients without nutrition matches
  disclaimer: string // always present
}

type MacroSummary = {
  calories: number
  protein: number
  fat: number
  carbohydrates: number
  fiber: number | null
}
```

#### Disclaimer (Mandatory, Non-Removable)

Every nutritional display includes:

> "Approximate values for planning purposes. Based on USDA reference data for raw ingredients. Actual values vary by brand, preparation method, and serving size. Not suitable for medical dietary planning."

This is not optional. It cannot be hidden, collapsed, or removed. ChefFlow is not a medical nutrition tool.

#### Coverage Strategy

Phase 1: Import the top ~500 ingredients from USDA SR Legacy that overlap with ChefFlow's `system_ingredients` catalog. This covers the majority of what private chefs cook with.

Phase 2: Expand to full SR Legacy (~7,700 foods). Link each entry to `culinary_ingredient_forms` from the ontology.

Phase 3: When a recipe ingredient has no USDA match, show "Nutrition data unavailable for [ingredient]" in the coverage report. Never show $0 or hide the gap.

#### Access Points

- **Recipe detail view:** "Nutrition" tab or expandable section showing per-serving macros with the coverage percentage and disclaimer.
- **Menu view:** Sum of per-recipe nutrition across all courses.
- **Ingredient detail:** Per-ingredient nutrition card.
- **Command palette:** `nutrition [recipe name]` computes and displays recipe nutrition.
- **Client portal (future):** If a client requests macros, chef can share the approximate breakdown.

#### Storage

Phase 1: JSON seed file (`lib/reference/data/usda-nutrition.json`) with the top 500 ingredients. No database table.

Phase 2: Database table for the full dataset and for linking to ontology forms.

```sql
-- Phase 2 only
CREATE TABLE nutrition_reference (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usda_fdc_id integer,
  ingredient_name text NOT NULL,
  ingredient_form_id uuid REFERENCES culinary_ingredient_forms(id),
  serving_size_g numeric NOT NULL DEFAULT 100,
  serving_label text NOT NULL DEFAULT '100g',
  calories numeric NOT NULL,
  protein_g numeric NOT NULL,
  fat_g numeric NOT NULL,
  saturated_fat_g numeric,
  carbohydrates_g numeric NOT NULL,
  fiber_g numeric,
  sugar_g numeric,
  sodium_mg numeric,
  cholesterol_mg numeric,
  source text NOT NULL DEFAULT 'USDA FoodData Central SR Legacy',
  source_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_nutrition_form ON nutrition_reference(ingredient_form_id);
CREATE INDEX idx_nutrition_usda ON nutrition_reference(usda_fdc_id);
```

---

## Exit Points Closed

| Exit # | Scenario                                                   | How This Spec Closes It                                                                                                                                                       |
| ------ | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 17     | Check a client's dietary/allergy info from external source | Module 3: Allergy and Dietary Condition Reference provides condition-specific guidance (what to avoid, safe alternatives, common mistakes) linked directly to client profiles |
| 22     | Check nutritional info for a dish                          | Module 4: Nutritional Data provides per-ingredient USDA macros and recipe-level approximate totals                                                                            |
| 23     | Verify food safety temps/times                             | Module 1: Food Safety Quick Reference provides searchable FDA/USDA temp/time/storage data accessible from recipe and event views                                              |
| 24     | Find a substitute ingredient                               | Module 2: Substitution Engine suggests alternatives with ratios, behavior notes, and limitation warnings, filtered by reason (allergy, dietary, cost, availability)           |

**Exit type change:** All four move from "reducible exit" to "closed" (chef no longer needs to leave ChefFlow for these lookups).

---

## Data Sources

| Source                                           | Used By      | License                                    | URL                                                                                                                                 |
| ------------------------------------------------ | ------------ | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| FDA Food Safety Guidelines                       | Module 1     | Public domain (US government)              | https://www.fda.gov/food/people-risk-foodborne-illness/safe-food-handling                                                           |
| USDA Safe Minimum Cooking Temperatures           | Module 1     | Public domain                              | https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/safe-minimum-internal-temperature-chart |
| Douglas Baldwin, Sous Vide Pasteurization Tables | Module 1     | Published research, cited with attribution | https://douglasbaldwin.com/sous-vide.html                                                                                           |
| FARE (Food Allergy Research & Education)         | Modules 2, 3 | Educational use                            | https://www.foodallergy.org/                                                                                                        |
| Celiac Disease Foundation                        | Module 3     | Educational use                            | https://celiac.org/                                                                                                                 |
| USDA FoodData Central (SR Legacy)                | Module 4     | Public domain (US government)              | https://fdc.nal.usda.gov/                                                                                                           |
| FDA Big 9 Allergen List (FASTER Act 2021/2023)   | Module 3     | Public domain                              | https://www.fda.gov/food/food-allergies/food-allergen-labeling-and-consumer-protection-act-2004-falcpa                              |

All primary data sources are US government publications (public domain) or established non-profit educational resources. No proprietary databases. No subscription APIs.

---

## Architecture

### Static-First, Database Later

All four modules start as static JSON seed files in `lib/reference/data/`. No database tables in Phase 1. This keeps the initial build simple, testable, and free from migration risk.

Database tables are added in Phase 2+ only when:

- AI-generated substitution rules need persistence (Module 2)
- Full USDA nutrition dataset exceeds practical JSON size (Module 4)
- Chef-approved or admin-curated additions need multi-tenant storage

### File Layout

```
lib/reference/
  data/
    food-safety.json           # Module 1 seed data
    substitutions.json         # Module 2 curated rules
    dietary-conditions.json    # Module 3 condition cards
    usda-nutrition.json        # Module 4 top-500 USDA entries
  food-safety.ts               # search, lookup, type definitions
  substitutions.ts             # search by ingredient + reason, AI expansion stub
  dietary-conditions.ts        # lookup by slug, linked allergen tags
  nutrition.ts                 # ingredient lookup, recipe calculation
  types.ts                     # shared types across modules
```

### No New Routes (Phase 1)

Phase 1 exposes reference data through existing surfaces:

- Recipe view (safety temps, substitutions, nutrition)
- Event view (dietary summary, safety in prep timeline)
- Client profile (dietary condition links)
- Command palette (all four modules searchable)

Standalone reference pages (`/reference/food-safety`, `/reference/dietary-conditions`) are Phase 2, after the data proves useful in context.

### AI Policy

The substitution engine's AI expansion (Module 2, Phase 2) follows the algorithm-first principle:

1. Deterministic curated data always takes priority over AI suggestions.
2. AI suggestions are always labeled as such and carry `confidence: 'experimental'`.
3. A chef must explicitly approve an AI suggestion before it enters the curated database.
4. AI never auto-approves substitutions for allergy-tier (red) restrictions. Those require curated, verified rules only.
5. Uses local Ollama only. No external AI APIs.

---

## Build Phases

### Phase 1: Static Reference Data

Deliverables:

- Seed all four JSON data files with initial content.
- Build search/lookup helpers for each module.
- Integrate food safety temps into recipe protein ingredient display.
- Integrate substitution suggestions into recipe editor (curated rules only).
- Link dietary condition cards from client dietary profiles.
- Add recipe-level nutrition calculator with coverage reporting and disclaimer.
- Command palette entries for all four modules.

Acceptance:

- Chef can search "chicken temp" and get 165F with FDA source.
- Chef can ask "substitute for almond flour, nut allergy" and get relevant options.
- Chef can view "celiac" reference card from a client's dietary profile.
- Chef can see approximate macros for a recipe with coverage percentage.
- All data displays its source.
- Nutrition always shows disclaimer.

### Phase 2: Expansion and Integration

Deliverables:

- Expand food safety to cover 50+ items (all common proteins, produce, dairy, prepared foods).
- Expand substitutions to ~500 curated rules.
- Import full USDA SR Legacy dataset (~7,700 foods) into database table.
- Link nutrition entries to ontology ingredient forms.
- Add AI-assisted substitution expansion via Ollama.
- Add standalone reference pages.
- Wire nutrition data to menu-level summary.

### Phase 3: Intelligence Layer

Deliverables:

- Auto-detect recipe/allergy conflicts and proactively suggest substitutions.
- CIL signal: "Recipe X contains allergen for guest Y; substitution available."
- Remy can answer "What's the safe temp for pork?" from the reference data.
- Nutrition comparison: "This menu has 2400 cal/person; client requested 1800."

---

## Files Likely Touched

| Area            | Files                                                                                |
| --------------- | ------------------------------------------------------------------------------------ |
| Reference data  | `lib/reference/data/food-safety.json` (new)                                          |
| Reference data  | `lib/reference/data/substitutions.json` (new)                                        |
| Reference data  | `lib/reference/data/dietary-conditions.json` (new)                                   |
| Reference data  | `lib/reference/data/usda-nutrition.json` (new)                                       |
| Service layer   | `lib/reference/food-safety.ts` (new)                                                 |
| Service layer   | `lib/reference/substitutions.ts` (new)                                               |
| Service layer   | `lib/reference/dietary-conditions.ts` (new)                                          |
| Service layer   | `lib/reference/nutrition.ts` (new)                                                   |
| Service layer   | `lib/reference/types.ts` (new)                                                       |
| Recipe view     | `app/(chef)/recipes/[id]/page.tsx` (extend with safety, substitution, nutrition)     |
| Event view      | `components/events/dietary-summary-panel.tsx` (extend with condition card links)     |
| Client profile  | `components/clients/dietary-profile.tsx` or equivalent (extend with condition links) |
| Command palette | `lib/commands/` (add reference search commands)                                      |
| Tests           | `tests/unit/reference-food-safety.test.ts` (new)                                     |
| Tests           | `tests/unit/reference-substitutions.test.ts` (new)                                   |
| Tests           | `tests/unit/reference-nutrition.test.ts` (new)                                       |

---

## Verification

- [ ] Food safety search returns correct FDA temps for all common proteins
- [ ] Sous vide time-at-temp table is accessible from recipe view
- [ ] Every food safety entry cites its source
- [ ] Substitution engine returns relevant swaps for each of the Big 9 allergens
- [ ] Substitution results include ratio, behavior notes, and limitations
- [ ] Substitution engine filters results by reason (allergy vs cost vs availability)
- [ ] AI-suggested substitutions are labeled and never auto-approved
- [ ] AI substitutions for allergy-tier restrictions are blocked (curated only)
- [ ] Dietary condition cards cover all Big 9 allergens plus common intolerances
- [ ] Dietary condition cards include avoid list, safe alternatives, common mistakes, and client questions
- [ ] Condition cards link to allergy severity tier classification
- [ ] Condition cards link to substitution engine for safe alternatives
- [ ] Recipe nutrition calculator sums ingredient macros correctly
- [ ] Recipe nutrition shows coverage percentage (what % of ingredients had data)
- [ ] Recipe nutrition shows missing ingredients by name
- [ ] Nutrition disclaimer is always visible and cannot be hidden
- [ ] Nutritional values cite USDA FoodData Central
- [ ] All four modules are searchable via command palette
- [ ] No module requires a new top-level nav item
- [ ] Static data loads from JSON seed files without database dependency

---

## Risks

| Risk                                                             | Mitigation                                                                                                         |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Scope creep into nutrition app                                   | Disclaimer is mandatory. Approximate only. Never claim medical accuracy.                                           |
| Substitution engine giving dangerous advice for severe allergies | AI suggestions blocked for allergy-tier. Curated-only for life-threatening conditions. Always show limitations.    |
| Stale food safety data                                           | Source URLs and lastVerified dates. Annual manual review. FDA rarely updates.                                      |
| USDA data import size                                            | Phase 1 is top-500 JSON only. Full import is Phase 2 with database table.                                          |
| Nutritional accuracy expectations                                | Disclaimer on every display. Coverage percentage makes gaps visible.                                               |
| Overlap with ontology substitution groups                        | This spec owns the rules (reasons, ratios, behavior notes). Ontology owns the ingredient identity. Clear boundary. |
