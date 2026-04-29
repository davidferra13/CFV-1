---
name: stripe-webhook-integrity
description: Protect ChefFlow Stripe webhook correctness. Use when work touches Stripe webhooks, checkout completion, subscription events, payment intents, refunds, invoices, webhook idempotency, signature verification, raw request bodies, or ledger updates caused by Stripe events.
---

# Stripe Webhook Integrity

Use this skill before changing Stripe webhook handling or Stripe-driven state changes.

## Workflow

1. Identify the exact Stripe event types involved and the internal records they may change.
2. Verify webhook signature handling uses the raw request body and server-side Stripe secret.
3. Check idempotency by Stripe event id, payment intent id, subscription id, invoice id, or the local unique key used by the handler.
4. Trace event processing from webhook receipt to DB writes, ledger entries, cache invalidation, and non-blocking side effects.
5. Confirm monetary values stay in integer cents and map to the correct tenant or chef through trusted local records.
6. Treat out-of-order, duplicate, retried, missing-object, and already-processed events as normal cases.
7. Add focused tests for duplicate webhook delivery and any new event type.

## Guardrails

- Never trust customer, tenant, chef, amount, or status data from a client route when Stripe or local records are the source of truth.
- Never let webhook failures appear successful unless the event is deliberately ignored and documented.
- Never create ledger entries before proving the event maps to the intended local record.
- Never update historical ledger entries. Use append-only corrections or reversals.
- Keep emails, notifications, activity logs, and calendar syncs non-blocking.
- Do not run `drizzle-kit push`, deploy, restart servers, or run long-lived processes while validating webhook work.

## Closeout

Report event types reviewed, idempotency evidence, signature handling evidence, and validation run. If a test is not run, state the exact reason and residual Stripe risk.
