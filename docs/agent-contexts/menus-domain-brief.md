# Menus Domain: Agent Context Brief

> Load this before touching any menus code. It maps every connection so you don't break cross-domain wiring.

---

## Quick Orientation

Menus is the most interconnected domain in ChefFlow. 40 lib files, 43 components, 15+ connected domains, 13 database tables, 7 email templates, 5 public routes, 3 API endpoints, and full Remy AI integration.

**Why:** In private chef work, the menu IS the product. Everything flows through it: pricing, client relationships, events, recipes, sharing, circles, approvals, documents.

---

## Database Tables (13)

### Core Chain (always query together)

```
menus (tenant_id FK -> chefs)
  -> dishes (menu_id FK -> menus)
    -> components (dish_id FK -> dishes, recipe_id FK -> recipes)
```

### Menu Table Key Columns

| Column                     | FK/Type                                       | Added By         |
| -------------------------- | --------------------------------------------- | ---------------- |
| `tenant_id`                | `chefs(id)`                                   | Layer 4          |
| `event_id`                 | `events(id)`                                  | Layer 4          |
| `client_id`                | `clients(id)`                                 | `20260401000106` |
| `dinner_circle_group_id`   | `hub_groups(id)`                              | `20260509000002` |
| `status`                   | enum: `draft -> shared -> locked -> archived` | Layer 4          |
| `is_showcase`              | boolean                                       | `20260330000013` |
| `scene_type`               | text                                          | `20260401000097` |
| `season`                   | text                                          | `20260401000106` |
| `visible_to_dinner_circle` | boolean                                       | `20260415000012` |

### Inbound FKs (other tables pointing at menus)

| Table                   | Column    | Migration                  |
| ----------------------- | --------- | -------------------------- |
| `events`                | `menu_id` | Layer 4 (line 401)         |
| `line_items` (commerce) | `menu_id` | `20260328000001` (line 83) |

### Workflow Tables

| Table                    | Purpose                                   |
| ------------------------ | ----------------------------------------- |
| `menu_state_transitions` | Immutable audit trail of status changes   |
| `menu_approval_requests` | Client approval workflow (snapshot JSONB) |
| `menu_preferences`       | Client-submitted preferences per event    |
| `menu_modifications`     | Substitution/addition/removal tracking    |
| `menu_share_tokens`      | Public share links for FOH menus          |

### Catalog Tables (Dish Memory)

| Table                | Purpose                                                             |
| -------------------- | ------------------------------------------------------------------- |
| `dish_index`         | Master canonical dish catalog (FK -> chefs, optional FK -> recipes) |
| `dish_appearances`   | When/where a dish was served (FK -> dish_index)                     |
| `dish_feedback`      | Client reactions per dish (FK -> dish_index)                        |
| `catalog_selections` | "Curate and send" workflow, produces menu_id                        |

### Template Tables

| Table                  | Purpose                                      |
| ---------------------- | -------------------------------------------- |
| `menu_templates`       | Seasonal template system (JSONB dishes)      |
| `tasting_menus`        | Standalone tasting menu entity (FK -> chefs) |
| `tasting_menu_courses` | Courses within tasting menu (FK -> recipes)  |

---

## State Machine (menu-lifecycle.ts)

```
draft -> shared -> locked -> archived
```

### Side Effects Per Transition

| Transition  | Side Effects                                                   |
| ----------- | -------------------------------------------------------------- |
| `-> shared` | `circleFirstNotify()`, send FOH email, `logChefActivity()`     |
| `-> locked` | `indexDishesFromMenu()` (writes dish_index + dish_appearances) |

**DANGER:** Lifecycle transitions fire cross-domain side effects via dynamic imports. Test transitions, not just menu CRUD.

---

## File Inventory: lib/menus/ (40 files)

### Tier 1: Core CRUD & State (touch carefully)

| File                | Size | Purpose                      | Cross-Domain Imports                       |
| ------------------- | ---- | ---------------------------- | ------------------------------------------ |
| `actions.ts`        | 69KB | All menu CRUD                | auth, db, remy-context, idempotency, units |
| `menu-lifecycle.ts` | -    | State machine + side effects | activity, hub/circles, chef layout, email  |
| `index.ts`          | -    | Barrel re-export             | everything                                 |

### Tier 2: Intelligence (heaviest business logic)

| File                           | Size | Purpose                                       | Cross-Domain Imports               |
| ------------------------------ | ---- | --------------------------------------------- | ---------------------------------- |
| `menu-intelligence-actions.ts` | 86KB | Margins, costs, scaling, allergens, seasonal  | clients (profile vectors, dietary) |
| `menu-engineering-actions.ts`  | -    | Quadrant analysis (star/plowhorse/puzzle/dog) | notifications                      |
| `menu-simulator.ts`            | -    | Pure calc: dish swap simulation               | none (pure)                        |
| `menu-intelligence-cache.ts`   | -    | Cache tag constants                           | none (pure)                        |

### Tier 3: Client-Facing Workflows

| File                    | Purpose                            | Cross-Domain                          |
| ----------------------- | ---------------------------------- | ------------------------------------- |
| `approval-portal.ts`    | Send proposals, collect feedback   | events, clients, recipes, ingredients |
| `preference-actions.ts` | Client preference submission       | notifications                         |
| `editor-actions.ts`     | Google Doc-style editor            | client notifications                  |
| `showcase-actions.ts`   | Portfolio menus for clients        | none                                  |
| `menu-share-actions.ts` | Token-based menu selection sharing | none                                  |
| `revisions.ts`          | Revision history/comparison        | none                                  |

### Tier 4: FOH (Front-of-House) Rendering

| File                         | Purpose                                           | Auth Level  |
| ---------------------------- | ------------------------------------------------- | ----------- |
| `foh-menu-data.ts`           | Pure data mapping (types: FOHMenuData, FOHCourse) | none (pure) |
| `foh-menu-options.ts`        | Display options (fonts, colors, layout)           | none (pure) |
| `foh-menu-actions.ts`        | Chef-authed FOH fetch                             | chef        |
| `foh-menu-client-actions.ts` | Client-authed FOH fetch                           | client      |
| `foh-public-actions.ts`      | Public no-auth FOH via share token                | public      |

### Tier 5: Dish Catalog System

| File                          | Purpose                                        |
| ----------------------------- | ---------------------------------------------- |
| `dish-index-actions.ts`       | CRUD for master dish catalog                   |
| `dish-index-bridge.ts`        | Auto-index dishes on menu lock                 |
| `dish-index-constants.ts`     | Enums, course types, canonicalization          |
| `dish-source-actions.ts`      | Add canonical dishes to menus                  |
| `dish-feedback-query.ts`      | Aggregate feedback summaries                   |
| `canonical-dish-menu-core.ts` | Materialize canonical dish into menu (circles) |

### Tier 6: Specialized Features

| File                           | Purpose                             | Cross-Domain                                |
| ------------------------------ | ----------------------------------- | ------------------------------------------- |
| `repeat-detection.ts`          | Dish overlap across client history  | events                                      |
| `rotation-guard.ts`            | Recently-served dish check          | none                                        |
| `allergen-check.ts`            | Deterministic allergen matching     | none (pure, shared with culinary + dietary) |
| `modifications.ts`             | Proposed vs served tracking         | events                                      |
| `menu-history-actions.ts`      | Client menu history log             | none                                        |
| `template-actions.ts`          | Seasonal templates CRUD             | none                                        |
| `tasting-menu-actions.ts`      | Tasting menu CRUD + course mgmt     | none                                        |
| `tasting-menu-bridge.ts`       | Materialize tasting into main model | none                                        |
| `catalog-selection-actions.ts` | "Curate and send" workflow          | none                                        |
| `quick-price-actions.ts`       | Quick price estimates               | none                                        |
| `estimate-actions.ts`          | Paste-dish-names cost estimator     | recipes, ingredients (read)                 |

### Tier 7: Upload/Parse

| File                 | Purpose                               | Cross-Domain        |
| -------------------- | ------------------------------------- | ------------------- |
| `upload-actions.ts`  | File upload, OCR, duplicate detection | none                |
| `extract-text.ts`    | PDF/DOCX/TXT/image extraction         | shared with vendors |
| `parse-menu-text.ts` | Parse text into dishes                | ai/parse-ollama     |

### Tier 8: Utilities (pure, safe to touch)

| File              | Purpose                                        |
| ----------------- | ---------------------------------------------- |
| `constants.ts`    | Component categories, transport, prep timeline |
| `course-utils.ts` | `getNextCourseNumber`, duplicate detection     |

---

## Components: components/menus/ (43 files)

All import from `lib/menus/`. Grouped by function:

**Core UI:** `menuGeneratorUI.tsx`, `menu-doc-editor.tsx`, `menu-health-score.tsx`, `menu-context-dock.tsx`
**FOH:** `front-of-house-menu.tsx`, `foh-customization-panel.tsx`, `client-foh-menu-section.tsx`
**Intelligence:** `menu-engineering-dashboard.tsx`, `menu-simulator-panel.tsx`, `menu-breakdown-panel.tsx`, `menu-cost-estimator.tsx`, `quick-price-calculator.tsx`
**Dish Index:** `dish-index-card.tsx`, `dish-quick-add.tsx`, `dish-estimate-row.tsx`, `dish-frequency-chart.tsx`
**Templates:** `template-library.tsx`, `menu-template-settings.tsx`, `save-as-template-button.tsx`
**Tasting:** `tasting-menu-form.tsx`, `tasting-menu-list.tsx`, `tasting-menu-preview.tsx`
**Sharing:** `menu-share-panel.tsx`, `showcase-menu-card.tsx`, `showcase-menu-preview.tsx`
**Catalog:** `catalog-curate-panel.tsx`, `catalog-selections-list.tsx`
**Safety:** `allergen-matrix.tsx`, `repeat-menu-alert.tsx`
**Workflow:** `menu-preferences-form.tsx`, `clone-menu-button.tsx`, `menu-upload-zone.tsx`, `upload-review-panel.tsx`, `recipe-link-picker.tsx`, `menu-pdf-button.tsx`, `menu-translate-button.tsx`, `menu-ai-suggestions-panel.tsx`, `cocktail-browser-panel.tsx`, `workflow-notes-panel.tsx`, `prep-timeline-view.tsx`, `client-menu-history.tsx`, `menu-history-timeline.tsx`, `dinner-circle-toggle.tsx`

---

## Cross-Domain Connections (Who Reads/Writes Menus)

### Domains That READ FROM menus

| Domain               | What It Reads                            | Key Files                                                       |
| -------------------- | ---------------------------------------- | --------------------------------------------------------------- |
| Finance              | dishes by menu_id, cost variance         | `food-cost-actions.ts`, `event-pricing-intelligence-actions.ts` |
| Completion           | menu health (recipe linkage, coverage)   | `completion/evaluators/menu.ts`                                 |
| Documents            | FOHMenuData for PDF/image gen            | `generate-front-of-house-menu.ts`, `generate-foh-image.ts`      |
| Email                | FOHMenuData for inline menu, 7 templates | `foh-menu-email.tsx`, approval/revision templates               |
| Culinary             | allergen matching for shopping lists     | `shopping-list-actions.ts`                                      |
| Dietary              | allergen recheck on allergy changes      | `dietary/menu-recheck.ts`                                       |
| Vendors              | OCR text extraction (shared)             | `document-intake-actions.ts`                                    |
| Onboarding           | create first menu                        | `first-menu-step.tsx`                                           |
| Dashboard            | menu history widget                      | `menu-history-widget.tsx`                                       |
| Recipes (components) | recipe usage tracking                    | `recipe-usage-panel.tsx`                                        |
| Campaigns            | menu list for push dinners               | `push-dinner-builder.tsx`                                       |

### Domains That WRITE TO menus (or trigger menu writes)

| Domain      | What It Does                               | Key Files                                               |
| ----------- | ------------------------------------------ | ------------------------------------------------------- |
| Events      | apply menu to event, approval workflow     | `menu-approval-actions.ts`, event detail page           |
| Hub/Circles | materialize dishes into menu, menu polling | `menu-poll-actions.ts`, `menu-proposal-actions.ts`      |
| Remy AI     | create/edit/duplicate/transition menus     | `agent-actions/menu-actions.ts`, `menu-edit-actions.ts` |

### Bidirectional (Read AND Write)

| Domain      | How                                                                      |
| ----------- | ------------------------------------------------------------------------ |
| Events      | FK both directions; approval workflow reads menu, writes approval status |
| Clients     | menu reads client dietary vectors; client submits preferences to menu    |
| Hub/Circles | menu lifecycle notifies circles; circles materialize dishes into menus   |
| Remy AI     | context reads menus; agent actions mutate menus                          |

---

## API Routes

| Route                          | Methods            | Auth |
| ------------------------------ | ------------------ | ---- |
| `/api/v2/menus`                | GET, POST          | chef |
| `/api/v2/menus/[id]`           | GET, PATCH, DELETE | chef |
| `/api/v2/menus/[id]/approve`   | POST               | chef |
| `/api/menus/upload`            | POST               | chef |
| `/api/menu-image/[menuId]`     | GET                | chef |
| `/api/v2/settings/menu-engine` | GET, PUT           | chef |

## Public Routes (no auth)

| Route                   | Purpose                       |
| ----------------------- | ----------------------------- |
| `/menu/[token]`         | FOH menu view via share token |
| `/menu-pick/[token]`    | Guest menu selection          |
| `/catalog-pick/[token]` | Public catalog picking        |
| `/print/menu/[id]`      | Print-friendly FOH            |

---

## App Pages

**Chef pages:** `/menus`, `/menus/new`, `/menus/[id]`, `/menus/[id]/editor`, `/menus/dishes`, `/menus/estimate`, `/menus/tasting`, `/menus/upload`, `/menus/selections`
**Culinary sub-views:** `/culinary/menus`, `/culinary/menus/approved`, `/culinary/menus/drafts`, `/culinary/menus/engineering`, `/culinary/menus/scaling`, `/culinary/menus/substitutions`, `/culinary/menus/templates`, `/culinary/menus/[id]`
**Event sub-views:** `/events/[id]` (menu section), `/events/[id]/menu-approval`, `/events/[id]/menu-polling`
**Client pages:** `/my-events/[id]` (FOH view), `/my-events/[id]/choose-menu`, `/my-events/[id]/approve-menu`
**Other:** `/culinary/dish-index`, `/culinary/components`, `/culinary/costing`, `/culinary/prep`, `/nutrition/[menuId]`

---

## Danger Zones (Break These, Break Everything)

1. **`actions.ts` exports** - 20+ domains import from here. Rename/remove = cascade failure.
2. **`FOHMenuData` type** - Used by email, documents, print, public routes, client portal. Change shape = 7+ broken surfaces.
3. **`menu-lifecycle.ts` transitions** - Side effects fire to circles, email, activity, dish index. Broken transition = silent data loss.
4. **`allergen-check.ts`** - Shared by menus, culinary, dietary. Wrong match = safety issue.
5. **`dish-index-bridge.ts`** - Fires on menu lock. Broken = dish catalog stops growing.
6. **`extract-text.ts`** - Shared with vendors domain. Change signature = break vendor intake.
7. **Core table schema** (`menus`, `dishes`, `components`) - 15+ domains query these directly.

---

## Agent Dispatch Zones

These are safe parallel work boundaries. Agents working in different zones won't conflict.

### Zone A: Intelligence & Analytics

- Files: `menu-intelligence-actions.ts`, `menu-engineering-actions.ts`, `menu-simulator.ts`, `menu-intelligence-cache.ts`
- Components: `menu-engineering-dashboard.tsx`, `menu-simulator-panel.tsx`, `menu-breakdown-panel.tsx`, `menu-cost-estimator.tsx`, `quick-price-calculator.tsx`
- Safe to modify independently. Reads from DB, doesn't mutate cross-domain.

### Zone B: FOH Rendering

- Files: `foh-menu-data.ts`, `foh-menu-options.ts`, `foh-menu-actions.ts`, `foh-menu-client-actions.ts`, `foh-public-actions.ts`, `menu-share-actions.ts`
- Components: `front-of-house-menu.tsx`, `foh-customization-panel.tsx`, `menu-share-panel.tsx`, `menu-pdf-button.tsx`
- Pages: `/menu/[token]`, `/menu-pick/[token]`, `/print/menu/[id]`
- CAUTION: `FOHMenuData` type is shared with email/documents. Type changes need coordination.

### Zone C: Dish Catalog

- Files: `dish-index-actions.ts`, `dish-index-bridge.ts`, `dish-index-constants.ts`, `dish-source-actions.ts`, `dish-feedback-query.ts`, `canonical-dish-menu-core.ts`
- Components: `dish-index-card.tsx`, `dish-quick-add.tsx`, `dish-estimate-row.tsx`, `dish-frequency-chart.tsx`
- Pages: `/culinary/dish-index`, `/menus/dishes`
- Isolated subsystem. Only intersection: `dish-index-bridge.ts` fires on menu lock.

### Zone D: Templates & Tasting

- Files: `template-actions.ts`, `tasting-menu-actions.ts`, `tasting-menu-bridge.ts`
- Components: `template-library.tsx`, `tasting-menu-*.tsx`, `save-as-template-button.tsx`, `menu-template-settings.tsx`
- Pages: `/menus/tasting`, `/culinary/menus/templates`
- Fully isolated. Own tables. No cross-domain side effects.

### Zone E: Upload & Parse

- Files: `upload-actions.ts`, `extract-text.ts`, `parse-menu-text.ts`
- Components: `menu-upload-zone.tsx`, `upload-review-panel.tsx`
- Pages: `/menus/upload`
- CAUTION: `extract-text.ts` shared with vendors. `parse-menu-text.ts` depends on Ollama.

### Zone F: Client Workflows

- Files: `approval-portal.ts`, `preference-actions.ts`, `editor-actions.ts`, `showcase-actions.ts`, `revisions.ts`
- Components: `menu-preferences-form.tsx`, `showcase-menu-*.tsx`, `client-menu-history.tsx`
- Pages: `/my-events/[id]/choose-menu`, `/my-events/[id]/approve-menu`
- Touches events + clients + notifications. Needs careful testing.

### Zone G: Safety & Guards

- Files: `allergen-check.ts`, `repeat-detection.ts`, `rotation-guard.ts`
- Components: `allergen-matrix.tsx`, `repeat-menu-alert.tsx`
- CRITICAL: `allergen-check.ts` is safety-critical and shared. Test exhaustively.

### EXCLUSION: Core CRUD (Zone 0 - Single Agent Only)

- Files: `actions.ts`, `menu-lifecycle.ts`, `index.ts`, `constants.ts`, `course-utils.ts`
- NEVER parallelize work on these. Too many dependents. One agent at a time.
