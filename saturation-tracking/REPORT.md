# Saturation Report

> Generated: 2026-05-14T11:25:15.190Z
> Run: `node devtools/saturation/populate.mjs && node devtools/saturation/report.mjs`

---

## Spec Coverage (537 specs)

| Status      | Count | %    |
| ----------- | ----- | ---- |
| verified    | 92    | 17 % |
| built       | 14    | 3 %  |
| in-progress | 0     | 0 %  |
| ready       | 50    | 9 %  |
| draft       | 11    | 2 %  |
| unknown     | 370   | 69 % |

**Completion rate:** 92/537 verified (17%)
**Ready to build:** 50 specs waiting for a builder agent

Bottleneck: too many specs queued as ready. Prioritize building over speccing.

---

## Audit Freshness (18 audits)

| Audit                                           | Last Run   | Changed Files | Decay |
| ----------------------------------------------- | ---------- | ------------- | ----- |
| admin-client-audit                              | 2026-03-25 | 4947          | STALE |
| anthropic-follow-on-audit-answers-2026-04-18    | 2026-04-18 | 2999          | STALE |
| anthropic-follow-on-audit-supplement-2026-04-18 | 2026-04-18 | 2999          | STALE |
| anthropic-system-audit-2026-04-18               | 2026-04-18 | 2999          | STALE |
| api-integration-health-audit-implementation     | 2026-03-27 | 4469          | STALE |
| app-complete-audit                              | 2026-04-25 | 2355          | STALE |
| chef-portal-navigation-audit                    | 2026-05-11 | 432           | STALE |
| dead-code-audit-2026-04-04                      | 2026-04-04 | 3975          | STALE |
| external-directory-audit                        | 2026-03-20 | 5414          | STALE |
| frontend-backend-parity-audit                   | 2026-03-25 | 4947          | STALE |
| palace-audit-build-spec                         | 2026-04-25 | 2355          | STALE |
| platform-identity-audit                         | 2026-03-25 | 4947          | STALE |
| production-readiness-audit-2026-03-18           | 2026-03-18 | 5784          | STALE |
| security-audit-2026-04-04                       | 2026-04-04 | 3975          | STALE |
| server-action-audit                             | 2026-03-25 | 4947          | STALE |
| ui-ux-audit-report                              | 2026-04-17 | 3213          | STALE |
| wiring-audit                                    | 2026-05-11 | 432           | STALE |
| zero-hallucination-audit                        | 2026-03-15 | 6236          | STALE |

**Fresh:** 0 | **Aging:** 0 | **Stale:** 18

Action needed: re-run stale audits: admin-client-audit, anthropic-follow-on-audit-answers-2026-04-18, anthropic-follow-on-audit-supplement-2026-04-18, anthropic-system-audit-2026-04-18, api-integration-health-audit-implementation, app-complete-audit, chef-portal-navigation-audit, dead-code-audit-2026-04-04, external-directory-audit, frontend-backend-parity-audit, palace-audit-build-spec, platform-identity-audit, production-readiness-audit-2026-03-18, security-audit-2026-04-04, server-action-audit, ui-ux-audit-report, wiring-audit, zero-hallucination-audit

---

## Persona Test Saturation

| Metric               | Value      |
| -------------------- | ---------- |
| Formally tested      | 12         |
| Defined              | 12         |
| Research cataloged   | 0          |
| Unique gaps found    | 42         |
| **Saturation level** | **MEDIUM** |

Making progress. Prioritize untested persona types (see REGISTRY.md heat map).

---

## Session Topic Frequency (from 68 digests)

_Date range: 2026-04-04 to 2026-04-25_

| Topic       | Mentions |
| ----------- | -------- |
| boundary    | 2        |
| remy        | 1        |
| dashboard   | 1        |
| request     | 1        |
| trust       | 1        |
| api         | 1        |
| tenant      | 1        |
| hardening   | 1        |
| runtime     | 1        |
| surface     | 1        |
| enforcement | 1        |
| ingredient  | 1        |
| sourcing    | 1        |
| fallback    | 1        |
| saturation  | 1        |
| tracking    | 1        |

---

## File Attention Heatmap (Last 30 Days)

| File                                               | Commits |
| -------------------------------------------------- | ------- |
| app/(chef)/events/[id]/page.tsx                    | 24      |
| app/(chef)/dashboard/page.tsx                      | 23      |
| lib/events/transitions.ts                          | 22      |
| components/navigation/nav-config.tsx               | 18      |
| lib/events/actions.ts                              | 16      |
| components/navigation/chef-nav.tsx                 | 15      |
| lib/calling/twilio-actions.ts                      | 15      |
| lib/ai/remy-context.ts                             | 14      |
| lib/menus/actions.ts                               | 14      |
| components/calling/call-hub.tsx                    | 14      |
| app/(chef)/layout.tsx                              | 13      |
| lib/clients/actions.ts                             | 13      |
| app/api/calling/gather/route.ts                    | 13      |
| app/globals.css                                    | 12      |
| app/(public)/hub/g/[groupToken]/hub-group-view.tsx | 12      |
| lib/quotes/actions.ts                              | 12      |
| app/(chef)/recipes/[id]/recipe-detail-client.tsx   | 12      |
| lib/quotes/client-actions.ts                       | 12      |
| app/api/webhooks/stripe/route.ts                   | 12      |
| app/(public)/page.tsx                              | 11      |

---

## Quick Summary

- **Specs:** 92/537 verified (17%), 50 ready to build
- **Audits:** 18 stale (need re-run)
- **Personas:** MEDIUM saturation (12 tested)
- **Sessions:** 68 digests, top topic: boundary (2)
- **Hottest file:** app/(chef)/events/[id]/page.tsx (24 commits/30d)
