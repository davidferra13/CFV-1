---
name: PIE - Pricing Intelligence Engine
description: ChefFlow's pricing system is called PIE. Five layers, not a database. Internal acronym, invisible to users.
type: project
---

PIE = Pricing Intelligence Engine. The canonical name for ChefFlow's entire pricing infrastructure.

**Five layers:**

1. **Data Platform** - OpenClaw collects/normalizes prices from 20+ chains, government APIs, wholesale catalogs, chef receipts
2. **Resolution Engine** - 11-tier waterfall (chef_override -> receipt -> api_quote -> wholesale -> scrape -> flyer -> instacart -> regional_avg -> resolved_national -> market_aggregate -> government -> historical -> category_baseline -> none)
3. **Intelligence Layer** - Seasonal factors, confidence scoring, anomaly detection, sourceability classification, source health monitoring
4. **Costing Engine** - Recipe/menu/event/quote pricing with yield adjustment, waste factors, labor overhead
5. **Decision Support** - Shopping optimizer, price comparison, vendor scorecards, spike warnings, margin projections

**Naming rules:**

- Internal (code, specs, conversations): **PIE** or "Pricing Intelligence Engine"
- User-facing UI: prices just appear with confidence badges. Never name the engine. Closest label: "Market Prices"
- External pitch: "proprietary food pricing infrastructure, 400 market regions, real-time collection"
- Never call it a "pricing database" (it's five systems, not one table)

**Key files:** `lib/pricing/` (30+ files), `components/pricing/` (34+ components), `app/api/pricing/`, `app/api/cron/resolve-prices/`, `app/api/cron/source-health/`

**Why:** This is ChefFlow's deepest moat. Workflow integration + chef feedback loop + normalization quality + multi-source triangulation + regional granularity. Hard to copy because the engine is woven into every operational surface.

**How to apply:** Always use "PIE" when referring to ChefFlow's pricing system. If someone says "pricing database" or "price engine," they mean PIE.
