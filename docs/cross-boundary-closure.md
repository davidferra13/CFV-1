# Cross-Boundary Gap Closure — Implementation Summary

## Overview

- 57 gaps found in cross-portal communication (Chef <-> Client)
- 2 food safety risks, 2 Zero Hallucination violations, 27 stale-cache issues, 26 missing notifications
- All 57 gaps closed across 5 phases

## What Changed

### Phase 0: Foundation

- 21 new `NotificationAction` types added to `lib/notifications/types.ts`
- 3 new email templates created: contract-signed, menu-approved, menu-revision
- 3 new email sending functions added to `lib/email/notifications.ts`

### Phase 1: Critical Safety & Zero Hallucination

- **Food Safety:** Guest RSVP allergies now alert chef immediately (`lib/sharing/actions.ts`). Client dietary profile changes trigger chef notification (`lib/clients/client-profile-actions.ts`).
- **Zero Hallucination:** Menu approval/revision now sends real chef notifications + emails (`lib/events/menu-approval-actions.ts`). Contract signing now sends real chef notifications + emails (`lib/contracts/actions.ts`). UI text "Your chef has been notified" is now TRUE.

### Phase 2: Business-Critical Communication

- **Event FSM** (`lib/events/transitions.ts`): Client now receives notifications for paid, in_progress, completed, and cancelled transitions. Chef receives email on client-initiated cancellation. Instant-book path (draft->paid) now properly notifies. Cache invalidation added for list pages.
- **Inquiry Pipeline** (`lib/inquiries/actions.ts`): Client now notified when inquiry is quoted, declined, expired, or converted to event. Cache invalidation for `/my-inquiries`.
- **Quote FSM** (`lib/quotes/client-actions.ts`, `lib/quotes/actions.ts`): Chef-side cache invalidation added for accept/reject. Fixed bug where `quote_name` was never resolved in notification text. Client-side cache invalidation for quote transitions.

### Phase 3: Payment, Chat & Loyalty

- **Stripe Webhooks** (`app/api/webhooks/stripe/route.ts`): Client gets in-app notification on successful payment and refund. Chef gets notification on dispute fund withdrawal (was completely missing).
- **Invoice** (`lib/events/invoice-actions.ts`): Fixed admin client usage in webhook context. Added client-side cache invalidation.
- **Chat** (`lib/chat/actions.ts`): Bidirectional notifications -- chef-to-client messages now trigger client notification (was only client->chef). Image and file messages now notify both directions.
- **Loyalty** (`lib/loyalty/actions.ts`, `lib/loyalty/redemption-actions.ts`): Client notified when points are awarded and tier upgraded. Chef notified when gift card is redeemed.

### Phase 4: Cache Invalidation Sweep

- `lib/events/photo-actions.ts`: Client portal sees photo changes
- `lib/events/offline-payment-actions.ts`: Both portals see offline payments
- `lib/events/pre-event-checklist-actions.ts`: Chef sees checklist completion
- `lib/events/financial-summary-actions.ts`: Client portal sees tip recording
- `lib/events/countdown-actions.ts`: Client portal sees countdown toggle

## Files Modified (22 files)

| File                                        | Phase | Changes                                                           |
| ------------------------------------------- | ----- | ----------------------------------------------------------------- |
| `lib/notifications/types.ts`                | 0     | +21 action types, +21 config entries                              |
| `lib/email/notifications.ts`                | 0     | +3 email sending functions                                        |
| `lib/sharing/actions.ts`                    | 1     | RSVP -> chef dietary alert + notification                         |
| `lib/clients/client-profile-actions.ts`     | 1     | Allergy change -> chef notification                               |
| `lib/events/menu-approval-actions.ts`       | 1     | Menu approval/revision -> chef notification + email               |
| `lib/contracts/actions.ts`                  | 1     | Contract sign -> chef notification + email                        |
| `lib/events/transitions.ts`                 | 2     | 6 new client notifications + chef cancel email                    |
| `lib/inquiries/actions.ts`                  | 2     | 4 new client notifications + cache invalidation                   |
| `lib/quotes/client-actions.ts`              | 2     | Chef cache invalidation + quote_name bug fix                      |
| `lib/quotes/actions.ts`                     | 2     | Client cache invalidation                                         |
| `app/api/webhooks/stripe/route.ts`          | 3     | 3 new notifications (client payment, client refund, chef dispute) |
| `lib/events/invoice-actions.ts`             | 3     | Admin client fix + client cache                                   |
| `lib/chat/actions.ts`                       | 3     | Bidirectional chat notifications                                  |
| `lib/loyalty/actions.ts`                    | 3     | Client points/tier notifications                                  |
| `lib/loyalty/redemption-actions.ts`         | 3     | Chef gift card notification                                       |
| `lib/events/photo-actions.ts`               | 4     | Client cache invalidation                                         |
| `lib/events/offline-payment-actions.ts`     | 4     | Both-portal cache invalidation                                    |
| `lib/events/pre-event-checklist-actions.ts` | 4     | Chef cache invalidation                                           |
| `lib/events/financial-summary-actions.ts`   | 4     | Client cache invalidation                                         |
| `lib/events/countdown-actions.ts`           | 4     | Client cache invalidation                                         |

## Files Created (3 files)

| File                                           | Purpose                                                    |
| ---------------------------------------------- | ---------------------------------------------------------- |
| `lib/email/templates/contract-signed-chef.tsx` | Email template for chef when client signs contract         |
| `lib/email/templates/menu-approved-chef.tsx`   | Email template for chef when client approves menu          |
| `lib/email/templates/menu-revision-chef.tsx`   | Email template for chef when client requests menu revision |

## Bugs Fixed Along the Way

1. **`notifyChefOfQuoteAccepted` -- quote name always undefined**: Was using `quote.name || quote.title` but the DB column is `quote_name`. Fixed to check `(quote as any).quote_name` first.
2. **Instant-book notification missing**: Event FSM only checked `fromStatus === 'accepted'` for paid notification, missing the `draft->paid` instant-book path.
3. **`requestMenuRevision` missing `chef_id` in select**: Needed for notification routing but wasn't being fetched.
4. **`recordClientView` missing `event_id` in select**: Needed for cache invalidation.
5. **`assignInvoiceNumber` using non-admin client**: Failed silently in Stripe webhook context (no user session).
6. **`sendContractToClient` email not in try/catch**: Failed email would crash the entire contract send action.

## Architecture Decisions

- **Non-blocking pattern**: All notifications/emails wrapped in `try/catch` per project rules -- failures are logged but never block the main operation.
- **Dynamic imports**: Used in files that don't normally import notification modules, to avoid circular dependencies.
- **createNotification vs createClientNotification**: Chef notifications use `createNotification` + `getChefAuthUserId`. Client notifications use `createClientNotification` which handles auth resolution internally.
- **Dual cache invalidation**: Every cross-boundary write invalidates both `/events/${id}` (chef) and `/my-events/${id}` (client) paths.

## Related Documents

- Audit: `docs/cross-boundary-audit.md`
- Plan: `.claude/plans/humble-yawning-oasis.md`
