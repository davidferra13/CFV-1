# Client Dashboard Widget Audit

Generated: 2026-03-05

## Coverage Summary

- Registry widget IDs: `15`
- Dashboard widget map entries: `15`
- Missing IDs: `0`
- Extra IDs: `0`

Source of truth:

- Widget registry: `lib/client-dashboard/types.ts`
- Dashboard map: `app/(client)/my-events/page.tsx`
- Data aggregation: `lib/client-dashboard/actions.ts`

## End-to-End Checklist

- [x] Every registry widget ID has a dashboard render block.
- [x] Every widget has a meaningful primary CTA or intentional passive behavior.
- [x] Every widget has a defined empty-state behavior or fallback copy.
- [x] Dashboard customization exists (`/my-events/settings/dashboard`) with persistence.
- [x] Collapse/expand controls exist per-widget and global.
- [x] Widget interactions are tracked with action metadata.
- [x] Widget preference sanitization/normalization is unit-tested.
- [x] Launch coverage includes widget persistence flow (`tests/launch/13-client-portal.spec.ts`).

## Widget Matrix

| Widget ID         | Data Source (Server)                                                  | Primary CTA(s)                                                            | Tracking Action Examples                                                             | Empty-State Behavior                                      | Status   |
| ----------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------- | -------- |
| `action_required` | `actionRequired` (computed from events/quotes/inquiries)              | `View Events`, `Book Again`                                               | `open_action_proposals`, `open_action_quotes`, `book_from_action_empty`              | Shows "caught up" + CTA row                               | Complete |
| `feedback`        | `unreviewedEvent`, `chefDisplayName`                                  | `Open Review Form`, `View Event History`                                  | `open_review_form`, `open_history_from_feedback`                                     | "No pending reviews" + history CTA                        | Complete |
| `rewards`         | `loyaltyStatus`                                                       | `Open Rewards`, `How It Works`                                            | `open_rewards_points`, `open_rewards`, `book_from_rewards_empty`                     | Rewards empty-state + booking CTA                         | Complete |
| `quotes`          | `quotes`, derived counts (`sent/accepted/rejected/expired`)           | `Review Pending Quote`, `Open Quotes`                                     | `review_pending_quote`, `open_quotes_pending`, `open_quotes_closed`                  | "No quotes yet" + inquiries CTA                           | Complete |
| `inquiries`       | `inquiries`, derived counts (`awaiting_client/awaiting_chef/quoted`)  | `Respond Now`, `Open Inquiries`                                           | `respond_to_inquiry`, `open_inquiries_awaiting_client`, `book_from_inquiries_empty`  | "No active inquiries" + new inquiry CTA                   | Complete |
| `messages`        | `inbox`, unread + latest thread derivations                           | `Open Latest Thread`, `Review Unread`                                     | `open_latest_conversation`, `open_messages_inbox`                                    | "No conversations yet" + message/inbox CTA                | Complete |
| `upcoming_events` | `eventsResult.upcoming`                                               | `Open Upcoming Events`, `Book Another Event`                              | `open_upcoming_events_list`, `book_from_upcoming_widget`, `book_from_upcoming_empty` | "No upcoming events" + booking/history CTAs               | Complete |
| `event_history`   | `eventsResult.past`, `pastTotalCount`, `cancelled`, `pastWithBalance` | `View all history` / `+more`                                              | `open_full_history_link`, `open_full_history_button`, `book_from_history_empty`      | "No past events yet" + first-booking CTA                  | Complete |
| `dinner_circle`   | `hubSummary`                                                          | `Open Dinner Circle`, `Invite Friends`                                    | `open_hub_groups`, `open_dinner_circle`, `create_group`                              | Quiet-state with group/friend CTAs                        | Complete |
| `spending`        | `spendingSummary`                                                     | `View Spending Breakdown`, `Open Spending`                                | `open_spending_lifetime`, `open_spending_dashboard`, `book_from_spending_empty`      | "No spending activity" + booking CTA                      | Complete |
| `profile_health`  | `profileSummary`                                                      | `Finish Profile`, `Review Meal Requests`, `Enable Alerts`, `Open Profile` | `complete_profile`, `review_meal_requests`, `enable_signal_alerts`                   | Health summary always shown; action buttons adapt by gaps | Complete |
| `rsvp_ops`        | `rsvpSummary`                                                         | `Open RSVP Dashboard`, `Guest Checklist`                                  | `open_rsvp_event`, `open_rsvp_dashboard`, `open_events_for_rsvp`                     | RSVP-missing state + upcoming-events CTA                  | Complete |
| `documents`       | `documentsSummary` (built into `documentActions`)                     | Dynamic doc actions, `View Events` fallback                               | `open_calendar`, `open_menu`, `open_receipt`, `open_events_for_documents`            | "No downloadable documents" + events CTA                  | Complete |
| `book_again`      | static                                                                | `Book Now`                                                                | `book_now`                                                                           | N/A                                                       | Complete |
| `assistant`       | widget enabled flag only                                              | Passive panel + Remy availability                                         | page-level widget view tracking                                                      | Informational copy (no direct CTA)                        | Complete |

## Cross-Cutting Dashboard Controls

- Layout customization page: `/my-events/settings/dashboard`
- Widget persistence server action: `updateClientDashboardPreferences`
- Collapse persistence key: `cf:client-dashboard-collapsed`
- Widget-level view tracking: `ActivityTracker` per visible widget
- Dashboard-level tracking includes visible widgets + key counters

## Validation Snapshot

- `next lint -- --file app/(client)/my-events/page.tsx --file components/activity/tracked-activity-link.tsx` PASS
- `node --test --import tsx tests/unit/client-dashboard-preferences.test.ts` PASS

## Residual Risks / External Blockers

- Global `npm run typecheck` currently blocked by unrelated syntax error in `components/ui/button.tsx`.
- Launch Playwright execution currently blocked in seed setup (`tests/helpers/e2e-seed.ts`), not by dashboard widget code.
