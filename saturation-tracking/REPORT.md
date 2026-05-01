# Saturation Report

> Generated: 2026-05-01T00:06:00.720Z
> Run: `node devtools/saturation/populate.mjs && node devtools/saturation/report.mjs`

---

## Spec Coverage (496 specs)

| Status      | Count | %      |
| ----------- | ----- | ------ |
| verified | 93 | 19% |
| built | 19 | 4% |
| in-progress | 0 | 0% |
| ready | 61 | 12% |
| draft | 10 | 2% |
| unknown | 313 | 63% |

**Completion rate:** 93/496 verified (19%)
**Ready to build:** 61 specs waiting for a builder agent

Bottleneck: too many specs queued as ready. Prioritize building over speccing.

---

## Audit Freshness (17 audits)

| Audit | Last Run | Changed Files | Decay |
| ----- | -------- | ------------- | ----- |
| admin-client-audit | 2026-03-25 | 3884 | STALE |
| anthropic-follow-on-audit-answers-2026-04-18 | 2026-04-18 | 2267 | STALE |
| anthropic-follow-on-audit-supplement-2026-04-18 | 2026-04-18 | 2267 | STALE |
| anthropic-system-audit-2026-04-18 | 2026-04-18 | 2267 | STALE |
| api-integration-health-audit-implementation | 2026-03-27 | 3855 | STALE |
| app-complete-audit | 2026-04-30 | 0 | fresh |
| dead-code-audit-2026-04-04 | 2026-04-04 | 3341 | STALE |
| external-directory-audit | 2026-03-20 | 4712 | STALE |
| frontend-backend-parity-audit | 2026-03-25 | 3884 | STALE |
| palace-audit-build-spec | 2026-04-25 | 1442 | STALE |
| platform-identity-audit | 2026-03-25 | 3884 | STALE |
| production-readiness-audit-2026-03-18 | 2026-03-18 | 4811 | STALE |
| project-freeze-skill-audit-2026-04-30 | 2026-04-30 | 0 | fresh |
| security-audit-2026-04-04 | 2026-04-04 | 3341 | STALE |
| server-action-audit | 2026-03-25 | 3884 | STALE |
| ui-ux-audit-report | 2026-04-17 | 2595 | STALE |
| zero-hallucination-audit | 2026-03-15 | 5311 | STALE |

**Fresh:** 2 | **Aging:** 0 | **Stale:** 15

Action needed: re-run stale audits: admin-client-audit, anthropic-follow-on-audit-answers-2026-04-18, anthropic-follow-on-audit-supplement-2026-04-18, anthropic-system-audit-2026-04-18, api-integration-health-audit-implementation, dead-code-audit-2026-04-04, external-directory-audit, frontend-backend-parity-audit, palace-audit-build-spec, platform-identity-audit, production-readiness-audit-2026-03-18, security-audit-2026-04-04, server-action-audit, ui-ux-audit-report, zero-hallucination-audit

---

## Persona Test Saturation

| Metric               | Value                |
| -------------------- | -------------------- |
| Formally tested | 11 |
| Defined | 12 |
| Research cataloged | 13 |
| Unique gaps found | 42 |
| **Saturation level** | **MEDIUM** |

Making progress. Prioritize untested persona types, see REGISTRY.md heat map.

---

## Session Topic Frequency (from 72 digests)

_Date range: 2026-04-04 to 2026-04-27_

| Topic | Mentions |
| ----- | -------- |
| draft | 8 |
| audit | 6 |
| openclaw | 5 |
| hardening | 4 |
| mempalace | 4 |
| sweep | 4 |
| system | 4 |
| boundary | 3 |
| client | 3 |
| complete | 3 |
| gap | 3 |
| api | 2 |
| cleanup | 2 |
| closure | 2 |
| cloud | 2 |
| completion | 2 |
| costing | 2 |
| crash | 2 |
| create | 2 |
| date | 2 |

---

## File Attention Heatmap (Last 30 Days)

| File | Commits |
| ---- | ------- |
| app/(chef)/events/[id]/page.tsx | 39 |
| components/navigation/nav-config.tsx | 36 |
| lib/events/transitions.ts | 32 |
| app/(chef)/dashboard/page.tsx | 31 |
| app/api/calling/gather/route.ts | 29 |
| app/(chef)/culinary/price-catalog/catalog-browser.tsx | 22 |
| lib/calling/twilio-actions.ts | 21 |
| lib/events/actions.ts | 21 |
| app/(public)/chef/[slug]/page.tsx | 20 |
| lib/ai/remy-context.ts | 20 |
| app/api/webhooks/stripe/route.ts | 19 |
| app/(chef)/layout.tsx | 18 |
| app/(public)/page.tsx | 18 |
| components/calling/call-hub.tsx | 18 |
| lib/inquiries/actions.ts | 17 |
| lib/inquiries/public-actions.ts | 17 |
| lib/quotes/actions.ts | 17 |
| components/navigation/chef-nav.tsx | 16 |
| components/public/public-inquiry-form.tsx | 16 |
| lib/clients/actions.ts | 16 |

Thrashing risk: app/(chef)/events/[id]/page.tsx has 39 commits in 30 days. Investigate stability.

---

## Quick Summary

- **Specs:** 93/496 verified (19%), 61 ready to build
- **Audits:** 15 stale, need re-run
- **Personas:** MEDIUM saturation (11 tested)
- **Sessions:** 72 digests, top topic: draft (8)
- **Hottest file:** app/(chef)/events/[id]/page.tsx (39 commits/30d)
