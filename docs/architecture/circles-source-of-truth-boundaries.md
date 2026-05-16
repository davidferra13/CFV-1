# Circles Source-Of-Truth Boundaries

> **Status:** draft implementation contract
> **Created:** 2026-05-15
> **Purpose:** Prevent Circles from becoming a duplicate Event/Menu/Client/Payment/Staff/Vendor system while making them the shared place where relational work happens.

## Rule

Circles coordinate shared work. Canonical domains own canonical truth.

A Circle can show, discuss, request, confirm, summarize, route, notify, and preserve evidence around a fact. The owning domain must still store and mutate that fact.

## Boundary Matrix

| Shared thing users experience in a Circle   | Circle can own                              | Canonical owner                                     | Mutation path                                                  |
| ------------------------------------------- | ------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------- |
| Conversation about date/address/guest count | messages, status prompt, handoff            | Events / Inquiries                                  | event/inquiry action with tenant guard                         |
| Client confirms date/address/guest count    | confirmation message/proof                  | Events / Inquiries                                  | approved update action, not raw message parsing as final truth |
| Menu visibility and discussion              | message, poll, visible menu projection      | Menus                                               | menu action/revision/approval flow                             |
| Menu approval                               | approval prompt/proof/event                 | Menus                                               | menu approval action                                           |
| Dietary/allergy statement                   | volunteered message/profile signal          | Guest/Profile/Event Guest/Client allergy record     | dietary/profile action with source/evidence                    |
| RSVP                                        | RSVP prompt/status/proof                    | Event Guests / hub member RSVP field where designed | RSVP action                                                    |
| Payment/deposit discussion                  | chef/client-safe message only where allowed | Ledger / Invoices / Quotes                          | financial action or payment provider webhook                   |
| Staff task discussion                       | message/handoff/proof                       | Staff assignments / prep/task modules               | staff/prep/task action                                         |
| Vendor substitution discussion              | message/proof/file                          | Vendor/Purchasing/Sourcing                          | vendor/sourcing action                                         |
| Partner referral follow-up                  | message/status/handoff                      | Partner/referral domain                             | partner/referral action                                        |
| Photos and social memories                  | media, captions, message context            | Hub media, optional portfolio/social modules        | media action; portfolio publish is separate                    |
| Readiness/status display                    | computed projection                         | Events/Menus/Ledger/Guests/etc.                     | read-only derived computation                                  |
| Unknown/missing blocker                     | missing-state marker/handoff                | owning domain remains source                        | request or update routed to owner action                       |

## Allowed Circle-Owned State

Circles may own:

- group identity, token, visibility, type, active/archived state
- membership and per-member permissions
- messages and message provenance
- notes, pinned context, media, polls, reactions
- invite links, invite attribution, recovery links
- notification preferences and read state
- Circle-specific status/handoff/memory/proof records if implemented as Circle metadata
- event-specific Circle projection config through `event_share_settings.circle_config`

## Not Circle-Owned

Circles must not own:

- Event lifecycle state
- canonical date/address/guest count
- canonical menu contents and revisions
- quote amount, status, or line items
- ledger entries, deposits, refunds, balances
- client CRM identity or private relationship notes
- staff identity/pay/assignment truth
- vendor identity/order/payment truth
- partner identity/referral payout truth
- auth roles or tenant ownership

## Projection Pattern

When a Circle needs to show canonical data:

1. Load the Circle with policy.
2. Resolve actor context.
3. Resolve linked object.
4. Fetch canonical data from the owning domain with tenant/role scope.
5. Transform to role-safe projection.
6. Label evidence/confidence where not confirmed.
7. Render the projection in the Circle.

Do not copy canonical facts into `hub_messages` or `hub_groups` as the long-term source of truth. Messages can provide evidence; they do not become the fact until the owning domain updates.

Public token and client-facing projections have an extra rule: no `select('*')` or raw admin-loaded `hub_groups`/linked-object row may cross the public/client boundary. Token routes may use admin DB access internally, but they must whitelist fields into a role-safe projection before rendering or returning data.

## Confirmation Pattern

When a participant confirms something in a Circle:

1. Store the participant's statement as a message or action event.
2. Route the statement through a domain action.
3. Apply validation and authorization in that domain.
4. Update the canonical record.
5. Post a Circle system message that says what changed and links to proof.
6. Mark weak inference as confirmed only after canonical update succeeds.

## Evidence Labels

Circle projections must distinguish:

- `confirmed`: canonical record or direct approved update.
- `computed`: deterministic calculation from canonical records.
- `claimed`: participant statement not yet applied to canonical record.
- `inferred`: AI/system/pattern guess.
- `unknown`: missing value.
- `stale`: old value needing review.
- `disputed`: conflicting values.

## Examples

### Address

Bad:

- A guest message says "Use the lake house" and the Circle UI treats the event address as confirmed.

Good:

- The message is stored as claimed evidence.
- Chef/client confirms exact address through an Event/Inquiry update action.
- Circle status changes to confirmed after the canonical record updates.

### Deposit

Bad:

- Guest token view displays "deposit missing."

Good:

- Chef portal can see payment state from Ledger.
- Guest/client Circle sees only client-safe readiness language unless the client payment portal explicitly exposes payment state to that client.

### Menu Poll

Bad:

- Poll winner rewrites menu contents directly from Circle state.

Good:

- Poll result is Circle evidence.
- Chef approves/materializes selection through Menu action.
- Menu revision records canonical change.
- Circle posts a system update.

## Test Requirements

Future regression harness should verify:

- Circle membership alone cannot read quote/ledger/client-private/staff-private data.
- Public token views do not include deposit/payment/internal risk fields.
- Claimed message facts do not become confirmed without canonical mutation.
- Role-safe projections hide restricted linked-object fields.
- System messages reference canonical changes after domain update, not before.
