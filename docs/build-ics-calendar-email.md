# Build: ICS Calendar Link in Event-Confirmed Email

## What Changed

When an event transitions from `paid → confirmed`, the system now sends the client an "Add to Calendar" button in the confirmation email, linking directly to the `.ics` download endpoint.

## Files Modified

| File                                      | Change                                                                                              |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `lib/email/templates/event-confirmed.tsx` | Added `calendarUrl` prop, `Button` import, "Add to Calendar" button, and `button` style constant    |
| `lib/email/notifications.ts`              | Added `eventId` param to `sendEventConfirmedEmail()`; builds `calendarUrl` from `APP_URL`           |
| `lib/events/transitions.ts`               | Passes `eventId` (already in scope) to `sendEventConfirmedEmail()` in the `paid → confirmed` branch |

## How It Works

1. Event FSM transitions `paid → confirmed`
2. `transitionEvent()` calls `sendEventConfirmedEmail({ ..., eventId })`
3. The notification builder constructs `calendarUrl = ${APP_URL}/api/calendar/event/${eventId}`
4. The email template renders an "Add to Calendar" button that downloads the `.ics` file

The ICS generation endpoint (`app/api/calendar/event/[id]/route.ts`) was already fully implemented — it was just not linked in the email. This change closes that gap.

## Why a Button Link (Not an Attachment)

- Email attachment `.ics` files have inconsistent parsing across clients (Gmail strips them, Outlook handles differently)
- A link to an authenticated download is cleaner and lets the client open the `.ics` on any device
- The endpoint already handles auth and generates RFC 5545-compliant calendar files

## Verification

1. Transition a test event to `paid`, then to `confirmed`
2. Open the confirmation email
3. Confirm "Add to Calendar" button appears
4. Click button → `.ics` file downloads and opens correctly in calendar app

## Related Files

- ICS generation: `app/api/calendar/event/[id]/route.ts`
- Email send utility: `lib/email/send.ts`
- Event FSM: `lib/events/transitions.ts`
