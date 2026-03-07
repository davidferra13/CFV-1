# Guest Experience Improvements

**Date:** 2026-03-06
**Branch:** `feature/risk-gap-closure`
**Status:** Complete (all 3 phases)

## Summary

End-to-end overhaul of the guest experience in ChefFlow. Previously, guests could only RSVP and submit dietary info. Now the guest portal is a full pre-event and post-event experience with 9 new features across 3 phases.

## What Changed

### Phase 1: High-Impact, Low-Effort

**1A. Menu Items in Guest Portal**

- Guests now see actual dishes/courses when chef enables "show menu" visibility
- Each dish shows: course number, course name, description, dietary tags (green badges), allergen flags (red badges)
- Data flows from `dishes` table through `loadGuestPortalContext()` to portal client
- Files: `lib/sharing/actions.ts` (query expansion), `portal-client.tsx` (rendering)

**1B. Day-of Guest Reminders**

- Chef can send "day before" or "day of" reminders to all confirmed guests
- Tracked in `guest_day_of_reminders` table (prevents duplicate sends)
- Chef UI: Reminders tab in Guest Experience Panel
- Files: `lib/sharing/actions.ts` (`sendDayOfGuestReminders`, `getDayOfReminderStatus`)

**1C. Guest Post-Event Feedback**

- New public page at `/guest-feedback/[token]` (token-gated, no auth)
- 3 star ratings (overall required, food + atmosphere optional)
- Free text: highlight, suggestion, testimonial consent
- Chef creates feedback requests from event detail page
- Chef views all responses with ratings and quotes
- Aggregated view: `guest_feedback_summary` database view
- Files: `app/(public)/guest-feedback/[token]/`, `lib/sharing/actions.ts`

### Phase 2: Medium Effort, Strong Value

**2A. Guest-to-Chef Messaging**

- Guests can send one-way messages to the chef directly from the RSVP portal
- Messages appear in the "Messages" tab of the Guest Experience Panel on event detail
- Chef can mark messages as read
- Rate limited: 10 messages per hour per guest token
- Creates notification for chef on new message
- Files: `guest_messages` table, `portal-client.tsx` (GuestMessageSection)

**2B. Dietary Confirmation Follow-up**

- Chef sends dietary confirmation requests to all attending guests with dietary info
- Summarizes their restrictions/allergies and asks for confirmation
- Guest can confirm or update via their RSVP portal token
- Tracked in `guest_dietary_confirmations` table
- Files: `lib/sharing/actions.ts` (`sendDietaryConfirmations`, `confirmGuestDietary`)

**2C. Pre-Event Experience Page**

- After RSVP submission, guest sees a rich countdown page instead of just "RSVP Recorded"
- Shows: days/hours until event, event details, pre-event info, shared documents, message the chef, about me, who's coming
- Chef customizes pre-event content (parking, dress code, what to expect, arrival instructions, custom message)
- Content stored in `event_shares.pre_event_content` JSONB column
- Files: `portal-client.tsx` (PostRSVPExperience, PreEventInfoSection)

### Phase 3: Longer-Term Polish

**3A. Guest No-Show Reconciliation**

- After event completes, chef marks actual attendance for each guest
- Options: attended, no-show, late, left early
- Stored on `event_guests` table (new columns: `actual_attended`, `reconciled_at`, `reconciled_by`)
- Feeds into guest analytics for reliability tracking
- Files: `lib/sharing/actions.ts` (`reconcileAttendance`, `getAttendanceReconciliation`)

**3B. Guest Document Sharing**

- Chef uploads/creates documents to share with event guests
- Types: recipe card, wine pairing, event photos, pre-event info, thank you note, other
- Documents can be pre-event (shown on countdown page) or post-event
- Publish/unpublish control; guests only see published documents
- Files: `event_guest_documents` table, `portal-client.tsx` (GuestDocumentsSection)

**3C. Guest-to-Guest Social**

- Guests can add an "about me" blurb (500 char max) visible to other guests
- Guest list shows colored RSVP status badges (green attending, red declined, gray pending)
- Files: `event_guests.about_me` column, `portal-client.tsx` (GuestAboutMeSection)

## Database Changes

**Migration:** `20260330000064_guest_experience_improvements.sql`

All additive. No existing tables/columns dropped or modified.

| Object                                  | Type   | Purpose                                |
| --------------------------------------- | ------ | -------------------------------------- |
| `guest_feedback`                        | Table  | Post-event guest satisfaction ratings  |
| `guest_messages`                        | Table  | One-way guest-to-chef messages         |
| `guest_day_of_reminders`                | Table  | Day-of reminder delivery tracking      |
| `guest_dietary_confirmations`           | Table  | 48-72hr dietary confirmation workflow  |
| `event_guest_documents`                 | Table  | Chef-shared documents for guests       |
| `guest_feedback_summary`                | View   | Aggregated feedback ratings per event  |
| `event_guests.actual_attended`          | Column | Post-event attendance reconciliation   |
| `event_guests.reconciled_at`            | Column | When attendance was recorded           |
| `event_guests.reconciled_by`            | Column | Who recorded attendance                |
| `event_guests.about_me`                 | Column | Guest bio for social features          |
| `event_shares.pre_event_content`        | Column | Chef-customized countdown page content |
| `event_shares.day_of_reminders_enabled` | Column | Toggle for day-of reminders            |

## UI Components

| Component               | Location                                        | Purpose                                          |
| ----------------------- | ----------------------------------------------- | ------------------------------------------------ |
| `GuestExperiencePanel`  | `components/sharing/guest-experience-panel.tsx` | Chef-side tabbed panel on event detail (7 tabs)  |
| `PostRSVPExperience`    | `portal-client.tsx`                             | Guest-side post-RSVP countdown + rich experience |
| `GuestMessageSection`   | `portal-client.tsx`                             | Guest-to-chef messaging form                     |
| `GuestAboutMeSection`   | `portal-client.tsx`                             | Guest bio editor                                 |
| `GuestDocumentsSection` | `portal-client.tsx`                             | Published document viewer                        |
| `PreEventInfoSection`   | `portal-client.tsx`                             | Pre-event countdown info display                 |
| `GuestFeedbackForm`     | `app/(public)/guest-feedback/[token]/`          | Post-event feedback form                         |

## Server Actions Added

All in `lib/sharing/actions.ts`:

- `sendDayOfGuestReminders` - Queue day-of reminders for confirmed guests
- `getDayOfReminderStatus` - Check reminder delivery status
- `getGuestFeedbackByToken` - Load feedback form by public token
- `submitGuestFeedback` - Submit guest satisfaction ratings
- `createGuestFeedbackForEvent` - Generate feedback tokens for all attendees
- `getGuestFeedbackForEvent` - Chef views all feedback responses
- `sendGuestMessage` - Guest sends message to chef from portal
- `getGuestMessagesForEvent` - Chef loads guest messages
- `markGuestMessageRead` - Chef marks message as read
- `sendDietaryConfirmations` - Queue dietary confirmations for guests with restrictions
- `getDietaryConfirmationStatus` - Chef checks confirmation responses
- `confirmGuestDietary` - Guest confirms/updates dietary info
- `createGuestDocument` - Chef creates document to share
- `getGuestDocumentsForEvent` - Chef lists all documents
- `getPublishedGuestDocuments` - Guest views published documents
- `publishGuestDocument` - Chef publishes a document
- `deleteGuestDocument` - Chef removes a document
- `reconcileAttendance` - Chef marks actual attendance
- `getAttendanceReconciliation` - Load attendance data
- `updateGuestAboutMe` - Guest updates bio
- `updatePreEventContent` - Chef sets countdown page content
- `getPreEventContent` - Guest loads countdown page content

## What Was NOT Built (intentionally out of scope)

- Guest login/accounts (token-gated access is the right pattern)
- Guest-side Remy AI (unnecessary complexity for one-time interactions)
- Push notifications for guests (email is the right channel)
- Automated reminder scheduling (chef triggers manually for now)
