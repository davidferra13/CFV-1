# AI Orphan Lanes

- Date: 2026-05-01
- Scope: focused duplicate AI module prune proof
- Owner: `ai-boundaries` duplicate cleanup, with canonical behavior owned by `sourcing-inventory` and `client-intake`
- Owned files: `lib/ai/vendor-comparison.ts`, `lib/ai/lead-scoring.ts`, `docs/reports/ai-orphan-lanes.md`, `docs/reports/prune-candidate-register.md`, `docs/reports/code-reachability-audit.md`
- Decision: prune duplicate

## Candidates

| Candidate                     | Exported surface                                          | Decision |
| ----------------------------- | --------------------------------------------------------- | -------- |
| `lib/ai/vendor-comparison.ts` | `compareVendors`, `VendorEntry`, `VendorComparisonResult` | Deleted  |
| `lib/ai/lead-scoring.ts`      | `scoreInquiry`, `LeadScore`                               | Deleted  |

## Current Reachability Proof

Commands run on branch `feature/v1-builder-runtime-scaffold`:

```text
rg -n --glob '!lib/ai/vendor-comparison.ts' --glob '!docs/**' "lib/ai/vendor-comparison|@/lib/ai/vendor-comparison|vendor-comparison|compareVendors|VendorEntry|VendorComparisonResult" app components lib hooks tests scripts package.json tsconfig.json tsconfig.next.json
```

Result: no live app, component, lib, hook, test, script, or config caller imported the file path or referenced the exported symbols. Broader search found only the candidate file, report text, archive text, active inventory owner paths, and `lib/ai/privacy-audit.ts` metadata strings. The privacy audit file was explicitly out of scope for this worker task and was not edited.

```text
rg -n --glob '!lib/ai/lead-scoring.ts' "@/lib/ai/lead-scoring|scoreInquiry\(|export .*LeadScore" app components lib hooks tests scripts
```

Result: no live caller imported `@/lib/ai/lead-scoring` or invoked its `scoreInquiry` export. Remaining `scoreInquiry` and `LeadScore` hits are separate modules: `lib/leads/scoring.ts`, `lib/gmail/extract-inquiry-fields.ts`, `lib/inquiries/goldmine-lead-score.ts`, inquiry UI components, prospecting scoring, and audit scripts.

```text
rg -n "compareVendors|scoreInquiry\(|lib/ai/vendor-comparison|lib/ai/lead-scoring" app components lib hooks tests scripts docs/reports docs/specs docs/archive
```

Result: candidate declarations plus report or archive mentions only for the two `lib/ai` paths. No runtime import survived.

## Canonical Owners

Vendor comparison is owned by the inventory module:

- `components/inventory/vendor-comparison-panel.tsx` imports `getVendorPricesForIngredient` from `@/lib/inventory/vendor-comparison-actions`.
- `app/(chef)/vendors/[id]/page.tsx` imports and renders `VendorComparisonPanel`.
- `app/(chef)/inventory/ingredients/[id]/page.tsx` imports and renders `VendorComparisonPanel`.
- `lib/inventory/vendor-comparison-actions.ts` owns tenant-scoped vendor price queries, best-price selection, and vendor pricing mutation actions.

GOLDMINE inquiry scoring is owned by the inquiry intake module:

- `lib/gmail/extract-inquiry-fields.ts` exports `extractAndScoreEmail`, `scoreInquiryFields`, and `LeadScoreData`.
- `lib/inquiries/goldmine-lead-score.ts` exports the deterministic GOLDMINE scoring formula through `computeLeadScore` and `scoreFromExtraction`.
- `components/inquiries/lead-score-badge.tsx` renders `LeadScoreData` from the Gmail bridge.
- `app/(chef)/inquiries/[id]/page.tsx` imports `scoreInquiryFields`, `LeadScoreData`, and `LeadScoreBadge`, then renders the stored or computed GOLDMINE score.

## Evidence Classification

- `current-dirty`: `git status --short --branch` showed many unrelated dirty files owned by other agents. None were in the owned paths at task start.
- `heuristic-signal`: targeted `rg` reachability found no live imports or exported-symbol callers for either candidate under `app`, `components`, `lib`, `hooks`, `tests`, or `scripts`.
- `current-dirty`: canonical owner proof comes from current source files in `app`, `components`, and `lib` on the dirty branch.
- `report-artifact`: older docs already classified both files as AI duplicates, but deletion is based on the current proof above.

## Decision

Delete `lib/ai/vendor-comparison.ts` and `lib/ai/lead-scoring.ts`.

Reason: both modules fail the deletion test. Removing them does not push behavior into callers because no caller exists, and the active behavior is already concentrated in canonical inventory and inquiry modules.

## Residual Risk

`lib/ai/privacy-audit.ts` still contains historical metadata keys named `lead-scoring` and `vendor-comparison`. This worker task explicitly excluded privacy audit edits, and those keys are not imports of the deleted files.
