# Spec: Global Culinary Ingredient Ontology

> **Status:** draft
> **Priority:** P0 foundation
> **Depends on:** `docs/specs/nationwide-ingredient-catalog.md`, `docs/specs/openclaw-reference-libraries.md`, `docs/specs/pie-national-vision.md`
> **Estimated complexity:** large
> **Created:** 2026-05-20

---

## What This Does

Builds the missing parent layer above `system_ingredients`, OpenClaw, and PIE: a canonical culinary ingredient ontology that represents the global universe of ingredients in both raw and non-raw forms.

The goal is not a flat grocery list. The goal is a graph:

```text
tomato
  -> tomato fruit
    -> fresh raw tomato
    -> canned whole tomato
    -> diced tomato
    -> tomato puree
    -> tomato paste
    -> sun-dried tomato
    -> tomato powder
    -> tomato water
    -> tomato oil
```

PIE prices the graph. OpenClaw observes store products and maps them into the graph. Recipes, menus, shopping, nutrition, yield, substitutions, allergies, cultural search, and ingredient knowledge all read from the same graph.

---

## Why It Matters

ChefFlow currently has several ingredient systems that solve adjacent problems:

- `system_ingredients` gives ChefFlow a canonical ingredient dictionary.
- OpenClaw captures product/catalog/price evidence.
- PIE resolves ingredient prices and confidence.
- Reference libraries provide yield, shelf life, seasonality, and store accuracy.
- Recipe and lifecycle systems track quantities, yield, purchasing, usage, and leftovers.

Those systems still need a shared definition of what an ingredient actually is.

Without this ontology, ChefFlow can confuse:

- raw tomato vs tomato paste
- wheat berry vs flour vs bread crumbs
- raw chicken breast vs cooked pulled chicken
- milk vs cream vs butter vs ghee
- cacao bean vs cocoa powder vs chocolate
- rice grain vs rice flour vs cooked rice
- fresh basil vs dried basil vs basil oil

For chefs, those are not interchangeable. They differ in price, yield, storage, nutrition, allergies, prep, substitution behavior, vendor availability, and menu meaning.

---

## Core Principle

Do not ask "is this ingredient raw?"

Ask:

1. What source material is this?
2. What edible part is used?
3. What culinary form is it in?
4. What transformations produced it?
5. Can it be priced, purchased, substituted, scaled, stored, and used in a recipe as this exact form?

Raw is one form state. Non-raw is a family of transformation states.

---

## Scope

### In Scope

- Raw biological ingredients: plants, animals, fungi, algae, microbes.
- Edible parts: leaves, roots, bulbs, seeds, fruits, flowers, bark, muscle, fat, bones, blood, roe, organs, shells where culinary.
- Culinary forms: fresh, frozen, dried, cooked, roasted, toasted, smoked, cured, fermented, pickled, canned, milled, powdered, extracted, rendered, clarified, distilled, pressed, sprouted, cultured, concentrated.
- Derived ingredients: flour, starch, oil, vinegar, stock, gelatin, rennet, whey, molasses, syrup, extract, paste, puree, flakes, granules.
- Culinary bases that function as ingredients: dashi, demi-glace, sofrito, curry paste, mirepoix, chili crisp, mole paste, garum, fish sauce, miso.
- Food-grade minerals, additives, and processing aids: salt, baking soda, citric acid, lecithin, pectin, agar, xanthan gum.
- Regional and cultural aliases, including non-English names where they are commonly used in cooking.
- Product/SKU mappings from OpenClaw to canonical ingredient forms.
- Form-level links to PIE price resolution and proof.
- Candidate records for unresolved ingredient strings seen in recipes, receipts, vendor catalogs, or store data.

### Out of Scope

- Finished dishes as menu items unless commonly used as an ingredient in other cooking.
- Branded snack/retail products as canonical ingredients. These map to ingredient forms or product observations.
- Medicines, supplements, cosmetics, non-food chemicals, and unsafe/non-culinary materials.
- Claims that the ontology is literally complete. The system must expose coverage and unresolved candidates honestly.
- Recipe generation. The ontology describes ingredients; it does not invent recipes.

---

## Definitions

| Term                | Meaning                                                         | Example                                      |
| ------------------- | --------------------------------------------------------------- | -------------------------------------------- |
| Source material     | The biological, mineral, microbial, or manufactured root entity | chicken, tomato, wheat, salt                 |
| Edible part         | The part used culinarily                                        | thigh, fruit, berry, leaf, seed              |
| Ingredient form     | A purchasable or usable culinary state                          | raw chicken thigh, tomato paste, wheat flour |
| Transformation      | A process that changes form                                     | dried, fermented, milled, smoked             |
| Product observation | A store/vendor/SKU instance mapped to a form                    | 28 oz can San Marzano tomatoes               |
| Alias               | Search/cultural/vendor name for an entity or form               | aubergine, eggplant, brinjal                 |
| Candidate           | Unresolved ingredient string awaiting review                    | "green mango powder" from receipt OCR        |

---

## Canonical Model

### Layer 1: Source Material

Represents the broad thing before culinary specialization.

Examples:

- tomato
- chicken
- wheat
- milk
- cacao
- oyster mushroom
- sugarcane
- salt

Source material should carry stable facts:

- source class: plant, animal, fungi, algae, microbial, mineral, synthetic food-grade
- scientific name when applicable
- broad category
- allergen flags
- diet flags
- external references
- primary aliases

### Layer 2: Edible Part

Represents the part of the source material.

Examples:

- chicken breast
- chicken thigh
- chicken liver
- tomato fruit
- beet root
- beet greens
- wheat berry
- cacao bean
- milk fat

Some source materials have only one default edible part. Others have many.

### Layer 3: Ingredient Form

Represents the actual culinary ingredient a chef can search, buy, price, store, or use.

Examples:

- fresh raw tomato
- canned diced tomato
- tomato paste
- sun-dried tomato
- raw chicken breast, boneless skinless
- cooked shredded chicken
- all-purpose flour
- whole wheat flour
- butter
- ghee
- cocoa powder
- dark chocolate

Ingredient form is the primary bridge to PIE.

### Layer 4: Product Observation

Represents a real product, vendor catalog row, receipt line, or store SKU.

Examples:

- "Muir Glen Organic Tomato Paste, 6 oz"
- "Whole Foods Boneless Skinless Chicken Breast, $5.99/lb"
- "Bob's Red Mill Whole Wheat Flour, 5 lb"

Product observations are not canonical ontology nodes by default. They map to one or more ingredient forms with confidence.

---

## Raw And Non-Raw Classification

`raw` must not be a single boolean. Use a multi-value state model.

### Form State Fields

| Field                 | Purpose                                                            | Example                                                                            |
| --------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| `raw_state`           | Whether the form is raw, cooked, mixed, not applicable, or unknown | `raw`, `cooked`, `mixed`, `not_applicable`, `unknown`                              |
| `preservation_state`  | Preservation method                                                | `fresh`, `frozen`, `dried`, `canned`, `pickled`, `cured`, `smoked`                 |
| `processing_state`    | Physical processing                                                | `whole`, `cut`, `ground`, `milled`, `powdered`, `pressed`, `extracted`, `rendered` |
| `fermentation_state`  | Fermentation/culture status                                        | `unfermented`, `fermented`, `cultured`, `aged`                                     |
| `concentration_state` | Water/solids concentration                                         | `standard`, `reduced`, `concentrated`, `dehydrated`                                |
| `composite_state`     | Whether this is one ingredient or a blend/base                     | `single_source`, `compound`, `prepared_base`                                       |

Examples:

| Form                | raw_state      | preservation_state | processing_state   | fermentation_state |
| ------------------- | -------------- | ------------------ | ------------------ | ------------------ |
| fresh tomato        | raw            | fresh              | whole              | unfermented        |
| canned diced tomato | cooked         | canned             | cut                | unfermented        |
| tomato paste        | cooked         | canned             | pureed             | unfermented        |
| sun-dried tomato    | raw or cooked  | dried              | whole/cut          | unfermented        |
| miso                | not_applicable | preserved          | paste              | fermented          |
| cocoa powder        | not_applicable | dried              | powdered           | fermented          |
| ghee                | cooked         | shelf_stable       | clarified/rendered | unfermented        |

The system must allow uncertainty. If the source does not prove whether a dried ingredient was heat-treated, store `unknown` rather than inventing certainty.

---

## Data Model

This spec extends the current `system_ingredients` model instead of replacing it immediately.

### New Tables

```sql
CREATE TABLE culinary_source_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name text NOT NULL,
  slug text NOT NULL UNIQUE,
  source_class text NOT NULL,
  scientific_name text,
  taxonomy_rank text,
  parent_source_material_id uuid REFERENCES culinary_source_materials(id),
  primary_category ingredient_category,
  allergen_tags text[] DEFAULT '{}',
  diet_flags text[] DEFAULT '{}',
  external_refs jsonb DEFAULT '{}'::jsonb,
  aliases text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE culinary_ingredient_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_material_id uuid NOT NULL REFERENCES culinary_source_materials(id) ON DELETE CASCADE,
  canonical_name text NOT NULL,
  slug text NOT NULL UNIQUE,
  part_type text NOT NULL,
  edible_role text,
  default_yield_pct numeric(5,2),
  aliases text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE culinary_ingredient_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_material_id uuid REFERENCES culinary_source_materials(id) ON DELETE SET NULL,
  ingredient_part_id uuid REFERENCES culinary_ingredient_parts(id) ON DELETE SET NULL,
  system_ingredient_id uuid REFERENCES system_ingredients(id) ON DELETE SET NULL,
  canonical_name text NOT NULL,
  slug text NOT NULL UNIQUE,
  raw_state text NOT NULL DEFAULT 'unknown',
  preservation_state text NOT NULL DEFAULT 'unknown',
  processing_state text NOT NULL DEFAULT 'whole',
  fermentation_state text NOT NULL DEFAULT 'unfermented',
  concentration_state text NOT NULL DEFAULT 'standard',
  composite_state text NOT NULL DEFAULT 'single_source',
  standard_unit text,
  unit_type text,
  density_g_per_ml numeric,
  default_yield_pct numeric(5,2),
  priceable boolean DEFAULT true,
  purchasable boolean DEFAULT true,
  recipe_usable boolean DEFAULT true,
  aliases text[] DEFAULT '{}',
  external_refs jsonb DEFAULT '{}'::jsonb,
  source_quality text NOT NULL DEFAULT 'seeded',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE culinary_form_transformations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_form_id uuid REFERENCES culinary_ingredient_forms(id) ON DELETE CASCADE,
  to_form_id uuid NOT NULL REFERENCES culinary_ingredient_forms(id) ON DELETE CASCADE,
  transformation text NOT NULL,
  yield_pct numeric(5,2),
  notes text,
  source text,
  confidence numeric(3,2),
  created_at timestamptz DEFAULT now(),
  UNIQUE (from_form_id, to_form_id, transformation)
);

CREATE TABLE culinary_ingredient_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  alias text NOT NULL,
  normalized_alias text NOT NULL,
  language_code text,
  cuisine_context text,
  region_context text,
  source text,
  confidence numeric(3,2) DEFAULT 1.0,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX idx_culinary_alias_unique
  ON culinary_ingredient_aliases (
    target_type,
    target_id,
    normalized_alias,
    coalesce(language_code, '')
  );

CREATE TABLE culinary_product_form_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES chefs(id) ON DELETE CASCADE,
  privacy_scope text NOT NULL DEFAULT 'global',
  product_source text NOT NULL,
  product_external_id text,
  product_name text NOT NULL,
  product_payload jsonb DEFAULT '{}'::jsonb,
  ingredient_form_id uuid REFERENCES culinary_ingredient_forms(id) ON DELETE SET NULL,
  match_confidence numeric(3,2) NOT NULL DEFAULT 0,
  match_reason text,
  needs_review boolean DEFAULT false,
  observed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE culinary_ingredient_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES chefs(id) ON DELETE CASCADE,
  privacy_scope text NOT NULL DEFAULT 'tenant_private',
  raw_text text NOT NULL,
  normalized_text text NOT NULL,
  source_context text NOT NULL,
  source_entity_type text,
  source_entity_id uuid,
  source_payload jsonb DEFAULT '{}'::jsonb,
  proposed_form_id uuid REFERENCES culinary_ingredient_forms(id) ON DELETE SET NULL,
  proposed_source_material_id uuid REFERENCES culinary_source_materials(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'unreviewed',
  reviewer_notes text,
  first_seen_at timestamptz DEFAULT now(),
  last_seen_at timestamptz DEFAULT now(),
  seen_count integer DEFAULT 1,
  UNIQUE (tenant_id, normalized_text, source_context)
);

CREATE TABLE culinary_form_redirects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_form_id uuid NOT NULL REFERENCES culinary_ingredient_forms(id) ON DELETE CASCADE,
  to_form_id uuid NOT NULL REFERENCES culinary_ingredient_forms(id) ON DELETE CASCADE,
  redirect_reason text NOT NULL,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  UNIQUE (from_form_id, to_form_id)
);

CREATE TABLE culinary_ontology_review_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_role text NOT NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  previous_state jsonb DEFAULT '{}'::jsonb,
  new_state jsonb DEFAULT '{}'::jsonb,
  reason text,
  downstream_impact jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);
```

### Required Indexes And Constraints

```sql
CREATE INDEX idx_culinary_forms_source_material
  ON culinary_ingredient_forms(source_material_id);

CREATE INDEX idx_culinary_forms_system_ingredient
  ON culinary_ingredient_forms(system_ingredient_id)
  WHERE system_ingredient_id IS NOT NULL;

CREATE INDEX idx_culinary_forms_state
  ON culinary_ingredient_forms(raw_state, preservation_state, processing_state, fermentation_state);

CREATE INDEX idx_culinary_forms_aliases
  ON culinary_ingredient_forms USING gin(aliases);

CREATE INDEX idx_culinary_candidates_status
  ON culinary_ingredient_candidates(status, last_seen_at DESC);

CREATE INDEX idx_culinary_candidates_tenant_status
  ON culinary_ingredient_candidates(tenant_id, status, last_seen_at DESC)
  WHERE tenant_id IS NOT NULL;

CREATE INDEX idx_culinary_product_mappings_review
  ON culinary_product_form_mappings(needs_review, match_confidence, updated_at DESC);

CREATE INDEX idx_culinary_form_redirects_from
  ON culinary_form_redirects(from_form_id);

CREATE INDEX idx_culinary_review_events_target
  ON culinary_ontology_review_events(target_type, target_id, created_at DESC);

CREATE INDEX idx_culinary_review_events_action
  ON culinary_ontology_review_events(action, created_at DESC);

ALTER TABLE culinary_product_form_mappings
  ADD CONSTRAINT culinary_product_form_mappings_privacy_scope_check
  CHECK (privacy_scope IN ('global', 'tenant_private', 'aggregate_only'));

ALTER TABLE culinary_ingredient_candidates
  ADD CONSTRAINT culinary_ingredient_candidates_privacy_scope_check
  CHECK (privacy_scope IN ('tenant_private', 'aggregate_only', 'global_candidate'));

ALTER TABLE culinary_ingredient_candidates
  ADD CONSTRAINT culinary_ingredient_candidates_status_check
  CHECK (status IN (
    'unreviewed',
    'matched_existing_form',
    'approved_new_form',
    'approved_new_source_material',
    'rejected_non_ingredient',
    'blocked_needs_source',
    'merged_duplicate'
  ));

ALTER TABLE culinary_ontology_review_events
  ADD CONSTRAINT culinary_ontology_review_events_actor_role_check
  CHECK (actor_role IN ('admin', 'system', 'migration', 'chef_request'));
```

### Compatibility With `system_ingredients`

During migration, `system_ingredients` remains the compatibility anchor.

Rules:

- Every existing `system_ingredients` row should map to one best `culinary_ingredient_forms` row.
- New systems should prefer `culinary_ingredient_forms.id`.
- Old recipe, pricing, and inventory paths can continue using `system_ingredient_id` until migrated.
- PIE must resolve prices at the form level when a form ID is available.
- If only a legacy ingredient ID is available, PIE maps through the best active form.

### Candidate Privacy Rules

Candidates are not automatically global knowledge. The same raw text can come from a private client recipe, a receipt, a vendor catalog, or a public store scrape.

Rules:

- Tenant recipe, receipt, vendor, and inventory candidates default to `tenant_private`.
- Public OpenClaw catalog candidates may be `global_candidate` if they contain no tenant data.
- Receipt-derived candidates may contribute to aggregate coverage metrics only after anonymization.
- Admin review must show privacy scope before any promotion to global ontology.
- Promotion from tenant-private candidate to global form must copy only the ingredient text and review decision, not tenant payload.

---

## Service Contracts

Keep the first implementation behind small deterministic helpers. Avoid spreading ontology decisions through UI components or pricing resolvers.

### Core Read Helpers

Likely file: `lib/culinary/ingredient-ontology.ts`

```typescript
type IngredientFormSearchInput = {
  query: string
  tenantId?: string
  includeInactive?: boolean
  limit?: number
}

type IngredientFormSearchResult = {
  formId: string
  canonicalName: string
  sourceMaterialName: string | null
  groupLabel: string
  rawState: string
  preservationState: string
  processingState: string
  matchKind: 'exact' | 'alias' | 'fuzzy' | 'tenant_recent' | 'fallback'
  confidence: number
  pieAvailable: boolean
}

async function searchIngredientForms(
  input: IngredientFormSearchInput
): Promise<IngredientFormSearchResult[]>
async function getIngredientForm(formId: string): Promise<IngredientFormDetail | null>
async function resolveLegacySystemIngredient(systemIngredientId: string): Promise<string | null>
async function resolveRedirectedForm(formId: string): Promise<string>
```

### Candidate Write Helpers

Likely file: `lib/culinary/ingredient-candidates.ts`

```typescript
type CaptureIngredientCandidateInput = {
  tenantId?: string
  rawText: string
  sourceContext:
    | 'recipe'
    | 'receipt'
    | 'vendor_catalog'
    | 'openclaw_product'
    | 'inventory'
    | 'manual_search'
  sourceEntityType?: string
  sourceEntityId?: string
  sourcePayload?: Record<string, unknown>
  privacyScope: 'tenant_private' | 'aggregate_only' | 'global_candidate'
}

async function captureIngredientCandidate(
  input: CaptureIngredientCandidateInput
): Promise<{ candidateId: string }>
async function listCandidateReviewQueue(input: ReviewQueueInput): Promise<CandidateReviewItem[]>
```

Candidate capture must be idempotent by `(tenant_id, normalized_text, source_context)`, increment `seen_count`, and update `last_seen_at`.

### Admin Review Helpers

Likely file: `lib/admin/culinary-ontology-actions.ts`

All admin mutation helpers must call `requireAdmin()`.

```typescript
async function approveCandidateAsExistingForm(
  candidateId: string,
  formId: string,
  reason: string
): Promise<void>
async function approveCandidateAsNewForm(
  candidateId: string,
  input: NewFormInput,
  reason: string
): Promise<{ formId: string }>
async function rejectCandidate(candidateId: string, reason: string): Promise<void>
async function mergeIngredientForms(
  sourceFormId: string,
  targetFormId: string,
  reason: string
): Promise<void>
async function splitIngredientForm(
  formId: string,
  replacements: NewFormInput[],
  reason: string
): Promise<{ formIds: string[] }>
async function reviewProductFormMapping(
  mappingId: string,
  decision: MappingReviewDecision
): Promise<void>
```

Every mutation must write `culinary_ontology_review_events`.

### PIE Adapter Helpers

Likely file: `lib/pricing/ingredient-form-price-target.ts`

```typescript
async function buildBuyablePriceTarget(input: {
  ingredientFormId?: string
  systemIngredientId?: string
  rawIngredientText?: string
  tenantId?: string
}): Promise<BuyablePriceTarget>
```

This helper owns exact-form vs fallback labeling so pricing surfaces do not hand-roll their own interpretation.

---

## File Ownership For First Build

The first build should own only the following areas:

| Area                  | Files                                                                                         |
| --------------------- | --------------------------------------------------------------------------------------------- |
| Migration             | `database/migrations/*_culinary_ingredient_ontology.sql`                                      |
| Schema types          | `lib/db/schema/schema.ts`, generated DB types if this repo regenerates them                   |
| Ontology read helpers | `lib/culinary/ingredient-ontology.ts`                                                         |
| Candidate helpers     | `lib/culinary/ingredient-candidates.ts`                                                       |
| PIE adapter           | `lib/pricing/ingredient-form-price-target.ts`                                                 |
| Tests                 | `tests/unit/ingredient-ontology*.test.ts`, `tests/unit/ingredient-form-price-target*.test.ts` |
| Spec/proof            | `docs/specs/global-culinary-ingredient-ontology.md`, implementation proof note if queue-fired |

Avoid touching recipe UI, OpenClaw scrapers, admin pages, command palette, or dashboard in the first batch unless the queue item explicitly expands scope.

---

## Import And Expansion Sources

Use sources as evidence, not as a single truth source.

Priority order:

1. Existing `system_ingredients`.
2. USDA FoodData Central / SR Legacy records already used by ChefFlow.
3. Existing OpenClaw canonical ingredients and product observations.
4. Receipt OCR and vendor catalog unmatched ingredient strings.
5. Existing ChefFlow recipe ingredients and menu components.
6. Public knowledge links already present in ingredient knowledge work.
7. Supplemental cuisine-specific seed lists curated by humans.

Every imported row must carry source metadata. The system must distinguish:

- verified canonical form
- seeded but unverified form
- inferred transformation
- observed product mapping
- candidate requiring review

---

## Normalization Rules

### Do Not Collapse When Meaning Changes

Keep separate forms when any of these differ materially:

- price
- unit behavior
- yield
- storage
- nutrition
- allergen or diet status
- prep method
- substitution behavior
- culinary usage
- purchasing source

Examples:

- raw chicken breast and cooked chicken breast are separate.
- fresh basil and dried basil are separate.
- tomato puree and tomato paste are separate.
- all-purpose flour and bread flour are separate.
- whole milk and heavy cream are separate.

### Collapse When Difference Is Only Labeling

Merge aliases when the culinary object is the same:

- eggplant, aubergine, brinjal
- cilantro leaf, coriander leaf
- garbanzo bean, chickpea

Keep regional alias metadata rather than creating duplicate forms.

### Product Variants Are Not Automatically Forms

Organic, brand, package size, and store-specific variants usually remain product observations mapped to the same form.

Create a separate form only when the variant changes culinary behavior:

- salted vs unsalted butter
- sweetened vs unsweetened condensed milk
- natural cocoa vs Dutch-process cocoa
- refined vs extra virgin olive oil
- gelatin sheets vs powdered gelatin

---

## PIE Integration

PIE must treat the ingredient form as the price target.

### Required PIE Contract Extension

`BuyablePriceContract` should eventually accept:

```typescript
type BuyablePriceTarget = {
  ingredientFormId?: string
  systemIngredientId?: string
  rawIngredientText?: string
  requestedFormState?: {
    rawState?: string
    preservationState?: string
    processingState?: string
    fermentationState?: string
  }
}
```

Resolution order:

1. exact `ingredientFormId`
2. mapped `systemIngredientId -> ingredientFormId`
3. alias match to form
4. source material + requested form state
5. candidate creation
6. no trusted price

### PIE Must Not

- Price tomato paste using fresh tomato unless explicitly marked as fallback.
- Price cooked chicken using raw chicken unless yield/cooking conversion exists.
- Hide form uncertainty behind high confidence.
- Claim shopping-safe proof without product/store/timestamp/form match.

### PIE Should

- Show when a price is for a parent/source material rather than the exact form.
- Surface cheaper or safer substitutions at the form level.
- Use form transformations for cost conversion only when a verified yield/conversion exists.
- Feed unresolved product names into `culinary_ingredient_candidates`.

---

## OpenClaw Integration

OpenClaw product captures map into `culinary_product_form_mappings`.

Product mapping examples:

| Product Name                                | Form Mapping                         |
| ------------------------------------------- | ------------------------------------ |
| "Roma Tomatoes, lb"                         | fresh raw tomato                     |
| "San Marzano Tomatoes, Whole Peeled, 28 oz" | canned whole peeled tomato           |
| "Tomato Paste, 6 oz"                        | tomato paste                         |
| "Chicken Breast Boneless Skinless, lb"      | raw chicken breast boneless skinless |
| "Rotisserie Chicken, each"                  | cooked whole chicken                 |

Mapping confidence must drop when:

- product name contains ambiguous preparation words
- package unit cannot be normalized
- product is a blend
- brand line does not expose enough detail
- multiple forms are plausible

Low-confidence mappings require review before they are used as high-trust PIE proof.

---

## Search And UX Requirements

### Search Behavior

Searching any alias should return the best canonical forms grouped by meaning.

Example search: `tomato`

Expected groups:

- Fresh/raw: fresh tomato, cherry tomato, Roma tomato
- Canned/preserved: canned whole tomato, canned diced tomato
- Concentrated: tomato paste, tomato puree
- Dried/powdered: sun-dried tomato, tomato powder
- Derived: tomato juice, tomato water

### Admin Review Surface

Create an operator-only review surface for unresolved candidates and low-confidence mappings.

Required actions:

- approve candidate as new source material
- approve candidate as new form
- attach candidate to existing form
- mark candidate as non-ingredient
- merge aliases
- split incorrect form
- review product-to-form mappings
- see PIE impact before approval

Admin routes must call `requireAdmin()` at runtime.

### Chef-Facing Surfaces

Chef-facing forms should not expose ontology complexity by default. They should expose useful distinctions:

- "Fresh tomato"
- "Canned diced tomato"
- "Tomato paste"
- "Sun-dried tomato"

Advanced detail can show:

- raw/cooked state
- preservation method
- source material
- yield
- PIE confidence
- substitution group

---

## Action Surface

The ontology should not be a hidden data project. It needs clear surfaces where users and operators can act on uncertainty.

### Chef Recipe Search

When a chef searches for an ingredient in recipe creation, menu planning, prep, shopping, or inventory:

- Show exact form matches first.
- Group ambiguous matches by culinary meaning.
- Label high-impact distinctions plainly: fresh, canned, dried, paste, cooked, raw, fermented.
- Let the chef choose a form without learning ontology terms.
- Offer "Use anyway" only when the chosen string can be saved as a tenant-private candidate.
- Preserve the original typed text for audit and future mapping.

Primary actions:

- Select form.
- Save as custom ingredient.
- Request review when no match exists.
- View price proof when PIE has data.
- Switch form when the price or recipe meaning looks wrong.

### Admin Ontology Review

Admin review is the operational workbench for keeping the ontology honest.

Required queues:

- Unreviewed candidates.
- Low-confidence product mappings.
- High-impact PIE fallbacks where parent/source pricing is being used often.
- Suspected duplicate forms.
- Forms with no price, no yield, no shelf life, or no aliases.

Required actions:

- Approve as existing form.
- Create new source material.
- Create new edible part.
- Create new ingredient form.
- Merge duplicate aliases.
- Split an over-broad form.
- Reject as non-ingredient.
- Mark blocked until source evidence exists.
- Promote anonymized tenant candidate to global form.
- Preview downstream PIE/search impact before saving.

Every admin action should create an audit row with actor, timestamp, previous state, new state, reason, and affected downstream systems.

### PIE Proof Surface

Wherever PIE shows a price for a form, the user must be able to inspect:

- exact form priced
- fallback form or parent, if any
- proof source
- freshness
- confidence
- missing proof
- recommended next action

Primary actions:

- Accept price.
- Refresh price.
- Mark price wrong.
- Switch ingredient form.
- Add receipt proof.
- Send mapping to admin review.

### Command Palette And Rail Hooks

The ontology should feed existing command and rail surfaces only when action is needed.

Useful command palette entries:

- Search ingredient forms.
- Review unresolved ingredient candidates.
- Open PIE proof for selected ingredient.
- Compare forms for costing.

Useful rail signals:

- "Ingredient needs review" when a recipe/menu uses an unresolved candidate.
- "PIE fallback pricing" when an event/menu relies on parent-form pricing.
- "High-value ontology gap" when a frequently used candidate has no global form.

Do not add a generic "Ontology" nav item for chefs. Chef-facing entry points should appear inside recipes, menus, shopping, inventory, and pricing where the decision happens.

---

## Workflow States

### First Use

1. Chef types or imports an ingredient.
2. Search returns grouped form choices.
3. Chef selects a form or saves the typed string as tenant-private candidate.
4. PIE prices the selected form when possible.
5. Missing form or price proof is visible, not hidden.

### Repeat Use

1. Previously selected forms appear first for the chef.
2. Tenant aliases improve matching.
3. PIE proof, yield, shelf life, and substitutions attach automatically when global data exists.
4. If a form was merged or split by admin review, legacy references continue to resolve through compatibility mapping.

### Empty State

When no form matches:

- Save the raw text as a tenant-private candidate.
- Tell the chef the ingredient can still be used, but global pricing/proof may be unavailable.
- Offer the closest safe search alternatives only as suggestions, never auto-collapse.

### Stale Or Low-Confidence State

When form mapping exists but price/product proof is weak:

- Show the exact reason: missing product proof, stale price, parent fallback, low-confidence product mapping, or no local source.
- Keep the recipe usable.
- Prevent high-confidence shopping-safe claims.

### Success State

After a candidate is approved:

- The original recipe/inventory/vendor reference points to the approved form.
- PIE can attempt exact-form pricing.
- Search aliases improve for future use.
- The review action appears in audit history.

---

## Data Invariants

These invariants are mandatory for implementation.

1. A product observation can map to zero or one active canonical form at a time, plus historical mappings in audit.
2. A tenant-private candidate cannot become global without an explicit admin promotion action.
3. A form split must preserve redirects from old form IDs to replacement form IDs.
4. PIE confidence cannot exceed the product mapping confidence that feeds it.
5. A parent/source-material fallback must never be displayed as an exact-form price.
6. Search may rank by chef usage, but canonical identity must remain global and deterministic.
7. AI may suggest matches, aliases, or split candidates, but deterministic review writes canonical state.
8. Deactivating a form must leave recipes, inventory, and historical price proof readable.
9. Merge and split operations must create redirects or replacement mappings before deactivating any form.
10. Admin review writes must be atomic: state change and review event succeed together or fail together.
11. Candidate capture must never throw away the original raw text, even after successful matching.
12. Product payloads from private sources must not be copied into global ontology tables.

### Confidence Thresholds

| Match Confidence | Behavior                                                                    |
| ---------------- | --------------------------------------------------------------------------- |
| `>= 0.90`        | Can auto-map public product observations if no conflict exists              |
| `0.70 - 0.89`    | Can be used as medium-confidence suggestion; review for shopping-safe proof |
| `0.40 - 0.69`    | Candidate only; no exact PIE proof                                          |
| `< 0.40`         | Treat as unresolved candidate                                               |

Shopping-safe PIE proof requires exact form match, fresh timestamp, local/store proof, unit/package normalization, and source availability.

---

## Cut List For First Build

Skip these until the foundation is proven:

- Full global ingredient completion.
- Chef-facing form picker UI.
- Admin review workbench UI.
- OpenClaw scraper changes.
- Dashboard cards.
- Command palette entries.
- Remy explanations.
- Public ingredient encyclopedia rewrites.
- Bulk migration of all recipe and inventory rows to form IDs.
- Automated AI approval of canonical forms.

The first build should prove data model, backfill, deterministic search, candidate capture, redirects, audit events, and PIE target labeling with tests.

---

## Security And Tenant Rules

The ontology itself is platform-level reference data, but chef-created mappings and overrides are tenant data.

Rules:

- Global ontology read endpoints can be public only if they expose no tenant data.
- Candidate rows from tenant recipes, receipts, or vendor files must include tenant scoping if they contain tenant context.
- Admin review routes must use `requireAdmin()`.
- Chef overrides must use `requireChef()` and `.eq('tenant_id', user.tenantId!)`.
- Product observations from private receipts must not become public proof without anonymization and aggregation.

---

## Build Phases

### Recommended First Batch

The first implementation batch should be deliberately narrow:

1. Add the ontology tables, privacy scope, candidate status, indexes, and compatibility mapping.
2. Backfill one active form per existing `system_ingredients` row.
3. Seed only the tomato and chicken form families deeply enough to prove raw/non-raw behavior.
4. Add deterministic normalization tests and PIE exact-vs-fallback tests for those families.
5. Add candidate capture without a full admin UI.

This proves the model without dragging every recipe, inventory, shopping, and OpenClaw surface into the first build.

### Phase 0: Audit And Contract

Deliverables:

- Count current `system_ingredients` rows by category, source, alias coverage, and parent/form hints.
- Identify existing fields that already represent form state: `parent_id`, `yield_pct`, density, USDA IDs, aliases, knowledge refs.
- Produce a migration compatibility map.
- Add tests for normalization examples before schema work.

Acceptance:

- Current state is documented.
- No app behavior changes.
- Known duplicate/collapse risks are listed.

### Phase 1: Add Ontology Tables

Deliverables:

- Add additive migration for new ontology tables.
- Add indexes for slug, alias, source class, form states, and candidate status.
- Add read types and query helpers.
- Backfill one form per existing `system_ingredients` row.

Acceptance:

- Migration is additive.
- Existing routes continue working.
- Every active `system_ingredients` row has a compatible form mapping.

### Phase 2: Form Expansion Seed

Deliverables:

- Seed high-value transformation families.
- Add cuisine-specific aliases for common global ingredients.
- Add candidate generation for unmapped recipe/receipt/vendor strings.

Acceptance:

- Each family has source material, parts, forms, transformations, aliases, and sample product mappings.
- Raw and non-raw forms are both represented.
- Search can distinguish forms in each seeded family.

Seed order:

| Order | Family      | Why First                                                                      |
| ----- | ----------- | ------------------------------------------------------------------------------ |
| 1     | tomato      | Clear raw/canned/paste/puree/dried distinctions and common pricing mistakes    |
| 2     | chicken     | Raw/cooked/cut/bone/skin/yield distinctions matter directly to safety and cost |
| 3     | basil/herbs | Fresh vs dried vs oil proves high-risk substitution and unit behavior          |
| 4     | wheat       | Grain/flour/bread crumb/pasta forms prove derivative hierarchy                 |
| 5     | milk        | Milk/cream/butter/ghee/whey proves transformation and allergen continuity      |
| 6     | rice        | Raw/cooked/flour/noodle forms prove state and cuisine alias handling           |
| 7     | cacao       | Bean/powder/butter/chocolate proves processed derivative behavior              |
| 8     | alliums     | Onion/garlic/scallion/chive forms prove part and preservation complexity       |
| 9     | legumes     | Bean/chickpea/flour/canned/dried aliases prove global naming                   |
| 10    | mushrooms   | Fresh/dried/powdered/species-level distinctions prove fungi coverage           |

### Phase 3: Product Mapping And Candidate Review

Deliverables:

- Map OpenClaw product observations to ingredient forms.
- Add low-confidence review queue.
- Add candidate dedupe and seen-count tracking.
- Add admin review actions.

Acceptance:

- Product rows can be traced to form or candidate.
- Low-confidence mappings cannot silently become high-trust PIE proof.
- Admin can approve, merge, split, or reject candidates.

### Phase 4: PIE Form-Level Pricing

Deliverables:

- Extend price resolution inputs to accept `ingredientFormId`.
- Preserve legacy `systemIngredientId` fallback.
- Add proof labels that show exact form vs parent fallback.
- Add tests for tomato/fresh vs tomato paste, raw chicken vs cooked chicken, fresh basil vs dried basil.

Acceptance:

- PIE does not use parent/source prices as exact form prices without disclosure.
- Exact form proof can be shopping-safe.
- Parent fallback proof is labeled as fallback.

### Phase 5: Recipe And Ingredient Search Adoption

Deliverables:

- Update recipe ingredient search to prefer forms.
- Show grouped form choices when a query has multiple culinary meanings.
- Store selected form ID where available.
- Preserve legacy ingredient ID behavior.

Acceptance:

- Chef can add "tomato paste" without it collapsing to "tomato".
- Chef can add "fresh tomato" distinctly from "canned tomato".
- Legacy recipes remain readable and costable.

### Phase 6: Coverage And Quality Metrics

Deliverables:

- Ontology coverage dashboard.
- Metrics:
  - total source materials
  - total forms
  - forms with PIE price
  - forms with yield
  - forms with shelf life
  - forms with aliases
  - unresolved candidates
  - low-confidence product mappings
- Exportable gap report.

Acceptance:

- ChefFlow can honestly say what is covered and what is not.
- New candidates become measurable backlog, not invisible failures.

### Phase 7: Chef-Facing Adoption

Deliverables:

- Recipe ingredient picker stores form ID when selected.
- Ingredient detail page shows form identity, raw/non-raw state, yield, shelf life, and PIE proof.
- Menu and event costing expose exact-form fallback warnings.
- Shopping list generation preserves selected form and unit behavior.

Acceptance:

- A chef can select tomato paste and never have it silently collapse to tomato.
- A chef can see when an event uses fallback pricing because exact form pricing is missing.
- Existing legacy recipes still load and price through compatibility mapping.

---

## Test Matrix

### Must-Pass Examples

| Query                 | Expected Result                                                |
| --------------------- | -------------------------------------------------------------- |
| tomato                | Shows fresh, canned, paste, puree, dried, powder groups        |
| tomato paste          | Exact tomato paste form                                        |
| raw chicken breast    | Raw chicken breast form                                        |
| cooked chicken breast | Cooked chicken breast form                                     |
| basil                 | Fresh basil and dried basil are distinct                       |
| cocoa                 | Cacao bean, cocoa powder, cocoa butter, chocolate are distinct |
| chickpea              | Alias resolves with garbanzo bean                              |
| aubergine             | Alias resolves with eggplant                                   |
| dashi                 | Prepared base form, not generic ingredient collapse            |
| baking soda           | Food-grade additive/mineral form                               |

### Regression Tests

- Existing `system_ingredients` lookup still works.
- Recipe costing still resolves a price through legacy IDs.
- PIE fallback never shows `$0`.
- Candidate creation is idempotent.
- Admin-only review routes reject non-admin users.
- Tenant candidate data never leaks to public/global read endpoints.

### Deepened Feature Tests

| Test                                      | Proof                                                                                                                           |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Tenant-private candidate remains private  | Candidate created from tenant recipe has `tenant_id`, `privacy_scope = tenant_private`, and is absent from public/global search |
| Product mapping confidence caps PIE trust | A 0.60 mapping cannot produce high-confidence shopping-safe proof                                                               |
| Parent fallback is labeled                | Tomato paste request with only fresh tomato price returns fallback label and missing exact-form proof                           |
| Form split preserves history              | Legacy form ID redirects to replacement form IDs without breaking old recipe view                                               |
| Candidate promotion strips tenant payload | Promoted global form contains canonical text and review metadata, not receipt/vendor private payload                            |
| Search grouping is stable                 | `tomato` returns grouped forms in deterministic order across repeated searches                                                  |

---

## Acceptance Criteria

This spec is complete when:

1. ChefFlow has a canonical model for source material, edible part, ingredient form, transformation, alias, product observation, and candidate.
2. Raw and non-raw forms are represented as first-class states, not a boolean.
3. Existing `system_ingredients` rows map into the new form model without breaking current features.
4. PIE can price exact forms and honestly label fallback pricing.
5. OpenClaw product rows can map to forms with confidence and review status.
6. Unresolved ingredient strings become candidates instead of disappearing.
7. Search distinguishes materially different culinary forms.
8. The system can report ontology coverage and gaps.

---

## Risks

| Risk                   | Mitigation                                                                                      |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| Infinite scope         | Use candidates, coverage metrics, and phased high-value families instead of claiming completion |
| SKU explosion          | Keep branded/package/store variants as product observations unless culinary behavior changes    |
| Incorrect collapse     | Preserve split/merge review actions and tests for high-risk families                            |
| PIE trust regression   | Require exact-form proof labels and fallback disclosure                                         |
| Cultural bias          | Track aliases with cuisine/region/language context and review unresolved names                  |
| Tenant data leakage    | Separate global reference data from tenant recipe/receipt/vendor candidates                     |
| Migration blast radius | Keep `system_ingredients` compatibility until form IDs are adopted route by route               |

---

## Build Queue Draft

Title: Global Culinary Ingredient Ontology Foundation

Domain: Culinary / Ingredients / PIE / OpenClaw / Recipe Intelligence

Goal: Build the parent ingredient ontology that represents raw and non-raw culinary forms, maps existing `system_ingredients` into it, and lets PIE price exact forms with honest fallback proof.

Scope:

- Add ontology tables.
- Backfill existing ingredients into forms.
- Seed high-value raw/non-raw families.
- Add candidate capture for unresolved strings.
- Add product-to-form mapping confidence.
- Extend PIE form-level resolution.
- Add admin review and coverage metrics.

Out of scope:

- Full world completion in one build.
- Replacing all recipe/inventory schema references immediately.
- Public marketing claims of completeness.

Verification:

- Unit tests for normalization and form distinctions.
- Migration/backfill smoke.
- PIE exact-vs-fallback pricing tests.
- Admin auth checks.
- Candidate idempotency tests.
- Search tests for tomato, chicken, basil, cocoa, chickpea, aubergine, dashi, baking soda.

### Queue-Ready First Slice

Title: Global Culinary Ingredient Ontology - Foundation Slice

Raw request: "list every possible culinary ingredient in the world, raw form and not raw" and make ChefFlow/PIE able to represent that without collapsing meanings.

Goal: Add the minimal ontology foundation that can represent ingredient source materials, edible parts, forms, candidates, redirects, review events, and exact-form PIE targets while preserving existing `system_ingredients`.

User value: Chefs can eventually choose and price the actual ingredient form they mean, such as tomato paste versus fresh tomato, without ChefFlow silently treating them as the same thing.

Business value: Creates the ingredient identity layer needed for better PIE trust, menu costing, shopping proof, OpenClaw mapping, search quality, and future ingredient intelligence.

Scope:

- Add additive ontology migration.
- Add indexes, privacy scope checks, candidate status checks, redirects, and review events.
- Backfill one compatible form for every active `system_ingredients` row.
- Seed tomato and chicken form families.
- Add deterministic read/search/candidate helper contracts.
- Add PIE target adapter for exact form vs fallback labeling.
- Add unit tests for search grouping, candidate privacy, redirects, and PIE confidence/fallback behavior.

Out of scope:

- Chef-facing UI.
- Admin review UI.
- Full OpenClaw product remapping.
- Global completion.
- Bulk recipe/inventory schema migration.

Likely files/routes:

- `database/migrations/*_culinary_ingredient_ontology.sql`
- `lib/culinary/ingredient-ontology.ts`
- `lib/culinary/ingredient-candidates.ts`
- `lib/pricing/ingredient-form-price-target.ts`
- `tests/unit/ingredient-ontology*.test.ts`
- `tests/unit/ingredient-form-price-target*.test.ts`

Acceptance criteria:

- Existing active `system_ingredients` rows have one compatible active form.
- Tomato family distinguishes fresh raw tomato, canned tomato, tomato paste, puree, dried tomato, and tomato powder.
- Chicken family distinguishes raw/cooked and key cut states.
- Candidate capture is idempotent and privacy-scoped.
- Form redirects resolve old form IDs to active replacements.
- PIE target adapter labels exact form, legacy mapping, raw-text candidate, and parent fallback cases.
- Low-confidence product mapping cannot create shopping-safe proof.

Risks:

- Migration touches platform-level reference data.
- Poor backfill could create misleading exact-form identity.
- PIE trust could regress if fallback labeling is skipped.
- Tenant-private candidate payloads could leak if privacy scope is ignored.

Dependencies:

- Existing `system_ingredients` table.
- Existing PIE price contract.
- Existing auth/admin guard patterns.

Verification:

- Run focused unit tests for ontology helpers and PIE adapter.
- Run migration/backfill dry run or test database smoke.
- Inspect sample tomato/chicken rows.
- Prove candidate privacy and review audit rows with tests.
