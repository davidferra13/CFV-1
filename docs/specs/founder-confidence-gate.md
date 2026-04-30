# Spec: Founder Confidence Gate

> **Status:** ready
> **Priority:** P0 (blocking)
> **Depends on:** `geographic-pricing-proof-harness.md`, `p0-chef-pricing-readiness-gate.md`, `chefflow-access-revenue-doctrine.md`
> **Estimated complexity:** medium (3-8 files)

## Timeline

| Event                 | Date                 | Agent/Session         | Commit  |
| --------------------- | -------------------- | --------------------- | ------- |
| Created               | 2026-04-30 12:55 EDT | Codex planner session | pending |
| Status: ready         | 2026-04-30 12:55 EDT | Codex planner session | pending |
| Claimed (in-progress) |                      |                       |         |
| Spike completed       |                      |                       |         |
| Pre-flight passed     |                      |                       |         |
| Build completed       |                      |                       |         |
| Type check passed     |                      |                       |         |
| Build check passed    |                      |                       |         |
| Playwright verified   |                      |                       |         |
| Status: verified      |                      |                       |         |

---

## Developer Notes

### Raw Signal

The developer said ChefFlow is an operating system first, but it still needs marketplace-capable infrastructure from day one. Marketplace should not come first, and ChefFlow should not become an extractive lead gate. It should be so good at operating the chef business that marketplace and discovery become natural supporting surfaces.

The developer also described a personal confidence gap. They have built many working hobby apps, but ChefFlow is the first product at this scale where real chefs may depend on it and where charging money becomes a serious ask. They do not want to monetize from hype. They want a real day and a real moment when the product has proven enough reliability that charging feels honest.

The specific confidence threshold was pricing truth. The developer said confidence would rise if Codex and Playwright could spend hours verifying that a chef account can enter ZIP codes across America and price realistic menus reliably. The test should not use one universal national number. It should prove that local or regional data changes by geography, that real and estimated values are separated, and that estimates only fill gaps after a defensible confidence threshold exists.

The developer pictured the pricing system as a growing national mesh: real observations, estimated fill, radius learning, freshness loops, stronger and weaker paths, and repeated revisits until the system has mapped the United States with honest confidence. The emotional core was clear: a chef should not need fake grocery carts, vendor sheets, or spreadsheets just to price a menu. That should be baseline infrastructure.

### Developer Intent

- **Core goal:** Define the exact evidence gate David needs before ChefFlow expands monetization beyond support and before core-adjacent pricing leverage is sold.
- **Key constraints:** Menu pricing stays free. The gate must distinguish workflow success from data truth. It must fail closed when source, freshness, radius, confidence, or fallback evidence is missing. It must not use fake certainty, national averages disguised as local truth, or hardcoded demo paths.
- **Motivation:** ChefFlow cannot ask chefs to pay for leverage until the product proves that its most important promise, honest menu pricing by place, works in reality.
- **Success from the developer's perspective:** Founder Authority can open one admin readiness surface or run one command and see whether ChefFlow has passed the founder confidence threshold, with exact blockers and evidence links.

---

## Continuity Preflight

| Question                            | Answer                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Continuity decision                 | attach                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Canonical owner                     | `docs/chefflow-access-revenue-doctrine.md`, `docs/specs/geographic-pricing-proof-harness.md`, and the existing admin launch-readiness surface                                                                                                                                                                                                                                                                                                                                                        |
| Existing related routes             | `app/(admin)/admin/launch-readiness/page.tsx` already requires admin access and renders launch-readiness checks. Evidence: `app/(admin)/admin/launch-readiness/page.tsx:3`, `app/(admin)/admin/launch-readiness/page.tsx:100-101`, `app/(admin)/admin/launch-readiness/page.tsx:177`                                                                                                                                                                                                                 |
| Existing related modules/components | `lib/validation/launch-readiness.ts` already models readiness checks and final ready or blocked status. Evidence: `lib/validation/launch-readiness.ts:19-44`, `lib/validation/launch-readiness.ts:114-119`, `lib/validation/launch-readiness.ts:640-655`                                                                                                                                                                                                                                             |
| Existing pricing readiness owner    | `lib/pricing/pricing-readiness-actions.ts` already separates chef pricing readiness from market readiness. Evidence: `lib/pricing/pricing-readiness-actions.ts:7-14`, `lib/pricing/pricing-readiness-actions.ts:69-112`, `lib/pricing/pricing-readiness-actions.ts:126-161`                                                                                                                                                                                                                          |
| Existing proof harness owner        | `docs/specs/geographic-pricing-proof-harness.md` defines the national geography x basket proof and quote-safety bridge. Evidence: `docs/specs/geographic-pricing-proof-harness.md:72-98`, `docs/specs/geographic-pricing-proof-harness.md:346-402`, `docs/specs/geographic-pricing-proof-harness.md:543`                                                                                                                                                                                             |
| Existing doctrine owner             | `docs/chefflow-access-revenue-doctrine.md` defines the free pricing rule, paid leverage boundary, marketplace doctrine, pricing truth standard, radius standard, and founder confidence gate. Evidence: `docs/chefflow-access-revenue-doctrine.md:13`, `docs/chefflow-access-revenue-doctrine.md:64`, `docs/chefflow-access-revenue-doctrine.md:113`, `docs/chefflow-access-revenue-doctrine.md:164`, `docs/chefflow-access-revenue-doctrine.md:180`, `docs/chefflow-access-revenue-doctrine.md:188` |
| Recent overlapping commits          | `7679796f6 chore(agent): lock menu pricing access doctrine feature-pwa-device-diagnostics`; `ac2d70a63 chore(agent): build geographic pricing proof spec feature-sticky-notes-intake-build`                                                                                                                                                                                                                                                                                                          |
| Dirty or claimed overlapping files  | Current tree contains unrelated sticky-notes and PWA/mobile dirty work. Do not touch those files from this spec build.                                                                                                                                                                                                                                                                                                                                                                               |
| Duplicate or orphan risk            | Medium. Older readiness specs exist. This spec does not create another pricing gate. It composes existing pricing, geographic proof, launch readiness, Playwright, and doctrine evidence into one founder-facing decision gate.                                                                                                                                                                                                                                                                      |
| Why this is not a duplicate         | Existing specs answer narrower questions: chef pricing readiness, geographic proof, launch readiness, or monetization doctrine. This spec defines the cross-cutting decision threshold for Founder Authority confidence.                                                                                                                                                                                                                                                                             |
| What must not be rebuilt            | Do not rebuild pricing resolution, the geographic proof harness, launch-readiness UI, or the payment stack. Extend and aggregate them.                                                                                                                                                                                                                                                                                                                                                               |

---

## Current State Summary

ChefFlow has the doctrine but not the executable founder gate. The access doctrine already states that ChefFlow will never charge a chef simply to price a menu with honest local pricing data. Evidence: `docs/chefflow-access-revenue-doctrine.md:13`.

The doctrine also separates free core from paid leverage. Evidence: `docs/chefflow-access-revenue-doctrine.md:37` and `docs/chefflow-access-revenue-doctrine.md:64`.

The geographic proof harness spec already defines the missing nationwide pricing truth artifact: one proof row per geography and basket ingredient, with source classification, freshness, unit confidence, quote safety, and blockers. Evidence: `docs/specs/geographic-pricing-proof-harness.md:72-98` and `docs/specs/geographic-pricing-proof-harness.md:346-402`.

The admin launch-readiness page already exists and is admin-gated. Evidence: `app/(admin)/admin/launch-readiness/page.tsx:3`, `app/(admin)/admin/launch-readiness/page.tsx:100-101`, and `app/(admin)/admin/launch-readiness/page.tsx:114`.

The launch-readiness model already returns a report with checks and an overall ready or blocked status. Evidence: `lib/validation/launch-readiness.ts:114-119` and `lib/validation/launch-readiness.ts:640-655`.

The missing piece is a founder-confidence aggregator that says: pricing truth, workflow proof, payment safety, zero-hallucination behavior, and monetization ethics have all passed, or names exactly what is still blocking.

---

## What This Does (Plain English)

This build creates one founder-facing confidence gate. Founder Authority can run a CLI or open the admin launch-readiness surface and see whether ChefFlow is trustworthy enough to expand monetization beyond voluntary support. The gate does not replace pricing proof, Playwright proof, payment checks, or launch readiness. It aggregates them into one fail-closed decision with evidence links and exact blockers.

---

## Why It Matters

ChefFlow's monetization decision should not be based on excitement, fear, or generic SaaS advice. It should be based on proof that the product's foundational promise works: a chef can price a real menu with honest local data and understand any caveats.

---

## Gate Definition

Founder Confidence Gate v1 passes only when all required lanes pass.

| Lane                    | Required Evidence                                                                                                                                             | Failure Behavior                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Pricing truth           | Latest geographic proof run covers the required 56 geographies and required basket with quote-safe or clearly caveated rows                                   | Block monetization expansion                          |
| Radius honesty          | Proof output includes radius, geography, source class, confidence, freshness, and fallback labels                                                             | Block monetization expansion                          |
| Workflow proof          | Playwright or equivalent browser test proves at least 100 chef-account pricing attempts across varied ZIP codes and menu baskets                              | Block monetization expansion                          |
| Real vs estimated truth | UI and reports distinguish real prices from estimated prices and never show estimates as observed facts                                                       | Block monetization expansion                          |
| Payment safety          | Stripe Connect, webhook, ledger, and platform fee health checks are green or explicitly not part of the monetization lane being considered                    | Block paid payment expansion                          |
| Zero hallucination      | Pricing failures produce honest error or caveat states, not zero prices, fake readiness, or blank success                                                     | Block public confidence claim                         |
| Free core protection    | The proposed monetization path does not charge for basic menu pricing or other free-core infrastructure defined in `docs/chefflow-access-revenue-doctrine.md` | Block the monetization proposal                       |
| Founder review          | Founder Authority records an explicit decision: `not_ready`, `pilot_ready`, `support_only`, `paid_leverage_ready`, or `marketplace_experiment_ready`          | Keep the product in support-only or validation status |

## Founder Decision States

The gate should return exactly one state:

- `not_ready`: blockers remain. Do not monetize beyond voluntary support.
- `pilot_ready`: okay for guided pilot use, but not paid leverage.
- `support_only`: product may ask for voluntary support, but no paid leverage.
- `paid_leverage_ready`: product may charge for additive automation, scale, or advanced intelligence after free pricing happens.
- `marketplace_experiment_ready`: product may test marketplace or discovery revenue with clear disclosure and no extractive lead gate.

The gate must include `blockers[]`, `warnings[]`, `evidence[]`, and `nextActions[]`.

---

## Files to Create

| File                                         | Purpose                                                                                       |
| -------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `lib/validation/founder-confidence-gate.ts`  | Pure gate model and scoring logic for Founder Confidence Gate v1                              |
| `devtools/founder-confidence-gate.mjs`       | CLI that loads gate evidence and prints JSON plus a concise terminal summary                  |
| `tests/unit/founder-confidence-gate.test.ts` | Unit tests for pass, fail-closed, missing evidence, free-core violation, and warning behavior |

---

## Files to Modify

| File                                                 | What to Change                                                                                                                   |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `lib/validation/launch-readiness.ts`                 | Add a `founder_confidence_gate` check that reads `evaluateFounderConfidenceGate()` and includes evidence links and blockers      |
| `app/(admin)/admin/launch-readiness/page.tsx`        | Render the new check through the existing check row UI. Do not create a second launch-readiness page                             |
| `lib/validation/launch-readiness-export-contract.ts` | Include Founder Confidence Gate state, blockers, and evidence in exported launch-readiness reports                               |
| `lib/validation/launch-readiness-decision-packet.ts` | Include the founder confidence state in the decision packet so monetization decisions have the same evidence as launch decisions |
| `docs/chefflow-access-revenue-doctrine.md`           | After build, add a short link to the implemented gate and its command                                                            |

---

## Database Changes

None for this spec.

The gate should read existing evidence and the proof artifacts created by `geographic-pricing-proof-harness.md`. If that proof harness later creates database tables, this spec consumes those tables but does not define them.

---

## Data Model

```ts
type FounderConfidenceState =
  | 'not_ready'
  | 'pilot_ready'
  | 'support_only'
  | 'paid_leverage_ready'
  | 'marketplace_experiment_ready'

type FounderConfidenceGateReport = {
  state: FounderConfidenceState
  generatedAt: string
  passed: boolean
  lanes: Array<{
    key:
      | 'pricing_truth'
      | 'radius_honesty'
      | 'workflow_proof'
      | 'real_vs_estimated_truth'
      | 'payment_safety'
      | 'zero_hallucination'
      | 'free_core_protection'
      | 'founder_review'
    label: string
    status: 'passed' | 'blocked' | 'warning' | 'missing'
    evidence: string
    sourcePath?: string
    blocker?: string
  }>
  blockers: string[]
  warnings: string[]
  nextActions: string[]
}
```

The final `passed` value is `true` only for `paid_leverage_ready` or `marketplace_experiment_ready`.

---

## Server Actions

No new server actions are required.

If the admin page needs server-side loading, use a normal server utility in `lib/validation/founder-confidence-gate.ts`, called from the existing admin-gated launch-readiness loader path. Do not create a public API for this gate.

---

## UI / Component Spec

### Page Layout

Use the existing `/admin/launch-readiness` page. Add one readiness check row labeled `Founder Confidence Gate`.

The row should show:

- current state
- pass or blocked badge
- top blocker
- evidence count
- link to doctrine
- link to geographic proof report when available
- link to decision packet export

### States

- **Loading:** Existing server-rendered admin page behavior.
- **Missing evidence:** Status `needs_action`, with the missing lane named.
- **Blocked:** Status `needs_action`, with blocker and next action.
- **Warning:** Status `operator_review`, if human review is required but core data proof is present.
- **Passed:** Status `verified`, only when the gate state is `paid_leverage_ready` or `marketplace_experiment_ready`.

### Interactions

No mutation is required in v1.

Founder review can initially be represented by a documented manual evidence file or decision packet entry. A future version can add explicit admin action buttons if needed.

---

## Edge Cases and Error Handling

| Scenario                                  | Correct Behavior                                                                                                |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Geographic proof harness has never run    | Gate returns `not_ready` with blocker `Missing geographic pricing proof run`                                    |
| Proof exists but is stale                 | Gate returns `not_ready` or warning based on freshness threshold from proof harness                             |
| 100-account workflow test is missing      | Gate blocks monetization expansion even if data proof exists                                                    |
| Payment evidence is missing               | Gate blocks payment-fee or marketplace monetization, but may still allow `support_only`                         |
| Proposed monetization charges for pricing | Gate blocks with free-core violation                                                                            |
| Evidence lookup throws                    | Gate fails closed with `missing` lane status and logs the read failure for admin inspection                     |
| Dirty or stale docs claim readiness       | Gate ignores narrative claims unless linked to executable evidence, proof rows, test output, or decision packet |

---

## Verification Steps

1. Run `npm run typecheck` or the repo's type-check command.
2. Run unit tests for `tests/unit/founder-confidence-gate.test.ts`.
3. Run `node devtools/founder-confidence-gate.mjs --json`.
4. Verify missing geographic proof produces `not_ready`.
5. Verify missing 100-account workflow proof produces `not_ready`.
6. Verify a free-core violation blocks paid leverage.
7. Verify mocked passing evidence returns `paid_leverage_ready`.
8. Open `/admin/launch-readiness` as admin and confirm the Founder Confidence Gate appears in the existing check list.
9. Export the launch-readiness decision packet and confirm the founder confidence state appears.

---

## Out of Scope

- Not implementing the geographic pricing proof harness. That is `docs/specs/geographic-pricing-proof-harness.md`.
- Not changing the pricing resolver.
- Not changing Stripe payment routing.
- Not adding a monetization paywall.
- Not creating a second admin launch-readiness page.
- Not adding public claims that ChefFlow is ready.
- Not changing marketplace behavior.

---

## Spec Validation

1. **What exists today that this touches?** Admin launch readiness exists at `app/(admin)/admin/launch-readiness/page.tsx:100-101`. Launch readiness checks exist in `lib/validation/launch-readiness.ts:281-655`. Pricing readiness exists in `lib/pricing/pricing-readiness-actions.ts:7-14` and `lib/pricing/pricing-readiness-actions.ts:69-161`.
2. **What exactly changes?** Add `lib/validation/founder-confidence-gate.ts`, `devtools/founder-confidence-gate.mjs`, and unit tests. Modify launch-readiness model, page, export, and decision packet to include the gate.
3. **What assumptions are being made?** The geographic proof harness will create or expose queryable proof evidence. This is verified as a spec dependency, not as built code, in `docs/specs/geographic-pricing-proof-harness.md:72-98`.
4. **Where will this most likely break?** Evidence wiring can drift if the geographic proof artifact changes shape. Launch-readiness can become noisy if the new gate over-blocks unrelated release checks. The CLI can become stale if it reads docs instead of executable evidence.
5. **What is underspecified?** The exact storage location for the 100-account workflow proof is not finalized. Builder must choose the simplest existing report location or add a documented JSON output under `reports/`.
6. **Dependencies or prerequisites.** Geographic proof harness, pricing readiness gate, admin launch-readiness surface, and the access doctrine.
7. **Existing logic conflicts.** Must not conflict with `lib/validation/launch-readiness.ts` final ready or blocked computation at `lib/validation/launch-readiness.ts:640-655`.
8. **Duplicate or fragmentation risk.** Avoided by attaching to `/admin/launch-readiness` instead of creating a new readiness page.
9. **End-to-end data flow.** CLI or admin page calls founder gate utility, utility loads proof and readiness evidence, gate returns lane states, launch-readiness model renders or exports the result.
10. **Correct implementation order.** Pure model first, unit tests second, CLI third, launch-readiness integration fourth, admin display fifth, export and decision packet sixth.
11. **Success criteria.** The gate fails closed with missing proof, passes only with all required lanes, appears in admin launch readiness, and exports evidence.
12. **Non-negotiable constraints.** Admin-only visibility, no public readiness claim, no basic pricing paywall, no fake data, no zero-dollar fallback.
13. **What should not be touched.** Pricing resolver, database migrations, Stripe routing, marketplace code, unrelated PWA/mobile work.
14. **Simplest complete version.** Yes. This is an aggregator gate, not a new pricing engine.
15. **If implemented exactly as written, what would still be wrong?** It would still need real proof runs and real Playwright evidence before it can pass. The spec defines the gate; it does not create the underlying truth.

## Final Check

This spec is production-ready as a builder handoff for the Founder Confidence Gate aggregator. It proceeds with one explicit dependency: the geographic proof harness must expose machine-readable evidence before this gate can pass.

---

## Notes for Builder Agent

Keep the gate boring and strict.

Do not turn it into a motivational dashboard. Founder Confidence Gate is a decision contract. It should say passed, blocked, or missing, then point to the evidence.

Do not make monetization decisions inside this gate. The gate reports whether evidence supports a decision. Founder Authority makes the decision.
