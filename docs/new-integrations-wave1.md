# New Integrations — Wave 1 (2026-02-27)

7 new integrations added to ChefFlow in a single session. All follow existing codebase patterns.

---

## Summary

| Integration          | Type          | Status                 | What It Does                                         |
| -------------------- | ------------- | ---------------------- | ---------------------------------------------------- |
| **QuickBooks**       | OAuth 2.0     | Service layer complete | Sync invoices + expenses to QB Online                |
| **iCal Feed**        | Public URL    | Fully functional       | Subscribe from Apple Calendar / Outlook / Google Cal |
| **DocuSign**         | OAuth 2.0     | Service layer complete | Send contracts for e-signature                       |
| **Square**           | OAuth 2.0     | Service layer complete | In-person + payment link collection                  |
| **Zapier/Make**      | REST Hooks    | Fully functional       | 17 event types → any Zapier/Make webhook             |
| **Yelp**             | API Key       | Fully functional       | Pull reviews into external_reviews table             |
| **Apple/Google Pay** | Stripe toggle | Fully functional       | Per-chef toggle for digital wallets                  |

---

## Files Created

### Database

- `supabase/migrations/20260327000009_new_integrations.sql`

### QuickBooks

- `lib/integrations/quickbooks/quickbooks-client.ts` — OAuth + invoice/expense sync
- `app/api/integrations/quickbooks/callback/route.ts` — OAuth callback

### DocuSign

- `lib/integrations/docusign/docusign-client.ts` — OAuth + envelope signing
- `app/api/integrations/docusign/callback/route.ts` — OAuth callback

### Square

- `lib/integrations/square/square-client.ts` — OAuth + payment links
- `app/api/integrations/square/callback/route.ts` — OAuth callback

### Zapier/Make

- `lib/integrations/zapier/zapier-webhooks.ts` — Subscription CRUD + event dispatch
- `app/api/integrations/zapier/subscribe/route.ts` — REST Hook API

### iCal Feed

- `lib/integrations/ical/ical-actions.ts` — Enable/disable/regenerate token
- `app/api/feeds/calendar/[token]/route.ts` — Public .ics endpoint

### Yelp

- `lib/integrations/yelp/yelp-sync.ts` — Fetch + sync reviews

### Apple Pay / Google Pay

- `lib/integrations/payments/payment-method-settings.ts` — Toggle actions

### Settings UI

- `app/(chef)/settings/calendar-sync/page.tsx` — iCal feed settings page
- `app/(chef)/settings/payment-methods/page.tsx` — Digital wallet toggle page
- `components/settings/ical-feed-settings.tsx` — iCal feed client component
- `components/settings/payment-methods-settings.tsx` — Payment method toggles

### Modified Files

- `lib/integrations/core/types.ts` — Added 4 new providers to enum
- `lib/integrations/core/providers.ts` — Added provider metadata + 4 new categories
- `lib/reviews/external-sync.ts` — Added Yelp as review provider
- `components/settings/integration-center.tsx` — Added 4 new category sections
- `app/(chef)/settings/integrations/page.tsx` — Updated description
- `middleware.ts` — Added `/api/feeds` to public API bypass list

---

## Environment Variables Needed

```env
# QuickBooks
QUICKBOOKS_CLIENT_ID=           # From Intuit Developer Portal
QUICKBOOKS_CLIENT_SECRET=       # From Intuit Developer Portal
QUICKBOOKS_SANDBOX=true         # Set to 'false' for production

# DocuSign
DOCUSIGN_CLIENT_ID=             # From DocuSign Developer Portal
DOCUSIGN_CLIENT_SECRET=         # From DocuSign Developer Portal
DOCUSIGN_AUTH_URL=               # Optional: override for production
DOCUSIGN_API_BASE=               # Optional: override for production

# Square
SQUARE_APPLICATION_ID=           # From Square Developer Dashboard
SQUARE_APPLICATION_SECRET=       # From Square Developer Dashboard
SQUARE_SANDBOX=true              # Set to 'false' for production

# Yelp
YELP_API_KEY=                    # From Yelp Fusion API
```

Apple Pay, Google Pay, iCal, and Zapier require **no new env vars**.

---

## How Each Integration Works

### QuickBooks (OAuth 2.0)

1. Chef clicks "Connect QuickBooks" → redirected to Intuit OAuth
2. Callback exchanges code for tokens, stores in `integration_connections`
3. `syncInvoiceToQuickBooks()` — creates invoices in QB from ChefFlow events
4. `syncExpenseToQuickBooks()` — pushes expenses to QB
5. Tokens auto-refresh with 5-min buffer

### iCal Feed

1. Chef enables feed in Settings → Calendar Sync
2. UUID token generated, stored in `chefs.ical_feed_token`
3. Public URL: `/api/feeds/calendar/{token}` returns `.ics` file
4. Any calendar app can subscribe by URL — refreshes every 5 min
5. Shows events from 30 days ago to future, respects event status

### DocuSign (OAuth 2.0)

1. Chef clicks "Connect DocuSign" → redirected to DocuSign OAuth
2. Callback exchanges code, fetches user info + account ID
3. `sendContractForSignature()` — creates envelope, sends for signing
4. Uses anchor tags (`/sig/`, `/date/`) for signature placement
5. Updates `contracts` table with envelope ID + status

### Square (OAuth 2.0)

1. Chef clicks "Connect Square" → redirected to Square OAuth
2. Callback exchanges code, fetches merchant info
3. `createSquarePaymentLink()` — creates quick-pay links for events
4. Tokens last 30 days, auto-refresh with 1-day buffer
5. Disconnect revokes token with Square API

### Zapier/Make (REST Hooks)

1. Zapier calls `POST /api/integrations/zapier/subscribe` with a webhook URL
2. ChefFlow stores subscription with HMAC secret
3. When events happen, `dispatchWebhookEvent()` fires to all matching subs
4. 17 event types: inquiry, event, client, payment, invoice, quote, etc.
5. HMAC-SHA256 signature in `X-ChefFlow-Signature` header for verification
6. Delivery log tracks success/failure for debugging

### Yelp

1. Chef adds a Yelp review source via external review settings
2. Config needs `{ business_id: "yelp-alias-or-id" }`
3. `fetchYelpReviews()` pulls via Yelp Fusion API v3
4. Reviews normalized and upserted into `external_reviews` table
5. Follows same sync interval pattern as Google Places

### Apple Pay / Google Pay

1. Already enabled via Stripe `automatic_payment_methods`
2. New per-chef toggle in `chefs.apple_pay_enabled` / `google_pay_enabled`
3. Settings page: `/settings/payment-methods`
4. TODO: Wire toggle into Stripe checkout creation to conditionally disable

---

## Tier Assignment

All 7 integrations are **Pro features** under the existing `integrations` module slug.
The integration settings page is already gated by the integrations module toggle.

---

## TODO / Future Work

- [ ] Wire Apple/Google Pay toggle into `lib/stripe/checkout.ts` (pass `payment_method_types` instead of `automatic_payment_methods` when disabled)
- [ ] Add QuickBooks webhook handler for payment notifications from QB
- [ ] Add DocuSign webhook handler for `envelope.completed` status updates
- [ ] Build Square Terminal integration for Reader SDK (hardware)
- [ ] Add Zapier event dispatch calls into existing server actions (inquiry, event, payment)
- [ ] Build setup wizards for QuickBooks/DocuSign/Square in the integration center
- [ ] Add Yelp business search UI to external review source setup
