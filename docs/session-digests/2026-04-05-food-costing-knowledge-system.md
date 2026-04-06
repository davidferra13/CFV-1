# Session Digest: Food Costing Knowledge System

**Date:** 2026-04-05
**Agent:** General (Claude Opus 4.6)
**Spec:** `docs/specs/food-costing-knowledge-system.md`

## What Happened

Two-phase build. Phase 1: built the knowledge layer from spec (static content maps, UI components, help page, Remy instant answers). Phase 2: deep exploration revealed the knowledge layer was 40% wired (display only) and 60% dormant (86 files doing costing math without it). Wired the knowledge layer into 10 existing surfaces.

## What Changed

### Phase 1: Knowledge Layer (5 new files)

- `lib/costing/knowledge.ts` - Static content map: 20 help topics, 13 warning explanations, 14 operator target profiles, unit conversions, validation ranges, variance thresholds, 50+ guide sections
- `lib/costing/operator-cost-lines.ts` - 80+ operator-specific cost line templates for 10 operation types + universal lines
- `components/costing/costing-help-popover.tsx` - Reusable "?" icon popover for any costing concept with contextual guidance
- `components/costing/costing-warning-detail.tsx` - Expandable warning explanation cards sorted by severity
- `app/(chef)/help/food-costing/page.tsx` - Full knowledge base page at `/help/food-costing`

### Phase 2: Integration (10 surfaces wired)

- Dashboard business cards: operator-specific food cost targets from chef's archetype (was hardcoded `private_chef`)
- Recipe detail: CostingHelpPopover on Total Cost and Cost per Portion
- Menu detail: CostingHelpPopover on Cost/Guest and Food Cost %
- Recipe costing dashboard: CostingHelpPopover on KPI cards
- Menu costing dashboard: CostingHelpPopover on table headers
- Food cost dashboard: operator-aware color thresholds (replaces hardcoded 30/35%)
- Menu engineering: operator-specific food cost target (replaces hardcoded 30%)
- Remy context: costingContext with operator type, targets, Q-factor, recosting frequency
- Archetype bridge: `archetypeToOperatorType()` and `getTargetsForArchetype()` (no migration needed)

### Also modified

- `components/navigation/nav-config.tsx` - Added "Food Costing Guide" as child of Help Center
- `app/api/remy/stream/route-instant-answers.ts` - 6 deterministic instant-answer patterns
- `docs/app-complete-audit.md` - Added `/help/food-costing` entry
- `docs/USER_MANUAL.md` - Added Costing Dashboard and Food Costing Guide sections

## Key Decisions

1. **All content is static.** No server actions, no database queries, no AI generation for the knowledge layer itself.
2. **Formula > AI.** Remy answers food costing questions deterministically from static content. Zero cost, zero latency, always correct.
3. **Operator-aware.** All targets, cost lines, and guidance adjust based on chef's operation type (14 types mapped from 6 archetypes).
4. **No migration needed.** Uses existing `chef_preferences.archetype` column via `getCachedChefArchetype()`.
5. **Contextual guidance.** The `CostingHelpPopover` accepts current values and operator type to provide real-time contextual feedback.

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
