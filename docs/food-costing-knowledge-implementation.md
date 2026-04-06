# Food Costing Knowledge System - Implementation

> **Date:** 2026-04-05
> **Spec:** `docs/specs/food-costing-knowledge-system.md`
> **Status:** Built (knowledge layer + delivery surface)

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

## Architecture

```
docs/food-costing-guide.md          (canonical user-facing content)
docs/food-costing-reference-data.md (canonical lookup tables)
        │
        ▼
lib/costing/knowledge.ts            (typed static maps, constants, helpers)
lib/costing/operator-cost-lines.ts  (cost line templates by operator type)
        │
        ├──▶ components/costing/costing-help-popover.tsx  (UI: "?" icon popover)
        ├──▶ components/costing/costing-warning-detail.tsx (UI: warning cards)
        ├──▶ app/(chef)/help/food-costing/page.tsx         (UI: full guide page)
        └──▶ route-instant-answers.ts                      (Remy: deterministic answers)
```

## Key Design Decisions

1. **All content is static.** No server actions, no database queries, no AI generation for the knowledge layer itself. It's a content map in TypeScript files.

2. **Formula > AI.** Remy answers food costing questions deterministically from static content, not via Ollama. Zero cost, zero latency, always correct.

3. **Contextual guidance.** The `CostingHelpPopover` accepts current values and operator type to provide contextual feedback ("Your food cost is 38%, above your 35% target").

4. **Operator-aware.** All targets, cost lines, and guidance adjust based on the chef's operation type (14 types supported).

5. **Warning system.** 13 warning types with severity levels, causes, actions, and links to the relevant guide section. The `CostingWarningList` component renders sorted by severity.

## What's NOT Built Yet (From Spec - Future Work)

These items are defined conceptually in the knowledge layer but require additional infrastructure:

- **Inline guidance on pricing settings page** (requires reading the settings form component)
- **CostingHelpPopover integration** into existing recipe/menu/event views (requires identifying exact insertion points in each view)
- **Remy context-aware costing answers** (requires loading chef's actual food cost data into RemyContext)
- **`lib/costing/knowledge.ts` as import source for the auto-costing engine** (engine needs to import validation ranges and conversion constants)

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

### Getting cost lines for an operator type:

```tsx
import { getCostLinesForOperator } from '@/lib/costing/operator-cost-lines'

const lines = getCostLinesForOperator('food_truck')
// Returns: commissary rental, generator fuel, vending permit, etc.
```
