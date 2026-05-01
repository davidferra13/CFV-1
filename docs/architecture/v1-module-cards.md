# V1 Module Cards

These cards translate the generated queue taxonomy into build-time context for Codex.

Source evidence:

- `scripts/unified-build-queue/generate.mjs`
- `system/unified-build-queue/candidates.json`
- `system/unified-build-queue/module-batches.json`
- `system/unified-build-queue/approved-batches.json`
- `system/unified-build-queue/summary.json`

Generated evidence snapshot: `2026-04-30T23:37:52.894Z`.

## How To Use These Cards

Before implementation, pick one module card and state:

1. Module owner.
2. Submodule owner.
3. Existing interface to attach to.
4. Invariants the change must preserve.
5. Test surface that proves the module still works.

If a task spans multiple cards, pick the primary owner and name any secondary modules as adapters or dependencies. If no primary owner is clear, stop and route to module review.

The accepted submodule baseline is recorded in `docs/architecture/v1-module-taxonomy-decisions.md`. The ownership scaffold is recorded in `docs/architecture/v1-module-ownership-registry.md`.

## Module Summary

| Module               | Candidates |  V1 | Batches | Approved Batch Tasks |
| -------------------- | ---------: | --: | ------: | -------------------: |
| `pricing-trust`      |         37 |  18 |       7 |                   17 |
| `finance-ledger`     |         22 |  14 |       5 |                   14 |
| `client-intake`      |         30 |  10 |       6 |                    6 |
| `events-ops`         |        100 |  48 |      14 |                   35 |
| `menus-offers`       |         21 |  14 |       3 |                    0 |
| `dietary-safety`     |          8 |   2 |       3 |                    2 |
| `sourcing-inventory` |         46 |  27 |       9 |                    0 |
| `v1-control-plane`   |        245 | 145 |      33 |                    0 |
| `auth-security`      |         64 |  56 |       9 |                    0 |
| `ai-boundaries`      |        136 |  73 |      19 |                    0 |
| `public-trust`       |         12 |   3 |       4 |                    0 |
| `chef-workspace`     |         34 |   5 |       6 |                    0 |
| `staff-partner`      |          9 |   1 |       3 |                    0 |
| `docs-release-proof` |         12 |   0 |       2 |                    0 |
| `unassigned`         |        328 |  51 |      35 |                    0 |

Additional accepted modules not yet emitted by the generator:

| Module                  | Reason                                                                                               |
| ----------------------- | ---------------------------------------------------------------------------------------------------- |
| `client-memory`         | Client truth is a V1 spine endpoint and cannot-fail contract, not just intake or workspace behavior. |
| `quality-hallucination` | No fake UI needs owned patterns plus cross-cutting checks.                                           |

## Pricing Trust

Purpose: pricing, costing, ingredient prices, quote safety, grocery pricing truth.

Backlog shape:

- `37` candidates.
- `18` V1 candidates.
- `7` batches.
- `3` approved batches, `17` approved tasks.

Build posture: current high-priority approved module. Treat pricing work as release-critical unless evidence proves it is V2.

Accepted submodules:

- `price-resolution`
- `pricing-confidence`
- `ingredient-matching`
- `unit-conversion`
- `yield-normalization`
- `quote-safety`
- `cost-export`
- `openclaw-price-adapter`

Likely anchors:

- `lib/pricing/`
- `lib/openclaw/` internal pricing adapters
- `lib/exports/actions.ts`
- recipe and menu costing surfaces
- quote acceptance and quote safety surfaces

Owned invariants:

- No fake prices.
- No failed load rendered as `$0.00`.
- Costing confidence and freshness stay visible.
- Tenant-scoped price and export reads.
- Missing price is represented honestly.

Forbidden moves:

- Do not render missing price as `$0.00`.
- Do not treat modeled price as observed.
- Do not bypass confidence or freshness labels.

Test surface:

- pricing unit tests
- export action tests
- quote safety tests
- typecheck on pricing and export modules

## Finance And Ledger

Purpose: ledger, payments, Stripe, invoices, payouts, cents, billing.

Backlog shape:

- `22` candidates.
- `14` V1 candidates.
- `5` batches.
- `2` approved batches, `14` approved tasks.

Build posture: current high-priority approved module. Treat money movement as append-only and evidence-first.

Accepted submodules:

- `ledger-core`
- `stripe-payments`
- `invoices`
- `quote-payment-boundary`
- `expenses-tax`
- `financial-reports`
- `supporter-contributions`
- `finance-export-adapter`

Likely anchors:

- `lib/ledger/append.ts`
- `lib/ledger/compute.ts`
- `lib/billing/`
- `lib/stripe/`
- finance and invoice routes
- payment webhook routes

Owned invariants:

- Money is stored in cents.
- Ledger entries are immutable and append-only.
- Balances are computed, not stored as mutable truth.
- Payment side effects are idempotent.
- Tenant scoping is mandatory.

Forbidden moves:

- Do not store mutable balances.
- Do not mutate ledger entries.
- Do not treat budget as revenue.

Test surface:

- `npm run test:unit:financial`
- ledger append and compute tests
- payment readiness checks
- webhook idempotency tests

## Client Intake

Purpose: public booking, inquiries, client onboarding, embed intake.

Backlog shape:

- `30` candidates.
- `10` V1 candidates.
- `6` batches.
- `1` approved batch, `6` approved tasks.

Build posture: V1 proof module. Intake must stay public-safe and honest.

Accepted submodules:

- `public-booking`
- `direct-inquiry`
- `embed-intake`
- `intake-lane-truth`
- `booking-follow-through`
- `intake-to-client-adapter`

Likely anchors:

- `app/api/book/route.ts`
- `lib/inquiries/public-actions.ts`
- `public/embed/chefflow-widget.js`
- booking and inquiry routes
- client onboarding actions

Owned invariants:

- Public requests never trust tenant ids from bodies.
- Empty or invalid input is rejected before DB work.
- Public success states do not imply a chef accepted work.
- Rate limits and duplicate protection stay non-silent.
- Embed behavior remains compatible.

Test surface:

- public route unit tests
- intake action tests
- embed widget smoke checks
- Playwright public booking proof when a server is already available

## Events Ops

Purpose: event spine, prep, service, checklist, timeline, guest count, agreement.

Backlog shape:

- `100` candidates.
- `48` V1 candidates.
- `14` batches.
- `5` approved batches, `35` approved tasks.

Build posture: large V1 surface. Use small owner slices, not broad rewrites.

Accepted submodules:

- `event-fsm`
- `event-detail-truth`
- `quote-agreement-boundary`
- `prep-service-readiness`
- `guest-dietary-handoff`
- `service-format-specialization`
- `followup-after-action`
- `event-route-discoverability`

Likely anchors:

- `lib/events/transitions.ts`
- event detail routes
- prep and checklist modules
- guest and timeline components
- agreement and service execution surfaces

Owned invariants:

- Event FSM remains valid.
- Event mutations are tenant scoped.
- Prep and service states do not fake completion.
- Guest counts and timelines come from real data.
- Agreement state is not bypassed by UI shortcuts.

Test surface:

- `npm run test:unit:fsm`
- event server action tests
- event detail route smoke checks
- targeted Playwright for changed event flows

## Menus And Offers

Purpose: menus, offers, proposals, packages, tastings.

Backlog shape:

- `21` candidates.
- `14` V1 candidates.
- `3` batches.
- `0` approved batch tasks.

Build posture: module review before broad build. Avoid recipe generation.

Accepted submodules:

- `menu-builder`
- `proposal-offer-state`
- `recipe-book-search`
- `menu-cost-adapter`
- `public-sample-menus`
- `package-tasting-offers`

Likely anchors:

- `lib/menus/`
- proposal action modules
- menu detail routes
- public sample menu surfaces

Owned invariants:

- AI never generates chef recipes.
- Menu cost and offer math use real data.
- Proposal state transitions are explicit.
- Missing menu data renders honestly.

Test surface:

- menu action tests
- proposal tests
- costing tests where menus affect quotes
- public profile menu rendering tests

## Dietary Safety

Purpose: allergies, dietary restrictions, guest preferences.

Backlog shape:

- `8` candidates.
- `2` V1 candidates.
- `3` batches.
- `1` approved batch, `2` approved tasks.

Build posture: safety-critical when active. Prefer explicit severity and source fields.

Accepted submodules:

- `allergy-records`
- `guest-dietary-handoff`
- `menu-safety-check`
- `severity-source-truth`

Likely anchors:

- guest preference modules
- dietary safety helpers
- menu safety reports
- client and event guest surfaces

Owned invariants:

- Allergy severity is not collapsed into a generic note.
- Guest dietary truth is traceable to real entered data.
- Safety warnings are not hidden as empty states.
- Menu safety does not invent substitutions.

Test surface:

- dietary helper tests
- guest preference action tests
- menu safety report tests
- event guest flow checks

## Sourcing And Inventory

Purpose: sourcing, inventory, pantry, vendors, suppliers, farms, stock.

Backlog shape:

- `46` candidates.
- `27` V1 candidates.
- `9` batches.
- `0` approved batch tasks.

Build posture: substantial future module. Require clear owner before implementation.

Accepted submodules:

- `inventory-quantity-truth`
- `vendor-supplier-truth`
- `pantry-stock-flow`
- `procurement-planning`
- `price-source-adapters`
- `stock-to-costing-adapter`

Likely anchors:

- `lib/inventory/`
- `lib/vendors/`
- sourcing and stock routes
- pantry review modules

Owned invariants:

- Inventory quantities and units remain explicit.
- Vendor and supplier truth is tenant scoped.
- Missing stock is not treated as zero unless proven.
- Source and freshness stay visible.

Test surface:

- inventory action tests
- vendor assignment tests
- unit conversion tests when stock touches costing

## V1 Control Plane

Purpose: Mission Control, V1 builder, queues, receipts, claims, governor.

Backlog shape:

- `245` candidates.
- `145` V1 candidates.
- `33` batches.
- `0` approved batch tasks.

Build posture: huge meta-module. Keep it operational and evidence-driven.

Accepted submodules:

- `v1-roadmap-release-truth`
- `builder-queue`
- `claims-receipts`
- `cannot-fail-gates`
- `validation-proof`
- `cross-system-integrity`
- `mission-control-status`
- `scheduled-ops-proof`
- `planning`

Likely anchors:

- `system/v1-builder/`
- `scripts/v1-builder/`
- `scripts/unified-build-queue/`
- `devtools/agent-*.mjs`
- admin V1 builder routes

Owned invariants:

- Raw candidates are not executable.
- Claims prevent duplicate work.
- Receipts record completion, blocked state, commit, and push truth.
- Blocked and rejected work remains visible.
- Builder automation cannot bypass Founder Authority or hard stops.

Test surface:

- `npm run v1-builder:test`
- unified queue generator checks
- receipt and claim parser tests
- Mission Control route tests when UI changes

## Auth And Security

Purpose: auth, tenant scoping, permissions, Founder Authority, admin.

Backlog shape:

- `64` candidates.
- `56` V1 candidates.
- `9` batches.
- `0` approved batch tasks.

Build posture: security-critical. Scope narrowly and test aggressively.

Accepted submodules:

- `founder-authority`
- `tenant-scoping`
- `role-hierarchy`
- `admin-gates`
- `server-action-auth`
- `public-token-auth`
- `data-portability`
- `secret-management`

Likely anchors:

- auth helpers
- admin guards
- server actions in `lib/**/actions.ts`
- route handlers under `app/api/`

Owned invariants:

- Server actions start with auth unless intentionally public.
- Every DB query is tenant or chef scoped.
- Founder Authority keeps owner-level access.
- Admin-only surfaces stay hidden and guarded.
- Generated database types are not manually edited.

Forbidden moves:

- Do not trust tenant id from request body.
- Do not weaken Founder Authority.
- Do not manually edit `types/database.ts`.

Test surface:

- `npm run test:unit:auth`
- server action guard tests
- route auth tests
- tenant-scope regression checks

## AI Boundaries

Purpose: Remy, Ollama, AI model access, agent behavior.

Backlog shape:

- `136` candidates.
- `73` V1 candidates.
- `19` batches.
- `0` approved batch tasks.

Build posture: high-risk module. Keep the single-provider and no-recipe rules central.

Accepted submodules:

- `ollama-gateway`
- `remy-surfaces`
- `recipe-ip-protection`
- `ai-privacy`
- `ai-tool-permissions`
- `ai-offline-failure`
- `ai-output-validation`

Likely anchors:

- `lib/ai/parse-with-ollama.ts`
- `components/ai/remy-drawer.tsx`
- Remy action modules
- AI privacy and tool routing modules

Owned invariants:

- All inference routes through the single Ollama-compatible gateway.
- No fallback AI provider.
- AI never generates recipes or chef creative IP.
- Offline AI fails clearly.
- AI output is Zod-validated where structured.

Forbidden moves:

- Do not generate recipes.
- Do not add fallback AI providers.
- Do not silently degrade when Ollama is offline.

Test surface:

- AI gateway tests
- Remy boundary tests
- no-recipe-generation scans
- offline runtime behavior tests

## Public Trust

Purpose: public site, SEO, signup, beta, trust surfaces.

Backlog shape:

- `12` candidates.
- `3` V1 candidates.
- `4` batches.
- `0` approved batch tasks.

Build posture: public claims must match product truth.

Accepted submodules:

- `public-homepage`
- `public-chef-profile`
- `nearby-directory`
- `public-seo-metadata`
- `public-claim-flow`
- `public-proof-copy`

Likely anchors:

- public route group
- public navigation config
- public health and readiness routes
- SEO and metadata modules

Owned invariants:

- Public claims do not overstate product capability.
- Public pages do not expose private platform language.
- Signup and beta forms give honest feedback.
- SEO data reflects actual public routes.

Test surface:

- web beta unit tests
- launch surface guard tests
- public coverage tests
- route metadata checks

## Chef Workspace

Purpose: dashboard, calendar, availability, tasks, workspace, command plane.

Backlog shape:

- `34` candidates.
- `5` V1 candidates.
- `6` batches.
- `0` approved batch tasks.

Build posture: attach new work to existing workspace surfaces rather than creating duplicate dashboards.

Accepted submodules:

- `dashboard-return-to-work`
- `task-calendar-command`
- `settings-configuration`
- `mobile-runtime`
- `workspace-navigation`
- `operator-empty-error-states`

Likely anchors:

- dashboard routes
- `components/dashboard/`
- calendar and task modules
- command plane modules

Owned invariants:

- Workspace cards show real data or honest errors.
- Loading states do not stack or duplicate.
- Actions route to functional server paths.
- Calendar and task views share consistent state truth.

Test surface:

- dashboard component tests
- task action tests
- calendar route smoke checks
- experiential tests for workspace changes

## Staff And Partner Ops

Purpose: staff, partners, venues, collaboration, teams.

Backlog shape:

- `9` candidates.
- `1` V1 candidate.
- `3` batches.
- `0` approved batch tasks.

Build posture: small module. Keep role boundaries clear.

Accepted lanes:

- `staff-execution`
- `partner-referrals`

Likely anchors:

- staff routes
- partner portal actions
- venue and collaboration modules

Owned invariants:

- Staff and partner users never gain chef or Founder Authority powers.
- Partner payout and referral data is scoped.
- Staff notifications and profiles remain role-correct.

Test surface:

- staff portal action tests
- partner portal tests
- role boundary checks

## Docs And Release Proof

Purpose: docs, audit, proof, definition of done, release evidence.

Backlog shape:

- `12` candidates.
- `0` V1 candidates.
- `2` batches.
- `0` approved batch tasks.

Build posture: evidence module. Treat docs as proof only when tied to current verification.

Accepted submodules:

- `build-integrity`
- `test-proof`
- `evidence-freshness`
- `release-attestation`
- `documentation-drift`
- `module-ownership-registry`

Likely anchors:

- `docs/build-state.md`
- release verification scripts
- audit reports
- definition of done docs

Owned invariants:

- Historical reports are not current proof.
- Build claims cite commit and dirty state.
- Release docs distinguish verified, stale, blocked, and inferred.

Test surface:

- release verifier scripts
- evidence integrity reports
- docs drift checks

## Unassigned

Purpose: no module owner yet.

Backlog shape:

- `328` candidates.
- `51` V1 candidates.
- `35` batches.
- `0` approved batch tasks.

Build posture: not buildable.

Required action:

1. Read source path and candidate summary.
2. Assign a primary module owner or split into multiple module-owned tasks.
3. Update source evidence or regenerate queue artifacts.
4. Only then promote into a build queue.

Current accepted module-review targets:

- `client-memory`
- `quality-hallucination`
- `validation-proof`
- `build-integrity`
- `cross-system-integrity`
- `data-portability`
- `mobile-runtime`
- `communication-ingestion`
- `role-hierarchy`
- `settings-configuration`

Common signals:

- vague system tasks
- duplicate or stale specs
- Sticky Notes candidates awaiting review
- broad platform shell work
- support tasks that need a clearer module owner
