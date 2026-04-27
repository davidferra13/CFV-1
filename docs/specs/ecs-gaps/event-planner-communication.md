# ECS Gap: Event Planner Communication Integration

> Source: ECS Scorecard 2026-04-27 | User Type: Event Planner/Assistant (27/100) | Dimension: Flow Continuity (4/20)

## Problem
Communication system has zero integration with event_contacts. Notifications, emails, and messages route only through the client record. A planner marked as primary contact with `receives_notifications = true` gets nothing.

## Spec
1. Read `lib/communication/actions.ts` and `lib/email/notifications.ts`
2. Find where event-related communications are sent (quote sent, event confirmed, etc.)
3. At each send point, also query `event_contacts` for contacts with `receives_notifications = true`
4. Send CC or separate notification to those contacts
5. Add contact_role field to inquiry schema so planners can be distinguished at intake

## Priority Communications
- Quote/proposal sent
- Event confirmed
- Payment received
- Pre-event reminders
- Post-event follow-up

## Acceptance
- Event contacts with receives_notifications=true get copies of key communications
- Planner role distinguished from client at inquiry stage
- Non-blocking (side effect pattern)
