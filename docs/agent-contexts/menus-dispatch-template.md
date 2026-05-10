# Menus Domain: Agent Dispatch Template

> Copy the zone-specific block below when spawning agents. Each agent gets the brief + its zone constraints.

---

## Universal Preamble (include in every agent prompt)

```
You are working on ChefFlow's menus domain, the most interconnected domain in the app.

BEFORE WRITING CODE, read: docs/agent-contexts/menus-domain-brief.md
It contains the full wiring map: 13 DB tables, 40 lib files, 15+ connected domains, danger zones.

RULES:
- Never rename or remove exports from lib/menus/actions.ts (20+ domains import from it)
- Never change FOHMenuData type shape without updating email/documents/print consumers
- Never modify allergen-check.ts without testing culinary + dietary consumers
- All server actions need: auth gate, tenant scoping, input validation, error propagation
- Conventional commits. Test your work.
- Read CLAUDE.md for full project rules.
```

---

## Zone Dispatch Blocks

### Zone A: Intelligence & Analytics

```
ZONE: Intelligence & Analytics
YOUR FILES (modify only these):
  lib/menus/menu-intelligence-actions.ts (86KB - largest file)
  lib/menus/menu-engineering-actions.ts
  lib/menus/menu-simulator.ts
  lib/menus/menu-intelligence-cache.ts
  components/menus/menu-engineering-dashboard.tsx
  components/menus/menu-simulator-panel.tsx
  components/menus/menu-breakdown-panel.tsx
  components/menus/menu-cost-estimator.tsx
  components/menus/quick-price-calculator.tsx

CROSS-DOMAIN READS (don't modify, but you query these):
  - clients/client-profile-chef-workflow (dietary conflicts, taste summary)
  - clients/client-profile-service (profile vectors)
  - notifications/actions (createNotification)
  - recipes + recipe_ingredients + ingredients (cost traversal)

PAGES: /culinary/menus/engineering, /culinary/menus/scaling
SAFE: Read-heavy zone. Minimal mutation risk.
```

### Zone B: FOH Rendering

```
ZONE: FOH Rendering (Front-of-House)
YOUR FILES:
  lib/menus/foh-menu-data.ts (FOHMenuData + FOHCourse types)
  lib/menus/foh-menu-options.ts
  lib/menus/foh-menu-actions.ts (chef-authed)
  lib/menus/foh-menu-client-actions.ts (client-authed)
  lib/menus/foh-public-actions.ts (no-auth, share tokens)
  lib/menus/menu-share-actions.ts
  components/menus/front-of-house-menu.tsx
  components/menus/foh-customization-panel.tsx
  components/menus/menu-share-panel.tsx
  components/menus/menu-pdf-button.tsx

PAGES: /menu/[token], /menu-pick/[token], /print/menu/[id], /catalog-pick/[token]

DANGER: FOHMenuData type is consumed by:
  - lib/documents/generate-front-of-house-menu.ts
  - lib/documents/generate-foh-image.ts
  - lib/documents/interactive-specs.ts
  - lib/email/templates/foh-menu-email.tsx
  - app/print/menu/[id]/print-menu-client.tsx
If you change FOHMenuData shape, update ALL consumers.

THREE AUTH TIERS: chef (full), client (read + preferences), public (token only).
```

### Zone C: Dish Catalog

```
ZONE: Dish Catalog
YOUR FILES:
  lib/menus/dish-index-actions.ts
  lib/menus/dish-index-bridge.ts (fires on menu lock!)
  lib/menus/dish-index-constants.ts
  lib/menus/dish-source-actions.ts
  lib/menus/dish-feedback-query.ts
  lib/menus/canonical-dish-menu-core.ts
  components/menus/dish-index-card.tsx
  components/menus/dish-quick-add.tsx
  components/menus/dish-estimate-row.tsx
  components/menus/dish-frequency-chart.tsx

TABLES: dish_index, dish_appearances, dish_feedback
PAGES: /culinary/dish-index, /menus/dishes

CROSS-DOMAIN:
  - dish-index-bridge.ts is called by menu-lifecycle.ts on "locked" transition
  - canonical-dish-menu-core.ts is called by hub/menu-poll-actions.ts
  - canonicalizeDishName is imported by events/post-event-learning-actions.ts
  - dish-index-constants.ts exports are used by culinary/dish-index pages

MOSTLY ISOLATED. Own tables, own pages. Just mind the bridge + canonical exports.
```

### Zone D: Templates & Tasting

```
ZONE: Templates & Tasting Menus
YOUR FILES:
  lib/menus/template-actions.ts
  lib/menus/tasting-menu-actions.ts
  lib/menus/tasting-menu-bridge.ts
  components/menus/template-library.tsx
  components/menus/tasting-menu-form.tsx
  components/menus/tasting-menu-list.tsx
  components/menus/tasting-menu-preview.tsx
  components/menus/save-as-template-button.tsx
  components/menus/menu-template-settings.tsx

TABLES: menu_templates, tasting_menus, tasting_menu_courses
PAGES: /menus/tasting, /culinary/menus/templates

FULLY ISOLATED. Own tables. No cross-domain side effects.
Safest zone for parallel work.
```

### Zone E: Upload & Parse

```
ZONE: Upload & Parse
YOUR FILES:
  lib/menus/upload-actions.ts
  lib/menus/extract-text.ts (SHARED with vendors!)
  lib/menus/parse-menu-text.ts (uses Ollama)
  components/menus/menu-upload-zone.tsx
  components/menus/upload-review-panel.tsx

PAGES: /menus/upload
API: /api/menus/upload

CROSS-DOMAIN:
  - extract-text.ts is imported by lib/vendors/document-intake-actions.ts
  - parse-menu-text.ts imports from lib/ai/parse-ollama
If you change extract-text.ts signature, update vendors consumer.
```

### Zone F: Client Workflows

```
ZONE: Client Workflows
YOUR FILES:
  lib/menus/approval-portal.ts
  lib/menus/preference-actions.ts
  lib/menus/editor-actions.ts
  lib/menus/showcase-actions.ts
  lib/menus/revisions.ts
  lib/menus/menu-history-actions.ts
  components/menus/menu-preferences-form.tsx
  components/menus/showcase-menu-card.tsx
  components/menus/showcase-menu-preview.tsx
  components/menus/client-menu-history.tsx
  components/menus/menu-history-timeline.tsx

PAGES:
  /my-events/[id]/choose-menu (client)
  /my-events/[id]/approve-menu (client)
  /events/[id]/menu-approval (chef)

CROSS-DOMAIN:
  - approval-portal.ts queries events, clients, recipes, ingredients
  - preference-actions.ts creates notifications
  - editor-actions.ts creates client notifications
  - Events domain has its own menu-approval-actions.ts (don't duplicate)

TOUCHES: events + clients + notifications. Test approval flow end-to-end.
```

### Zone G: Safety & Guards

```
ZONE: Safety & Guards
YOUR FILES:
  lib/menus/allergen-check.ts
  lib/menus/repeat-detection.ts
  lib/menus/rotation-guard.ts
  components/menus/allergen-matrix.tsx
  components/menus/repeat-menu-alert.tsx

CROSS-DOMAIN CONSUMERS OF allergen-check.ts:
  - lib/culinary/shopping-list-actions.ts (ingredientMatchesAllergen)
  - lib/dietary/menu-recheck.ts (checkDishAgainstAllergens)
  - lib/menus/approval-portal.ts (internal)

CRITICAL: Allergen matching is a SAFETY feature. Wrong match = client health risk.
Test exhaustively. Never weaken matching rules. Additive changes only.
```

### Zone 0: Core CRUD (SINGLE AGENT ONLY)

```
ZONE: Core CRUD (NEVER PARALLELIZE)
YOUR FILES:
  lib/menus/actions.ts (69KB - 20+ domains import from this)
  lib/menus/menu-lifecycle.ts (state machine + side effects)
  lib/menus/index.ts (barrel)
  lib/menus/constants.ts
  lib/menus/course-utils.ts

WHY SINGLE AGENT: These files are imported by every other zone and 15+ external
domains. Parallel modifications = merge hell + broken imports.

LIFECYCLE SIDE EFFECTS (menu-lifecycle.ts):
  -> shared: circleFirstNotify(), FOH email, logChefActivity()
  -> locked: indexDishesFromMenu() (dish catalog)

EXPORTS USED EXTERNALLY (partial list from actions.ts):
  getMenus, getMenuById, createMenu, updateMenu, deleteMenu,
  createMenuWithCourses, addDishToMenu, updateDish, deleteDish,
  addComponentToDish, duplicateMenu, transitionMenu, applyMenuToEvent,
  getMenuCostSummaries, getMenuEvent, getMenuQuickViewData,
  getMenuInquiryLink, toggleShowcase, saveMenuAsTemplate,
  initializeMenuForEvent, getEditorClientList, getCirclePickerList,
  getMenuHealthData, markPreferencesViewed, getMenuLibraryForEvent

NEVER rename or remove any of these without grep-checking all consumers.
```

---

## Example: Dispatching 4 Parallel Agents

```
Agent 1 (Zone A - haiku): "Refactor menu-intelligence-actions to reduce file size.
  Read docs/agent-contexts/menus-domain-brief.md first. Zone A files only."

Agent 2 (Zone D - haiku): "Add 'brunch' scene type to tasting menu templates.
  Read docs/agent-contexts/menus-domain-brief.md first. Zone D files only."

Agent 3 (Zone E - haiku): "Add HEIC image support to menu upload.
  Read docs/agent-contexts/menus-domain-brief.md first. Zone E files only."

Agent 4 (Zone C - sonnet): "Build dish rotation analytics dashboard.
  Read docs/agent-contexts/menus-domain-brief.md first. Zone C files only."
```

All four agents work on isolated file sets. No merge conflicts. No broken imports.
