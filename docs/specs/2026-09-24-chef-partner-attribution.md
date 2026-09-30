# Chef Partner Network: trust, economics, and attribution

Date: 2026-09-24
Branch: feat/chef-partner-attribution-20260924
Status: in-progress

Surface modes:

- /chef-partners: browsing
- /chef-partners/terms: reviewing

## Objective

Make nationwide chef partnerships defensible before outreach begins.

ChefFlow should never look like a middleman that inserts itself into business the chef already owns. The network earns money only when it creates and processes incremental demand under a chef-approved commercial schedule.

## Non-negotiable invariants

1. Existing chef clients are protected.
2. Chef-generated referrals are protected.
3. No subscription is required for the booking channel.
4. No exclusivity is required.
5. The chef controls price, availability, service area, menu, methods, and acceptance.
6. Unknown or disputed source ownership cannot auto-charge a commission.
7. A direct later booking is not commissionable merely because ChefFlow made an earlier introduction.
8. Commission rate and agreement version are snapshotted on the booking.
9. Refunded service revenue reduces the commission basis.
10. Tax, gratuity, refundable deposits, and separately itemized pass-through reimbursements are outside the standard commission basis.
11. Corrections must preserve an attribution audit trail.
12. No chef outreach is part of this slice.

## Source decision

The attribution engine returns one of three states:

- commissionable
- non_commissionable
- needs_review

A booking is commissionable only when:

- the chef has an accepted agreement;
- source ownership is ChefFlow;
- the chef does not have an earlier documented relationship with the client;
- the booking itself is processed through ChefFlow; and
- no source dispute is open.

## Persistence

Migration 20260924000001 adds:

- chef_partner_agreements
- booking_attributions
- booking_attribution_audit

The partner agreement is versioned. The booking attribution record carries the agreement, rate, source evidence, first-touch timestamps, relationship type, decision, and commission snapshot. The audit table preserves evidence for corrections and disputes.

## Public surfaces

/chef-partners

- one-page economics and objection-handling surface
- explicitly protects existing clients
- sample math is clearly labeled as sample economics
- makes no booking-volume guarantee

/chef-partners/terms

- operational agreement draft
- states that public copy alone is not acceptance
- requires a chef-specific signed schedule before commissionable work

These pages are intentionally not wired into a recruitment campaign in this slice.

## Merge hooks

When the marketplace golden-path branch is ready, connect the attribution record at three points:

1. demand capture: create source evidence before matching;
2. chef acceptance: lock agreement version, rate, assigned chef, and decision;
3. financial closeout: write commission basis, refunds, and final commission amount.

Do not derive source ownership after the fact from a payout or payment processor record.

## Legal/compliance rollout gate

Before nationwide commercial launch, have counsel review the partner agreement and signed schedule for contractor classification, state-specific food-service obligations, tax handling, payment flow, consumer terms, insurance, dispute language, and governing-law choices.

The product should keep the chef operationally independent in practice, not only in contract copy.
