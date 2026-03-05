# Clover Parity MVP Contract

Owner: `Commerce/POS + Integrations`  
Effective date: `2026-03-05`  
Target pilot window: `2026-Q2`

## Segment target

Target segment: `quick service`

## In-scope CLV IDs (pilot-critical)

- `CLV-000` Parity target defined by segment.
- `CLV-001` MVP parity contract frozen.
- `CLV-003` Parity dashboard with weighted completion by module.
- `CLV-101` Card-not-present keyed flow for phone/mail/virtual terminal with risk-control extension plan.
- `CLV-103` Cash tender workflow with change-due and drawer events.
- `CLV-104` Split tender workflow with expanded tenders and QA coverage.
- `CLV-106` Refund and void controls with role policy and reason capture.
- `CLV-111` Receipt delivery and reprint flows.
- `CLV-200` Register lifecycle (`open`, `suspend`, `resume`, `close`).
- `CLV-201` Counter-service order flow (`send`, `hold`, quick modifiers).
- `CLV-203` Order state model (`open`, `sent`, `fulfilled`, `canceled`, `refunded`).
- `CLV-300` Catalog CRUD with categories.
- `CLV-301` Modifier groups with required/optional validation and pricing deltas.
- `CLV-304` Inventory decrement-on-sale plus manual adjustments.
- `CLV-305` Low-stock and out-of-stock behavior in register UI.
- `CLV-500` Employee accounts with secure session/PIN login.
- `CLV-501` Role matrix and policy engine.
- `CLV-505` Sensitive action reason-code enforcement.
- `CLV-600` Sales dashboard by day/week/month and channel.
- `CLV-601` Payment mix and tender breakdown reporting.
- `CLV-605` X/Z report generation and exports.
- `CLV-606` Daily reconciliation workflow and variance handling.
- `CLV-700` Virtual terminal keyed payments.
- `CLV-701` Invoicing with hosted payment links and status tracking.
- `CLV-800` Hardware abstraction layer for terminal/scanner/printer/drawer.
- `CLV-802` Printer queue with retry/backoff and failure surfacing.
- `CLV-803` Cash drawer policy and guarded no-sale flow.
- `CLV-1103` Immutable audit trail for sensitive mutations.
- `CLV-1200` POS SLO contract.
- `CLV-1201` Alerting for checkout and reconciliation anomalies.
- `CLV-1300` Canonical commerce schema for orders/payments/tenders/tax/tips/modifiers.
- `CLV-1303` Idempotency keys standardized for payment/order mutation APIs.
- `CLV-1400` End-to-end open-register to close-register test pack.
- `CLV-1404` Financial correctness test pack (rounding/tax/refund edges).
- `CLV-1406` Go/No-Go checklist artifact for pilot decision.

## Definition of done

- Each in-scope CLV item is merged behind production-safe flags or role gates where required.
- Acceptance criteria for each in-scope CLV item is documented and mapped to test cases.
- UAT evidence is captured for the full quick-service flow (`open register -> sell -> refund/void -> close register`).
- Pilot merchants complete scripted validation with no unresolved Sev-1 or Sev-2 defects.

## Exit gates

- Duplicate capture rate: `0`
- Combined cash/card success rate: `>=99.5%`
- Unresolved close variance above `$5`: `0`
- No unresolved Sev-1 or Sev-2 incident at Go/No-Go meeting
