# Metric Truth Registry

The Metric Truth Registry is the canonical inventory of ChefFlow analytics metrics. It gives every portal number a stable id, label, description, source tables, source action, tenant scope, freshness SLA, rollup cadence, value kind, owning domain, and failure behavior.

## Why It Exists

ChefFlow has analytics across `/analytics`, `/insights`, dashboards, daily reports, Remy context, and operational pages. Without a registry, the same business idea can be calculated differently in different surfaces. The registry makes the contract explicit before adding cached rollups, alerts, exports, or new dashboard panels.

## Current Contract

- Source file: `lib/analytics/metric-registry.ts`
- UI surface: `/insights`, Metric Registry tab
- Test file: `tests/unit/metric-registry.test.ts`
- Failure mode: every metric uses `error_state_not_zero`, which means failures must render as an error state instead of a silent zero.
- Scope model: metrics declare `tenant_id`, `chef_id`, or `derived_from_tenant`. New query implementations must still enforce tenant scoping in the server action that reads data.

## Covered Domains

- Money: ledger-backed revenue, payment velocity, outstanding balance, average event value
- Sales: inquiry conversion, quote acceptance, pipeline value, response time SLA
- Growth: repeat rate, lifetime value, acquisition source, dormant clients
- Planning: event volume, status mix, weekday demand, seasonality
- Culinary: menu usage, recipe usage, ingredient usage, dietary frequency, menu coverage
- Inventory: food cost rate, ingredient price freshness
- Operations: phase time, forgotten items, activity volume
- Quality: AAR ratings, client satisfaction, benchmark percentile

## Rules For Adding Metrics

1. Add the definition in `METRIC_DEFINITIONS`.
2. Use a namespaced id such as `culinary.ingredient_usage`.
3. List real source tables and the server action or helper responsible for the calculation.
4. Declare the tenant scope, freshness SLA, rollup cadence, and value kind.
5. Add at least one surface where the metric is used or will be used.
6. Keep the failure mode as `error_state_not_zero`.
7. Extend `tests/unit/metric-registry.test.ts` if the metric introduces a new domain, cadence, or value kind.

No migration is required for the registry itself. Future materialized rollups or snapshots should use additive migrations only and must keep this registry as the source of truth.
