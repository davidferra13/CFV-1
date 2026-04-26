# Persona Stress Test: Leo Varga

## Generated: 2026-04-25

## Type: Chef

## Persona Summary

Leo Varga is a high-end private chef working in unstable, mobile environments such as yachts, remote villas, and moving ports. He needs ChefFlow to keep core menus, guest preferences, provisioning, inventory, and day-of plans reliable when connectivity is weak or absent. ChefFlow has strong connected-operation coverage, but Leo exposes a major need for offline-first resilience and voyage-aware provisioning.

## Capability Fit (rate each as SUPPORTED / PARTIAL / MISSING)

- Offline-first operation for critical plans, preferences, menus, and inventory: **MISSING**
- Dynamic guest preference onboarding and offboarding: **PARTIAL**
- Long-range provisioning for isolated service windows: **PARTIAL**
- Inventory risk visibility and critical stock awareness: **SUPPORTED**
- Menu adaptation from onboard availability: **PARTIAL**
- Fluid timing and daily routine management: **SUPPORTED**
- Solo-operator resilience under isolation: **PARTIAL**
- Conflict-safe sync after disconnected edits: **MISSING**
- Charter or voyage depletion modeling: **MISSING**
- Inventory-constrained menu feasibility filtering: **PARTIAL**

## Top 5 Gaps

1. **No explicit offline-first guarantee for mission-critical workflows**
   - What's missing: reliable local access to inventory, preferences, plans, menus, and task timelines during disconnected work.
   - File to change first: `app/(chef)/dashboard/page.tsx` and the PWA/offline shell.
   - Effort estimate: **Large** (offline cache contract, sync policy, degraded-mode UX)

2. **No documented conflict-safe sync model**
   - What's missing: safe handling for multi-day disconnected edits and eventual reconnection.
   - File to change first: shared persistence and sync infrastructure.
   - Effort estimate: **Large** (data contract and reconciliation rules)

3. **No charter or voyage provisioning mode**
   - What's missing: depletion simulation for fixed no-restock windows, storage limits, shelf life, and contingency substitutions.
   - File to change first: `app/(chef)/inventory/page.tsx` and provisioning planning surfaces.
   - Effort estimate: **Medium-Large** (inventory projections plus planning UI)

4. **No rapid guest roster churn flow**
   - What's missing: arrive-today and depart-today actions that update preference relevance in active plans.
   - File to change first: event guest list surfaces under `app/(chef)/events/[id]`.
   - Effort estimate: **Medium** (guest state and active-plan filtering)

5. **No deterministic inventory-to-menu execution assistant**
   - What's missing: a first-class answer to "what can I serve now with what remains?" across current stock and guest constraints.
   - File to change first: `app/(chef)/menus/page.tsx` and menu filtering components.
   - Effort estimate: **Medium-Large** (ingredient matching plus constraint display)

## Quick Wins Found

1. **Add connectivity state copy to the dashboard header**
   - Exact file: `app/(chef)/dashboard/page.tsx`
   - Change: Add text for Online, Degraded, Offline, and last sync time once state is available.
   - Why: Makes degraded-operation expectations visible before full offline sync exists.
   - Size: **< 20 lines**

2. **Add an "Offline Essentials" action label**
   - Exact file: `app/(chef)/dashboard/page.tsx`
   - Change: Add a compact action label for today's timeline, guest restrictions, critical stock, and prep tasks.
   - Why: Establishes the mental model for Leo's isolated-service workflow.
   - Size: **< 20 lines**

3. **Add guest roster fast-action labels**
   - Exact file: `app/(chef)/events/[id]/page.tsx`
   - Change: Add "Arrive today" and "Depart today" action labels where guest list controls already exist.
   - Why: Reduces friction for active charter roster changes.
   - Size: **< 20 lines**

4. **Add critical stock helper text**
   - Exact file: `app/(chef)/inventory/page.tsx`
   - Change: Add helper copy explaining service-critical stock thresholds.
   - Why: Clarifies how chefs should identify isolated-service shortages.
   - Size: **< 20 lines**

5. **Add menu feasibility filter copy**
   - Exact file: `app/(chef)/menus/page.tsx`
   - Change: Add "Show dishes executable with current stock" as a planned filter label or disabled hint.
   - Why: Makes the inventory-to-menu gap explicit without pretending the logic is complete.
   - Size: **< 20 lines**

## Score: 68/100

- Workflow Coverage (35%): **23/35**
- Data Model Fit (25%): **16/25**
- UX Alignment (25%): **16/25**
- Isolation Reliability (15%): **13/15**

Weighted final score: **68/100**. ChefFlow is strong on planning, stock visibility, and day-of execution, but Leo's use case depends on offline-first reliability and voyage-aware provisioning that are not yet first-class.

## Verdict

Leo can use ChefFlow for connected planning, inventory visibility, and service execution today. It is not yet a dependable yacht or remote-service backbone until offline continuity, conflict-safe sync, and no-restock provisioning are explicit system behaviors.
