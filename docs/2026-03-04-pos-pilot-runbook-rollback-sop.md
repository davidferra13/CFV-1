# POS Pilot Runbook + Rollback SOP

Owner: `Commerce/POS`  
Last updated: `2026-03-04`

## 1) Shift Open Checklist

1. Confirm register hardware health on `/commerce/register`:
   - terminal status healthy
   - scanner/printer/drawer capability flags match physical setup
2. Confirm tax readiness:
   - business ZIP is set
   - taxable item checkout is not blocked
3. Confirm role matrix:
   - cashier can checkout
   - lead can open/suspend register
   - manager can close register/refund/void
4. Open register with counted opening cash and session name.

## 2) During Service

1. Use quick item and quick sandwich flow for non-barcode menu items.
2. Apply promo code only when needed; auto-apply runs if enabled.
3. Watch `/commerce/observability`:
   - open alerts
   - error/critical alerts
   - repeated terminal/tax failures
4. Record paid in/out and no-sale drawer events with notes.

## 3) Shift Close

1. Confirm no in-flight sales.
2. Count closing cash and enter close notes when variance is above policy threshold.
3. Close register.
4. Verify:
   - reconciliation report generated
   - daily metrics snapshot captured
   - unresolved alerts triaged (acknowledge or resolve)

## 4) Incident Severity

1. `critical`: checkout/payment state integrity risk (payment recorded failure, sale finalization failure).
2. `error`: subsystem unavailable or blocking condition (terminal unhealthy, tax service unavailable).
3. `warning`: operator intervention needed but flow may continue (register close blocked, high cash variance).
4. `info`: informational anomaly.

## 5) Rollback SOP (Production Safe Mode)

If incident rate spikes or checkout reliability drops, apply this order:

1. Disable optional discount automation:
   - `POS_ENABLE_AUTO_PROMOTIONS=false`
2. Move card to known-safe provider mode:
   - `POS_TERMINAL_PROVIDER=mock` only if terminal stack is unstable and store accepts cash-only fallback.
3. Keep checkout controls strict:
   - `POS_ENFORCE_ROLE_MATRIX=true`
   - `POS_ENFORCE_MANAGER_APPROVAL=true`
4. Keep tax blocking enabled for taxable items (do not bypass tax validation).
5. Communicate fallback operating mode to store staff:
   - cash-only if terminal degraded
   - manual receipt download if printer degraded
6. Re-open observability page and verify new alerts stop increasing.

## 6) Recovery Back to Normal Mode

1. Resolve root cause (terminal network, tax provider, DB latency).
2. Capture a fresh daily metrics snapshot.
3. Run one full transaction test:
   - open register
   - cash sale
   - card sale
   - close register
4. Re-enable paused features (auto promotions, terminal provider) one by one.
