# Client Portal Contract Map

## Scope

This map documents the current Chef -> Client contract implemented in code under:

- `app/(client)/*`
- `lib/events/*`, `lib/quotes/*`, `lib/inquiries/*`, `lib/contracts/*`, `lib/chat/*`, `lib/stripe/*`
- Client-accessible document routes in `app/api/documents/*`

It is based on the current runtime code paths, not intended architecture.

## Canonical lifecycle vocab used by client portal

- Event status: `draft`, `proposed`, `accepted`, `paid`, `confirmed`, `in_progress`, `completed`, `cancelled`
- Quote status: `draft`, `sent`, `accepted`, `rejected`, `expired`
- Menu approval status on events: `not_sent`, `sent`, `approved`, `revision_requested`
- Contract status: `draft`, `sent`, `viewed`, `signed`, `voided`

## Route-by-route contract

### `/my-events`

- Data sources:
  - `events` (+ joined `clients`) via `getClientEvents`
  - `client_reviews` (review existence check)
  - `event_financial_summary` (outstanding balance check on completed events)
  - `chefs` (post-event banner chef name)
  - Loyalty: `clients`, `loyalty_rewards`, `loyalty_transactions` via `getMyLoyaltyStatus`
- Query/mutation path:
  - `lib/events/client-actions.ts:getClientEvents`
  - `lib/loyalty/actions.ts:getMyLoyaltyStatus`
- Expected/derived fields:
  - Event list fields from `events.*`; joined client identity
  - Derived buckets: `upcoming`, `past`, `cancelled`, `pastTotalCount`
  - Derived action labels depend on `status` and `quoted_price_cents`
- Invariants:
  - Client must only see owned events (`client_id = user.entityId`)
  - `draft` events are hidden (`.not('status','eq','draft')`)
  - Completed events may still surface "Pay Balance" from `event_financial_summary`
- Lifecycle assumptions:
  - Upcoming set = `proposed|accepted|paid|confirmed|in_progress`
- Error handling:
  - Query failure throws `Failed to fetch events`
  - Loyalty load failure is swallowed (`catch(() => null)`)

### `/my-events/history`

- Data sources:
  - `events` via `getClientEvents({ pastLimit: Infinity })`
  - `event_financial_summary` (completed events with outstanding balance)
- Invariants:
  - Same ownership and `draft` exclusion contract as `/my-events`
- Error handling:
  - Relies on upstream action behavior

### `/my-events/[id]` (event detail)

- Data sources:
  - `events` (+ `clients`) via `getClientEventById`
  - `menus` (attached menus)
  - `ledger_entries` (payment history)
  - `event_financial_summary` (derived financials)
  - `event_state_transitions` (journey timeline)
  - `event_photos` (photo existence)
  - `event_contracts` (contract existence/signed_at)
  - `client_reviews` (review existence)
  - Sharing: `event_shares`, `event_guests`, `event_rsvp_summary`
  - Completed-only section pulls `client_reviews`, `chefs` (google link), event photos list
- Query/mutation path:
  - `lib/events/client-actions.ts:getClientEventById`
  - `lib/sharing/actions.ts:getEventShares|getEventGuests|getEventRSVPSummary`
  - Cancel/accept actions: `acceptEventProposal`, `cancelEventAsClient`, `requestCancellationViaChat`
- Expected/derived fields:
  - Derived `financial` object:
    - `totalPaidCents`, `outstandingBalanceCents`, `quotedPriceCents`, `paymentStatus`
  - Derived booleans:
    - `hasPhotos`, `hasContract`, `contractSignedAt`, `hasReview`
- Invariants:
  - Event must be owned by client and not `draft`
  - Printable FOH menu download CTA is only rendered when status in `confirmed|in_progress|completed`
  - Cancellation modes split by state:
    - direct cancel: `proposed|accepted`
    - chat cancellation request: `paid|confirmed|in_progress`
- Lifecycle assumptions:
  - Journey stepper expects valid event transition history sequence
- Error handling:
  - Missing event -> `notFound()`
  - Some secondary widgets degrade gracefully if optional datasets are empty

### `/my-events/[id]/proposal`

- Data sources:
  - Same base event projection as detail route
  - `event_contracts` via `getClientEventContract`
- Derived contract/payment gating:
  - `canPay` requires `event.status === 'accepted'`, positive balance, and contract either absent or signed
- Invariants:
  - Proposal view assumes quote/payment values are already populated on event row/view
- Error handling:
  - Missing event -> `notFound()`
  - Contract fetch failure -> falls back to `null` contract

### `/my-events/[id]/pay`

- Data sources:
  - `getClientEventById` (events + financial summary)
  - Stripe setup via `createPaymentIntent`
- Mutation path:
  - `lib/stripe/actions.ts:createPaymentIntent`
  - Gift card/voucher flow through `RedemptionCodeInput` integrations
- Invariants:
  - Route is only valid when event status is `accepted`, otherwise redirect to event detail
  - Payment amount uses deposit-first logic:
    - first payment uses `deposit_amount_cents` when present
    - otherwise outstanding balance
- Lifecycle assumptions:
  - Successful payment eventually transitions event to `paid` via Stripe webhook/system transition
- Error handling:
  - Missing event -> `notFound()`
  - Invalid state/amount -> `redirect`
  - Payment intent errors surfaced in UI `Alert`

### `/my-events/[id]/invoice`

- Data sources:
  - `getInvoiceDataForClient`:
    - `events`, `chefs`, `ledger_entries`
    - optional tax lookup via API Ninjas
- Invariants:
  - Strict ownership (`events.client_id = user.entityId`)
  - Invoice is computed projection, not a separate invoices table
- Error handling:
  - No accessible invoice data -> `notFound()`

### `/my-events/[id]/payment-plan`

- Data sources:
  - `events` (`id, quoted_price_cents, event_date, occasion`)
- Invariants:
  - Relies on RLS for ownership; query only filters by `id`
- Error handling:
  - Query wrapped in `try/catch`; falls back to zero/default display values

### `/my-events/[id]/approve-menu`

- Data sources:
  - `menu_approval_requests` via `getClientMenuApprovalRequest`
- Mutations:
  - `approveMenu` -> updates `menu_approval_requests` and `events.menu_approval_status = approved`
  - `requestMenuRevision` -> updates request + `events.menu_approval_status = revision_requested`
- Expected fields:
  - `menu_snapshot`, `status`, `revision_notes`
- Invariants:
  - Request must belong to client and still be `sent` to respond
- Error handling:
  - Missing `req` param -> redirect to event page
  - Missing request -> `notFound()`
  - Invalid response state -> action throws

### `/my-events/[id]/contract`

- Data sources:
  - `event_contracts` via `getClientEventContract`
- Mutations:
  - `recordClientView` (sent -> viewed)
  - `signContract` (sent/viewed -> signed with signature payload)
- Invariants:
  - Client can only access own event contract
  - Signing only allowed from `sent|viewed`
- Error handling:
  - Missing contract -> `notFound()`
  - Invalid state or write failure -> error shown in signing UI

### `/my-events/[id]/pre-event-checklist`

- Data sources:
  - `events` checklist fields
  - `clients` profile fields used for prep confirmation
- Mutations:
  - `confirmPreEventChecklist`
  - `updateClientJourneyNote`
- Invariants:
  - Route only valid for `confirmed|paid|in_progress`
  - Ownership enforced with `event.client_id = user.entityId`
- Error handling:
  - Missing event/data -> `notFound()`
  - Invalid state -> redirect to event

### `/my-events/[id]/event-summary`

- Data sources:
  - `getClientEventById` projection (menus, ledgerEntries, transitions, financial)
- Invariants:
  - Route only valid for `completed` events
- Error handling:
  - Missing event -> `notFound()`
  - Non-completed -> redirect to event

### `/my-events/[id]/countdown`

- Data sources:
  - `events` via `getEventCountdown`
- Invariants:
  - Client query excludes `draft`
- Error handling:
  - Action errors are swallowed and route renders "not available" fallback

### `/my-quotes`

- Data sources:
  - `quotes` + joined `inquiries` via `getClientQuotes`
- Invariants:
  - Client-owned quotes only
  - Visible quote statuses limited to `sent|accepted|rejected` (`draft` hidden)
- Error handling:
  - Fetch errors throw and surface route error boundary

### `/my-quotes/[id]`

- Data sources:
  - `quotes` + joined `inquiries` via `getClientQuoteById`
  - Quote PDF route `GET /api/documents/quote-client/[quoteId]`
- Mutations:
  - `acceptQuote`, `rejectQuote`
- Invariants:
  - Client can respond only when quote is `sent`
  - Accept path freezes pricing snapshot (`snapshot_frozen`, `pricing_snapshot`)
- Lifecycle assumptions:
  - Accepted quote may propagate:
    - linked inquiry `quoted -> confirmed`
    - linked event pricing fields updated from quote
- Error handling:
  - Missing quote -> redirect `/my-quotes`
  - Action errors shown inline in modal UI

### `/my-inquiries`

- Data sources:
  - `inquiries` via `getClientInquiries`
- Invariants:
  - Client-owned inquiries only
  - Only active statuses shown: `new|awaiting_client|awaiting_chef|quoted|confirmed`

### `/my-inquiries/[id]`

- Data sources:
  - `inquiries` detail
  - `inquiry_state_transitions`
  - linked `quotes` (`sent|accepted|rejected`)
- Invariants:
  - Client-owned inquiry only
- Error handling:
  - Missing inquiry -> `notFound()`

### `/my-chat` and `/my-chat/[id]`

- Data sources:
  - `conversation_participants`, `conversations`, `chat_messages`
  - RPCs: `get_unread_counts`, `get_total_unread_count`
  - participant identity lookup via `chefs` and `clients`
- Mutations:
  - `markConversationRead`
  - message sends and file/image uploads (`sendChatMessage`, `sendImageMessage`, `sendFileMessage`)
- Invariants:
  - User must be conversation participant
  - Client conversation creation binds to `tenant_id = user.tenantId`
- Error handling:
  - Missing conversation -> redirect `/my-chat`
  - Message failures throw user-visible errors

### `/my-profile`

- Data sources:
  - `clients` profile fields via `getMyProfile`
  - `clients.fun_qa_answers`
  - `clients.availability_signal_notifications`
- Mutations:
  - `updateMyProfile`
  - `updateMyFunQA`
  - `setClientSignalNotificationPref`
- Invariants:
  - Client can only read/update own `clients` row
- Error handling:
  - Fetch/update errors surfaced in form alerts

### `/my-rewards`

- Data sources:
  - `clients` loyalty summary
  - `loyalty_rewards`, `loyalty_transactions`
  - `client_incentives`, `loyalty_reward_redemptions`, `loyalty_config`
- Query path:
  - `getMyLoyaltyStatus`, `getVoucherAndGiftCards`, `getMyPendingRedemptions`
- Invariants:
  - Client-only incentives are filtered to created/targeted client IDs
- Error handling:
  - Missing loyalty status returns warning state

### `/my-spending`

- Data sources:
  - `events` + `event_financial_summary` via `getClientSpendingSummary`
- Invariants:
  - Excludes `draft`
  - Uses completed events for lifetime/year spend
- Error handling:
  - Query failures return zeroed summary object (graceful fallback)

### `/my-cannabis`

- Data sources:
  - access gate: `cannabis_tier_users`
  - events: `events` filtered by `cannabis_preference = true`
  - detail overlay: `cannabis_event_details`
- Invariants:
  - Access requires active cannabis tier membership (or admin bypass)
- Error handling:
  - No access -> redirect `/my-events`
  - Event fetch failures degrade to empty list

### `/book-now`

- Data sources:
  - Public inquiry submission component flow
- Invariants:
  - Requires authenticated client route access

### `/survey/[token]` (public token route under client app tree)

- Data sources:
  - `event_surveys` + joined `events` + `chefs` via admin client token lookup
- Mutations:
  - `submitSurveyResponse` -> `submitSurvey` update on `event_surveys`
- Invariants:
  - No login required; token is auth boundary
  - Single submission enforced (`submitted_at` guard)
- Error handling:
  - Missing/invalid token -> `notFound()`
  - Duplicate submissions show thank-you state

## Client-visible document routes contract

### `GET /api/documents/foh-menu/[eventId]`

- Auth: `requireClient()`
- Data pipeline: `events` -> `menus` -> `dishes`
- Invariant: client must own event
- Output: PDF (`Content-Type: application/pdf`)
- Current behavior note: generation function does not additionally gate by event status, while UI link is status-gated.

### `GET /api/documents/quote-client/[quoteId]`

- Auth: `requireClient()`
- Data pipeline: `quotes` + `clients` + `chefs`; optional `events` or `inquiries`; optional `menus/dishes/components`
- Invariant: quote must be owned by client
- Output: PDF

### `GET /api/documents/invoice-pdf/[eventId]`

- Auth: `requireAuth()`
- Uses role-aware fetcher; client path uses `getInvoiceDataForClient`
- Invariant: client can only fetch own event invoice projection

### `GET /api/documents/receipt/[eventId]`

- Auth: `requireAuth()`
- Client path uses client-scoped receipt generator

## High-risk contract edges (where schema drift breaks client quickly)

- `lib/events/client-actions.ts:getClientEventById` uses `select('*')` on `events` and maps downstream fields in many route sections.
- `event_financial_summary` view drives payment UI, spending, invoice, and outstanding balance behavior.
- Quote response contract requires both:
  - DB policy permitting client update (`sent -> accepted/rejected`)
  - App-level row-update verification to avoid silent no-op writes.
- Menu approval and contract flows update multiple tables without a single transaction; partial states are possible if second write fails.
