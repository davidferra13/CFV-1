# Customer Feedback Collection (Feature U3)

## Overview

After any service (event, bakery order, delivery, wholesale order, preorder, tasting), send a feedback request link to the client. Track ratings, comments, NPS scores, and feedback tags.

## How It Works

1. Chef creates a feedback request (links to an entity like an event)
2. System generates a unique token-based URL
3. Client visits the public URL (no auth required) and submits their feedback
4. Chef sees aggregated ratings, NPS, tags, and individual responses on the dashboard

All scoring is deterministic (Formula > AI). NPS calculation: (promoters - detractors) / total \* 100.

## Files

| File                                                                     | Purpose                                               |
| ------------------------------------------------------------------------ | ----------------------------------------------------- |
| `lib/feedback/customer-feedback-actions.ts`                              | Chef-facing server actions (7 functions)              |
| `lib/feedback/public-feedback-actions.ts`                                | Public submission actions (no auth)                   |
| `lib/email/templates/feedback-request.tsx`                               | Email template for feedback requests                  |
| `components/feedback/feedback-dashboard.tsx`                             | Full feedback dashboard                               |
| `app/(chef)/feedback/page.tsx`                                           | Chef feedback management page                         |
| `app/feedback/[token]/page.tsx`                                          | Public feedback form (no auth)                        |
| `supabase/migrations/20260331000036_food_cost_and_customer_feedback.sql` | Creates feedback_requests + feedback_responses tables |

## Database Tables

### feedback_requests

- `id`, `tenant_id`, `entity_type`, `entity_id`, `client_name`, `client_email`, `client_phone`
- `token` (unique, for public access)
- `status` (pending, sent, completed, expired)
- RLS on tenant_id

### feedback_responses

- `id`, `tenant_id`, `request_id`, `rating` (1-5), `comment`, `tags[]`, `would_recommend`
- RLS on tenant_id for reads; public submissions use admin/service role client

## NPS Calculation

- **Promoters:** would_recommend = true AND rating >= 4
- **Detractors:** would_recommend = false OR rating <= 2
- **Passives:** everyone else
- **NPS Score:** ((promoters - detractors) / total) \* 100

## Feedback Tags

Pre-defined tags clients can select: Food Quality, Service, Timing, Presentation, Value.

## Public Form

The public form at `/feedback/[token]` requires no authentication. It shows:

- Star rating selector (1-5, large touch targets)
- Optional comment textarea
- Tag checkboxes
- "Would you recommend?" Yes/No buttons
- Thank you screen after submission
- Already-submitted detection (shows "already submitted" message)
