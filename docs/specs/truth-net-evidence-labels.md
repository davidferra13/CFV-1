# Spec: Truth Net Evidence Labels

> **Status:** draft
> **Priority:** P1
> **Depends on:** `docs/specs/chef-operating-loop-external-memory.md`
> **Estimated complexity:** medium (3-8 files)

## Developer Notes

### Raw Signal

The research repeatedly separates confirmed facts from claims, inference, unknowns, and disputed items. It describes journalism as a truth net: interviews, documents, timelines, witnesses, contradiction checks, corroboration, and clear labels for what is confirmed, claimed, inferred, unknown, or disputed.

### Developer Intent

- **Core goal:** Make ChefFlow's intelligence trustworthy by labeling source, confidence, and uncertainty consistently.
- **Key constraints:** Do not overclaim. Do not show AI or computed signals as fact without evidence. Do not hide uncertainty behind polished copy.
- **Success from the developer's perspective:** When ChefFlow says something matters, the chef can see why, where it came from, and how certain the system is.

## What This Does

Creates a reusable evidence-label vocabulary and UI pattern for intelligence surfaces: Current, CIL, rail, client profile signals, pricing confidence, vendor extraction, inquiry parsing, and Remy suggestions.

## Existing Grounding

- `lib/current/types.ts` already has a source field.
- `lib/cil` has proactive signals with confidence and source concepts.
- `lib/discovery/chef-rail-contracts.ts` has `confidence`, lifecycle states, and audit events.
- Pricing, vendor document intake, discovery parsing, and platform intelligence specs already use confidence in scattered ways.

## Files To Create

| File                                       | Purpose                                                                  |
| ------------------------------------------ | ------------------------------------------------------------------------ |
| `lib/evidence-labels/types.ts`             | Shared evidence label taxonomy.                                          |
| `lib/evidence-labels/format.ts`            | Formatting helpers for source, confidence, freshness, and uncertainty.   |
| `components/evidence/evidence-pill.tsx`    | Compact label for confirmed/inferred/unknown/stale/disputed.             |
| `components/evidence/evidence-popover.tsx` | Expanded evidence details with source, timestamp, confidence, and route. |
| `tests/unit/evidence-labels.test.ts`       | Taxonomy and formatting coverage.                                        |

## Files To Modify

| File                                                    | What To Change                                                                       |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `lib/current/types.ts`                                  | Add optional evidence metadata without breaking existing collectors.                 |
| `lib/cil/types.ts`                                      | Align signal confidence/source fields with evidence labels.                          |
| `app/(chef)/dashboard/_sections/cil-signal-summary.tsx` | Show evidence pills on signal cards.                                                 |
| `app/(chef)/dashboard/_sections/chef-operator-rail.tsx` | Show confidence/evidence label on rail-derived items.                                |
| `components/vendors/vendor-document-intake.tsx`         | Replace one-off OCR confidence wording with shared evidence label where appropriate. |
| `components/calling/ingredient-resolution-view.tsx`     | Keep existing source health, but align labels with shared taxonomy where low-risk.   |

## Database Changes

None. V1 labels are derived from existing source metadata.

## Evidence Taxonomy

| Label       | Meaning                                                                              |
| ----------- | ------------------------------------------------------------------------------------ |
| `confirmed` | User-entered, verified by source record, paid/accepted/signed, or directly observed. |
| `computed`  | Deterministic calculation from trusted data.                                         |
| `inferred`  | Pattern-derived or AI/computed assumption requiring caution.                         |
| `claimed`   | External or user-provided statement not independently verified.                      |
| `stale`     | Source was once useful but is old enough to reduce trust.                            |
| `unknown`   | Missing data; do not guess.                                                          |
| `disputed`  | Conflicting sources exist.                                                           |

## UI Spec

- Evidence pill appears beside intelligence claims, not beside every static label.
- Popover includes: label, source, last updated, confidence if known, and route to evidence.
- Low-confidence inferred items use subdued styling and must not outrank confirmed urgent items by confidence alone.

## Acceptance Criteria

- Shared evidence components exist and are documented by usage examples.
- CIL/dashboard signals show evidence labels.
- At least one non-CIL surface adopts the shared labels.
- Unit tests cover label selection and formatting.
- Existing pricing confidence behavior is not regressed.

## Edge Cases

| Scenario                  | Correct Behavior                                               |
| ------------------------- | -------------------------------------------------------------- |
| No confidence available   | Show evidence source without fake percentage.                  |
| Multiple sources conflict | Show disputed or mixed evidence, not a single confident label. |
| AI suggestion             | Label inferred unless backed by deterministic source.          |
| Sensitive evidence        | Do not reveal private note content in shared/staff surfaces.   |

## Verification Steps

1. Run evidence label unit tests.
2. Open dashboard CIL signal section.
3. Verify labels show source and uncertainty.
4. Verify popover does not leak private content.
5. Confirm existing pricing/vendor confidence displays still work.
6. Capture screenshots.

## Out Of Scope

- Full audit trail redesign.
- Rewriting pricing confidence.
- Making low-confidence AI decisions automatically actionable.

## Queue-Ready Draft

- **Raw request / source:** Research on journalism, practical transparency, and labeling gaps honestly.
- **Goal:** Add shared truth/evidence labels for intelligence claims.
- **Scope:** Taxonomy, components, first dashboard/CIL adoption, one secondary adoption.
- **Acceptance criteria:** Confirmed/computed/inferred/stale/unknown/disputed labels display correctly.
- **Risks:** Over-labeling the UI; exposing sensitive evidence.
- **Verification:** unit tests, screenshots, privacy review.
