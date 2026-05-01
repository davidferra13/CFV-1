# Code Reachability Audit

- Date: 2026-05-01
- Scope: production TypeScript and React surface under `app`, `components`, `lib`, and `hooks`
- Source spec: `docs/specs/p1-code-reachability-and-safe-prune-audit.md`
- Method: static import graph from `scripts/audit-reachability.mjs`, plus targeted `rg` checks for seed findings

## Boundary

This audit treats Next.js route files as framework entrypoints. Files under `app/**/page.tsx`, `app/**/route.ts`, `app/**/layout.tsx`, `app/**/loading.tsx`, `app/**/error.tsx`, `app/**/template.tsx`, and `app/**/not-found.tsx` are not dead merely because nothing imports them.

The first pass does not delete, move, or rewrite product code. Static import absence is a signal for classification, not proof that removal is safe.

## Summary

| Area | Files scanned | Production orphans | Used nowhere | Used only by tests or scripts |
| --- | ---: | ---: | ---: | ---: |
| `components` | 1734 | 311 | 311 | 0 |
| `lib` | 2384 | 179 | 150 | 29 |
| `hooks` | 7 | 0 | 0 | 0 |

Total first-pass production-surface orphan signal after the first cleanup pass: 490 files.

## Largest Orphan Buckets

| Area | Bucket | Count | Interpretation |
| --- | --- | ---: | --- |
| `components` | `dashboard` | 31 | Likely old or parallel dashboard surface work. Needs route and import proof before cleanup. |
| `components` | `events` | 27 | High-risk area because event work touches the V1 Spine. Treat as recover or uncertain until checked against event pages. |
| `components` | `finance` | 22 | High-risk area because monetary logic must stay ledger-first. Do not remove without financial flow proof. |
| `components` | `ui` | 21 | Potential shared UI residue. Needs string, dynamic import, and barrel export checks. |
| `components` | `clients` | 16 | Likely mixed client memory, onboarding, and legacy UI. Needs recover-vs-prune review. |
| `lib` | `ai` | 11 | High-risk because AI gateway and recipe restrictions apply. Some files may be policy-only or stale. |
| `lib` | `clients` | 10 | Likely client memory or relationship logic. Needs caller and route proof. |
| `lib` | `communication` | 8 | Could include non-import activation paths. Needs notification and scheduler review. |
| `lib` | `analytics` | 6 | Likely report or dashboard logic. Needs route and test coverage proof. |
| `lib` | `pricing` | 6 | High-risk because Pricing Trust is a V1 cannot-fail module. Keep until proven outside live quoting paths. |

## Seed Findings Checked

| File or cluster | Fresh evidence | Classification |
| --- | --- | --- |
| `hooks/use-field-validation.ts` and `lib/validation/use-field-validation.ts` | Both defined `useFieldValidation`; no production, test, or script caller imported either hook by name in the scanned surface. `lib/validation/form-rules.ts` supports the lib version. | Resolved on 2026-05-01 by deleting the unused root hook and keeping `lib/validation/use-field-validation.ts` as the canonical Form Validation Module. |
| `components/ai/remy-public-widget.tsx` | Static import graph reports no inbound production, test, or script references. | `uncertain`. Remy surfaces can be dynamically embedded or product-owned elsewhere, so inspect public Remy routes before deletion. |
| `components/admin/admin-sidebar.tsx` | Static import graph reports no inbound production, test, or script references. | `duplicate-or-prune-candidate`. Admin shell ownership must be checked first. |
| `components/activity/client-activity-timeline.tsx` | Static import graph reports no inbound production, test, or script references. | `recover-or-prune-candidate`. Client activity may be a real feature that lost route wiring. |
| `lib/ai/menu-suggestions.ts` | Static import graph reports no inbound callers. Targeted search found only its own logging string and an entry in `lib/ai/privacy-audit.ts`. Push snapshot guard still treats `getAIMenuSuggestions` and `getAIMenuSuggestionsFromContext` as exported contract. The implementation delegates to the live read-only recipe-book interface, `lib/menus/recipe-book-suggestions-actions.ts`. | `contract-retained`. Keep until the snapshot contract is intentionally updated, then prune in a separate compatibility-removal slice. |
| `lib/events/fsm.ts` | Targeted search found production imports from `app/api/v2/events/[id]/transition/route.ts`, `lib/events/transitions.ts`, and `lib/events/readiness.ts`, plus unit coverage. | `keep`. The older seed claim that it is test-only is stale. |

## High-Risk Keep Rules

Keep by default until deeper proof exists:

- event FSM, event transition, payment, quote, ledger, and readiness modules
- server actions where non-import activation may happen through forms, route handlers, or scheduled jobs
- webhook, OAuth, cron, scheduled, token, and public embed entrypoints
- Pricing Trust code, unit conversion code, and no-blank price contract code
- AI gateway and Remy policy modules that enforce provider, privacy, or recipe restrictions

## Architecture Candidates

1. Form Validation Module

Files: `hooks/use-field-validation.ts`, `lib/validation/use-field-validation.ts`, `lib/validation/form-rules.ts`

Problem: two shallow hook interfaces expose similar validation behavior with no current production callers. The duplication lowers locality because a future form could import either one.

Solution: completed on 2026-05-01. `lib/validation/use-field-validation.ts` remains the canonical hook next to `form-rules.ts`; the unused root hook was deleted.

Benefits: a single test surface for validation rules, less import ambiguity, and better locality for future form fixes.

2. Remy Public Surface Module

Files: `components/ai/remy-public-widget.tsx`, `lib/ai/remy-actions.ts`, `components/ai/remy-drawer.tsx`, public Remy API routes

Problem: at least one public Remy widget appears orphaned while Remy action files still have policy tests and related routes. The current shape makes it hard to tell which interface is canonical.

Solution: define one Remy Public Surface Module around the actual route and widget entrypoint, then classify older widget code as keep, recover, or prune.

Benefits: stronger locality for AI safety rules and fewer stale assistant surfaces.

3. Admin Shell Module

Files: `components/admin/admin-sidebar.tsx`, `components/navigation/admin-nav-config.ts`, `app/(admin)/layout.tsx`

Problem: `admin-sidebar.tsx` appears unused, but admin route ownership is security-sensitive. A sidebar can be stale UI or a missing shell adapter.

Solution: verify admin shell imports and route policy first, then either recover the sidebar as the shell adapter or remove it as a stale duplicate.

Benefits: clearer admin control-plane ownership and less chance of admin UI drifting into chef workspace navigation.

4. Client Activity Module

Files: `components/activity/client-activity-timeline.tsx`, activity routes, client detail routes

Problem: a client activity timeline appears severed from production. This could be dead UI, or it could be missing discoverability for client memory.

Solution: compare it against current client activity and client memory routes. Classify as recover if it represents real V1 Spine memory, otherwise as prune-candidate.

Benefits: protects client memory while removing unowned activity UI.

## Next Proof Needed

Before any cleanup commit touches product code:

1. Re-run reachability after the worktree is less polluted by unrelated active agent files.
2. For each candidate, search static imports, dynamic imports, string registry references, route links, tests, scripts, and docs.
3. For every `prune-candidate`, require a follow-up diff that deletes only that file or cluster plus any tests that prove removal is safe.
4. Treat `recover` candidates as feature wiring tasks, not cleanup tasks.
