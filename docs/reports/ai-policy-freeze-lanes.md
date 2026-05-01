# AI Policy Freeze Lanes

Date: 2026-05-01
Branch: feature/v1-builder-runtime-scaffold
Module owner: ai-boundaries

## Scope

Owned paths audited in this lane:

- `components/ai/pricing-intelligence-panel.tsx`
- `components/ai/recipe-scaling-panel.tsx`
- `components/ai/remy-public-widget.tsx`
- `components/ai-privacy/ai-processing-notice.tsx`
- `components/ai-privacy/data-flow-schematic.tsx`
- `components/ai-privacy/remy-gate.tsx`
- `lib/ai/agent-actions/recipe-actions.ts`
- `lib/ai/client-portal-triage.ts`
- `lib/ai/menu-suggestions.ts`
- `lib/ai/privacy-audit.ts`
- `lib/ai/remy-actions.ts`
- `lib/ai/runtime-provider-policy.ts`
- `lib/ai/scheduled/scheduler.ts`

## Pruned

| Path                                           | Class           | Proof                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/ai/pricing-intelligence-panel.tsx` | duplicate       | No exact path import, symbol ref, route ref, or API usage outside itself and `tsconfig.ci.expanded.json`. Event pricing is owned by `components/finance/event-pricing-intelligence-panel.tsx`, imported by `app/(chef)/events/[id]/financial/page.tsx` and `app/(chef)/events/[id]/_components/event-detail-money-tab.tsx`.                                                               |
| `components/ai/recipe-scaling-panel.tsx`       | prune-candidate | No exact path import, symbol ref, route ref, or API usage outside itself and `tsconfig.ci.expanded.json`. It calls `scaleRecipeWithAI`, exposes `Auto Scale`, and renders AI produced technique, equipment, and ingredient scaling notes. AI recipe generation and recipe drafting are banned, so an unused AI recipe scaling UI should not be recovered.                                 |
| `components/ai/remy-public-widget.tsx`         | duplicate       | No exact path import, dynamic import, route ref, or symbol ref outside reports/specs/queue text and `tsconfig.ci.expanded.json`. The active public Remy surface is `components/public/remy-concierge-widget.tsx`, dynamically imported by `app/(public)/layout.tsx`; the active embed intake surface is `public/embed/chefflow-widget.js` plus `components/embed/embed-inquiry-form.tsx`. |

## Kept

| Path                                             | Class            | Proof                                                                                                                                                                                                                             |
| ------------------------------------------------ | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/ai/remy-actions.ts`                         | keep/recover     | Canonical Remy server action in `system/canonical-surfaces.json`; referenced by tests and capability registry. Uses the single Ollama path through `parseWithOllama`.                                                             |
| `lib/ai/menu-suggestions.ts`                     | keep/recover     | Compatibility adapter. Prior freeze register marks exported functions as contract-retained. Implementation delegates to `lib/menus/recipe-book-suggestions-actions.ts`, which searches saved recipes instead of inventing dishes. |
| `lib/ai/agent-actions/recipe-actions.ts`         | policy-tombstone | Empty action list documents the permanent recipe write ban. `lib/ai/agent-actions/index.ts` also records that recipe write actions remain restricted.                                                                             |
| `lib/ai/privacy-audit.ts`                        | policy-tombstone | Importable registry for AI routing policy. Current map uses `ollama` for every module and preserves single-provider evidence.                                                                                                     |
| `components/ai-privacy/remy-gate.tsx`            | keep/recover     | Included in AI runtime coherence tests and imports privacy narrative constants. Useful Remy privacy setup guard.                                                                                                                  |
| `components/ai-privacy/data-flow-schematic.tsx`  | keep/recover     | No live import, but it imports canonical privacy narrative constants and is referenced by AI runtime/privacy docs. Prefer recover or replace under privacy copy work, not silent deletion.                                        |
| `components/ai-privacy/ai-processing-notice.tsx` | keep/recover     | Shared notice component over `lib/ai/privacy-narrative.ts`. No live import found, but it is a low-risk recovery target for centralizing disclosure copy.                                                                          |
| `lib/ai/client-portal-triage.ts`                 | keep/recover     | Authenticated, tenant-scoped server action using `parseWithOllama` for client message triage. No live caller found, but behavior is draft-only and policy-compliant.                                                              |
| `lib/ai/runtime-provider-policy.ts`              | keep/recover     | Wrapper over `lib/ai/dispatch/routing-table` that exposes single-provider runtime policy with `PrimaryProvider = 'ollama'`.                                                                                                       |
| `lib/ai/scheduled/scheduler.ts`                  | keep/recover     | Referenced by `tests/unit/agent-silent-failure-guards.test.ts`; records non-blocking scheduler failures and has tenant mismatch protection in `rescheduleTask`.                                                                   |

## Uncertain

None in this owned lane after pruning the three proven duplicates.

## Validation Notes

- Remove only the three pruned component entries from `tsconfig.ci.expanded.json`.
- Run exact removed-path scan after deletion.
- Run tsconfig missing-file check after deletion.
- Run report em dash and nocheck directive scan before closeout.
