# Clients Orphan Lanes

- Date: 2026-05-01
- Branch: `feature/v1-builder-runtime-scaffold`
- Scope: duplicate client wrapper proof for five owned files only
- Decision: prune pure duplicate wrappers with zero inbound references and live canonical owners

## Guardrails

- No recover or uncertain client files were touched.
- No database files, migrations, generated types, runtime processes, or server controls were touched.
- Searches covered `app`, `components`, `lib`, `tests`, `scripts`, and `docs`.
- Historical report mentions were treated as audit artifacts, not live callers.

## Focused Search Proof

Pre-delete commands run:

```text
rg -n "ClientTimeline|client-timeline" app components lib tests scripts docs
rg -n "ClientValueCard|client-value-card" app components lib tests scripts docs
rg -n "DietarySummaryBadge|dietary-summary-badge" app components lib tests scripts docs
rg -n "NdaBadge|getNdaBadgeStatus|nda-badge" app components lib tests scripts docs
rg -n "TopClientsWidget|top-clients-widget" app components lib tests scripts docs
```

Post-delete exact caller commands run:

```text
rg --pcre2 -n "(?<!Unified)\bClientTimeline\b|client-timeline\.tsx|/client-timeline" app components lib tests scripts
rg --pcre2 -n "\bClientValueCard\b|client-value-card\.tsx|/client-value-card" app components lib tests scripts
rg --pcre2 -n "\bDietarySummaryBadge\b|dietary-summary-badge\.tsx|/dietary-summary-badge" app components lib tests scripts
rg --pcre2 -n "\bNdaBadge\b|\bgetNdaBadgeStatus\b|nda-badge\.tsx|/nda-badge" app components lib tests scripts
rg --pcre2 -n "\bTopClientsWidget\b|top-clients-widget\.tsx|/top-clients-widget" app components lib tests scripts
```

Results:

| Candidate | Search result | Decision |
| --- | --- | --- |
| `components/clients/client-timeline.tsx` | Pre-delete exact export proof only found the candidate. Post-delete exact caller proof returned `NO_CLIENT_TIMELINE_CALLERS`. Broader `getClientTimeline` and `UnifiedClientTimeline` hits are separate canonical activity and relationship timeline owners. | Delete |
| `components/clients/client-value-card.tsx` | Pre-delete exact export proof only found the candidate. Post-delete exact caller proof returned `NO_CLIENT_VALUE_CARD_CALLERS`. | Delete |
| `components/clients/dietary-summary-badge.tsx` | Pre-delete exact export proof only found the candidate. Post-delete exact caller proof returned `NO_DIETARY_SUMMARY_BADGE_CALLERS`. | Delete |
| `components/clients/nda-badge.tsx` | Pre-delete exact export proof only found the candidate. Post-delete exact caller proof returned `NO_NDA_BADGE_CALLERS`. | Delete |
| `components/clients/top-clients-widget.tsx` | Pre-delete exact export proof only found the candidate. Post-delete exact caller proof returned `NO_TOP_CLIENTS_WIDGET_CALLERS`. | Delete |

## Canonical Owner Proof

| Duplicate lane | Canonical owner | Evidence |
| --- | --- | --- |
| Relationship timeline wrapper | `UnifiedClientTimeline` plus `getUnifiedClientTimeline` | `app/(chef)/clients/[id]/page.tsx` imports `getUnifiedClientTimeline` from `@/lib/clients/unified-timeline`, imports `UnifiedClientTimeline` from `@/components/clients/unified-client-timeline`, loads `unifiedTimeline`, and renders `<UnifiedClientTimeline items={unifiedTimeline} unavailable={unifiedTimelineUnavailable} />`. |
| Client detail value card wrapper | Client detail financial section plus `ClientFinancialPanel` and `LTVChart` | `app/(chef)/clients/[id]/page.tsx` imports `ClientFinancialPanel`, loads `getClientFinancialDetail(params.id)`, renders financial detail at the client detail page, and separately renders `LTVChart` when `getClientLTVTrajectory(params.id)` has enough data. |
| Dietary badge wrapper | `AllergyRecordsPanel` | `app/(chef)/clients/[id]/page.tsx` imports `AllergyRecordsPanel` and renders `<AllergyRecordsPanel clientId={client.id} initialRecords={allergyRecords as any} />`. |
| NDA badge wrapper | `NDAPanel` | `app/(chef)/clients/[id]/page.tsx` imports `NDAPanel` from `@/components/protection/nda-panel` and renders the active NDA and photo permission panel. |
| Top clients widget wrapper | `/clients/insights/top-clients` | `app/(chef)/clients/insights/top-clients/page.tsx` is a server page protected by `requireChef()`, uses `getClientsWithStats()`, ranks clients by `totalSpentCents`, and renders the top-client table directly. |

## Deleted Files

- `components/clients/client-timeline.tsx`
- `components/clients/client-value-card.tsx`
- `components/clients/dietary-summary-badge.tsx`
- `components/clients/nda-badge.tsx`
- `components/clients/top-clients-widget.tsx`

## Residual Risk

Low. The deleted files were client components or pure wrappers with no import path, no export reference, and no route-level owner. The remaining client files include active canonical owners and were not touched.
