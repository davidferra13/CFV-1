# ADR-001: PIE National Architecture

**Status:** Accepted
**Date:** 2026-05-04
**Decision makers:** David (product owner), Claude (architect)

## Context

ChefFlow has a working pricing intelligence engine (PIE) running on a
Raspberry Pi with ~70K canonical ingredients, 245K prices, and 150K+ stores.
It serves one chef today. The vision is to serve millions of food professionals
across America.

This ADR records the architectural decisions that govern PIE's evolution from
a personal tool to national infrastructure.

## Decision

### 1. PIE is a separate service, not a ChefFlow feature

**Why:** At national scale, PIE has value independent of ChefFlow. Recipe apps,
meal planners, restaurant management tools all want pricing data. Coupling PIE
to ChefFlow limits its addressable market and makes it harder to scale independently.

**Implication:** PIE exposes a public API. ChefFlow is PIE's first client, not
its only client. PIE's data layer, sync pipeline, and intelligence engine are
architecturally separable from ChefFlow's UI and business logic.

### 2. Ingredient-level, not SKU-level

**Why:** Chefs think in ingredients ("chicken breast"), not products ("Tyson
Boneless Skinless Chicken Breast 3lb"). SKU-level is what grocery apps do.
Ingredient-level requires normalization (the hard problem) but delivers
dramatically more useful results for food professionals.

**Implication:** The normalization_map (product -> canonical_ingredient) is the
core intellectual property. It must be accurate, growing, and protected.
Census is measured in ingredients, not products.

### 3. Self-hosted first, cloud optional

**Why:** $0/month infrastructure. No cloud dependency. Full data ownership.
A Raspberry Pi runs the entire acquisition pipeline today. This architecture
scales further than most assume (the Pi handles 245K prices at 85% CPU/memory).

**Implication:** All processing must work on modest hardware. No services that
require cloud-scale compute. Docker images for self-hosted deployment. Cloud
is a distribution option, not a requirement.

### 4. Synthetic pricing fills every gap

**Why:** Law 9 (Synthetic Pricing) demands that every ingredient in the Census
has a price. Real data is better but takes time to acquire. Synthetics ensure
zero dead zones while real data accumulates.

**Implication:** Every ingredient is priced from day one. Synthetics are clearly
marked with confidence scores. The system never returns "no data." Synthetic
accuracy improves as real data validates and calibrates the models.

### 5. Geographic resolution at pricing-region level

**Why:** National averages are useless for purchasing decisions. A chef in NYC
and a chef in rural Kansas need different prices. ZIP-code level is ideal but
requires massive data density. Pricing regions (~400 metro/micro areas) balance
accuracy with feasibility.

**Implication:** Every price is tagged with a region. Resolution order:
store -> metro -> state -> multi-state -> national. The system degrades
gracefully through geographic tiers.

### 6. Compound learning is architectural, not aspirational

**Why:** Law 7 demands that PIE gets smarter every day without human intervention.
This means models must be designed to calibrate against incoming data, seasonal
patterns must sharpen with each year, and anomaly detection must learn from
every incident.

**Implication:** Price history is never deleted. Validation results feed back
into model weights. Seasonal indices recalculate annually. Volatility scores
update continuously. The architecture is designed for learning loops, not
static lookup tables.

### 7. 8-skill operational model

**Why:** PIE is complex enough that a single monolithic skill can't manage it.
Separating concerns (measure, improve, validate, alert, expand, forecast, fix,
coordinate) allows each operation to run independently, on different schedules,
with clear responsibilities.

**Skills:**

- `/pie` - command center (dispatch + dashboard)
- `/pie-measure` - read-only metrics snapshot
- `/pie-ratchet` - monotonic improvement (Layer 1 + 2)
- `/pie-accuracy` - ground truth validation
- `/pie-alert` - regression and failure detection
- `/pie-census` - ingredient manifest expansion
- `/pie-forecast` - Layer 2 intelligence building
- `/pie-fix` - reactive Law violation repair

**Implication:** Each skill has a clear trigger, gate check, and output format.
The operational runbook defines how they coordinate. New skills can be added
without modifying existing ones.

### 8. Layer-gated intelligence

**Why:** Building trends and forecasts on unreliable price data produces
confident lies. Layer 2 (intelligence) must wait for Layer 1 (resolution) to
be solid.

**Layers:**

1. Price Resolution (coverage, freshness, accuracy)
2. Trend Intelligence (volatility, seasonality, forecasting)
3. Menu Economics (food cost %, margin, substitution)
4. Purchasing Intelligence (store optimization, timing, bulk)
5. Market Positioning (benchmarks, pricing power)
6. Predictive Supply Chain (origin, shortage, carbon)

**Implication:** `/pie-forecast` has a gate check (coverage > 80%). The ratchet
prioritizes Layer 1 opportunities over Layer 2 at equal scores. No skipping ahead.

### 9. Network effect without user labor (Law 13)

**Why:** Users must never feel like data farmers. The system works perfectly
at zero user contributions. But passive signals (receipt photos, location data)
from users make it better for everyone, creating a defensible network effect.

**Implication:** Receipt OCR is opt-in, zero-effort (photograph, done), and
processed locally. Aggregate signals are anonymized. The system never degrades
if users stop contributing. OpenClaw is the floor; user signals are the ceiling.

### 10. API-first monetization path

**Why:** The long-term value of PIE is as infrastructure that other food
applications consume. ChefFlow is the vertical integration play; the API is
the horizontal platform play.

**Tiers:** Free (50 req/day) -> Pro (5K/day) -> Business (50K/day) -> Enterprise
**Implication:** API response shapes are designed now, even if the API doesn't
launch for 6+ months. Data structures support external consumption natively.

## Alternatives Considered

### Cloud-first architecture

Rejected. Violates $0 infrastructure mandate. Creates vendor dependency.
Current Pi architecture proves the concept scales further than expected.

### Product/SKU-level pricing

Rejected. Doesn't serve the food professional use case. Chefs don't buy
specific SKUs; they buy ingredients. Normalization is harder but more valuable.

### Crowdsourced pricing

Rejected (as primary source). Violates Law 13. Users must never be the
primary data source. OpenClaw provides the floor. User signals are bonus.

### Single monolithic pricing skill

Rejected. Too complex for one skill to handle measurement, improvement,
validation, alerting, expansion, forecasting, and repair. Separation of
concerns enables independent operation and clearer accountability.

## Consequences

**Positive:**

- Clear separation of concerns across 8 skills
- Phase-gated progress prevents building on weak foundations
- Self-hosted architecture keeps costs at $0
- Network effect moat grows with each user without user effort
- API-first design enables future monetization

**Negative:**

- 8 skills to maintain (complexity cost)
- Layer gating may slow visible progress (Layer 2 locked until Layer 1 solid)
- Self-hosted limits scale ceiling (eventually need distributed architecture)
- Normalization is hard and error-prone (the core technical risk)

**Risks:**

- Normalization quality is the single biggest technical risk
- Pi hardware failure (single point of failure for data acquisition)
- Scraper breakage from website changes (ongoing maintenance)
- Accuracy validation depends on having ground truth (chicken-and-egg)

## Related Documents

- `docs/specs/pie-national-vision.md` - strategic vision
- `docs/specs/pie-laws.md` - 13 immutable laws
- `docs/specs/pie-operational-runbook.md` - daily operations
- `.claude/skills/pie-*` - 8 operational skills
