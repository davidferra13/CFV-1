# Intensify: Pricing (PIE) Zone

## Run 2026-05-16 (quick)

STATUS: fresh
DEPTH: quick
YIELD_TREND: stable

SURFACED:

- 5 missing outbound edges: communication (ZERO), invoices (ZERO), events (ZERO), menus (ZERO), proposals (ZERO)
- Strong inbound consumption: quotes, intelligence, openclaw, recipes, procurement, 12+ UI components, 8 cron jobs
- resolve-price chain well-built but results never surface at event/menu creation time
- No cost alerts, no price-justified proposals, no margin visibility on menu builder

ACTED ON:

- (none yet)

SKIPPED:

- pricing -> communication: premature until CIL bridge exists (CIL already produces price-anomaly signals)
- pricing -> proposals: low usage surface currently

NEXT TRIGGER: After pricing->events (auto-cost menu) is wired -> partially-mined; then pricing->menus (live cost annotation)

---

## Deep-Pass Run 2026-05-16

STATUS: partially-mined
DEPTH: normal (2 domain + 1 cross-domain agents)
YIELD_TREND: increasing

SURFACED:

- Accelerator outputs (method_weights, regional_bias_corrections, confidence_calibration) computed every 6h, NEVER consumed by resolve-price or synthetic-engine
- Synthetic engine ignores its own learning (fixed method order despite Law 7 Compound Learning)
- PieAttentionCard component exists with full data pipeline, not rendered on dashboard
- margin-feedback.ts fully built (repricing alerts, spike alerts), zero consumers
- menu-economics-actions.ts fully built (dish-level margin, what-if, seasonal opt), zero consumers
- 6 files read stale `cost_per_unit_cents ?? last_price_cents` instead of calling PIE: food-cost-actions, menu-cost-guard, quote-cost-guard, shopping-list-actions, exports/actions, grazing/actions
- expense-line-item-actions updates ingredient table but never calls processReceiptSignals (PIE ground truth bypass)
- Post-event financial summary computes projected-vs-actual but never feeds variance back to PIE
- CIL inventory analyzer reinvents spike detection PIE already does better
- grocery/pricing-actions.ts has parallel API integration (Spoonacular/Kroger/MealMe) duplicating PIE tiers
- Tier 2 (API Quote) likely dead due to no-cloud mandate (dead latency cost)

LENSES_USED:

- Systems Feedback Engineer: broken information loops are highest-leverage intervention
- Pricing Engine Architect: tiered resolution domain validation, canary recommendations
- Chef-Operator: real user impact (which numbers I look at, when I'd act)
- Data Pipeline Reliability: stale-vs-live consistency, fallback safety
- Product Value Analyst: sequence by user value (C: stop lying, B: surface value, A: infrastructure)

EXPERT_VALIDATION:

- food-cost-actions live PIE wire: endorsed (all 5) - chef's #1 metric showing stale data
- PieAttentionCard render: endorsed (chef + product) - immediate visible value, zero build
- shopping list live PIE: endorsed (pipeline + chef) - second most-viewed price surface
- margin-feedback surface: endorsed (chef) - "I'd reprice immediately"
- accelerator->synthetic wire: endorsed (systems + pricing) - highest leverage infra fix. CAVEAT: require confidence>0.7 AND sample>10 before applying weights
- expense->processReceiptSignals: endorsed (systems) - ground truth pipeline bypass
- costing guards live PIE: endorsed (pipeline) - quotes sent with stale cost basis
- menu-economics surface: endorsed (product) - fully built, just wire
- post-event variance signal: endorsed (systems) - event-level bias detection
- CIL->PIE spike query: endorsed (pricing) - single source of truth for anomalies

EXPERT_ADDITIONS:

- Canary mechanism for learned weights (confidence>0.7, sample>10 per category)
- Tier hit distribution observability (log which tier resolves, detect dead tiers)
- Fallback safety audit (verify resolve-price fallback chain when removing stale-column reads)

REJECTED:

- pricing->communication templates: unstable design space, premature before core numbers correct
- discovery compare budget from PIE: requires multi-chef usage (single user now)
- grocery/pricing-actions merger: circular update risk, needs design not a wire

ACTED ON:

- (pending user selection)

SKIPPED:

- Wholesale intelligence UI: premature until chef has active wholesale accounts
- Discovery budget comparison: requires multi-chef network
- Communication template price trends: needs core pricing correct first

CROSS_REFS:

- [[events]]: event detail should show supply risk + cost projection from PIE
- [[menus]]: menu builder should have live cost annotation via menu-economics
- [[finance]]: food-cost-actions is the highest-priority bypass to fix
- [[cil]]: CIL should consume PIE for spike detection, not reinvent
- [[dashboard]]: PieAttentionCard + margin-feedback both target dashboard surface

NEXT TRIGGER: When top 4 moves (PieAttentionCard, food-cost fix, shopping list, margin-feedback) are live -> near-saturated for outbound wiring. Accelerator wire resets to fresh for compound learning depth.
