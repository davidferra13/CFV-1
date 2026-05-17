# Intensify: Ingredient Verification + AI Vendor Calling

## Deep-Pass Run 2026-05-17

STATUS: fresh (first run)
DEPTH: normal

SURFACED:

- Auto-resolve engine (549 lines) is dead code: never scheduled
- Remy has no calling tools (only lookupPrice)
- Ingredient health banner shows "needs sourcing" as passive text with no action
- Sourcing page has no context params (always starts blank)
- Ingredient board "unavailable" status never triggers calling
- Event countdown blind to sourcing status
- Event detail pages have no path to sourcing
- Feature flag not consulted in ingredient verification flow
- 10/10 wiring gaps confirmed between calling infrastructure and ingredient surfaces

LENSES_USED:

- Private Chef Ops: Real workflow validation from 10yr chef experience
- Voice/Telephony Architect: Twilio wiring, webhook reliability
- Automation UX Designer: Where triggers live, progressive automation
- Supply Chain Logistics: Vendor calling cadence, batch efficiency
- Reactive Systems Engineer: Event-driven vs cron, Inngest patterns

EXPERT_VALIDATION:

- Wire auto-resolve to cron: endorsed (all 5) - simplest activation of dead code
- Remy calling tools: endorsed (4/5) - natural language is ultimate zero-click
- Source button on health banner: endorsed (4/5) - highest-traffic surface
- Sourcing page context params: endorsed (5/5) - eliminates re-entry
- Board unavailable auto-queue: cautioned - needs 5-min debounce (toggling states)
- Event countdown sourcing badge: endorsed (4/5) - passive signal + link
- Event detail source button: endorsed (4/5) - natural event-first workflow
- Per-ingredient call buttons: REJECTED - trains bad habits, annoys vendors
- Auto-call without confirmation: REJECTED - calling humans needs chef say-so

EXPERT_ADDITIONS:

- Batch caller already groups by vendor (validated, no action needed)
- Inngest sourcing.ingredient.unresolved event (future reactive trigger, not in Wave 1)
- Post-call phone notification already exists (validated)

REJECTED:

- Per-ingredient individual call buttons: batching is the only sane approach
- Zero-click auto-calling: calling a human without chef say-so crosses a line

ACTED ON:

- Wave 1 dispatched 2026-05-17: cron-wiring, remy-tools, sourcing-params, countdown-badge
- Wave 2 pending: health-source-button, board-auto-queue, event-detail-button

SKIPPED:

- Phone tree navigation improvements: already working
- Voicemail inbox enhancements: peripheral
- LLM transcript upgrades: working, not blocking

CROSS_REFS:

- [[pricing]]: PIE tier resolution feeds ingredient-resolution.ts directly
- [[communication]]: voicemail-bridge already connects calls to comms pipeline
- [[cil]]: vendor/ingredient entity types exist but no signal handler for sourcing events yet

NEXT TRIGGER: Twilio credentials configured in prod + supplier_calling enabled for test account

BUILD_PROMPTS:

Wave 1 (DISPATCHED 2026-05-17):

- wire-auto-resolve-cron (haiku): register in lib/cron/definitions.ts
- remy-calling-tools (opus): 2 new tools in lib/ai/remy-tools.ts
- sourcing-page-context-params (haiku): searchParams on sourcing page
- event-countdown-sourcing-badge (haiku): 48h warning badge

Wave 2 (PENDING):

- ingredient-health-source-button (opus): "Source Unresolved" on health banner
- ingredient-board-auto-queue (opus): unavailable -> draft session with debounce
- event-detail-source-button (haiku): "Source Ingredients" on event detail
