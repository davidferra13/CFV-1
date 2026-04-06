# Food Costing Knowledge System - Implementation

> **Date:** 2026-04-05
> **Spec:** `docs/specs/food-costing-knowledge-system.md`
> **Status:** Built and wired (knowledge layer + 10 delivery surfaces)

## What Was Built

The food costing knowledge system is a **read-only reference layer** that makes the canonical food costing methodology accessible to users, developers, and AI agents (Remy).

### Files Created

| File                                            | Purpose                                                                                                                                                                         |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/costing/knowledge.ts`                      | Static content map: 20 help topics, 13 warning explanations, 14 operator target profiles, unit conversion constants, validation ranges, variance thresholds, 50+ guide sections |
| `lib/costing/operator-cost-lines.ts`            | 80+ operator-specific cost line templates for 10 operation types + universal lines. Keyed by OperatorType with lookup helpers                                                   |
| `components/costing/costing-help-popover.tsx`   | Reusable "?" icon popover for any costing concept. Click to see definition, formula, target range, contextual guidance, and link to full guide                                  |
| `components/costing/costing-warning-detail.tsx` | Expandable warning explanation cards + `CostingWarningList` component. Sorted by severity (red, amber, info)                                                                    |
| `app/(chef)/help/food-costing/page.tsx`         | Full knowledge base page at `/help/food-costing`. Table of contents, quick reference card, all concept cards, operator targets table, variance thresholds                       |

### Files Modified

| File                                           | Change                                                                                                                                                                                                 |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `components/navigation/nav-config.tsx`         | Added "Food Costing Guide" as child of Help Center                                                                                                                                                     |
| `app/api/remy/stream/route-instant-answers.ts` | Added 6 deterministic instant-answer patterns for food costing questions (food cost %, Q-factor, yield factor, prime cost, cost-plus, contribution margin). Formula > AI: these bypass Ollama entirely |

### Phase 2: Integration (10 Surfaces Wired)

| Surface                  | File                                                | What was wired                                                                                      |
| ------------------------ | --------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Dashboard business cards | `app/(chef)/dashboard/_sections/business-cards.tsx` | Uses chef's actual archetype for operator-specific food cost targets (was hardcoded `private_chef`) |
| Recipe detail            | `app/(chef)/recipes/[id]/recipe-detail-client.tsx`  | CostingHelpPopover on Total Cost and Cost per Portion                                               |
| Menu detail              | `app/(chef)/menus/[id]/menu-detail-client.tsx`      | CostingHelpPopover on Cost/Guest and Food Cost %                                                    |
| Recipe costing dashboard | `app/(chef)/culinary/costing/recipe/page.tsx`       | CostingHelpPopover on "Most expensive" and "Average cost" KPIs                                      |
| Menu costing dashboard   | `app/(chef)/culinary/costing/menu/page.tsx`         | CostingHelpPopover on Estimated Cost and Cost/Guest headers                                         |
| Food cost dashboard      | `components/vendors/food-cost-dashboard.tsx`        | Operator-aware color thresholds via props (replaces hardcoded 30/35%)                               |
| Menu engineering         | `lib/analytics/menu-engineering.ts`                 | Operator-specific food cost target from archetype (replaces hardcoded 30%)                          |
| Remy context             | `lib/ai/remy-context.ts`                            | `costingContext` with operator type, targets, Q-factor, recosting frequency                         |
| Remy types               | `lib/ai/remy-types.ts`                              | `costingContext` interface added to RemyContext                                                     |
| Knowledge bridge         | `lib/costing/knowledge.ts`                          | `archetypeToOperatorType()` and `getTargetsForArchetype()` functions                                |

### Archetype-to-Operator Bridge

The chef's archetype (stored in `chef_preferences.archetype`) maps to operator-specific costing targets. No migration needed.

| Archetype (DB) | OperatorType   | Food Cost Target | Prime Cost | Q-Factor |
| -------------- | -------------- | ---------------- | ---------- | -------- |
| `private-chef` | `private_chef` | 25-35%           | 55%        | 7%       |
| `caterer`      | `catering`     | 25-38%           | 60%        | 5%       |
| `meal-prep`    | `meal_prep`    | 28-35%           | 60%        | 5%       |
| `restaurant`   | `restaurant`   | 28-35%           | 65%        | 5%       |
| `food-truck`   | `food_truck`   | 28-35%           | 60%        | 5%       |
| `bakery`       | `bakery`       | 25-38%           | 60%        | 3%       |

## Architecture

```
docs/food-costing-guide.md          (canonical user-facing content)
docs/food-costing-reference-data.md (canonical lookup tables)
        |
        v
lib/costing/knowledge.ts            (typed static maps, constants, helpers)
lib/costing/operator-cost-lines.ts  (cost line templates by operator type)
        |
        |--- components/costing/costing-help-popover.tsx   (UI: "?" icon popover)
        |--- components/costing/costing-warning-detail.tsx  (UI: warning cards)
        |--- app/(chef)/help/food-costing/page.tsx          (UI: full guide page)
        |--- route-instant-answers.ts                       (Remy: deterministic answers)
        |
        |--- [WIRED] dashboard business cards               (operator-aware targets)
        |--- [WIRED] recipe detail page                     (help popovers)
        |--- [WIRED] menu detail page                       (help popovers)
        |--- [WIRED] recipe costing dashboard               (help popovers)
        |--- [WIRED] menu costing dashboard                 (help popovers)
        |--- [WIRED] food cost dashboard                    (dynamic thresholds)
        |--- [WIRED] menu engineering analytics             (dynamic target)
        |--- [WIRED] Remy context                           (costingContext)
```

## Key Design Decisions

1. **All content is static.** No server actions, no database queries, no AI generation for the knowledge layer itself. It's a content map in TypeScript files.

2. **Formula > AI.** Remy answers food costing questions deterministically from static content, not via Ollama. Zero cost, zero latency, always correct.

3. **Contextual guidance.** The `CostingHelpPopover` accepts current values and operator type to provide contextual feedback ("Your food cost is 38%, above your 35% target").

4. **Operator-aware.** All targets, cost lines, and guidance adjust based on the chef's operation type (14 types supported).

5. **Warning system.** 13 warning types with severity levels, causes, actions, and links to the relevant guide section. The `CostingWarningList` component renders sorted by severity.

## What's NOT Built Yet (Future Work)

- ~~CostingHelpPopover integration into recipe/menu views~~ DONE (Phase 2)
- ~~Remy context-aware costing answers~~ DONE (costingContext in RemyContext)
- ~~Operator-specific targets replacing hardcoded 30%~~ DONE (dashboard, menu engineering, food cost dashboard)
- **Inline guidance on pricing settings page** (rate fields need "?" popovers)
- **CostingWarningList in recipe/menu views** (warnings when food cost exceeds operator targets)
- **Cost-plus quote builder** pre-populated with `getCostLinesForOperator()` templates
- **Event form cost sidebar** (food cost vs. price relationship during event creation)
- **Auto-costing engine** importing validation ranges and conversion constants from knowledge.ts

## How to Use

### Adding a help popover to any costing display:

```tsx
import { CostingHelpPopover } from '@/components/costing/costing-help-popover'
;<div className="flex items-center gap-1">
  <span>Food Cost: 32%</span>
  <CostingHelpPopover
    topic="food_cost_pct"
    currentValue={32}
    targetValue={30}
    operationType="private_chef"
  />
</div>
```

### Rendering warnings from a CostingResult:

```tsx
import { CostingWarningList } from '@/components/costing/costing-warning-detail'
;<CostingWarningList warnings={costingResult.warnings} />
```

### Getting operator targets from a chef's archetype:

```tsx
import { getTargetsForArchetype } from '@/lib/costing/knowledge'

const targets = getTargetsForArchetype('private-chef')
// targets.foodCostPctLow = 25, targets.foodCostPctHigh = 35, etc.
```

### Getting cost lines for an operator type:

```tsx
import { getCostLinesForOperator } from '@/lib/costing/operator-cost-lines'

const lines = getCostLinesForOperator('food_truck')
// Returns: commissary rental, generator fuel, vending permit, etc.
```
