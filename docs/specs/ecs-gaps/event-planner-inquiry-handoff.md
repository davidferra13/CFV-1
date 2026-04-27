# ECS Gap: Event Planner Inquiry-to-Event Contact Handoff

> Source: ECS Scorecard 2026-04-27 | User Type: Event Planner/Assistant (27/100) | Dimension: Flow Continuity (4/20)

## Problem
When an inquiry converts to an event, there is no automatic creation of event_contacts from the inquiry's contact_name/contact_email fields. The planner's info is lost in the conversion.

## Spec
1. Find where inquiries convert to events (search for inquiry-to-event conversion action)
2. After event creation, check if inquiry has contact_name/contact_email different from the client
3. If different, auto-create an event_contact record with role='planner' and receives_notifications=true
4. Also carry over contact_phone if available

## Acceptance
- Inquiry contact info automatically becomes an event contact on conversion
- Only creates contact if different from the booking client
- Role defaults to 'planner'
- Notifications enabled by default
