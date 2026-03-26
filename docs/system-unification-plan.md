# ChefFlow V1: System Unification Plan

> Produced: 2026-03-26
> Purpose: Map the current system, identify fragmentation, and define a build-ready plan to close the operational loop.

---

## PART 1: CURRENT SYSTEM MAP

### 1.1 What Exists (Scale)

| Dimension                 | Count                                                         |
| ------------------------- | ------------------------------------------------------------- |
| Database tables           | ~270+                                                         |
| Database migrations       | 348                                                           |
| App pages (page.tsx)      | ~670                                                          |
| Server action files       | 926                                                           |
| Exported server functions | ~1,500+                                                       |
| AI parser files           | 20+                                                           |
| Route groups              | 8 (chef, client, public, admin, staff, partner, mobile, demo) |

### 1.2 Core Data Model (What's Canonical)

The system has a clean canonical core buried under feature sprawl:

```
Chef (tenant root)
├── Clients (CRM with full preference/household data)
├── Inquiries (multi-channel intake, 7-state FSM)
├── Events (8-state FSM, the central operational unit)
│   ├── Menu (4-state FSM: draft → shared → locked → archived)
│   │   ├── Dishes (courses, ordered by course_number)
│   │   │   └── Components (building blocks, optional recipe link)
│   │   │       └── Recipes (from Recipe Bible)
│   │   │           └── Recipe Ingredients → Ingredients (master list)
│   │   └── Menu State Transitions (immutable audit)
│   ├── Quotes (pricing proposals, immutable after acceptance)
│   ├── Ledger Entries (append-only, immutable financial truth)
│   ├── Expenses (cost tracking, receipt linkage)
│   ├── After-Action Reviews (post-event retrospective)
│   ├── Staff Assignments
│   ├── Guest List
│   └── Event State Transitions (immutable audit)
├── Recipes (independent Recipe Bible, reusable across menus)
├── Ingredients (master list with pricing)
├── Conversation Threads (unified messaging)
├── Staff Members
├── Calendar Entries
└── Documents
```

This core is **sound**. The schema is well-designed with immutability where it matters, proper tenant scoping, and clear foreign key relationships.

### 1.3 Core Loop Status

The system's backbone loop:

```
Input → Structure → Plan → Cost → Outputs → Execute → Capture → Learn → Improve
```

| Stage         | What Exists                                                      | Status                                                       |
| ------------- | ---------------------------------------------------------------- | ------------------------------------------------------------ |
| **Input**     | Inquiry intake (7 channels), brain dump, CSV import, receipt OCR | FUNCTIONAL but fragmented (20+ parsers, no unified pipeline) |
| **Structure** | Client, Event, Menu creation from inquiry                        | COMPLETE and connected                                       |
| **Plan**      | Menu → Dishes → Components → Recipes                             | COMPLETE chain                                               |
| **Cost**      | Ingredient → Recipe → Component → Dish → Menu cost               | COMPLETE (forward projection only)                           |
| **Outputs**   | Prep sheet, execution sheet, grocery list                        | PARTIAL (grocery incomplete, packing list missing)           |
| **Execute**   | Prep timeline, prep blocks, day-of mobile view                   | PARTIAL (2 timeline implementations, no service tracking)    |
| **Capture**   | AAR (ratings + notes), expense recording                         | FUNCTIONAL but disconnected                                  |
| **Learn**     | `times_cooked` counter increments                                | MINIMAL (counter only, no feedback integration)              |
| **Improve**   | Menu suggestions exist                                           | STATELESS (ignores history, ratings, past performance)       |

---

## PART 2: FRAGMENTATION ANALYSIS

### 2.1 Where the Loop Breaks

**Break Point 1: Estimated vs Actual Cost (the biggest gap)**

The system projects food cost before an event but has no mechanism to capture actual cost after. Receipts are imported but never reconciled against menu ingredients. The chef can't answer: "Did I spend what I estimated?"

- Expense table exists but is generic (category + amount), not linked to ingredients/recipes
- Receipt OCR extracts line items but they dead-end in storage
- AAR captures "forgotten items" as text, not linked to ingredients
- Ingredient `last_price_cents` is manually updated, never auto-updated from receipts

**Break Point 2: AAR Doesn't Feed the System**

After-Action Reviews capture valuable data (ratings, notes, forgotten items, menu performance) but none of it flows back:

- Low prep rating doesn't flag the menu/recipes as problematic
- Forgotten items don't update shopping lists
- Menu performance notes don't inform future suggestions
- Recipe timing estimates never update from actual experience

**Break Point 3: No Variant System**

Each variant of a dish is a completely separate recipe. A chef with 30 variations of chocolate lava cake has 30 independent records with no relationship between them. This creates:

- Maintenance burden (update base technique in 30 places)
- No inheritance (fix a step in one, others stay wrong)
- No comparison (which variant costs less? Which is faster?)

**Break Point 4: Ingestion is Scattered**

20+ parsers with no coordination:

- Multiple paths to create a client (parse-client, parse-brain-dump, CSV import, manual form)
- No deduplication across paths
- No unified "draft → approve → commit" pipeline
- CSV parsers duplicate tokenizer code

### 2.2 Duplication Map

| What's Duplicated       | Instance A                               | Instance B                             | Impact                                      |
| ----------------------- | ---------------------------------------- | -------------------------------------- | ------------------------------------------- |
| Grocery list generation | `lib/documents/generate-grocery-list.ts` | `lib/grocery/generate-grocery-list.ts` | Unclear which is canonical                  |
| Prep timeline           | `lib/events/prep-timeline.ts` (formula)  | `lib/ai/prep-timeline.ts` (Gemini)     | Two approaches, no clear selection criteria |
| CSV tokenizer           | `parse-csv-expenses.ts` lines 53-88      | `parse-csv-events.ts` lines 53-88      | Copy-paste code                             |
| Client creation         | `lib/clients/actions.ts`                 | `lib/ai/parse-client.ts` + brain dump  | Multiple entry points                       |
| Financial hub           | `/financials` page                       | `/finance/overview` page               | Two hub pages for same domain               |
| Settings profile        | `/settings/profile`                      | `/settings/my-profile`                 | Unclear distinction                         |
| Privacy policy          | `/privacy`                               | `/privacy-policy`                      | Duplicate public pages                      |

### 2.3 Feature Sprawl (Pages That Exist But May Not Be Connected)

The system has ~670 pages. Many are fully functional. Some are feature scaffolds that were built but never connected to the core loop:

- **Commerce/POS** (20 pages): Full restaurant point-of-sale system. Disconnected from event-based workflow.
- **Cannabis vertical** (14 pages): Specialized compliance module. Niche use case.
- **Loyalty program** (6 pages): Points/rewards system. Not connected to financial core.
- **Social media** (11 pages): Content creation/scheduling. Disconnected from operations.
- **Safety/claims** (7 pages): Incident tracking. Standalone module.

These aren't broken. They're features that exist in parallel to the core loop rather than inside it.

---

## PART 3: THE CANONICAL DATA MODEL

What must be treated as the single source of truth:

### Tier 1: Immutable Sources of Truth (Never Override)

- **Ledger Entries** - all financial state derives from here
- **State Transition Tables** - event/inquiry/quote/menu history
- **Ingredient Master** - canonical ingredient identity
- **Recipe Bible** - canonical recipe definitions

### Tier 2: Canonical Records (CRUD, Tenant-Scoped)

- **Chefs** - tenant root
- **Clients** - relationship + preferences
- **Events** - operational unit
- **Menus** - culinary plan
- **Dishes / Components** - menu structure

### Tier 3: Derived (Computed, Never Stored Directly)

- **Financial summaries** - from ledger entries via views
- **Payment status** - trigger-computed from ledger
- **Client LTV** - trigger-computed from ledger
- **Food cost %** - formula from ingredients + menu structure
- **Allergen flags** - computed from ingredient allergens up through recipe → component → dish

### Tier 4: Operational Outputs (Generated From Canonical Data)

- **Grocery list** - derived from menu → recipes → ingredients
- **Prep sheet** - derived from menu → components → recipes
- **Execution sheet** - derived from menu + client preferences
- **Cost projections** - derived from ingredients + scale factors

---

## PART 4: UNIFICATION ARCHITECTURE

### 4.1 Principle: Don't Delete, Reconnect

Every working feature stays. The goal is to close open loops, eliminate duplication, and establish clear canonical paths.

### 4.2 Nine Interventions (Ordered by Impact)

---

#### Intervention 1: Close the Cost Loop (Estimated vs Actual)

**Problem:** Chef estimates $120 food cost, spends $145. System never knows.

**Solution:** Link expenses to events at the ingredient level.

**What exists:** `expenses` table (generic), `receipt_digitization` (OCR output), `ingredients` table (master list)

**What to add:**

- Add `expense_line_items` table: links an expense to specific ingredients with quantity and unit cost
- After receipt OCR, map extracted line items to ingredients (AI-assisted matching, chef approves)
- Compute actual cost per event: SUM(expense_line_items where expense.event_id = X)
- Surface variance: actual vs estimated on event financial tab
- Auto-update `ingredients.last_price_cents` when receipt line items are approved

**Schema change (additive):**

```sql
CREATE TABLE expense_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  ingredient_id UUID REFERENCES ingredients(id),  -- nullable for unmatched items
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  description TEXT NOT NULL,
  quantity DECIMAL,
  unit TEXT,
  amount_cents INTEGER NOT NULL,
  matched_by TEXT DEFAULT 'manual',  -- 'manual' | 'ai' | 'receipt_ocr'
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Connects:** Receipt OCR → Expense Line Items → Ingredient Pricing → Recipe Costing → Menu Costing → Event P&L (actual)

---

#### Intervention 2: Wire AAR Feedback Into the System

**Problem:** Post-event learnings captured but ignored.

**Solution:** Make AAR data actionable by linking it to recipes, ingredients, and future suggestions.

**What to add:**

- Add `aar_recipe_notes` junction table: links AAR to specific recipes with timing_accuracy (faster/slower/accurate), would_use_again (boolean), notes
- Add `aar_ingredient_issues` junction table: links AAR to specific ingredients (forgotten, substituted, quality issue)
- When generating menu suggestions, query past AARs for the client and the recipes being considered
- Surface "chef's track record" on recipe detail page: times cooked, average prep rating, notes

**Schema change (additive):**

```sql
CREATE TABLE aar_recipe_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aar_id UUID NOT NULL REFERENCES after_action_reviews(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES recipes(id),
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  timing_accuracy TEXT CHECK (timing_accuracy IN ('faster', 'accurate', 'slower')),
  would_use_again BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE aar_ingredient_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aar_id UUID NOT NULL REFERENCES after_action_reviews(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES ingredients(id),
  tenant_id UUID NOT NULL REFERENCES chefs(id),
  issue_type TEXT CHECK (issue_type IN ('forgotten', 'substituted', 'quality', 'quantity_wrong', 'price_wrong')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**Connects:** AAR → Recipe feedback loop → Menu suggestions → Ingredient tracking

---

#### Intervention 3: Recipe Variant System

**Problem:** 30 variations = 30 unrelated recipes.

**Solution:** Parent-child recipe relationships.

**What to add:**

- Add `parent_recipe_id` column to `recipes` table (self-referencing FK, nullable)
- Add `variant_label` column to `recipes` table (e.g., "Gluten-Free", "Dairy-Free", "Classic")
- UI: Recipe detail page shows all variants as tabs/cards
- When creating a variant: clone parent recipe, link to parent, allow divergent ingredients/method
- Costing: compare variant costs side-by-side
- Menu builder: when selecting a recipe, show variant picker

**Schema change (additive):**

```sql
ALTER TABLE recipes ADD COLUMN parent_recipe_id UUID REFERENCES recipes(id);
ALTER TABLE recipes ADD COLUMN variant_label TEXT;
CREATE INDEX idx_recipes_parent ON recipes(parent_recipe_id) WHERE parent_recipe_id IS NOT NULL;
```

**Connects:** Recipe Bible → Menu Builder (variant selection) → Costing (variant comparison)

---

#### Intervention 4: Unify Ingestion Pipeline

**Problem:** 20+ parsers, no coordination, no deduplication.

**Solution:** Single ingestion orchestrator with draft → approve → commit flow.

**What to add:**

- `lib/ingestion/orchestrator.ts`: Unified entry point that accepts any input type (text, CSV, image, PDF)
- Routes to appropriate parser based on input type and content detection
- All parsers output to a common `DraftRecord` type with `{ type, data, confidence, source }`
- Draft records shown in a unified review UI before committing
- Deduplication check: before committing, search for existing records with matching identifiers
- Extract shared CSV tokenizer into `lib/ingestion/csv-tokenizer.ts` (DRY)

**No schema change needed.** This is a code-level refactor of the parser layer.

**Connects:** All import paths → Unified draft queue → Canonical tables

---

#### Intervention 5: Resolve Operational Output Duplicates

**Problem:** Two grocery list generators, two prep timeline generators.

**Solution:** Establish canonical implementations.

**Grocery list:**

- `lib/grocery/generate-grocery-list.ts` (server action) = canonical data fetcher
- `lib/documents/generate-grocery-list.ts` = PDF renderer that calls the server action
- Rename/refactor so the relationship is clear: data function vs presentation function

**Prep timeline:**

- `lib/events/prep-timeline.ts` (formula) = canonical, deterministic, always works
- `lib/ai/prep-timeline.ts` (Gemini) = enhancement layer, only used when chef explicitly requests "AI-optimized timeline"
- Default to formula. AI is opt-in.

**No schema change needed.** Code refactor only.

---

#### Intervention 6: Complete Grocery List

**Problem:** Shopping list generation appears to cut off mid-implementation.

**Solution:** Verify and complete the `lib/culinary/shopping-list-actions.ts` implementation.

**Required behavior:**

1. Fetch event → menu → dishes → components → recipes → recipe_ingredients → ingredients
2. Apply scale factors from components
3. Consolidate duplicate ingredients (same ingredient across multiple recipes)
4. Convert units where possible (g + kg = kg)
5. Subtract on-hand inventory (from pantry if tracked)
6. Group by store section (produce, proteins, dairy, pantry, specialty, alcohol)
7. Split into stops (grocery store vs specialty/liquor)
8. Return structured data for both UI display and PDF generation

---

#### Intervention 7: Add Packing List Generation

**Problem:** No packing list document exists.

**Solution:** Generate from event + menu + equipment data.

**What to pack (derived from canonical data):**

- Ingredients purchased (from grocery list, marked as "bought")
- Equipment needed (from recipe methods: "immersion blender", "torch", etc.)
- Make-ahead components (from components where `is_make_ahead = true`)
- Documents (printed prep sheet, execution sheet, contract)
- Service items (plates, utensils if chef brings them)
- Client-specific items (allergy cards, dietary labels)

**What to add:**

- `lib/documents/generate-packing-list.ts`: Derives packing list from event data
- Categorized by transport type: cold (cooler), hot (insulated), dry (boxes), equipment (bags), documents (folder)

---

#### Intervention 8: Surface Event Variance Dashboard

**Problem:** Chef can't see estimated vs actual across events.

**Solution:** After Intervention 1 (expense line items), build a variance view.

**What to show on Event Financial tab:**

- Estimated food cost (from menu → recipe → ingredient costing)
- Actual food cost (from expense line items linked to this event)
- Variance (actual - estimated), highlighted red if over
- Per-ingredient breakdown: estimated qty/cost vs actual qty/cost
- Trend: "Your salmon estimates are consistently 15% low"

---

#### Intervention 9: Connect Decision Support to History

**Problem:** Menu suggestions are stateless; they ignore past events, ratings, and client preferences.

**Solution:** Enrich the menu suggestion prompt with real history.

**What to include in suggestion context:**

- Past menus for this client (what was served before)
- AAR recipe feedback (which recipes got good/bad ratings)
- Client preferences (loved dishes, disliked ingredients from `client_preferences`)
- Recipe usage frequency (`times_cooked`, `last_cooked_at`)
- Seasonal relevance (time of year)
- Cost performance (recipes that consistently come in under/over budget)

**No schema change needed.** This enriches the existing `getAIMenuSuggestions()` function with more context.

---

## PART 5: UI UNIFICATION

### 5.1 Navigation Simplification

The current nav has deep nesting. Recommended structure (chef portal):

```
PRIMARY (always visible):
├── Dashboard (morning briefing, priority actions)
├── Inbox (all communications, triage)
├── Events (list + calendar + pipeline views)
├── Clients (CRM)
├── Culinary (recipes, menus, ingredients, costing)
├── Finance (ledger, expenses, invoices, reports)
└── Settings

SECONDARY (collapsible):
├── Operations (staff, tasks, scheduling, prep blocks)
├── Marketing (social, campaigns, push dinners)
├── Commerce (POS, if enabled)
├── Network (community)
└── Admin (if admin)
```

### 5.2 Page Consolidation Candidates

| Current                                      | Recommendation                            |
| -------------------------------------------- | ----------------------------------------- |
| `/financials` + `/finance/overview`          | Merge into single `/finance` hub          |
| `/settings/profile` + `/settings/my-profile` | Merge into single `/settings/profile`     |
| `/privacy` + `/privacy-policy`               | Redirect one to the other                 |
| `/expenses` + `/finance/expenses`            | Single entry point at `/finance/expenses` |

### 5.3 The Event Detail Page (The Operational Hub)

An event page should be the single operational hub. It currently has 18+ sub-tabs. Recommended grouping:

```
Event [id]
├── Overview (status, date, client, guest count, key actions)
├── Menu (dishes, components, dietary flags, interactive preview)
├── Financial (quote, payments, expenses, variance, P&L)
├── Prep (timeline, shopping list, make-ahead tracking)
├── Day-Of (execution sheet, packing list, KDS, mobile view)
├── Post-Event (AAR, debrief, receipts, close-out)
└── Documents (all generated docs, contract, invoice)
```

---

## PART 6: IMPLEMENTATION PRIORITY

### Phase 1: Close the Cost Loop (Highest Impact)

1. Add `expense_line_items` table (Intervention 1)
2. Wire receipt OCR output to expense line items
3. Auto-update ingredient prices from approved receipts
4. Build variance display on event financial tab (Intervention 8)

### Phase 2: Close the Feedback Loop

5. Add `aar_recipe_feedback` and `aar_ingredient_issues` tables (Intervention 2)
6. Update AAR form to capture per-recipe feedback
7. Surface recipe track record on recipe detail page

### Phase 3: Eliminate Duplication

8. Resolve grocery list duplicate (Intervention 5)
9. Resolve prep timeline duplicate (Intervention 5)
10. Extract shared CSV tokenizer (Intervention 4)
11. Complete grocery list implementation (Intervention 6)

### Phase 4: Variant System

12. Add parent_recipe_id and variant_label to recipes (Intervention 3)
13. Build variant UI on recipe detail page
14. Integrate variant picker into menu builder

### Phase 5: Operational Completeness

15. Build packing list generator (Intervention 7)
16. Enrich menu suggestions with history (Intervention 9)
17. Unify ingestion pipeline (Intervention 4)

### Phase 6: UI Consolidation

18. Merge duplicate pages
19. Simplify navigation structure
20. Consolidate event detail sub-tabs

---

## PART 7: WHAT NOT TO TOUCH

These systems are **working correctly** and should not be modified during unification:

- **Ledger system** (append-only, immutable, trigger-enforced) - pristine
- **Event FSM** (8-state, transition-enforced) - solid
- **Auth system** (Auth.js v5, role-based, tenant-scoped) - works
- **Realtime/SSE** (EventEmitter bus, useSSE hook) - functional
- **AI privacy boundary** (Ollama for private, Gemini for generic) - correctly enforced
- **State transition audit trails** - immutable, correct
- **Embeddable widget** - self-contained, works
- **Client portal** - functional, independent

---

## PART 8: SUCCESS CRITERIA

The system is unified when:

1. **Cost loop is closed:** Chef sees estimated vs actual food cost on every completed event
2. **Feedback flows back:** AAR data informs future menu suggestions and recipe assessments
3. **No duplicate implementations:** One canonical path for each output (grocery, prep, timeline)
4. **Recipes have variants:** Chef manages 1 base recipe with N variants, not N independent recipes
5. **All operational docs generate:** Grocery list, prep sheet, execution sheet, packing list - all from canonical data
6. **Ingestion is unified:** Any input (text, CSV, image, PDF) enters through one pipeline with draft-approve-commit flow
7. **Decision support uses history:** Menu suggestions reference past events, ratings, client preferences, cost performance

---

## APPENDIX A: Files to Read Before Starting Work

| File                                                                   | Why                                      |
| ---------------------------------------------------------------------- | ---------------------------------------- |
| `lib/ledger/append.ts` + `append-internal.ts`                          | Understand immutable financial model     |
| `lib/events/transitions.ts`                                            | Understand event FSM and side effects    |
| `lib/finance/food-cost-actions.ts`                                     | Understand current costing chain         |
| `lib/documents/generate-prep-sheet.ts`                                 | Understand operational output pattern    |
| `lib/documents/generate-execution-sheet.ts`                            | Same pattern                             |
| `lib/aar/actions.ts`                                                   | Understand what AAR captures today       |
| `lib/ai/menu-suggestions.ts`                                           | Understand current suggestion approach   |
| `lib/recipes/actions.ts`                                               | Understand recipe CRUD                   |
| `lib/menus/actions.ts`                                                 | Understand menu → dish → component chain |
| `database/migrations/20260215000004_layer_4_menus_recipes_costing.sql` | Understand culinary schema               |

## APPENDIX B: Schema Changes Summary

All changes are **additive** (no drops, no renames, no type changes):

| Change                              | Type                | Risk            |
| ----------------------------------- | ------------------- | --------------- |
| `expense_line_items` table          | New table           | Zero (additive) |
| `aar_recipe_feedback` table         | New table           | Zero (additive) |
| `aar_ingredient_issues` table       | New table           | Zero (additive) |
| `recipes.parent_recipe_id` column   | New nullable column | Zero (additive) |
| `recipes.variant_label` column      | New nullable column | Zero (additive) |
| Index on `recipes.parent_recipe_id` | New index           | Zero (additive) |

No existing tables, columns, or constraints are modified. No data migration required.
