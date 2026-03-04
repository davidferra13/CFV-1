# POS Pilot Roadmap

Owner: `Commerce/POS`
Start date: `2026-03-04`
Target: First paid pilot readiness for a single convenience store

## Phase 0 - Architecture Contracts (Week 1)

- [x] `POS-001` Payment terminal abstraction contract
  - Scope:
    - Add provider-agnostic terminal interfaces for card payments.
    - Add adapter resolver driven by `POS_TERMINAL_PROVIDER`.
    - Add mock adapter and Stripe Terminal adapter stub.
    - Add server action wrapper to process terminal card payments and record commerce payments.
  - Delivered files:
    - `lib/commerce/terminal/types.ts`
    - `lib/commerce/terminal/index.ts`
    - `lib/commerce/terminal/mock-adapter.ts`
    - `lib/commerce/terminal/stripe-terminal-adapter.ts`
    - `lib/commerce/payment-terminal-actions.ts`
  - Acceptance criteria:
    - `getPaymentTerminalAdapter()` returns a valid adapter for `mock` and `stripe_terminal`.
    - Mock adapter can capture valid card payments and fail invalid ones.
    - Terminal wrapper action records a card payment for captured/authorized terminal results.

- [x] `POS-002` Hardware abstraction contract
  - Scope:
    - Add scanner/printer/cash drawer interfaces and capability model.
    - Add capability resolver from env flags:
      - `POS_SCANNER_ENABLED`
      - `POS_PRINTER_ENABLED`
      - `POS_CASH_DRAWER_ENABLED`
    - Add mock adapters and stack factory.
    - Surface terminal + hardware health in register UI.
  - Delivered files:
    - `lib/commerce/hardware/types.ts`
    - `lib/commerce/hardware/index.ts`
    - `lib/commerce/hardware/mock-adapters.ts`
    - `app/(chef)/commerce/register/page.tsx` (health wiring)
    - `components/commerce/pos-register.tsx` (health display)
  - Acceptance criteria:
    - App boots when all hardware flags are off.
    - Capabilities are visible on `/commerce/register`.
    - Disabled hardware paths fail safely (no app crash).

## Phase 1 - Core Store Operations (Weeks 2-3)

- [x] `POS-003` Barcode scan-to-cart
  - Add scanner event ingestion and UPC lookup service path.
  - Unknown barcode now supports inline quick-create (name + price + barcode) and immediate add-to-cart.

- [x] `POS-004` Receipt printer jobs + drawer kick policy
  - Print job queue with retry/backoff.
  - Drawer open policy for cash sales and manager no-sale events.

- [x] `POS-005` Tax hardening
  - No silent `$0 tax` fallback for taxable SKUs.
  - Explicit blocking state + reason when tax service unavailable.

- [x] `POS-006` Shift controls and blind close
  - Enforce blind close variance reason thresholds.
  - Manager override flow and immutable shift close log.

## Phase 2 - Control and Security (Weeks 4-5)

- [x] `POS-007` Role enforcement (cashier/lead/manager)
  - Added `POS_ENFORCE_ROLE_MATRIX` with hierarchical enforcement:
    - cashier+: checkout, sale and payment mutation paths
    - lead+: register open/suspend/resume, paid-in drawer movement, payment status updates
    - manager: void/refund/register close/manager-gated drawer actions (existing manager controls retained)
- [x] `POS-008` Immutable POS audit trail
- [x] `POS-009` Offline idempotent replay hardening
- [ ] `POS-010` Multi-register concurrency integrity
  - DB partial unique index enforced: one active register session per tenant (`open` or `suspended`).
  - Action layer hardening shipped (unique-violation mapping, CAS close, mid-checkout register revalidation).
  - Remaining: dedicated E2E two-register race validation (`E2E-05`).
  - Added race guards: checkout re-validates register-open state before capture, and register close is blocked while any session sale is still in progress.

## Phase 3 - Reporting and Pilot (Weeks 6-8)

- [x] `POS-011` Daily reconciliation workflow
  - Reports now auto-generate on register close (non-blocking) and can be generated manually from `/commerce/reconciliation`.
  - Day scoping is timezone-aware using tenant timezone.
- [x] `POS-012` X/Z reporting exports
  - Added reconciliation CSV export and closed-shift (Z-style) CSV export to reports export menu.
- [x] `POS-013` Age-restricted item controls
  - Checkout now blocks alcohol/cannabis items unless age verification is explicitly confirmed in POS.
- [x] `POS-014` Promotions/discount rule engine
  - Added promotion rules (percent/fixed, order/item scoped) with per-line discount allocation and checkout integration.
  - Added `/commerce/promotions` management UI and register promo code entry.
- [x] `POS-015` Alerts/observability package
  - Added alert event + daily metrics tables and `/commerce/observability` operator dashboard.
  - Wired checkout/register/reconciliation incident hooks to publish and resolve operational alerts.
  - Added daily snapshot capture action and close-register automatic snapshot attempt.
- [x] `POS-016` Pilot runbook and rollback SOP
  - Added operational runbook and rollback sequence:
    - `docs/2026-03-04-pos-pilot-runbook-rollback-sop.md`
- [x] `POS-017` Table-service foundation (zones/tables/open checks)
  - Added table-service data model:
    - `supabase/migrations/20260330000031_commerce_table_service_foundation.sql`
  - Added table-service actions and management page:
    - `lib/commerce/table-service-actions.ts`
    - `/commerce/table-service`
  - Added register linkage for selecting and auto-closing open table checks at checkout.

## CI Gates for Pilot

- [ ] `E2E-01` Open register -> ring sale -> close register
- [ ] `E2E-02` Card approved/declined terminal states
- [ ] `E2E-03` Refund/void permissions by role
- [ ] `E2E-04` Offline replay without duplicates
- [ ] `E2E-05` Two-register concurrency test
- [ ] `E2E-06` Tax validation across tax classes
- [ ] `E2E-07` Reconciliation mismatch detection

## Go/No-Go Thresholds

- [ ] 7 days with no Sev-1/Sev-2 POS incidents
- [ ] Duplicate charge/sale rate = `0`
- [ ] Unresolved close variance > `$5` = `0`
- [ ] Combined cash/card success rate >= `99.5%`
