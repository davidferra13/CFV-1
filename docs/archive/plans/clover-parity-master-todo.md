# Clover Parity Master To-Do

Owner: `Commerce/POS + Integrations`  
Last updated: `2026-03-05`  
Goal: Build functional parity with Clover core capabilities inside this application.

Scope note: Clover App Market changes constantly. This backlog targets Clover's core platform/device capabilities and common first-party workflows.

## Status legend

- [ ] Not started
- [~] In progress
- [x] Done

## Completed so far (crossed off)

- [x] `CLV-700-A` Added virtual terminal page (`/commerce/virtual-terminal`) with dashboard entry points.
- [x] `CLV-700-B` Added virtual terminal server action pipeline (`runVirtualTerminalCharge`).
- [x] `CLV-101-A` Added manual keyed card entry mode support (`cardEntryMode=manual_keyed`) for CNP flows.
- [x] `CLV-101-B` Added manual card reference validation and persistence for keyed card captures.
- [x] `CLV-111-A` Added receipt email delivery from POS checkout.
- [x] `CLV-111-B` Added receipt SMS delivery from POS checkout.
- [x] `CLV-111-C` Added receipt email/SMS delivery from virtual terminal flow.
- [x] `CLV-104-A` Added split-tender backend capture path in `counterCheckout` (multi-payment recording).
- [x] `CLV-104-B` Added split-tender idempotent resume aggregation for existing checkout retries.
- [x] `CLV-104-C` Added POS UI flow for `card + cash` split payments.
- [x] `CLV-103-A` Added automatic cash drawer sale movement logging on checkout-captured cash intake.
- [x] `CLV-106-A` Hardened refund/void controls with required explicit reasons and manager-gated action tests.
- [x] `CLV-003-A` Added Clover parity dashboard page with weighted completion by module (`/commerce/parity`).
- [x] `CLV-601-A` Added payment mix and tender breakdown reporting in Commerce Reports.
- [x] `CLV-605-A` Added explicit X report (current register) and Z report (closed shift) CSV/PDF exports.
- [x] `CLV-1200-A` Defined POS SLO contract and surfaced it in Observability.
- [x] `CLV-701-A` Added hosted invoice payment link generation action and sent-invoice payment status tracking.

## Everything still to do

- [ ] Every unchecked item in sections `0` through `14` below remains in scope.

## 0) Parity Program Setup

- [x] `CLV-000` Define parity target by segment (`retail`, `quick service`, `table service`).
  - [x] 2026-03-05: Locked pilot parity segment to `quick service`.
- [x] `CLV-001` Freeze MVP parity contract (what must match Clover before pilot launch).
  - [x] 2026-03-05: Added frozen contract at `plans/clover-parity-mvp-contract.md`.
- [x] `CLV-002` Create Clover parity acceptance suite (scripted UAT list).
  - [x] 2026-03-05: Added scripted UAT suite at `plans/clover-parity-acceptance-suite.json` and verifier `scripts/verify-clover-parity-acceptance.mjs` (`npm run verify:clover-parity`).
- [x] `CLV-003` Create parity dashboard with `% complete` by module.
- [ ] `CLV-004` Establish merchant advisory group for parity validation.

## 1) Payments and Checkout (Core POS)

- [ ] `CLV-100` Card-present flows: tap/dip/swipe authorization + capture.
- [~] `CLV-101` Card-not-present flows: keyed entry for phone/mail/virtual terminal.
  - [x] 2026-03-05: Added virtual-terminal manual keyed reference path (`cardEntryMode=manual_keyed`) and channel-aware checkout.
  - [ ] Add CNP risk controls (AVS/CVV/velocity hooks, dispute evidence linkage).
- [ ] `CLV-102` Wallet payments: Apple Pay/Google Pay contactless support.
- [x] `CLV-103` Cash tender workflow: amount tendered, change due, drawer events.
  - [x] 2026-03-05: Added automatic `sale_payment` drawer movement writes from checkout cash intake (including split-tender cash component), with non-blocking alerting on movement log failure.
- [~] `CLV-104` Split tenders across payment methods in one ticket.
  - [x] 2026-03-05: Added split-tender backend capture path in `counterCheckout` with idempotent resume aggregation and POS UI support for `card + cash` split payments.
  - [ ] Expand split tenders beyond `card + cash` UI presets and add broader QA coverage.
- [ ] `CLV-105` Tip workflows: fixed/percentage/custom, pre/post payment mode.
- [x] `CLV-106` Refunds and voids with role-based controls and reason capture.
  - [x] 2026-03-05: Enforced required manual reason validation in `voidSale` and `createRefund`, updated sale-detail UI to require a void reason, and added role/reason unit coverage for refund+void paths.
- [ ] `CLV-107` Pre-auth/adjust/close flow for bar tabs and table checks.
- [ ] `CLV-108` Offline payment queue with idempotent replay + conflict handling.
- [ ] `CLV-109` Surcharge/cash-discount configuration and legal guardrails by location.
- [ ] `CLV-110` Tax engine with product tax classes + jurisdiction fallback policy.
- [x] `CLV-111` Receipt flows: print, email, SMS, and reprint from transaction history.
  - [x] 2026-03-05: Added post-sale email/SMS delivery actions in POS + virtual terminal (print and reprint already present).
- [ ] `CLV-112` Payment dispute lifecycle tracking (chargeback evidence workspace).

Acceptance gates:

- [ ] Payment success rate >= `99.5%` in pilot.
- [ ] Duplicate capture rate = `0`.
- [ ] Refund/void permission matrix passes all role tests.

## 2) Register, Orders, and Service Modes

- [ ] `CLV-200` Register open/suspend/resume/close with blind close variance.
- [ ] `CLV-201` Counter-service order flow (fast ring, quick modifiers, send/hold).
- [ ] `CLV-202` Table-service flow (zones, tables, open checks, coursing basics).
- [ ] `CLV-203` Order states: open, sent, fulfilled, canceled, refunded.
- [ ] `CLV-204` Order queue screen for kitchen/prep pickup timing.
- [ ] `CLV-205` Barcode scan-to-cart with unknown barcode quick-create.
- [ ] `CLV-206` Park/recall orders and transfer between operators/registers.
- [ ] `CLV-207` Reopen closed tickets with manager approval and full audit trail.
- [ ] `CLV-208` Manual price override and line discount controls by role.
- [ ] `CLV-209` Age-restricted item check path (ID verified flag and auditor log).

Acceptance gates:

- [ ] One active register session max per register identity.
- [ ] No orphan orders during suspend/resume and connection drops.

## 3) Catalog, Menu, and Inventory

- [ ] `CLV-300` Product/item catalog CRUD with categories.
- [ ] `CLV-301` Modifier groups, required/optional rules, and price deltas.
- [ ] `CLV-302` Variants (size/color/portion) with SKU-level pricing.
- [ ] `CLV-303` Barcode/PLU assignment and lookup.
- [ ] `CLV-304` Stock counts with decrement on sale and manual adjustment flows.
- [ ] `CLV-305` Low-stock and out-of-stock behaviors in register UI.
- [ ] `CLV-306` Menu/daypart visibility controls for time-based availability.
- [ ] `CLV-307` Bulk import/export for catalog and inventory.
- [ ] `CLV-308` Inventory valuation snapshot and movement audit log.
- [ ] `CLV-309` Bundle/combo item support with correct tax and inventory effects.

Acceptance gates:

- [ ] Inventory variance alerts fire on threshold breaches.
- [ ] Modifier pricing is reflected correctly in receipts and exports.

## 4) Customers, Loyalty, and Gift Cards

- [ ] `CLV-400` Customer profiles with purchase history and saved contact channels.
- [ ] `CLV-401` Search/attach customer at checkout.
- [ ] `CLV-402` Loyalty points accrual rules (spend-based and visit-based).
- [ ] `CLV-403` Rewards redemption at checkout with eligibility enforcement.
- [ ] `CLV-404` Promotions engine with item/order-level rule support.
- [ ] `CLV-405` Gift card lifecycle: issue, load, redeem, balance inquiry, refund behavior.
- [ ] `CLV-406` Customer feedback capture post-transaction (private NPS-style flow).
- [ ] `CLV-407` Audience segmentation for campaigns and lifecycle messaging.
- [ ] `CLV-408` Opt-in/opt-out compliance management for email/SMS marketing.

Acceptance gates:

- [ ] Loyalty and gift card balances always reconcile against ledger.
- [ ] Promotion engine prevents double-discount conflicts.

## 5) Team Management and Permissions

- [ ] `CLV-500` Employee accounts with PIN login for device sessions.
- [ ] `CLV-501` Role matrix (`cashier`, `lead`, `manager`, `admin`) with policy engine.
- [ ] `CLV-502` Manager override flow (remote/onsite approval path).
- [ ] `CLV-503` Shift tracking: clock in/out, breaks, labor summaries.
- [ ] `CLV-504` Employee performance view (sales, tips, refunds, voids, discount use).
- [ ] `CLV-505` Sensitive action reason codes (`no sale`, `void`, `price override`).
- [ ] `CLV-506` Session timeout + re-auth policy for unattended terminals.

Acceptance gates:

- [ ] Unauthorized mutation attempts are blocked and audited.
- [ ] PIN brute-force lockouts verified in security tests.

## 6) Reports, Reconciliation, and Back Office

- [ ] `CLV-600` Sales dashboard by day/week/month and channel.
- [x] `CLV-601` Payment mix and tender breakdown reporting.
- [ ] `CLV-602` Tax reporting and export-ready summaries.
- [ ] `CLV-603` Tip reporting by employee and shift.
- [ ] `CLV-604` Refund/void/discount anomaly reports.
- [x] `CLV-605` X and Z report generation + CSV/PDF exports.
- [ ] `CLV-606` Daily reconciliation workflow with variance management.
- [ ] `CLV-607` Multi-location roll-up analytics for HQ operators.
- [ ] `CLV-608` Scheduled report delivery (email or storage destination).

Acceptance gates:

- [ ] Reconciliation mismatch detection alerts within `5 minutes`.
- [ ] Exported reports match on-screen aggregates exactly.

## 7) Omnichannel Commerce

- [x] `CLV-700` Virtual terminal in dashboard for keyed payments.
  - [x] 2026-03-05: Added `/commerce/virtual-terminal` UI, action pipeline, and navigation links.
- [~] `CLV-701` Invoicing with hosted payment links and status tracking.
  - [x] 2026-03-05: Added hosted invoice payment link generation and payment status/outstanding tracking on sent invoices.
  - [ ] Extend hosted link workflow from event invoices into full commerce invoice lifecycle primitives.
- [ ] `CLV-702` Online ordering storefront with pickup options.
- [ ] `CLV-703` Delivery mode integration hooks (internal dispatch or partner API).
- [ ] `CLV-704` Unified order timeline across in-store and online channels.
- [ ] `CLV-705` Ecommerce catalog sync and inventory reservation strategy.
- [ ] `CLV-706` Customer self-serve receipt and order status portal.

Acceptance gates:

- [ ] Online and in-store stock contention handling is deterministic.
- [ ] Hosted invoice links pass end-to-end payment tests.

## 8) Hardware and Device Profiles

- [ ] `CLV-800` Hardware abstraction for terminal/scanner/printer/cash drawer.
- [ ] `CLV-801` Device health checks and degraded-mode UX.
- [ ] `CLV-802` Receipt printer queue with retry/backoff and failure surfacing.
- [ ] `CLV-803` Cash drawer policy engine (`cash sale`, `no-sale manager`, `test open`).
- [ ] `CLV-804` Barcode scanner ingestion reliability and duplicate-scan suppression.
- [ ] `CLV-805` Customer-facing display mode support.
- [ ] `CLV-806` Device pairing/provisioning and remote disable/reset.

Device parity tracks:

- [ ] `CLV-820` Station-style countertop full POS profile.
- [ ] `CLV-821` Mini-style compact full POS profile.
- [ ] `CLV-822` Flex-style handheld profile (mobile/tableside workflows).
- [ ] `CLV-823` Go-style mobile reader companion profile.
- [ ] `CLV-824` Compact-style payment-terminal-only profile.
- [ ] `CLV-825` Kiosk self-order profile with idle-reset and pairing controls.
- [ ] `CLV-826` Kitchen display profile for prep queue and bump flow.

Acceptance gates:

- [ ] Core sale path works across each enabled device profile.
- [ ] Device disconnect mid-transaction does not duplicate charges.

## 9) Integrations and Extension Surface

- [ ] `CLV-900` OAuth connection lifecycle (`connect`, `refresh`, `disconnect`, `reauth`).
- [ ] `CLV-901` Webhook intake pipeline with signature verification per provider.
- [ ] `CLV-902` Pull sync scheduler with cursoring and backoff.
- [ ] `CLV-903` Canonical event mapper for orders/payments/customers/catalog.
- [ ] `CLV-904` Integration health center (sync lag, failed jobs, reprocess).
- [ ] `CLV-905` App/extension framework for add-on capabilities.
- [ ] `CLV-906` Developer credentials and environment isolation (`dev`, `staging`, `prod`).

Acceptance gates:

- [ ] No lost events under webhook replay and out-of-order delivery.
- [ ] Sync jobs are idempotent across retries and restarts.

## 10) Financial Services Layer

- [ ] `CLV-1000` Rapid payout/deposit option framework (provider-agnostic).
- [ ] `CLV-1001` Capital/advance offer ingestion and repayment visibility (if enabled).
- [ ] `CLV-1002` Funding eligibility UI and compliance notices by jurisdiction.

Acceptance gates:

- [ ] Funding features are region/merchant eligibility gated correctly.

## 11) Security, Compliance, and Risk

- [ ] `CLV-1100` PCI scope minimization architecture review and documentation.
- [ ] `CLV-1101` PII encryption policy for customer and payment-adjacent data.
- [ ] `CLV-1102` Fraud/risk controls for CNP payments (velocity, AVS/CVV hooks, 3DS path).
- [ ] `CLV-1103` Immutable audit trail for all sensitive mutations.
- [ ] `CLV-1104` Data retention and deletion controls by tenant policy.
- [ ] `CLV-1105` Incident response runbook for payment failures and outages.

Acceptance gates:

- [ ] Security regression suite passes for authz/authn/CSRF/webhook verification.

## 12) Reliability, Observability, and Operations

- [x] `CLV-1200` POS SLOs defined (availability, latency, capture success, replay lag).
- [ ] `CLV-1201` Alerting for checkout failures, terminal health, reconciliation anomalies.
- [ ] `CLV-1202` Operational dashboards for on-call and store managers.
- [ ] `CLV-1203` Feature flags for safe rollout/rollback by tenant and location.
- [ ] `CLV-1204` Runbooks for pilot launch, rollback, and incident drills.
- [ ] `CLV-1205` Synthetic transaction canary for early failure detection.

Acceptance gates:

- [ ] 7-day pre-launch burn-in with no Sev-1/Sev-2 commerce incident.

## 13) Data Model and API Surface

- [ ] `CLV-1300` Canonical schema for orders, payments, tenders, taxes, tips, modifiers.
- [ ] `CLV-1301` Audit/event tables for immutable financial mutation history.
- [ ] `CLV-1302` Public/internal API contracts for register, reconciliation, and reporting.
- [ ] `CLV-1303` Idempotency keys standardized for all payment/order mutations.
- [ ] `CLV-1304` Multi-tenant isolation validation at DB and API layers.

Acceptance gates:

- [ ] Schema migration safety checks pass with rollback path tested.

## 14) QA, UAT, and Pilot Readiness

- [ ] `CLV-1400` End-to-end test pack for open-register to close-register flow.
- [ ] `CLV-1401` Hardware simulation tests (printer down, scanner lag, drawer fault).
- [ ] `CLV-1402` Offline/online chaos tests with replay verification.
- [ ] `CLV-1403` Multi-register race/concurrency tests.
- [ ] `CLV-1404` Financial correctness tests (rounding/tax/refund edge cases).
- [ ] `CLV-1405` Merchant UAT scripts by business type.
- [ ] `CLV-1406` Go/No-Go checklist and launch approval artifact.

Go/No-Go thresholds:

- [ ] Duplicate charge rate = `0`.
- [ ] Unresolved close variance > `$5` = `0`.
- [ ] Combined cash/card success rate >= `99.5%`.
- [ ] No unresolved Sev-1/Sev-2 incidents at launch decision.

## Recommended build sequence

- [ ] `PHASE-A` Foundation: sections `0`, `1`, `2`, `8`, `13`.
- [ ] `PHASE-B` Merchant ops: sections `3`, `5`, `6`, `12`.
- [ ] `PHASE-C` Growth: sections `4`, `7`, `9`.
- [ ] `PHASE-D` Advanced finance/risk: sections `10`, `11`, `14`.

## Existing project assets to reuse first

- [ ] Reuse register/terminal/hardware foundations from `plans/pos-pilot-roadmap.md`.
- [ ] Reuse integration provider scaffolding in `lib/integrations/core/*`.
- [ ] Reuse POS provider normalization in `lib/integrations/providers/pos-integration.ts`.
- [ ] Reuse current `/commerce/*` screens before adding new modules.
