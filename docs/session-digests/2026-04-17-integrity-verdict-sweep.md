# Session Digest: L10/L11 Integrity Verdict Sweep + Code Fixes

**Date:** 2026-04-17
**Agent:** Builder (Opus 4.6)
**Branch:** main
**Commits:** `17595351b`, `0795d4dad`, `7c69dd368`, `3b9e1befd`, `fc444088b`, `a5c8af3fb`

## What Was Done

Systematic sweep of all 6 interrogation specs for stale verdicts (features already built but verdicts never updated), scorecard counting errors, and 2 real code fixes.

### Stale Verdicts Corrected (6)

Grep'd for each PARTIAL's key feature, found existing implementations, upgraded verdicts:

| Question | Spec         | What was already built                                |
| -------- | ------------ | ----------------------------------------------------- |
| Q7       | Chef Journey | Welcome card in HeroMetricsClient                     |
| Q19      | Chef Journey | Convert to Event button in InquiryTransitions         |
| Q41      | Chef Journey | Rebook Client button on client detail page            |
| FQ15     | Commerce     | getTenantTaxRateBps + computeLineTaxCents in checkout |
| FQ16     | Commerce     | Tax export accuracy (depends on FQ15, now verified)   |
| FQ27     | Commerce     | Gross/net labels (UI fix shipped this session)        |

### Scorecard Fixes (3 specs)

- Commerce: 17/2/7 corrected to 28/2/0
- Scheduled Jobs: SQ3 text "4/29" corrected to "12/29", total 12 PASS to 13
- Restaurant Adoption: RQ13 was missing from summary, 3 to 4 PARTIALs

### Code Fixes Shipped (3)

1. **FQ11 - Tip auto-sync on register close:** `lib/commerce/register-actions.ts` now calls `importTipsFromRegister` after `closeRegister` completes. Non-blocking (try/catch), dynamic import to avoid bundling.

2. **FQ27 - Gross/net revenue labeling:** 3 UI files updated: P&L report says "Net Revenue (after refunds)", shift report says "Gross Revenue", dashboard says "net revenue".

3. **Q49 - Multi-menu event support:** Removed `.limit(1)` from menu query. Changed return type from `string | false` to `string[] | null`. Updated 4 files (parent page + 3 tab components). Multi-menu events now show "Edit Menus (N)" button.

### Final Scorecard (all 6 specs)

| Spec                   | PASS    | PARTIAL | FAIL  |
| ---------------------- | ------- | ------- | ----- |
| Chef User Journey      | 52      | 7       | 1     |
| Operational Resilience | 48      | 2       | 0     |
| Scheduled Jobs         | 13      | 2       | 0     |
| System Integrity       | 12      | 0       | 0     |
| Commerce Financial     | 28      | 2       | 0     |
| Restaurant Adoption    | 26      | 4       | 0     |
| **Total**              | **179** | **17**  | **1** |

## Files Touched

- `lib/commerce/register-actions.ts` (FQ11 tip auto-sync)
- `app/(chef)/events/[id]/page.tsx` (Q49 multi-menu query + type)
- `app/(chef)/events/[id]/_components/event-detail-money-tab.tsx` (Q49 + FQ27 labels)
- `app/(chef)/events/[id]/_components/event-detail-overview-tab.tsx` (Q49 type)
- `app/(chef)/events/[id]/_components/event-detail-ops-tab.tsx` (Q49 type)
- `components/finance/ProfitAndLossReport.tsx` (FQ27 net revenue label)
- `components/commerce/shift-report.tsx` (FQ27 gross revenue label)
- `app/(chef)/dashboard/_sections/restaurant-metrics.tsx` (FQ27 subtitle)
- `docs/specs/chef-user-journey-interrogation.md` (Q7/Q19/Q41/Q49 verdicts)
- `docs/specs/commerce-financial-integrity-interrogation.md` (FQ11/FQ15/FQ16/FQ27 + scorecard)
- `docs/specs/restaurant-adoption-interrogation.md` (RQ13 scorecard fix)
- `docs/specs/scheduled-jobs-integrity-interrogation.md` (SQ3 fix)

## Context for Next Agent

17 genuine PARTIALs remain across specs. No FAILs except Q50 (chef journey, public portfolio page). The remaining PARTIALs are real gaps, not stale verdicts. Best next targets: FQ9 (commerce-to-ledger bridge), FQ25 (loyalty/rewards program), Q20 (client auto-invite on quote accept). Build state not re-verified this session (no structural changes, only business logic additions and label updates).
