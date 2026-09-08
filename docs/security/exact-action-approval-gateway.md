# Exact-action approval gateway

## Non-negotiable boundary

Consequential external work is denied unless David reviews the final action preview
and approves that exact payload. General instructions such as "do it", "ASAP", or
approval of a broader task do not authorize a later provider mutation.

The fingerprint binds the actor, tenant, provider tool, operation, environment,
target, complete payload, financial disclosure, and current source-state version.
Changing any bound value requires a new preview and approval.

Approvals:

- expire no later than ten minutes after approval;
- can be consumed exactly once through a transactional database function;
- are scoped to the authenticated actor and tenant;
- reject raw bank and credential fields from model-visible payloads;
- require amount, fees, net, masked source and destination, timing, rail,
  reversibility, reversal path, and the no-action result for money actions;
- enter incident lock after an unknown provider outcome and never retry automatically;
- are not complete until a provider receipt has been retrieved and persisted.

## Implemented provider boundaries

| Surface                         | Enforcement                                                                                                                               |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Stripe event refunds            | Two-step preview then explicit approval; exact amount, original payment destination, current charge state, and Stripe options are hashed. |
| Stripe Connect                  | Two-step preview then explicit approval before account or onboarding-link creation.                                                       |
| Refund notification email       | Removed from the refund transaction. It requires a separate message preview and approval.                                                 |
| Deferred transfer batch         | Hard-disabled; the read-only reconciliation list remains available.                                                                       |
| Cancelled-event webhook refund  | Hard-disabled and converted to a critical approval-required incident.                                                                     |
| Ticket refunds                  | Hard-disabled before Stripe or local financial mutation.                                                                                  |
| Admin subscription cancellation | Hard-disabled unless a dedicated exact approval path is added.                                                                            |
| Remy auto acknowledgements      | Disabled. Every outbound message requires approval.                                                                                       |
| Legacy autonomy queue           | High-risk auto-execution disabled; status-only approvals cannot authorize consequential domains.                                          |

Authenticated client payment creation, card-present terminal collection, and
customer subscription signup are user-initiated payment flows, not AI or background
agent actions. They remain outside David's agent-approval queue while retaining
their existing actor, ownership, amount, and payment-form checks.

## Database evidence

`exact_action_approvals` stores the immutable preview and action hash.
`consume_exact_action_approval` performs the approved-to-consumed transition with
one atomic update constrained by actor, tenant, hash, expiration, status, and an
empty consumption timestamp.
`exact_action_audit` records preview, approval, consumption, provider confirmation,
and incident-lock events. The provider executor treats invocation errors,
verification failures, missing receipts, and receipt-persistence failures as
unknown outcomes that require read-only reconciliation.

## Deployment order

1. Review and merge the isolated implementation branch.
2. Apply `20260908000100_exact_action_approval_gateway.sql`.
3. Deploy application code only after the migration succeeds.
4. Run a harmless Stripe test-mode Connect-link preview and approval.
5. Run a small Stripe test-mode refund and verify the stored receipt.
6. Confirm changed amount, destination, expired, and replay attempts fail.
7. Keep deferred transfers, ticket refunds, webhook refunds, and subscription
   cancellation disabled until each receives its own complete exact-action UI.

Never deploy application code before the migration: the gateway intentionally
fails closed when its database tables or consumption function are unavailable.
