# Client Gifting & Follow-Up Automation (Feature 2.16)

## What was built

A system for tracking client gifts and configuring automated follow-up rules.

### Database tables

- `client_gift_log` - records every gift sent to a client (type, occasion, cost, delivery method, notes)
- `client_followup_rules` - configurable triggers (post-event, birthday, no-booking intervals, milestones) paired with actions (reminder, email draft, gift suggestion)

Both tables use RLS scoped to `chef_id`.

### Server actions (`lib/clients/gifting-actions.ts`)

- CRUD for gift log entries and follow-up rules
- `getGiftSuggestions()` - deterministic (no AI) suggestions based on upcoming birthdays (14-day window), clients with no booking in 60+ days, and event count milestones (5, 10, 25, 50, 100)
- `getGiftingStats()` - total spend, gift counts per client, average gift cost

### UI Components

1. **GiftLogPanel** (`components/clients/gift-log-panel.tsx`) - table of past gifts with inline add form, type badges, cost tracking. For use on client detail pages.
2. **FollowUpRulesManager** (`components/clients/followup-rules-manager.tsx`) - list of rules with enable/disable toggles, edit/delete, preset templates for common scenarios. For use in settings.
3. **GiftSuggestionsWidget** (`components/dashboard/gift-suggestions-widget.tsx`) - compact dashboard widget showing upcoming occasions with urgency indicators and quick-log buttons.

### Patterns followed

- All money stored in cents
- `requireChef()` + tenant scoping on every action
- `startTransition` with try/catch and rollback on all client mutations
- Error states shown to user (never silent failures)
- Formula-based suggestions, no AI dependency
