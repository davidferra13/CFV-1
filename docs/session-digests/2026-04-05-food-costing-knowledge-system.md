# Session Digest: Food Costing Knowledge System

**Date:** 2026-04-05
**Agent:** General (Claude Opus 4.6)
**Spec:** `docs/specs/food-costing-knowledge-system.md`

## What Happened

Built the complete food costing knowledge system from spec. This is a read-only reference layer that makes the canonical food costing methodology accessible to users, developers, and Remy.

## What Changed

### New Files (5)

- `lib/costing/knowledge.ts` - Static content map: 20 help topics, 13 warning explanations, 14 operator target profiles, unit conversions, validation ranges, variance thresholds, 50+ guide sections
- `lib/costing/operator-cost-lines.ts` - 80+ operator-specific cost line templates for 10 operation types + universal lines
- `components/costing/costing-help-popover.tsx` - Reusable "?" icon popover for any costing concept with contextual guidance
- `components/costing/costing-warning-detail.tsx` - Expandable warning explanation cards sorted by severity
- `app/(chef)/help/food-costing/page.tsx` - Full knowledge base page at `/help/food-costing`

### Modified Files (3)

- `components/navigation/nav-config.tsx` - Added "Food Costing Guide" as child of Help Center
- `app/api/remy/stream/route-instant-answers.ts` - 6 deterministic instant-answer patterns (food cost %, Q-factor, yield factor, prime cost, cost-plus, contribution margin)
- `docs/app-complete-audit.md` - Added `/help/food-costing` entry

### Documentation (1)

- `docs/food-costing-knowledge-implementation.md` - Implementation doc with architecture, design decisions, usage examples

## Key Decisions

1. **All content is static.** No server actions, no database queries, no AI generation for the knowledge layer itself.
2. **Formula > AI.** Remy answers food costing questions deterministically from static content. Zero cost, zero latency, always correct.
3. **Operator-aware.** All targets, cost lines, and guidance adjust based on chef's operation type (14 types).
4. **Contextual guidance.** The `CostingHelpPopover` accepts current values and operator type to provide real-time contextual feedback.

## Verification

- TSC: clean (exit 0)
- Commit: `116881744`
- Pushed to GitHub: yes

## What's NOT Built (From Spec - Future Work)

- Inline guidance on pricing settings page
- CostingHelpPopover integration into existing recipe/menu/event views
- Remy context-aware costing answers (requires loading chef's actual food cost data)
- `lib/costing/knowledge.ts` as import source for the auto-costing engine

## For Next Agent

The knowledge layer is complete and self-contained. Integration into existing views (recipe costing, menu costing, event pricing) is a separate task. The `CostingHelpPopover` and `CostingWarningList` components are ready to drop in anywhere.
