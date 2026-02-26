# Marketing Execution System

## What Changed

Added an email campaign system that lets chefs compose and send targeted campaigns to client lists. Supports re-engagement, seasonal, announcement, thank-you, and promotion campaign types. Includes audience segmentation, send preview, delivery tracking, and unsubscribe honor.

## Why

Private chefs have a natural re-engagement opportunity that most don't act on. Past clients who haven't booked in 90+ days often just need a gentle, personal touch. Before this change, there was no way to reach those clients from inside ChefFlow — chefs were manually emailing from their personal email, with no tracking or segmentation. Marketing emails are also how chefs announce seasonal menu offerings or acknowledge loyal clients. This closes the loop between CRM data (client list, booking history) and outbound communication.

## What Was Built

### Database

**Migration:** `supabase/migrations/20260303000019_marketing_campaigns.sql`

**`marketing_campaigns`**

- `name`, `campaign_type` enum (re_engagement, seasonal, announcement, thank_you, promotion, other)
- `status` enum: draft, scheduled, sending, sent, cancelled
- `target_segment JSONB` — flexible audience definition (see below)
- `subject`, `body_html`
- `scheduled_at`, `sent_at`, `recipient_count`

**`campaign_recipients`**

- Per-email delivery record: `campaign_id`, `client_id`, `email`
- `sent_at`, `opened_at`, `clicked_at`, `unsubscribed_at` — tracking pixels (where supported)
- `error_message` — records delivery failure reason

**Clients table additions (ALTER TABLE):**

- `marketing_unsubscribed BOOLEAN DEFAULT false`
- `marketing_unsubscribed_at TIMESTAMPTZ`
  These are marketing-specific opt-outs. Transactional emails (quotes, contracts, event updates) are unaffected.

### Server Actions

**File:** `lib/marketing/actions.ts`

| Action                             | What                                                                                       |
| ---------------------------------- | ------------------------------------------------------------------------------------------ |
| `createCampaign(input)`            | Save draft or scheduled campaign                                                           |
| `updateCampaign(id, input)`        | Edit a draft                                                                               |
| `deleteCampaign(id)`               | Delete draft/cancelled campaigns                                                           |
| `listCampaigns()`                  | All campaigns, newest first                                                                |
| `previewCampaignAudience(segment)` | Returns matching client list for preview before sending                                    |
| `sendCampaignNow(campaignId)`      | Resolves audience, sends via `sendEmail()`, creates `campaign_recipients` rows, marks sent |
| `recordUnsubscribe(clientId)`      | Marks client as marketing_unsubscribed                                                     |
| `getCampaignStats(campaignId)`     | Total/sent/failed/opened/clicked/unsubscribed counts                                       |

### Audience Segments

`target_segment` is a JSONB object. Currently supported segment types:

- `{ type: 'dormant_90_days' }` — clients with no events in the last 90 days who haven't unsubscribed
- `{ type: 'all_clients' }` — all subscribed clients with an email
- `{ type: 'client_ids', ids: [...] }` — specific client IDs

### UI

- **`app/(chef)/marketing/page.tsx`** — Campaign history list with status badges, campaign builder card
- **`app/(chef)/marketing/campaign-builder-client.tsx`** — 2-step compose flow:
  1. **Compose**: name, type, audience, subject, message body
  2. **Preview**: shows draft summary, audience count, message preview; Send or go back to edit

## Send Flow

1. Chef composes campaign → saved as draft
2. Preview step shows audience count
3. Chef clicks "Send to N clients"
4. `sendCampaignNow()` iterates audience, calls `sendEmail()` per recipient
5. Each send creates a `campaign_recipients` row (success or failure)
6. Campaign marked as `sent` with `sent_at` and `recipient_count`

Email delivery uses the same `sendEmail()` function as transactional emails — no new email infrastructure needed.

## Unsubscribe Behavior

`marketing_unsubscribed = true` excludes a client from all campaign audience queries. It does not affect transactional emails (quotes, event confirmations, contracts). This distinction is important for trust and legal compliance.

## Future Considerations

- HTML template builder (not just plain text)
- Open/click tracking via Resend webhooks
- Scheduled send at a specific date/time
- Custom segment builder (by cuisine preference, loyalty tier, event count, etc.)
- Unsubscribe link in every email footer (legal requirement in many jurisdictions)
