# Session Digest: OpenClaw Strategic Pivot

**Date:** 2026-04-04
**Agent:** General (strategic planning)
**Duration:** Extended conversation
**Branch:** main

---

## What Was Discussed

Developer-initiated deep strategic review of OpenClaw's role, priorities, and roadmap.

## Key Decisions Made

1. **OpenClaw's role defined:** Headless data engine on Raspberry Pi. Collects, structures, and delivers data. ChefFlow is the frontend. Users never see "OpenClaw." Data flows one direction.

2. **Nationwide pricing is a launch requirement.** ChefFlow must launch with complete pricing for every chef in every zip code in America. This is non-negotiable.

3. **Price-intel reversed from maintenance to active development.** Earlier in this session it was demoted to maintenance mode; developer corrected this firmly. Both Archive Digester (#1) and price-intel (#2) are active, running concurrently.

4. **Users never contribute core data.** ChefFlow does not crowdsource its pricing database. Receipt scanning is a personal QoL feature, completely separate from the pricing engine. This is a hard product rule.

5. **Pi utilization raised from 10% to 85% target.** Operational ceilings raised from 60/70% to 85/85% CPU/memory. The Pi exists to work.

6. **First task: Map every food source in America.** Every grocery store, wholesale club, farmers market, farm, gas station hybrid, corner store, dollar store, ethnic market, co-op in all 50 states. OpenStreetMap + Google Places + USDA data. Even non-scrapable stores go in the directory.

7. **No named individuals in memory.** Developer corrected that storing real names of external contacts in memory files is inappropriate. All removed. Rule saved.

## Documents Created

- `docs/specs/openclaw-nationwide-pricing-strategy.md` - Full spec: 7 categories, 30+ tasks, phase execution order, rules, targets
- `memory/project_pricing_database_strategy.md` - Strategy summary in memory
- `memory/feedback_no_crowdsourced_core_data.md` - Hard rule: never crowdsource core data
- `memory/feedback_no_named_market_research.md` - No real names in memory/research
- `memory/feedback_pi_utilization.md` - Push Pi to 85%

## Documents Updated

- `memory/reference_openclaw_targets.md` - Raised ceilings to 85/85%
- `memory/project_openclaw_database_catalog.md` - Archive Digester #1, price-intel #2, both active
- `memory/project_openclaw_chefflow_separation.md` - Reflects pivot, no crowdsourcing rule
- `memory/project_openclaw_archive_digester.md` - #1 priority, collection checklist
- `memory/project_current_priorities.md` - Full strategic pivot recorded
- `memory/reference_raspberry_pi.md` - Load gate misalignment flagged
- `memory/MEMORY.md` - All index entries updated

## Documents Deleted

- `memory/project_beta_tester_elena.md` - Named individual removed per developer feedback

## Scope Expansion (later in session)

5 new categories added after deeper research:

- **Category 8: Yield Factors** - USDA Food Buying Guide API + Handbook 102. Turns food costing from approximate to precise.
- **Category 9: Seasonal Availability** - USDA + AMS shipping data. "What's cheapest and freshest right now in your area."
- **Category 10: Food Safety Monitoring** - openFDA + USDA FSIS recall feeds matched against chef ingredients. Safety-critical.
- **Category 11: Commodity Tracking** - CME futures + FRED PPI. Math-based price forecasting (not AI guessing).
- **Category 12: Anomaly Consumption** - 50K existing anomalies classified as deals/alerts/errors and pushed to ChefFlow.

Also identified: Kroger has a real developer API program (production, not the broken cert API). Should apply for access.

Research targets documented in spec for investigation before building.

## Unresolved / Next Steps

- **Developer action:** Collect raw business artifacts into dump folder (Archive Digester)
- **Developer action:** Purchase residential proxy ($25/month) to unlock Instacart geographic expansion
- **Next Pi session:** Update `run-full-catalog.sh` load gate thresholds from 70/75% to 85/85%
- **Next OpenClaw session:** Begin Phase 1 (store mapping via OpenStreetMap bulk download) and Phase 2 (free government data ingest)
- **Research:** Apply for Kroger production API access
- **Research:** Test scrapability of WebstaurantStore, Restaurant Depot, Produce Market Guide, CME delayed quotes

## Context for Next Agent

This was a strategic planning session, not a code session. No code was written. No builds were run. All output is documentation and memory updates. The full pricing strategy spec at `docs/specs/openclaw-nationwide-pricing-strategy.md` is the canonical reference for all future OpenClaw pricing work. Read it before starting any price-intel development.

The developer feels strongly about:

- Complete data coverage (not partial, not "good enough")
- OpenClaw doing the work (not users)
- The Pi earning its keep (85% utilization, not 10%)
- No named individuals in agent memory
