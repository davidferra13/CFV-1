# System Integrity Question Set: OpenClaw-ChefFlow Cohesion V3

> Companion to:
>
> - `system-integrity-question-set-openclaw-cohesion.md`
> - `system-integrity-question-set-openclaw-cohesion-v2.md`
> - `system-integrity-question-set-openclaw-cohesion-v2-answers.md`
>
> Generated: 2026-04-18
> Status: QUESTIONS DEFINED, ANSWERS PENDING
> Scope: 50 new questions across 10 untouched domains

---

## What V1 And V2 Already Covered (Do Not Re-Ask)

V1 covered:

- geographic equity
- sync pipeline reliability
- price accuracy and trust
- scale and geographic expansion readiness
- security and isolation
- failure propagation
- cross-feature cohesion
- data completeness
- observability
- the first "all users benefit" pass

V2 covered:

- receipt ingestion and manual price entry
- shopping list to store assignment alignment
- event costing and quote/menu/recipe chains
- alias quality and vendor/wholesale ingestion
- yield and waste factor integration
- briefing, forecast, and sale-calendar usage
- exports and attribution
- price watch alerts
- public/client/embed surfaces
- cron coordination
- unbuilt backend follow-ups
- edge cases like zero-ingredient chefs and deleted ingredients

V3 goes deeper into areas V1/V2 only touched indirectly:

- human override governance
- degraded mode behavior
- retryability and reconciliation
- retention and long-term data hygiene
- source semantics and explainability consistency
- ID/model integrity
- time semantics
- public/API machine-consumption risk
- operational replay and runbooks
- collective-learning loops that decide whether "all users benefit" is actually compounding

---

## Domain 25: Human Override Governance

### Q101. Quarantine Review Writeback

When an admin reviews a quarantined OpenClaw price in `openclaw.quarantined_prices` and marks it approved, what exactly happens next? Does approval write the record into `ingredient_price_history`, trigger `refreshIngredientCostsAction()`, and bust relevant caches, or does it only mark the quarantine row as reviewed?

### Q102. Chef-Side Bad Price Override Stickiness

If a chef sees a bad OpenClaw-derived `last_price_cents` on an ingredient and manually corrects it, how long does that correction stay authoritative? Does the next sync overwrite it, or does the manual correction remain sticky until fresher high-confidence evidence arrives?

### Q103. Override Audit Trail Completeness

For every pricing override path available to a human, is there a durable audit trail showing:

- who changed it
- what the previous value was
- why it changed
- whether it was a local override, an admin review, or an automated sync correction

### Q104. Alias Governance Separation

`ingredient_aliases` can be auto-created, confirmed, or dismissed. Are those three states clearly distinguishable in admin/chef tooling, or can a future maintainer mistake "dismissed" for "unmatched" and accidentally re-link something the chef explicitly rejected?

### Q105. Human Correction Feedback Loop

When a human corrects a bad match or bad price, does that correction improve anything upstream:

- Pi source quality
- store accuracy scores
- anomaly thresholds
- alias suggestion quality
  or is the correction isolated to that single local row forever?

---

## Domain 26: Degraded Mode Truthfulness

### Q106. Pi Offline UX Consistency

When the Pi is down, do **all** user-facing OpenClaw actions fail in a consistent and honest way? Compare:

- sale calendar
- weekly briefing
- price watch
- catalog browser
- shopping optimization
- cart repricing
- vendor import

Do they all say some form of "data engine temporarily unavailable," or do some silently degrade into partial stale behavior?

### Q107. Partial Data vs No Data Distinction

Across pricing surfaces, is there a clear distinction between:

- "we have no data for this ingredient/store"
- "the Pi is offline right now"
- "we only have stale cached data"
- "we have data, but not enough confidence to show it"

If those states collapse into the same empty UI, the system is not fully specified.

### Q108. Fire-and-Forget Side Effect Visibility

Many follow-up actions are explicitly non-blocking: cost refresh, polish, Pi push, webhook emit, catalog suggestions. When one of those fails, is there any persistent operator-visible record, or does the failure exist only in logs that no chef or admin will ever read?

### Q109. Recovery After Temporary Pi Outage

If the Pi is down for 6 hours and comes back, does ChefFlow have a defined catch-up path for everything it missed during that window:

- sync
- receipt pushes
- vendor confirms
- unmatched-name suggestions
- mark-synced callbacks
  or do some operations just vanish into the gap?

### Q110. Stale Cache Honesty Under Outage

When Pi-backed features are cached, can the system continue serving old results without any indication that the live backend is down? If yes, is that deliberate and clearly labeled, or accidental?

---

## Domain 27: Retryability And Reconciliation

### Q111. Receipt Push Retry Gap

`receipt-scan-actions.ts` pushes imported prices back to Pi in a non-blocking call. If that call fails, is there any retry queue or later reconciliation job, or is cross-tenant benefit permanently lost for that receipt?

### Q112. Vendor Confirm Reconciliation Gap

If `/api/vendor/confirm` succeeds on Pi but local ChefFlow never mirrors the result into durable local pricing history, is there any later reconciliation job that can repair that split-brain state?

### Q113. Mark-Synced Failure Consequences

Several handlers mark items "synced" on the Pi in non-blocking paths. If the local write succeeds but the mark-synced call fails, will the next run duplicate work? Is that duplication benign, idempotent, or can it create reprocessing drift?

### Q114. Post-Sync Cascade Self-Healing

If sync succeeds but `refreshIngredientCostsAction()` or the polish job fails afterward, does a later sync or cron run automatically heal downstream state, or can ingredient cost fields and derived summaries remain stale indefinitely?

### Q115. Replayability Of A Single Failed Step

For every major cartridge or downstream step, can an operator safely rerun just that failed step without rerunning the whole system? If not, which parts require full pipeline replay to recover?

---

## Domain 28: Retention, Hygiene, And Long-Term Data Shape

### Q116. Price History Retention Policy

What is the intended retention policy for `ingredient_price_history`? Does the table grow forever, and if so, at what point do queries, materialized views, and monthly aggregates become operationally expensive?

### Q117. Quarantine Backlog Lifecycle

What is supposed to happen to old reviewed and unreviewed quarantine rows over time? Is there a cleanup/archival policy, or does the system assume the quarantine table can grow without affecting observability and admin usefulness?

### Q118. Flyer Archive Lifetime

`flyer-archiver.ts` exists to preserve flyer history. Is old flyer data ever pruned, compacted, or downsampled? If not, what prevents that archive from turning into a write-only historical sink nobody can query effectively?

### Q119. Dead Watch / Dead Cart Hygiene

Do old `price_watch_list`, `shopping_carts`, and `shopping_cart_items` rows ever get pruned or auto-archived? If chefs never clean them up, do stale preferences and stale watch targets distort future system behavior?

### Q120. Analytics Distortion From Deleted Or Archived Ingredients

When ingredients are archived vs deleted, do historical price analytics, volatility, and monthly summaries treat them consistently? Could archived/deleted lifecycle choices skew aggregates used for active ingredients?

---

## Domain 29: Source Semantics And Explainability Consistency

### Q121. Same Resolver, Different Story

If the same resolved price is shown on:

- ingredient detail
- grocery list
- event costing
- menu intelligence
- weekly briefing
  does each surface describe the source/freshness/confidence the same way, or can the same number be framed differently enough to erode trust?

### Q122. "Estimated" vs "Observed" Language Discipline

Which surfaces clearly distinguish between:

- observed purchase evidence
- live scrape evidence
- market/regional aggregate
- category fallback estimate

If some surfaces flatten these into a single "price" concept, the system is still semantically ambiguous.

### Q123. Freshness Threshold Drift

Different tiers use different recency windows. Are those windows explained consistently to users anywhere, or can one surface call a value "fresh" that another surface would implicitly treat as stale?

### Q124. Missing Price Copy Actionability

When the system has no price, does the UI consistently tell the chef what action unlocks progress:

- scan a receipt
- confirm an alias
- wait for sync
- choose a covered store
- use vendor import
  or is "no data" presented without a next step?

### Q125. Public vs Private Source Story

Are public pages, chef pages, and internal admin pages aligned on what the price means and where it came from, or could a user compare two surfaces and conclude the system is contradicting itself?

---

## Domain 30: Data Model Integrity And ID Semantics

### Q126. Wholesale ID Validity

`wholesale-handler.ts` writes `canonical_ingredient_id` into `ingredient_price_history.ingredient_id`, but that column is FK-linked to `ingredients.id`. Are those ID spaces truly compatible, or is there a hidden model assumption here that should be made explicit and verified?

### Q127. Canonical vs System vs Chef Ingredient Namespace Discipline

Across:

- `ingredients.id`
- `system_ingredients.id`
- `openclaw.canonical_ingredients.ingredient_id`
- `ingredient_aliases.system_ingredient_id`
  is there any path where IDs from one namespace are treated as if they belong to another? Where are the boundary assertions?

### Q128. Dual Linking Drift

If the system uses both `ingredients.system_ingredient_id` and `ingredient_aliases.system_ingredient_id` in different places, can those two representations drift apart? If so, which one is authoritative?

### Q129. Null-Tenant Shared Data Semantics

`openclaw_wholesale` rows are shared via `tenant_id IS NULL`. Is every consumer that reads `ingredient_price_history` aware of that exception, or are there surfaces that silently exclude or mishandle shared rows?

### Q130. Legacy Null Geography In State-Aware Averages

After adding `store_state` and state-aware regional averages, what do legacy rows with null geography actually mean? Is the fallback honest, or can old pre-state rows still distort current "regional" labels?

---

## Domain 31: Time Semantics And Freshness Fidelity

### Q131. Date vs Timestamp Precision Loss

Many local pricing rows are stored and sorted by `purchase_date` rather than a full timestamp. When two prices from the same source/store/ingredient arrive on the same day, is the system guaranteed to preserve "newest wins," or does date-only storage blur that distinction?

### Q132. Timezone Boundary Integrity

Pi and PC do not necessarily share the same timezone assumptions. For every field crossing the boundary:

- `confirmed_at`
- `purchase_date`
- `last_seen_at`
- `last_price_date`
- weekly briefing windows
- freshness dots
  is the timestamp semantics explicit and consistent?

### Q133. Daily Window Drift In Alerts And Briefings

Price watch alerts, weekly briefing comparisons, and stale thresholds all depend on calendar windows. Are those windows computed in tenant-local time, server-local time, Pi time, or UTC? If different features use different clocks, users can see contradictory "today/this week" behavior.

### Q134. Sync Audit Timing Truth

`sync_audit_log` records started/completed timestamps. Do those timestamps measure:

- Pi fetch completion
- local DB write completion
- downstream materialized view refresh completion
- post-sync cost refresh completion
  or only part of the journey?

### Q135. Freshness Surface Agreement

If an ingredient page, weekly briefing, and event costing page all depend on the same underlying price, can they disagree about how old that price is because they derive freshness from different fields?

---

## Domain 32: Public And API Machine Surfaces

### Q136. Public Ingredient API Abuse Resistance

Public ingredient pages and APIs expose shared catalog data. Is there any rate limiting, scraping protection, or abuse control on those routes, or can a third party continuously mine the catalog with no operational boundary?

### Q137. Search Endpoint Blast Radius

Public ingredient search and lookup paths can fan out across canonical ingredients, normalization maps, and store products. What prevents abusive queries from becoming an accidental public analytics workload?

### Q138. Sync Receiver Trust Boundary

`sync-receiver.ts` accepts sync payloads into ChefFlow. How is authenticity, replay protection, and source identity established there? If a caller can imitate the Pi, what stops poisoned sync traffic from entering the system?

### Q139. Image Proxy Abuse Separation

The image proxy was audited earlier for SSRF. But are OpenClaw image consumers scoped so that a public-user image request can never reach private/internal image sources or leak operational metadata?

### Q140. Public Data Volume Transparency

Does the public layer communicate that it serves shared market data rather than chef-specific purchase data? If a public consumer assumes the catalog is real-time and exhaustive, is there enough copy to prevent misuse?

---

## Domain 33: Operational Replay, Runbooks, And Safe Recovery

### Q141. Single-Cartridge Replay Safety

For each cartridge in `cartridge-registry.ts`, can an operator rerun it independently with confidence that:

- it is idempotent
- it will not double-write
- it will not desynchronize adjacent steps

### Q142. "Rebuild From Truth" Procedure

If derived state gets corrupted, is there a defined recovery procedure that rebuilds:

- ingredient price fields
- recipe costs
- menu summaries
- regional/category aggregates
- polish enrichments
  from authoritative history rather than patching fields ad hoc?

### Q143. Disconnected Module Detection

If modules like `flyer-archiver.ts`, `store-accuracy-scorer.ts`, or `seasonal-analyzer.ts` are expected to matter operationally, what proves they are actually wired into a scheduler or invocation chain? Is there a registry or only tribal knowledge?

### Q144. Failure Taxonomy Completeness

When something goes wrong, can an operator distinguish:

- bad source data
- Pi outage
- auth failure
- local DB write failure
- downstream cascade failure
- stale cache
  from the recorded telemetry alone?

### Q145. Dry-Run Trustworthiness

For sync, polish, and cartridge execution, does "dry run" really simulate the same matching and validation path without side effects, or are operators trusting a dry-run mode that does not exercise the full real workflow?

---

## Domain 34: Collective Learning And "All Users Benefit" Compounding

### Q146. Which Corrections Compound Globally

Make a precise map of which human/system actions actually improve the system for everyone:

- receipt scan
- manual price log
- vendor import
- alias confirm
- alias dismiss
- quarantine review
- store accuracy review
- unmatched catalog suggestion

Which of these truly compound, and which only help one chef locally?

### Q147. Coverage Prioritization By Demand

If many chefs repeatedly search for stores or ingredients with no coverage, does the system aggregate that unmet demand anywhere to prioritize:

- new scrapers
- new store onboarding
- new normalization work
- new catalog ingestion

### Q148. Store Accuracy Feedback Utilization

If store accuracy is computed from receipts vs scrapes, does that metric feed back into any future decision:

- source weighting
- trust badges
- store ranking
- scraper tuning
  or is it a dead-end analytic artifact?

### Q149. Negative Learning Risk

Could one chef’s bad or noisy data harm everyone else? For example:

- malformed receipt push
- bad vendor import
- incorrect canonical mapping
- weak normalization suggestion
  Where are the safeguards that prevent global learning from becoming global contamination?

### Q150. System-Wide Benefit Accounting

If the philosophy is "all users benefit unless very specific," can the current system actually prove that philosophy with metrics? What are the measurable compounding loops, and where are the blind spots where local effort still fails to become shared advantage?

---

## Scoring

Same scoring rubric as V1 and V2:

| Grade      | Meaning                                                                                  |
| ---------- | ---------------------------------------------------------------------------------------- |
| SOLID      | Verified working correctly with code evidence                                            |
| ACCEPTABLE | Works but has a minor gap or edge case                                                   |
| GAP        | Missing functionality that affects users                                                 |
| RISK       | Could cause incorrect data, silent failure, security exposure, or long-term system drift |

**Target: 45/50 SOLID or ACCEPTABLE (90%)**

---

## Why These Questions Matter

V1 and V2 proved the OpenClaw integration is real and mostly coherent. V3 is not about whether the system basically works. It is about whether the system is:

- reversible when it is wrong
- honest when dependencies degrade
- internally consistent about time and source semantics
- safe to replay
- structurally clean about ID boundaries
- genuinely compounding improvements across users

Those are the remaining rocks.
