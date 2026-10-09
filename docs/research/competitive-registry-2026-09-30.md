# Competitive capability registry

## Purpose and scope

Owner request: "Continue building this", referring to the competitor inventory and a granular competitive capability registry. This adds a read-only product-intelligence layer to `lib/capabilities/registry.ts`; it does not replace that registry, start jobs, change production navigation, or claim parity.

The seed contains 233 distinct named product candidates across 24 editorial categories. The earlier standalone Samsung Food section is folded into the relevant categories. Repeated names and named surfaces such as Instagram Reels are deduplicated. The universe is not exhaustive. Unconfirmed entries may be retired, renamed, ambiguous brands or modules rather than independent products.

Twelve vendor sources were reviewed on September 30, 2026. Eleven currently document offerings; Mealime additionally announces an October 21, 2026 shutdown. This records the announcement, not firsthand proof of actual closure. The remaining 221 candidates require current product research. No competitor account was created or paid for and no competitor workflow was hands-on tested.

There are 46 initial atomic benchmarks. Each records a precise vendor statement, original URL, reviewed date, persona, category, proposed ownership strategy, priority, dependencies, existing canonical capability IDs and ChefFlow-specific acceptance criteria. Acceptance criteria are our proposed bar, not a claim that the cited competitor meets every condition.

## Run the read-only audit

```powershell
node --import tsx scripts/audit-competitive-registry.mjs
node --test --import tsx tests/unit/capabilities.competitive.test.ts
node scripts/audit-competitive-registry-smoke.mjs
```

Optional deterministic snapshot:

```powershell
node --import tsx scripts/audit-competitive-registry.mjs --as-of 2026-09-30 --out-dir reports/competitive-registry
```

Outputs are `competitive-registry.json`, `competitive-registry.md` and a self-contained searchable `competitive-registry.html`. Open the HTML without a server. It contains benchmark, product and proposed-work-order views, source links, category/search filters, observed references and canonical proof states. No third-party scripts, external tracking or live fetches are required.

The audit reads the actual canonical registry and its existing proof evaluator. It checks mapped code references without reading tenant data, credentials or business records. It writes only generated reports inside the selected checkout. This is inert developer tooling; production does not need a restart or deployment for the audit to run.

## Evidence rules

- A named competitor is a candidate, not an automatically verified active product.
- Vendor documentation is not hands-on testing. Source reviews expire after 30 days by default; an announced closure becomes a recheck requirement, never an inferred closure.
- A found directory or file is an investigation lead, not evidence that the named workflow works.
- Canonical `VERIFIED` receipts remain canonical proof. They do not automatically prove the narrower benchmark acceptance criteria or superiority.
- A missing mapped reference means implementation discovery is needed. It does not justify declaring a feature absent.
- The work order is proposed, dependency-aware and deterministic. It is not the executing build queue and does not dispatch agents.
- A retailer checkout handoff remains an external interaction. Payment and accounting infrastructure are not labeled as fully replaced.

## Integration and next implementation work

The extension owns `competitive-catalog.json`, `competitive-benchmarks.json`, `competitive.mjs`, `competitive-report.mjs`, the audit CLI and focused unit tests. Existing capability IDs and statuses are untouched. The focused test filename matches the existing `tests/unit/**/*.test.ts` runner.

Start runtime verification with the guest dinner request, proposal comparison, contextual menu conversation and authoritative booking confirmation. In parallel, verify the professional inquiry/proposal/invoice and recipe/yield/price provenance loops. Consumer recipe import, shared lists and meal planning follow their prerequisite dependencies. Confirm actual behavior on phone and desktop before promoting any competitive claim.

No consumer UX, payment flow, recipe policy or legal agreement is changed by this tooling. Those changes require their own implementation, existing security boundaries, end-to-end tests and established release verification.

## Registry maintenance

Add products as `UNCONFIRMED`, then attach primary documentation with a review date, locator and accurate short paraphrase. Link each benchmark to the specific source/product pair supporting its statement. Update source reviews based on actual rereading, not a timestamp refresh. Add acceptance criteria and dependencies before execution. Run the audit after changes; duplicate IDs, unsafe references, malformed dates, unknown canonical mappings, mismatched sources and dependency cycles fail validation.

No automatic market monitoring is installed. The generated report is a dated snapshot.
