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

## Cannabis Client Actions Slice

- Date: 2026-05-01
- Candidate: `lib/clients/cannabis-client-actions.ts`
- Decision: Delete

### Evidence

`lib/clients/cannabis-client-actions.ts` had no live import path from `app`, `components`, `lib`, `tests`, or `scripts`. Exact symbol and filename search only found historical docs/spec references for `clientHasCannabisAccess`, `getClientCannabisEvents`, and `cannabis-client-actions.ts`.

Canonical cannabis owners exist and are live:

| Owner | Evidence |
| --- | --- |
| `app/(client)/my-cannabis/page.tsx` | Client cannabis portal is intentionally disabled for clients. The route calls `requireClient()` and redirects to `/my-events`. |
| `lib/chef/cannabis-actions.ts` | Chef cannabis actions are imported by `app/(chef)/cannabis/*`, `app/api/cannabis/rsvps/[eventId]/summary/route.ts`, `lib/chef/cannabis-access-guards.ts`, and `app/(chef)/dashboard/_sections/business-section-loader.ts`. |
| `lib/cannabis/invitation-actions.ts` | Public invite claiming is imported by `app/(public)/cannabis-invite/[token]/cannabis-claim-client.tsx`. |
| `lib/cannabis/control-packet-engine.ts` | Control packet engine is imported by chef control packet actions, template page, and unit tests. |

### Commands Run

```text
rg --pcre2 -n "(?<!function\s)\bclientHasCannabisAccess\b|(?<!function\s)\bgetClientCannabisEvents\b|cannabis-client-actions|@/lib/clients/cannabis-client-actions|lib/clients/cannabis-client-actions" app components lib tests scripts docs
rg -n "hasCannabisAccess|getCannabisEvents|getCannabisEventDetails|sendCannabisInvite|getCannabisRSVPDashboardData|updateChefCannabisGuestProfile" app lib tests
rg -n "getCannabisInviteByToken|claimCannabisInvite|buildCannabisHostAgreementSnapshot|generateSeatBlueprint|evaluateReconciliation" app lib tests
```

### Residual Artifact

`tsconfig.ci.expanded.json` contains a generated explicit-file reference to the deleted path. It was not edited because this worker owns only `lib/clients/cannabis-client-actions.ts` and `docs/reports/clients-orphan-lanes.md`.

## Client Duplicate Action Slice

- Date: 2026-05-01
- Scope: `lib/clients/payment-plan-actions.ts`, `lib/clients/loyalty-program.ts`, `lib/clients/passport-actions.ts`, `lib/clients/referral-tree.ts`
- Decision: delete clear unused duplicates, retain ambiguous passport behavior

### Import And Symbol Proof

Commands run:

```text
rg -n "payment-plan-actions|loyalty-program|passport-actions|referral-tree" .
rg -n "\b(getPaymentPlan|calculateInstallments|Installment|PaymentPlanOption|EventPaymentPlan)\b" app components lib tests scripts
rg -n "\b(getClientLoyaltySummary|getLoyaltyRewardCatalog|awardClientLoyaltyBonus|redeemClientLoyaltyReward)\b" app components lib tests scripts
rg -n "\b(getClientPassport|upsertClientPassport|deleteClientPassport)\b" app components lib tests scripts
rg -n "\b(getClientReferralTree|ReferralNode)\b" app components lib tests scripts
```

Results:

| Candidate | Live usage evidence | Decision |
| --- | --- | --- |
| `lib/clients/payment-plan-actions.ts` | No live import path. Symbol search only found the candidate exports plus unrelated generic `Installment` text. Live callers import `getPaymentPlan` from `@/lib/finance/payment-plan-actions`. | Delete |
| `lib/clients/loyalty-program.ts` | No live import path. Exact wrapper symbol search only found the candidate exports. | Delete |
| `lib/clients/passport-actions.ts` | No live import path. Exact symbol search only found the candidate exports. Behavior is not equivalent to `lib/hub/passport-actions.ts`: this file keys passport records by `tenant_id` and `client_id`, supports `deleteClientPassport`, and writes delegate fields. Current orphan-lane rule requires deletion when there are no live callers and no route owner, even if behavior is unique dormant code. | Delete |
| `lib/clients/referral-tree.ts` | No live import path. Exact symbol search only found the candidate exports, except an unrelated `ReferralNode` interface in `lib/intelligence/referral-chain-mapping.ts`. | Delete |

### Canonical Owner Proof

Commands run:

```text
rg -n "@/lib/finance/payment-plan-actions|lib/finance/payment-plan-actions" app components lib tests scripts
rg -n "@/lib/loyalty/actions|lib/loyalty/actions|awardBonusPoints|getClientLoyaltyProfile|getRewards|redeemReward" app components lib tests scripts
rg -n "@/lib/hub/passport-actions|lib/hub/passport-actions|getPassportForProfile|upsertPassport" app components lib tests scripts
rg -n "@/lib/clients/referral-actions|lib/clients/referral-actions|getClientReferral|updateClientReferral|getReferralOptions|client_referrals|referred_by_client_id" app components lib tests scripts
```

Evidence:

| Lane | Canonical owner | Evidence |
| --- | --- | --- |
| Payment plans | `lib/finance/payment-plan-actions.ts` | Imported by `components/finance/payment-plan-panel.tsx`, `app/(chef)/events/[id]/page.tsx`, `app/(chef)/events/[id]/billing/page.tsx`, and Remy intelligence actions. |
| Loyalty | `lib/loyalty/actions.ts` plus `lib/loyalty/store.ts` | Imported by chef loyalty pages, client rewards pages, onboarding, event transitions, and client dashboard actions. |
| Passport | `lib/clients/client-default-knowledge-actions.ts` plus `lib/hub/passport-actions.ts` | `app/(client)/my-profile/page.tsx`, `app/(client)/my-profile/default-knowledge-panel.tsx`, and `app/(client)/book-now/page.tsx` import the default-knowledge owner. It reads and upserts `client_passports` by `tenant_id` plus `client_id`, including delegate fields. `lib/hub/passport-actions.ts` is the dormant hub owner for profile-keyed passport records. |
| Referrals | `lib/clients/referral-actions.ts` and referral health modules | `components/analytics/referral-dashboard.tsx` and `components/clients/referral-panel.tsx` import referral actions. Referral health and client health modules also use referral fields. |

### Deleted Files

- `lib/clients/payment-plan-actions.ts`
- `lib/clients/loyalty-program.ts`
- `lib/clients/passport-actions.ts`
- `lib/clients/referral-tree.ts`

### Deleted Dormant Passport Behavior

`lib/clients/passport-actions.ts` was deleted on 2026-05-01 after focused proof found no live imports, no symbol callers, and no route owner. The deleted dormant code provided chef-authenticated CRUD wrappers around `client_passports` by `tenant_id` and `client_id`, including `getClientPassport`, `upsertClientPassport`, and `deleteClientPassport`. It also wrote communication preferences, chef autonomy, auto-approval cents, service defaults, default locations, delegate fields, and revalidated `/clients/${clientId}`.

The live canonical owner for client self-service passport defaults is `lib/clients/client-default-knowledge-actions.ts`, reached from `app/(client)/my-profile/page.tsx`, `app/(client)/my-profile/default-knowledge-panel.tsx`, and `app/(client)/book-now/page.tsx`. The dormant profile-keyed hub owner remains `lib/hub/passport-actions.ts` with `getPassportForProfile` and `upsertPassport`.

### Passport Orphan Lane Commands

```text
rg -n "passport-actions" app components lib tests scripts docs tsconfig.ci.expanded.json
rg -n -F "@/lib/clients/passport-actions" app components lib tests scripts docs tsconfig.ci.expanded.json
rg -n -F "lib/clients/passport-actions" app components lib tests scripts docs tsconfig.ci.expanded.json
rg -n -F "./passport-actions" app components lib tests scripts docs tsconfig.ci.expanded.json
rg -n -F "../passport-actions" app components lib tests scripts docs tsconfig.ci.expanded.json
rg -n "\b(getClientPassport|upsertClientPassport|deleteClientPassport)\b" app components lib tests scripts docs
rg -n "client-default-knowledge-actions|getMyDefaultKnowledgeSettings|updateMyDefaultKnowledgeSettings|client_passports|CLIENT_PASSPORT_SELECT" "app/(client)" "app/(chef)/clients" components/clients lib tests
rg -n "@/lib/hub/passport-actions|lib/hub/passport-actions|getPassportForProfile|upsertPassport" app components lib tests scripts docs
rg -n -F "./lib/clients/passport-actions.ts" tsconfig.ci.expanded.json
rg -n -F "passport-actions.ts" tsconfig.ci.expanded.json
```

Results: no live `@/lib/clients/passport-actions`, relative import path, or exported-symbol caller was found. Filename hits were limited to this report and historical specs after deletion. `tsconfig.ci.expanded.json` had no explicit `lib/clients/passport-actions.ts` entry, so it was not changed.
