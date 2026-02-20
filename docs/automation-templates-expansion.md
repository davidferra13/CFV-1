# Automation Templates Expansion

## What Changed
`components/automations/rule-builder.tsx` — added 2 new quick-start templates

## New Templates
**"Payment received → thank-you draft"**
- Trigger: `event_status_changed`
- Condition: `new_status = paid`
- Action: `create_follow_up_task` — "Send thank-you note to {{client_name}} for {{occasion}}"
- Due in: 4 hours

**"Event completed → request review"**
- Trigger: `event_status_changed`
- Condition: `new_status = completed`
- Action: `create_follow_up_task` — "Request a review from {{client_name}} — 24h after {{occasion}}"
- Due in: 24 hours

## Total Templates: 6
1. New Wix lead → notify me
2. Client goes quiet → schedule follow-up
3. Event is 24h away → prep reminder
4. Inquiry status changes → log a note
5. Payment received → thank-you draft *(new)*
6. Event completed → request review *(new)*

## Template Gallery Behavior
The gallery is already shown by default when creating a new rule (`showQuickStart` initializes
to `!isEditing`). No change needed to prominence.

## Files Modified
- `components/automations/rule-builder.tsx`
