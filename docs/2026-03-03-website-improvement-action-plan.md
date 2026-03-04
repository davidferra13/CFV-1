# Website Improvement Plan (30/60/90)

Generated: 2026-03-03

## Objective

Improve ChefFlow usability, reliability, and conversion while reducing Remy friction and risk.

## North-Star Rules

- Core chef workflows must succeed without Remy.
- Remy must be optional, non-invasive, and auditable.
- Mobile experience prioritizes screen real estate and speed.

## 30 Days (P0: Stability + UX Friction)

### Product Reliability

- Harden top chef workflows (events, quotes, clients, finance dashboard) with regression checks.
- Close known auth/tenant-isolation defects and flaky test hotspots.
- Add performance budgets for dashboard and event detail pages.

### Remy UX and Safety

- Keep Remy hidden on mobile by default and enforce hidden behavior at runtime.
- Keep desktop in docked mode by default (no persistent character unless user expands).
- Ensure every Remy commit action is audited and policy-gated.

### Metrics (must ship in P0)

- Track: page load p75, action success rate, Remy approve rate, Remy block rate, mobile open rate.
- Define weekly quality scorecard posted to team docs.

### Acceptance Criteria

- No P0 chef workflow regressions in smoke tests.
- Mobile Remy not visible unless explicitly enabled in future policy.
- All Remy physical actions logged with status and duration.

## 60 Days (P1: Conversion + Efficiency)

### Funnel and Sales

- Optimize lead-to-quote-to-booking path (reduce clicks and latency).
- Improve inquiry triage and quote follow-up tooling.

### Operations

- Streamline event prep and day-of execution paths.
- Reduce duplicate data entry across events, menus, and clients.

### Remy Parity Expansion (Controlled)

- Expand only high-frequency, low-risk actions from the flow inventory.
- Add rollback paths for reversible Remy actions where feasible.

### Acceptance Criteria

- Conversion uplift on inquiry->quote and quote->accepted.
- Reduced median task completion time for top 10 workflows.

## 90 Days (P2: Scale + Governance)

### Platform Quality

- Enforce SLAs for high-traffic chef pages.
- Add continuous quality gates (unit + e2e + parity checks) in CI.

### Remy Governance

- Finalize tiered rollout policy (beta cohorts, enablement controls, kill-switch drills).
- Publish operator runbook for queue load, abuse handling, and incident response.

### Acceptance Criteria

- Weekly quality score remains within target band for 4 consecutive weeks.
- Remy incident rate below agreed threshold before broader rollout.

## Immediate Actions Started

- Implemented mobile runtime lock to hidden mode in:
  - `lib/hooks/use-remy-display-mode.ts`
  - `components/ai/remy-wrapper.tsx` (hidden mode now force-closes drawer)
- Shipped Remy Control Center for policy + audit operations:
  - `app/(chef)/settings/remy/page.tsx`
  - `app/(chef)/settings/remy/remy-control-client.tsx`
  - `lib/ai/remy-approval-policy-actions.ts`
  - `lib/ai/remy-action-audit-actions.ts`
- Expanded Remy Control Center to include:
  - Runtime enable/disable control
  - Searchable action-level policy matrix
  - Bulk policy operations (block all significant, emergency lock all, reset all overrides)
  - Per-action execution analytics (last run + success rate)
  - Reliability recommendations panel (high-failure actions + one-click block)
  - Quality metrics panel (approve rate, block rate, error rate, p95 duration)
  - Filterable audit-log table
- Added runtime preference gating so disabled/non-onboarded chefs do not see Remy:
  - `app/(chef)/layout.tsx`
- Enforced runtime preference server-side so disabled Remy cannot execute commands:
  - `lib/ai/command-orchestrator.ts`
  - `app/api/remy/stream/route.ts`
- Reduced docked launcher intrusiveness:
  - `components/ai/remy-wrapper.tsx` (utility controls hidden until hover)
- Added additional anti-intrusion runtime behavior:
  - Auto-dock mascot when chef focuses a form field (prevents mascot overlap during data entry)
  - Ambient idle micro-motion scheduler (reduces static uncanny stare behavior)
  - Narrow-desktop corner normalization (keeps launcher on right side when viewport is tight)
  - Auto-hide launcher during non-Remy modal-heavy workflows (restores to docked mode after modal closes)
  - `components/ai/remy-wrapper.tsx`
- Added typed confirmation gate for significant actions:
  - UI requires explicit phrase confirmation before approving significant actions
  - Server re-validates the phrase before any commit path
  - `components/ai/agent-confirmation-card.tsx`
  - `components/ai/remy-task-card.tsx`
  - `components/ai/command-result-card.tsx`
  - `lib/ai/command-orchestrator.ts`
  - `lib/ai/remy-significant-approval.ts`
- Added final delivery verification artifacts:
  - One-command smoke script: `npm run qa:remy:delivery`
  - Script file: `scripts/remy-delivery-smoke.mjs`
  - Release checklist: `docs/2026-03-04-remy-delivery-qa-checklist.md`
- Capability inventories generated for planning:
  - `docs/chef-vs-remy-action-inventory.md`
  - `docs/chef-vs-remy-inventory-by-business-flow.md`

## Next 7 Days (Execution Queue)

1. Build P0 dashboard: define and log 5 core quality metrics.
2. Run and fix top failing smoke/critical tests that impact chef workflows.
3. Identify top 15 chef actions by usage and map current Remy coverage gaps.
4. Prioritize 3 UX pain fixes on events/quotes/clients from user session recordings.
5. Confirm Remy rollout policy: desktop-only beta, mobile hidden, kill switch ownership.
