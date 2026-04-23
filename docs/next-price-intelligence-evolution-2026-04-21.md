# Next Price Intelligence Evolution - 2026-04-21

## Assumption

The mission is national price coverage inside ChefFlow's pricing intelligence system, not "every product already has a fresh direct observed price in every market."

## Next Net-New Actions

1. **Canonical price graph.** Build one national price intelligence identity model spanning source, chain, store, product, ingredient, observation, inference, and geography with provenance, confidence, duplicate links, lifecycle state, and publication eligibility. This does not yet exist as a single enforced contract.

2. **Coverage denominator and KPI governor.** Add a state/metro/ZIP/store/category coverage model so the system can answer "how many priceable sources should exist here, how many are discovered, how many have fresh observed prices, how many are inferable, how many are publishable, how many are actually being used downstream." Right now growth cannot be measured honestly.

3. **Entity resolution and merge ledger.** Create a deterministic dedupe and merge engine across chain aliases, duplicate stores, UPC/title drift, product variants, and ingredient mappings with source precedence, survivorship rules, conflict flags, and append-only merge history. More scraping without this just creates sludge.

4. **Priceability and evidence-resolution layer.** Add explicit states such as discoverable, source_live, observable, observed, inferable, publishable, stale, conflicting, unreachable, closed, and needs_review. This is still under-specified and blocks conversion from raw captures into usable pricing facts.

5. **Publication quality gate.** Define hard rules for when an observed or inferred price can surface to ChefFlow, stay internal-only, or enter review. This is the missing trust boundary between OpenClaw ingestion and ChefFlow exposure.

6. **Refresh, decay, and recrawl runtime.** Add staleness scoring, anomaly decay, closure detection, source-specific refresh policy, and recrawl priority. Coverage is meaningless without freshness and survivorship.

7. **Post-ingestion activation bridge.** The moment a source, product, or price clears the gate, route it into recipe costing, substitutions, shopping optimization, alerts, and store-preference surfaces. Otherwise the intelligence layer becomes a dead-end catalog.

8. **Acquisition funnel analytics.** Track the full chain from source -> discovered -> normalized -> observed -> inferable -> publishable -> synced -> consumed -> retained, with source-level and geography-level win rates. This is still missing and is required to know which acquisition paths actually matter.

## Recommended Order

`1 -> 2 -> 3 -> 5 -> 4 -> 6 -> 7 -> 8`

## Related Context

- `docs/specs/openclaw-ideal-runtime-and-national-intelligence.md`
- `docs/specs/universal-price-intelligence.md`
- `docs/openclaw-price-intelligence.md`
