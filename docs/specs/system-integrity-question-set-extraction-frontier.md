# System Integrity Question Set: Extraction Frontier and Cohesion Delta

> Created: 2026-04-18
> Purpose: determine whether the current thread, repo corpus, and available evidence have been fully extracted; identify the remaining cohesion gaps; and define the next high-leverage question set that forces ChefFlow into a fully specified, verifiable state.
> Relationship to prior sets: this is not a replacement for the domain question sets. It is the frontier layer after reviewing the current repo docs, audits, route topology, and currently available external sources.

---

## Executive Answer

**Have we fully extracted everything available in this thread and topic?**

No.

**Have we reached full cohesiveness?**

No.

**Why not?**

1. **MemPalace is named as a core source but is not actually available in this session.**
   - `CLAUDE.md:212` says MemPalace exists and points to `memory/project_mempalace_backlog.md`.
   - `docs/tooling-master-checklist.md:62-69` lists MemPalace as an MCP server.
   - The referenced backlog file is missing from the workspace, and no MemPalace tool is exposed in the current environment.
   - Conclusion: the repo corpus is rich, but it is not the whole knowledge surface.

2. **The evidence layer is not fully trustworthy yet.**
   - `docs/anthropic-unasked-questions-2026-04-18.md:69-111` shows release-gate truth is still under-specified.
   - `docs/anthropic-system-audit-2026-04-18.md:206` warns that green does not mean green right now on the dirty checkout.
   - `docs/anthropic-follow-on-audit-answers-2026-04-18.md:91-120` confirms there is still no single authoritative release gate and that dirty checkouts can inherit a green aura.

3. **Intake parity is still not universal across entrypoints.**
   - `app/api/embed/inquiry/route.ts:187-188` writes dietary/allergy context into the client.
   - `app/api/embed/inquiry/route.ts:278` writes dietary restrictions into the inquiry.
   - `app/api/embed/inquiry/route.ts:336-337` writes dietary restrictions and allergies into the auto-created event.
   - `app/api/book/route.ts:167` parses shared dietary restrictions once.
   - `app/api/book/route.ts:210-211` now writes dietary/allergy context into newly created clients.
   - `app/api/book/route.ts:235` writes dietary restrictions into the inquiry.
   - `app/api/book/route.ts:278-279` now writes dietary restrictions and allergies into the auto-created event.
   - Conclusion: the two main public booking entrypoints are now aligned on this safety path, but full intake parity across all entrypoints is still not proven.

4. **Decision support is still only partially closed-loop.**
   - `lib/intelligence/smart-quote-suggestions.ts:26-196` suggests prices from historical quoted prices and similarity, not from historical profitability.
   - `lib/intelligence/event-context.ts:60-123` separately computes profitability projection and margin warnings.
   - Conclusion: profitability knowledge exists, but the quote engine and the profitability engine are still parallel systems.

5. **Cost truth still depends on refreshed stored columns, not only on live resolution.**
   - `lib/recipes/actions.ts:1995-2019` computes ingredient cost from `cost_per_unit_cents` and `last_price_cents`.
   - `lib/pricing/cost-refresh-actions.ts:156-294` refreshes those columns by resolving prices in batch.
   - `lib/openclaw/sync.ts:602-604` does trigger that refresh non-blocking after sync.
   - Conclusion: the pricing chain is much stronger than before, but recipe costing still depends on refresh discipline rather than a pure live resolution path.

6. **Duplicate or parallel surfaces still exist.**
   - `docs/system-unification-plan.md:123-125` called out duplicate finance, profile, and privacy surfaces.
   - Those surfaces still exist in the app tree:
     - `app/(chef)/financials/page.tsx`
     - `app/(chef)/finance/page.tsx`
     - `app/(chef)/settings/profile/page.tsx`
     - `app/(chef)/settings/my-profile/page.tsx`
     - `app/(public)/privacy/page.tsx`
     - `app/(public)/privacy-policy/page.tsx` (redirect alias)
   - Conclusion: some duplicates have been softened into aliases, some still represent parallel ownership.

7. **The repo contains older claims of total cohesion that the current snapshot cannot safely inherit.**
   - `docs/specs/system-integrity-question-set-cross-system-cohesion.md:152` says "No broken links remain."
   - Current code and current audits show real unresolved seams in intake parity, release-gate truth, and OpenClaw health truth.
   - Conclusion: the corpus itself now needs freshness discipline, not just more feature work.

---

## What Has Already Been Extracted

The current repo corpus already gives strong coverage in these areas:

1. **Canonical identity and scope**
   - `docs/project-definition-and-scope.md`
   - `docs/system-architecture.md`
   - `docs/system-behavior-specification.md`

2. **Current feature and route topology**
   - `docs/app-complete-audit.md`
   - `docs/research/route-discoverability-report.md`
   - `docs/research/production-reachability-report.md`

3. **Cross-system continuity work already done**
   - `docs/system-unification-plan.md`
   - `docs/research/cross-system-continuity-audit.md`
   - `docs/cost-loop-closure.md`
   - `docs/feedback-loop-closure.md`

4. **Operational and evidence-layer audits**
   - `docs/anthropic-system-audit-2026-04-18.md`
   - `docs/anthropic-unasked-questions-2026-04-18.md`
   - `docs/anthropic-follow-on-audit-answers-2026-04-18.md`

5. **Backlog and vision extraction**
   - `docs/autodocket.md`
   - `docs/product-blueprint.md`
   - `project-map/`
   - `MEMORY.md`

6. **Question-set corpus**
   - The repo already contains domain question sets for API routes, auth, onboarding, finance, settings, dashboard, public surface, cross-system cohesion, operational pressure, data export, OpenClaw cohesion, and more.

7. **Current topology scan performed in this session**
   - API route families currently include `149` `v2` routes, `35` `scheduled`, `17` `cron`, `17` `documents`, plus dedicated `integrations`, `kiosk`, `prospecting`, `remy`, `openclaw`, webhook, and storage families.
   - Chef route groups are especially dense in `finance`, `settings`, `culinary`, `clients`, `events`, `commerce`, and `inventory`.

Conclusion: this is not a repo with no extraction. It is a repo with a large extraction corpus and a smaller but very important frontier of unresolved truth and cohesion questions.

---

## What Is Still Not Fully Extracted

These are the remaining blind spots:

1. **MemPalace conversation corpus**
   - Not available through the current tool surface.
   - The repo claims it exists, but the session cannot inspect it directly.
   - This is the largest missing knowledge source.

2. **Freshness of prior question-set conclusions**
   - Some older question sets appear to have been correct for an earlier snapshot but should not be treated as timeless truth.
   - The repo needs a freshness model for "PASS", "fully cohesive", and "done" claims.

3. **Machine truth vs repo truth**
   - OpenClaw health, scheduled tasks, build state, and active topology are still multi-source truths rather than one contract.
   - This means some system questions can only be answered partially from repo inspection.

4. **Entry-point parity across similar user actions**
   - The same user intent often has multiple ingress paths: open booking, embed inquiry, manual inquiry, imports, APIs, cron jobs, scheduled jobs, and token flows.
   - The canonical question is no longer "is the feature built?" but "do all paths produce the same canonical state?"

---

## Current Cohesion Delta

These are the most important currently visible cohesion gaps.

### Delta 1: Evidence truth is weaker than feature truth

The product model is strong. The evidence used to judge the product is not yet equally strong.

- Release gate still lacks one canonical manifest.
- Dirty checkouts can inherit older green language.
- Failing tests still mix stale checks and real signals.
- Older docs can assert total cohesion without current-snapshot attestation.

### Delta 2: Intake parity is not finished

One concrete parity gap is now closed: open booking and embed inquiry both carry dietary/allergy context through inquiry, client, and event creation. But full intake parity is still not finished across the larger family of intake paths.

This is exactly the kind of gap that broad feature counts hide and real-world usage exposes.

### Delta 3: Decision systems are still parallel in places

The repo can compute profitability, can compute smart quote suggestions, can collect AAR feedback, and can generate menu AI suggestions. But those systems are not all consuming each other's best signals yet.

The most important partial bridge right now is:

- price suggestions use price history
- profitability exists
- profitability does not yet appear to drive the price suggestion engine

### Delta 4: Canonical pricing still relies on propagation discipline

The resolve-price engine is real and the sync layer now refreshes costs after sync, but recipe cost computation still reads stored price columns. That means the system is coherent only if propagation succeeds. This is better than dead-end pricing, but weaker than direct canonical resolution.

### Delta 5: Surface ownership is still not fully normalized

Multiple surfaces still represent the same conceptual ownership area:

- finance hub vs financials hub
- profile vs my-profile
- privacy vs privacy-policy aliasing

This creates ambiguity in navigation, support, docs, and future maintenance unless one owner is declared canonical and the others become redirects or clearly scoped variants.

### Delta 6: Corpus drift is now a product risk

The repo has enough documentation that stale certainty is now dangerous. A stale "fully cohesive" claim can mislead builders more than missing documentation would.

---

## The Frontier Question Set

This is the serious, real-world question set that should drive the next cohesion pass.

**How to use it**

- Every question must be answered `YES`, `PARTIAL`, `NO`, or `UNKNOWN`.
- Every non-`YES` answer must cite the owner, source of truth, and fix path.
- If a question applies to multiple entrypoints, it does not pass until all entrypoints pass.
- If a question depends on MemPalace evidence, the system must explicitly mark whether that evidence was available in the audit.

---

## Domain 1: Extraction Completeness and Corpus Trust (Q1-Q5)

**Q1. Can every major "PASS", "green", or "fully cohesive" claim be tied to an exact git snapshot, command set, and dirty-state fingerprint?**
Current signal: NO.

**Q2. Is MemPalace materially available to the person performing the audit, or is the system still claiming an unavailable source as if it were part of the active evidence surface?**
Current signal: NO.

**Q3. Does every major cohesion document carry a freshness boundary stating whether it is executable truth, historical note, design intent, or operator observation?**
Current signal: NO.

**Q4. When two docs disagree, is there one enforced precedence order that builders actually follow in practice?**
Current signal: PARTIAL.

**Q5. Can a new builder answer "what has already been checked off, and what remains unknown" without manually reconciling 20+ documents?**
Current signal: NO.

---

## Domain 2: Intake Parity Across Entry Points (Q6-Q10)

**Q6. Do all public intake paths create the same minimum canonical package: client, inquiry, event seed, source attribution, and safety context?**
Current signal: PARTIAL.

**Q7. Do all intake paths persist dietary restrictions and allergies into the inquiry, client, and event records, not just one of them?**
Current signal: PARTIAL.

**Q8. Do all intake paths preserve budget semantics identically: exact, range, not sure, and unknown?**
Current signal: PARTIAL.

**Q9. Do all intake paths preserve context that matters later, such as favorites, dislikes, serve-time expectations, and additional notes, in fields that downstream systems actually consume?**
Current signal: PARTIAL.

**Q10. Do all intake paths produce the same downstream notification, circle/thread, and event-linkage behavior?**
Current signal: UNKNOWN.

---

## Domain 3: Canonical Entity Continuity (Q11-Q15)

**Q11. Once an inquiry becomes an event, can the event surface the original inquiry context without forcing the chef to route-hop?**
Current signal: PARTIAL.

**Q12. Does every event created from any intake path arrive with enough information for allergen safety checks, shopping, menu context, and client communication?**
Current signal: PARTIAL.

**Q13. Are client merges exhaustive across dependent records, or do merged clients still leave orphaned preferences, loyalty state, notes, or dietary records behind?**
Current signal: PARTIAL.

**Q14. Do event, quote, proposal, document, portal, and ledger surfaces all resolve the same canonical event and client identities without duplicate parallel records?**
Current signal: PARTIAL.

**Q15. Is the event detail page truly the single operational hub, or do critical adjacent contexts still live elsewhere with no embedded bridge?**
Current signal: PARTIAL.

---

## Domain 4: Pricing and Cost Truth (Q16-Q20)

**Q16. Does every recipe cost calculation derive from the canonical price engine itself, not from stale stored columns that only sometimes refresh?**
Current signal: PARTIAL.

**Q17. When OpenClaw, receipts, or manual pricing updates change ingredient truth, do all affected recipes, menus, events, and dashboards converge automatically?**
Current signal: PARTIAL.

**Q18. Do vendor-specific prices participate in canonical price resolution, or are vendor systems still reference-only beside the costing chain?**
Current signal: PARTIAL.

**Q19. Can the chef see planned menu cost, actual spend, quoted price, paid revenue, and margin in one authoritative event view with no contradictory figures?**
Current signal: PARTIAL.

**Q20. Does every price shown in UI carry an honest provenance and freshness story that agrees with the underlying health/status surfaces?**
Current signal: PARTIAL.

---

## Domain 5: Learning and Decision Loops (Q21-Q25)

**Q21. Does smart quote suggestion incorporate historical profitability, not just historical quoted price and similarity?**
Current signal: NO.

**Q22. Do menu AI suggestions use client history, prior outcomes, and AAR feedback, not only current event metadata and recipe names?**
Current signal: PARTIAL.

**Q23. Does AAR timing feedback adjust future prep estimates or workflow timing automatically?**
Current signal: PARTIAL.

**Q24. Do ingredient issue reports from AARs trigger remediation in procurement, vendor review, or future checklist generation?**
Current signal: PARTIAL.

**Q25. Does post-event learning materially improve the next quote, menu, prep plan, and shopping list for a similar event?**
Current signal: PARTIAL.

---

## Domain 6: Surface Ownership, Duplicates, and Discoverability (Q26-Q30)

**Q26. Does every concept have one canonical surface owner and route family, with all other paths clearly redirected or explicitly scoped variants?**
Current signal: PARTIAL.

**Q27. Are all hidden or deep-link-only routes intentionally hidden, documented, and protected from becoming accidental support burdens?**
Current signal: PARTIAL.

**Q28. Are orphan or parallel components and modules either wired into production or explicitly pruned from the mental model?**
Current signal: PARTIAL.

**Q29. Does navigation reflect actual system ownership, or are there still routes that exist without a clear discoverability contract?**
Current signal: PARTIAL.

**Q30. When a user asks "where do I do X?", is there one unambiguous answer for finance, profile, privacy, booking, and other repeated domains?**
Current signal: PARTIAL.

---

## Domain 7: API, Automation, and State Mutation Cohesion (Q31-Q35)

**Q31. Do legacy API routes, `v2` routes, server actions, cron routes, and scheduled routes all enforce the same invariants on the same canonical objects?**
Current signal: PARTIAL.

**Q32. Is every scheduled job attached to an operator-visible status, alert, or audit trail, rather than silently mutating system state off-screen?**
Current signal: PARTIAL.

**Q33. Are `cron` and `scheduled` route families semantically distinct and documented, or are they now two overlapping mutation planes?**
Current signal: PARTIAL.

**Q34. Can every state transition that triggers side effects be traced end-to-end through notification, document, calendar, webhook, and automation delivery evidence?**
Current signal: PARTIAL.

**Q35. Does every mutation bust all relevant cache layers and realtime surfaces, not just the page the builder happened to be looking at?**
Current signal: PARTIAL.

---

## Domain 8: Operational Truth and Host Topology (Q36-Q40)

**Q36. Is OpenClaw health represented by one canonical contract that separates wrapper sync, local mirror freshness, database freshness, and downstream propagation?**
Current signal: NO.

**Q37. Can the system represent partial success explicitly, instead of collapsing mixed states into one red or green label?**
Current signal: NO.

**Q38. Is the live scheduled-task, watchdog, and process topology reproducibly derived from checked-in repo definitions?**
Current signal: PARTIAL.

**Q39. Is "no visible popup windows and no rogue restarts" a standing operational contract rather than a one-time cleanup memory?**
Current signal: PARTIAL.

**Q40. Can the system answer "what is truly running now?" from one authoritative operational surface without manual log archaeology?**
Current signal: NO.

---

## Priority Order

If only five questions are advanced next, they should be these:

1. **Q2** - Is MemPalace actually available as an evidence source for active audits?
2. **Q7** - Do all intake paths persist dietary restrictions and allergies into inquiry, client, and event?
3. **Q1** - Can every "green" or "fully cohesive" claim be tied to the exact current snapshot?
4. **Q21** - Does smart quote suggestion incorporate historical profitability?
5. **Q36** - Is OpenClaw health represented by one canonical multi-stage contract?

---

## Immediate Improvement Queue

These are the concrete next moves that would raise cohesion fastest:

1. **Restore or expose MemPalace access**
   - Either expose the connector in the working environment or export the relevant conversations into repo-accessible artifacts.

2. **Finish intake parity**
   - Audit the remaining intake families against the same contract now shared by `app/api/book/route.ts` and `app/api/embed/inquiry/route.ts`.

3. **Create a release-gate manifest**
   - One file, one command set, one dirty-state policy, one test classification policy.

4. **Close the profitability loop**
   - Feed profitability history into smart quote suggestions and related price guidance.

5. **Create a doc freshness contract**
   - Every "PASS" or "fully cohesive" document needs a freshness label and scope boundary.

6. **Collapse duplicate surface ownership**
   - Finance, profile, and public policy routes need one declared canonical owner each.

7. **Define canonical OpenClaw health**
   - Separate wrapper failure, mirror freshness, DB freshness, and downstream propagation into one shared status schema.

---

## Done When

This extraction frontier is closed only when all of the following are true:

1. MemPalace evidence is either directly accessible or explicitly exported into the active corpus.
2. Every major cohesion claim is tied to a current snapshot and explicit verification method.
3. All major intake paths produce the same canonical downstream safety state.
4. Profitability, AAR feedback, and pricing all participate in the same decision loops.
5. Duplicate surfaces are consolidated or intentionally aliased with documented ownership.
6. OpenClaw and host-process truth are represented through one canonical operational contract.
7. A new builder can answer "what is done, what is partial, what is unknown" without reconstructing the entire project by hand.

---

## Bottom Line

ChefFlow is already much more extracted and much more unified than a random large app. The remaining problem is not lack of thought. It is the smaller, harder layer after broad feature coverage:

- missing access to the best historical corpus
- inconsistent parity across similar entrypoints
- partially open decision loops
- operational truth split across competing evidence surfaces
- stale certainty inside parts of the documentation layer

That is the current frontier.
