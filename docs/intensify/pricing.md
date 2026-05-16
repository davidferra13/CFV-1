# Intensify: Pricing (PIE) Zone

## Run 2026-05-16

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
